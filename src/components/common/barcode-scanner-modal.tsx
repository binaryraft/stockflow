
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScanLine, Loader2, VideoOff, CameraOff, AlertTriangle, Camera, CheckCircle2 } from 'lucide-react';
import { BrowserMultiFormatReader, NotFoundException, DecodeHintType } from '@zxing/library';
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
  | "permission_granted" // Permission obtained, camera not yet started
  | "permission_denied"
  | "no_camera_found"
  | "camera_error" // General camera issues
  | "preview_active" // Video preview is live and playing
  | "capturing_image"
  | "decoding_image"
  | "scan_success_image"
  | "scan_failed_image" // No barcode found in captured image
  | "error"; // Generic error

export function BarcodeScannerModal({
  isOpen,
  onOpenChange,
  onScanSuccess,
  onScanError,
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // For capturing frames
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const { toast } = useToast();

  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs for callbacks to ensure useEffect doesn't re-run due to their reference changes
  const onScanSuccessRef = useRef(onScanSuccess);
  const onScanErrorRef = useRef(onScanError);
  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => { onScanSuccessRef.current = onScanSuccess; }, [onScanSuccess]);
  useEffect(() => { onScanErrorRef.current = onScanError; }, [onScanError]);
  useEffect(() => { onOpenChangeRef.current = onOpenChange; }, [onOpenChange]);

  const stopCameraStream = useCallback(() => {
    console.log("BarcodeScanner (Image): stopCameraStream called.");
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    let isActive = true; // Flag to manage async operations

    const initializeCamera = async () => {
      if (!isOpen || !isActive) return;

      setStatus("requesting_permission");
      setErrorMessage("Requesting camera permission...");

      await new Promise(resolve => setTimeout(resolve, 50)); // Brief delay for modal render

      if (!isActive || !videoRef.current) {
        if (isActive) { // Only set error if still active
          setStatus("error");
          setErrorMessage("Video element reference is not available. Modal might not be fully rendered.");
          console.error("BarcodeScanner (Image): Video ref not available post delay.");
        }
        return;
      }

      try {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!isActive || !isOpen || !videoRef.current) { stopCameraStream(); return; }

        setStatus("permission_granted");
        setErrorMessage(null);
        videoRef.current.srcObject = mediaStreamRef.current;
        await videoRef.current.play();

        if (!isActive || !isOpen) { stopCameraStream(); return; }
        setStatus("preview_active");

      } catch (err: any) {
        if (!isActive || !isOpen) { stopCameraStream(); return; }
        console.error("BarcodeScanner (Image): Camera initialization error:", err);
        let userMessage = 'Could not access camera.';
        let newStatus: ScannerStatus = 'camera_error';

        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          userMessage = 'Camera permission denied. Please enable it in your browser settings.';
          newStatus = 'permission_denied';
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          userMessage = 'No camera found. Ensure a camera is connected and enabled.';
          newStatus = 'no_camera_found';
        } else if (err.name === "NotReadableError" || err.name === "SourceUnavailableError" || err.name === "TrackStartError") {
          userMessage = 'Camera is already in use or unreadable. Try closing other apps using the camera.';
        }
        
        setStatus(newStatus);
        setErrorMessage(userMessage);
        if (onScanErrorRef.current) onScanErrorRef.current(new Error(userMessage));
        toast({ variant: "destructive", title: "Camera Access Error", description: userMessage, duration: 7000 });
        stopCameraStream();
      }
    };

    if (isOpen) {
      initializeCamera();
    } else {
      stopCameraStream();
      setStatus("idle");
      setErrorMessage(null);
    }

    return () => {
      isActive = false;
      stopCameraStream();
    };
  }, [isOpen, stopCameraStream, toast]);

  const handleCaptureAndDecode = async () => {
    if (!videoRef.current || !canvasRef.current || status !== 'preview_active') {
      setErrorMessage("Camera not ready for capture or already processing.");
      toast({ variant: "destructive", title: "Capture Error", description: "Camera not ready." });
      return;
    }

    setStatus("capturing_image");
    setErrorMessage(null);

    const videoNode = videoRef.current;
    const canvasNode = canvasRef.current;

    canvasNode.width = videoNode.videoWidth;
    canvasNode.height = videoNode.videoHeight;

    const ctx = canvasNode.getContext('2d');
    if (!ctx) {
      setStatus("error");
      setErrorMessage("Could not get canvas context for image capture.");
      toast({ variant: "destructive", title: "Capture Error", description: "Canvas context failed." });
      return;
    }

    ctx.drawImage(videoNode, 0, 0, canvasNode.width, canvasNode.height);
    setStatus("decoding_image");

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

    try {
      const result = await codeReaderRef.current.decodeFromCanvas(canvasNode);
      setStatus("scan_success_image");
      onScanSuccessRef.current(result.getText());
      toast({ title: "Barcode Scanned!", description: `Value: ${result.getText()}` });
      onOpenChangeRef.current(false);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        setStatus("scan_failed_image");
        setErrorMessage("No barcode found in the image. Please adjust camera and try again.");
        toast({ variant: "default", title: "Scan Attempt", description: "No barcode detected in the captured image." });
      } else {
        setStatus("error");
        setErrorMessage(`Error decoding barcode: ${error.message}`);
        console.error("BarcodeScanner (Image): Decoding error:", error);
        if (onScanErrorRef.current) onScanErrorRef.current(error);
        toast({ variant: "destructive", title: "Decoding Error", description: error.message });
      }
      // Allow user to try again by resetting to preview_active after a short delay if scan failed
      if (error instanceof NotFoundException) {
        setTimeout(() => {
            if (isOpen && (status === "scan_failed_image" || status === "decoding_image")) { // Check current status before resetting
                setStatus("preview_active");
                setErrorMessage(null);
            }
        }, 1500);
      }
    }
  };


  let statusOverlayContent = null;
  switch (status) {
    case "requesting_permission":
    case "permission_granted":
    case "capturing_image":
    case "decoding_image":
      statusOverlayContent = (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-primary-foreground p-4 text-center z-10">
          <Loader2 className="h-10 w-10 text-primary/80 animate-spin mb-3" />
          <p className="text-sm px-2">{status === 'requesting_permission' ? 'Requesting camera permission...' : status === 'capturing_image' ? 'Capturing image...' : status === 'decoding_image' ? 'Analyzing image...' : 'Initializing camera...'}</p>
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
          <p className="text-xs">{errorMessage}</p>
        </div>
      );
      break;
    case "scan_success_image": // This state is brief as modal closes
       statusOverlayContent = (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500/80 text-white p-4 text-center z-10">
          <CheckCircle2 className="h-10 w-10 mb-3" />
          <p className="text-sm font-semibold">Scan Successful!</p>
        </div>
      );
      break;
    case "preview_active":
      // No overlay, show video feed
      break;
    default: // idle
      statusOverlayContent = (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-primary-foreground p-4 text-center z-10">
          <VideoOff className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm">Camera preview will appear here.</p>
        </div>
      );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          stopCameraStream(); // Ensure camera stops if dialog is closed manually
          setStatus("idle");
        }
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
                playsInline
                muted
                autoPlay={false} // We explicitly call play()
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} /> {/* Hidden canvas */}
              {statusOverlayContent}
            </div>
            {status === 'preview_active' && (
              <Button onClick={handleCaptureAndDecode} className="w-full" variant="default">
                <Camera className="mr-2 h-5 w-5" /> Capture & Decode Barcode
              </Button>
            )}
             {(status === 'scan_failed_image') && (
              <Button onClick={handleCaptureAndDecode} className="w-full" variant="outline">
                <Camera className="mr-2 h-5 w-5" /> Try Capture Again
              </Button>
            )}
            {errorMessage && (status === 'scan_failed_image' || status === 'error' || status === 'camera_error' || status === 'permission_denied' || status === 'no_camera_found' ) && (
               !statusOverlayContent && /* Only show if not already part of overlay */
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
    </>
  );
}
