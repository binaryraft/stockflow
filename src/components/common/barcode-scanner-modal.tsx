
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScanLine, Loader2, VideoOff, CameraOff, AlertTriangle, Camera, CheckCircle2 } from 'lucide-react';
import { BrowserMultiFormatReader, DecodeHintType, NotFoundException, IScannerControls } from '@zxing/library';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: Error) => void;
}

type ScannerStatus =
  | "idle"
  | "requesting_permission"
  | "permission_granted" // Intermediate state after getUserMedia succeeds
  | "permission_denied"
  | "no_camera_found"
  | "initializing_video" // Video stream is being set up
  | "preview_active" // Video preview is live and playing, ready for capture
  | "capturing_image"
  | "decoding_image"
  | "scan_success_image" // Barcode found in image, briefly show success
  | "scan_failed_image" // No barcode found in captured image
  | "camera_error" // General camera or video stream issues (e.g., dimensions, play error)
  | "error"; // Generic unhandled error

export function BarcodeScannerModal({
  isOpen,
  onOpenChange,
  onScanSuccess,
  onScanError,
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null); // Not used in image capture, but good practice

  const { toast } = useToast();

  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastScannedValue, setLastScannedValue] = useState<string | null>(null);

  // Refs for callbacks to ensure stability of the main useEffect
  const onScanSuccessRef = useRef(onScanSuccess);
  const onScanErrorRef = useRef(onScanError);
  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => { onScanSuccessRef.current = onScanSuccess; }, [onScanSuccess]);
  useEffect(() => { onScanErrorRef.current = onScanError; }, [onScanError]);
  useEffect(() => { onOpenChangeRef.current = onOpenChange; }, [onOpenChange]);

  const stopEverything = useCallback(() => {
    if (scannerControlsRef.current) {
      scannerControlsRef.current.stop();
      scannerControlsRef.current = null;
    }
    if (codeReaderRef.current) {
      codeReaderRef.current.reset(); // Good practice for ZXing
      // codeReaderRef.current = null; // Let it be re-initialized if needed
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.pause(); // Pause before clearing srcObject
      videoRef.current.srcObject = null;
    }
    // Reset status to idle unless it's a persistent error we want the user to see
    if (status !== "permission_denied" && status !== "no_camera_found" && status !== "camera_error" && status !== "error") {
      setStatus("idle");
    }
  }, [status]); // Keep status dependency, to correctly reset to idle or preserve error states

  useEffect(() => {
    let isActive = true; // Flag to prevent state updates if component unmounts during async ops

    const initializeCamera = async () => {
      if (!isActive || !isOpen) { stopEverything(); return; }

      // Give the modal and video element a moment to render
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!isActive || !isOpen) { stopEverything(); return; }

      if (!videoRef.current) {
        console.error("BarcodeScanner (Image): Video ref not available even after delay.");
        if (isActive) {
          setStatus("error");
          setErrorMessage("Video element initialization failed. Please try reopening the scanner.");
          toast({ variant: "destructive", title: "Scanner Error", description: "Video element issue."});
        }
        return;
      }
      
      if (isActive) {
        setStatus("requesting_permission");
        setErrorMessage(null);
        setLastScannedValue(null);
      }

      try {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!isActive || !isOpen) { stopEverything(); return; }

        // Explicitly set status after permission is granted BEFORE other operations
        if (isActive) setStatus("permission_granted");

        if (!videoRef.current) { // Re-check ref after await
          if (isActive) setStatus("error"); setErrorMessage("Video element became unavailable.");
          stopEverything(); return;
        }
        
        videoRef.current.srcObject = mediaStreamRef.current;
        if (isActive) setStatus("initializing_video");

        await videoRef.current.play();
        if (!isActive || !isOpen) { stopEverything(); return; }

        // Wait for video dimensions to be valid
        let attempts = 0;
        while (attempts < 30 && (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0)) {
          if (!isActive || !isOpen) { stopEverything(); return; }
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
          console.error("BarcodeScanner (Image): Video dimensions remained zero.");
          if (isActive) {
            setStatus("camera_error");
            setErrorMessage("Camera stream started but video dimensions are invalid. Try again or check camera.");
            toast({ variant: "destructive", title: "Camera Error", description: "Video dimensions invalid." });
          }
          stopEverything();
          return;
        }

        if (isActive) setStatus("preview_active");

      } catch (err: any) {
        if (!isActive || !isOpen) { stopEverything(); return; }
        console.error("BarcodeScanner (Image): Camera initialization error:", err);
        let userMessage = 'Could not access camera.';
        let newStatus: ScannerStatus = 'camera_error';

        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          userMessage = 'Camera permission denied. Please enable it in browser settings and try again.';
          newStatus = 'permission_denied';
          toast({ variant: "destructive", title: "Permission Denied", description: userMessage, duration: 7000 });
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          userMessage = 'No camera found. Ensure a camera is connected and enabled.';
          newStatus = 'no_camera_found';
          toast({ variant: "destructive", title: "No Camera", description: userMessage, duration: 7000 });
        } else if (err.name === "NotReadableError" || err.name === "SourceUnavailableError" || err.name === "TrackStartError") {
          userMessage = 'Camera is already in use or unreadable. Try closing other apps using the camera.';
          newStatus = 'camera_error';
          toast({ variant: "destructive", title: "Camera In Use", description: userMessage, duration: 7000 });
        } else if (err.name === "AbortError") { // Video play interrupted
             userMessage = 'Camera playback was interrupted. Please try again.';
             newStatus = 'camera_error';
             toast({ variant: "destructive", title: "Playback Error", description: userMessage, duration: 5000 });
        }
        
        if (isActive) {
          setStatus(newStatus);
          setErrorMessage(userMessage);
        }
        if (onScanErrorRef.current) onScanErrorRef.current(new Error(userMessage));
        stopEverything(); // Ensure cleanup on error
      }
    };

    if (isOpen) {
      initializeCamera();
    } else {
      stopEverything();
    }

    return () => {
      isActive = false;
      stopEverything();
    };
  }, [isOpen, stopEverything]); // stopEverything is memoized

  const handleCaptureAndDecode = async () => {
    if (!isOpen || !videoRef.current || !canvasRef.current || status !== 'preview_active') {
      setErrorMessage("Camera not ready for capture or already processing.");
      toast({ variant: "destructive", title: "Capture Error", description: "Camera not ready." });
      return;
    }

    if (status !== 'preview_active' && status !== 'scan_failed_image') return;


    setStatus("capturing_image");
    setErrorMessage(null);
    setLastScannedValue(null);

    const videoNode = videoRef.current;
    const canvasNode = canvasRef.current;

    canvasNode.width = videoNode.videoWidth;
    canvasNode.height = videoNode.videoHeight;

    if (canvasNode.width === 0 || canvasNode.height === 0) {
      setStatus("camera_error");
      setErrorMessage("Failed to prepare image for scanning (canvas dimensions zero).");
      toast({ variant: "destructive", title: "Capture Error", description: "Canvas dimensions invalid." });
      setTimeout(() => { if (isOpen) setStatus("preview_active"); }, 1500);
      return;
    }

    const ctx = canvasNode.getContext('2d');
    if (!ctx) {
      setStatus("error");
      setErrorMessage("Could not get canvas context for image capture.");
      toast({ variant: "destructive", title: "Capture Error", description: "Canvas context failed." });
      return;
    }

    ctx.drawImage(videoNode, 0, 0, canvasNode.width, canvasNode.height);
    setStatus("decoding_image");

    try {
      if (!codeReaderRef.current) {
        const hints = new Map();
        const formats = [
            DecodeHintType.EAN_13, DecodeHintType.EAN_8, DecodeHintType.CODE_128,
            DecodeHintType.QR_CODE, DecodeHintType.DATA_MATRIX, DecodeHintType.UPC_A,
            DecodeHintType.UPC_E, DecodeHintType.CODE_39, DecodeHintType.CODE_93,
            DecodeHintType.ITF, DecodeHintType.PDF_417, DecodeHintType.AZTEC,
        ];
        hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
        hints.set(DecodeHintType.TRY_HARDER, true);
        codeReaderRef.current = new BrowserMultiFormatReader(hints);
      }

      // Ensure codeReaderRef.current and decodeFromCanvas are valid
      if (!codeReaderRef.current || typeof codeReaderRef.current.decodeFromCanvas !== 'function') {
        console.error("BarcodeScanner: codeReader or decodeFromCanvas is not available.");
        setStatus("error");
        setErrorMessage("Barcode scanning library failed to initialize.");
        toast({ variant: "destructive", title: "Scanner Error", description: "Library initialization issue."});
        return;
      }

      const result = await codeReaderRef.current.decodeFromCanvas(canvasNode);
      const scannedText = result.getText();
      
      setStatus("scan_success_image");
      setLastScannedValue(scannedText); // Show scanned value briefly
      
      setTimeout(() => {
        if (isOpen) { // Check if modal is still open before calling success
          onScanSuccessRef.current(scannedText);
          toast({ title: "Barcode Scanned!", description: `Value: ${scannedText}` });
          onOpenChangeRef.current(false); // Close modal on success
        }
      }, 1000); // Delay to show success message

    } catch (error: any) {
      if (!isOpen) return; // Modal closed during decode

      if (error instanceof NotFoundException) {
        setStatus("scan_failed_image");
        setErrorMessage("No barcode found in the captured image. Please adjust camera and try again.");
        // No toast for "not found" to avoid annoyance, rely on UI message
      } else {
        console.error("Barcode decoding error:", error);
        setStatus("error");
        setErrorMessage(`Error decoding barcode: ${error.message || "Unknown decoding error"}`);
        if (onScanErrorRef.current) onScanErrorRef.current(error);
        toast({ variant: "destructive", title: "Decoding Error", description: error.message || "Could not read barcode from image." });
      }
    }
  };

  let statusOverlayContent = null;
  switch (status) {
    case "requesting_permission":
    case "permission_granted": // Show loading even after permission granted, until video is ready
    case "initializing_video":
    case "capturing_image":
    case "decoding_image":
      statusOverlayContent = (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-primary-foreground p-4 text-center z-10">
          <Loader2 className="h-10 w-10 text-primary/80 animate-spin mb-3" />
          <p className="text-sm px-2">
            {status === 'requesting_permission' ? 'Requesting camera permission...' :
             status === 'permission_granted' ? 'Permission granted, preparing camera...' :
             status === 'initializing_video' ? 'Initializing video stream...' :
             status === 'capturing_image' ? 'Capturing image...' :
             status === 'decoding_image' ? 'Analyzing image for barcode...' :
             'Loading scanner...'}
          </p>
        </div>
      );
      break;
    case "permission_denied":
    case "no_camera_found":
    case "camera_error":
    case "error":
      statusOverlayContent = (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4 text-center z-10">
          <Alert variant="destructive" className="m-4 text-destructive-foreground bg-destructive/80 border-destructive-foreground/30 max-w-sm">
            {status === 'permission_denied' || status === 'no_camera_found' ? <CameraOff className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            <AlertTitle className="font-semibold">Camera or Scanner Error</AlertTitle>
            <AlertDescription className="text-xs">{errorMessage || "An unknown error occurred."}</AlertDescription>
          </Alert>
        </div>
      );
      break;
    case "scan_failed_image":
       statusOverlayContent = (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 text-white p-4 text-center z-10">
          <AlertTriangle className="h-10 w-10 text-amber-400 mb-3" />
          <p className="text-sm font-semibold">No Barcode Detected</p>
          {errorMessage && <p className="text-xs mt-1">{errorMessage}</p>}
        </div>
      );
      break;
    case "scan_success_image":
       statusOverlayContent = (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-600/80 backdrop-blur-sm text-white p-4 text-center z-20">
          <CheckCircle2 className="h-12 w-12 mb-3" />
          <p className="text-lg font-semibold">Scan Successful!</p>
          {lastScannedValue && <p className="text-md mt-1 font-mono bg-black/20 px-2 py-1 rounded">{lastScannedValue}</p>}
        </div>
      );
      break;
    case "preview_active":
      // No overlay, show video feed and capture button
      break;
    default: // idle
      statusOverlayContent = (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-primary-foreground p-4 text-center z-10">
          <VideoOff className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm">Camera preview will appear here.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Waiting for camera initialization...</p>
        </div>
      );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        // When dialog is closed by any means (X button, overlay click, Escape key)
        if (!open) { stopEverything(); }
        onOpenChangeRef.current(open);
      }}>
      <DialogContent className="sm:max-w-md p-0 border-t-4 border-primary shadow-xl overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" /> Scan Product Barcode
          </DialogTitle>
        </DialogHeader>
        <div className="p-1 sm:p-2 space-y-2">
          <div className="relative w-full aspect-[4/3] bg-muted rounded-md overflow-hidden shadow-inner">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline // Important for iOS
              muted // Muted to prevent echo if mic is accidentally picked up
              autoPlay={false} // We explicitly call play()
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} /> {/* Hidden canvas for image capture */}
            {statusOverlayContent}
          </div>
          {(status === 'preview_active' || status === 'scan_failed_image') && (
            <Button 
              onClick={handleCaptureAndDecode} 
              className="w-full" 
              variant={status === 'scan_failed_image' ? "outline" : "default"}
              disabled={status === 'capturing_image' || status === 'decoding_image'}
            >
              <Camera className="mr-2 h-5 w-5" /> 
              {status === 'scan_failed_image' ? "Try Capture Again" : "Capture & Decode Barcode"}
            </Button>
          )}
          {/* Show persistent error messages at the bottom if they are not part of an overlay and dialog is open */}
          {isOpen && errorMessage && 
           (status === 'error' || status === 'camera_error') && 
           status !== 'permission_denied' && status !== 'no_camera_found' && (
              <p className="text-xs text-destructive text-center py-1">{errorMessage}</p>
          )}
        </div>
        <DialogFooter className="p-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

