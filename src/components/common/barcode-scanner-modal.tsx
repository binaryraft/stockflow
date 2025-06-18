
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScanLine, Loader2, VideoOff, CameraOff, AlertTriangle, Camera, CheckCircle2 } from 'lucide-react';
import { BrowserMultiFormatReader, NotFoundException, DecodeHintType, IScannerControls } from '@zxing/library'; // Added IScannerControls
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
  | "permission_denied"
  | "no_camera_found"
  | "camera_error" // General camera issues
  | "initializing_video" // Video stream is being set up
  | "preview_active" // Video preview is live and playing, ready for capture
  | "capturing_image"
  | "decoding_image"
  | "scan_success_image" // Barcode found in image, briefly show success
  | "scan_failed_image" // No barcode found in captured image
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

  const { toast } = useToast();

  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastScannedValue, setLastScannedValue] = useState<string | null>(null);

  const onScanSuccessRef = useRef(onScanSuccess);
  const onScanErrorRef = useRef(onScanError);
  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => { onScanSuccessRef.current = onScanSuccess; }, [onScanSuccess]);
  useEffect(() => { onScanErrorRef.current = onScanError; }, [onScanError]);
  useEffect(() => { onOpenChangeRef.current = onOpenChange; }, [onOpenChange]);

  const stopEverything = useCallback(() => {
    console.log("BarcodeScanner (Image): stopEverything called. Current status:", status);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
      console.log("BarcodeScanner (Image): Media stream tracks stopped.");
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject = null;
      console.log("BarcodeScanner (Image): Video srcObject nulled.");
    }
    // For image capture method, codeReaderRef is reset but doesn't have ongoing controls to stop typically.
    // Resetting the ref allows re-initialization if modal is opened again.
    if (codeReaderRef.current) {
        console.log("BarcodeScanner (Image): Resetting ZXing Reader instance in ref.");
        codeReaderRef.current.reset(); // Good practice
        codeReaderRef.current = null;
    }

    // Don't clear critical error messages immediately if they help user diagnose.
    // Only reset status to idle if not already in a persistent error state shown to user.
    if (status !== "permission_denied" && status !== "no_camera_found" && status !== "camera_error" && status !== "error") {
        setStatus("idle");
        // setErrorMessage(null); // Keep error message if it was critical
    }
  }, [status]); // Dependency on status ensures it logs the correct status when called


  useEffect(() => {
    let isActive = true;

    const initializeCamera = async () => {
      if (!isOpen || !isActive) return;

      console.log("BarcodeScanner (Image): Modal opened, starting camera initialization.");
      setStatus("requesting_permission");
      setErrorMessage(null); // Clear previous errors
      setLastScannedValue(null);

      await new Promise(resolve => setTimeout(resolve, 100)); // Brief delay for modal render

      if (!isActive || !videoRef.current) {
        if (isActive) {
          console.error("BarcodeScanner (Image): Video ref not available post delay.");
          setStatus("error");
          setErrorMessage("Video element reference is not available. Modal might not be fully rendered.");
        }
        return;
      }

      try {
        console.log("BarcodeScanner (Image): Requesting camera permission.");
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        
        if (!isActive || !isOpen || !videoRef.current) { stopEverything(); return; }
        console.log("BarcodeScanner (Image): Camera permission granted.");
        setStatus("permission_granted");
        setErrorMessage(null);

        videoRef.current.srcObject = mediaStreamRef.current;
        console.log("BarcodeScanner (Image): Video stream attached to element.");
        setStatus("initializing_video");

        await videoRef.current.play();
        if (!isActive || !isOpen) { stopEverything(); return; }
        console.log("BarcodeScanner (Image): Video play() successful.");

        // Ensure video dimensions are valid before proceeding
        let attempts = 0;
        while (attempts < 20 && (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0)) {
            if (!isActive || !isOpen) { stopEverything(); return; }
            console.log(`BarcodeScanner (Image): Waiting for video dimensions... Attempt ${attempts + 1}`);
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
            attempts++;
        }

        if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
            console.error("BarcodeScanner (Image): Video dimensions remained zero after timeout.");
            setStatus("camera_error");
            setErrorMessage("Camera stream started but video dimensions are invalid. Please try again or check camera.");
            toast({ variant: "destructive", title: "Camera Error", description: "Video dimensions invalid." });
            stopEverything();
            return;
        }
        console.log("BarcodeScanner (Image): Video dimensions valid:", videoRef.current.videoWidth, "x", videoRef.current.videoHeight);
        setStatus("preview_active"); // Ready for capture

      } catch (err: any) {
        if (!isActive || !isOpen) { stopEverything(); return; }
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
        } else if (err.name === "AbortError") {
           userMessage = 'Camera setup was aborted. This can happen if the modal was closed too quickly.';
           newStatus = 'camera_error'; // Or a more specific "aborted" status
        }
        
        setStatus(newStatus);
        setErrorMessage(userMessage);
        if (onScanErrorRef.current) onScanErrorRef.current(new Error(userMessage));
        if (newStatus !== 'permission_denied') { // Permission denied toast is more specific
            toast({ variant: "destructive", title: "Camera Access Error", description: userMessage, duration: 7000 });
        }
        stopEverything();
      }
    };

    if (isOpen) {
      initializeCamera();
    } else {
      stopEverything();
    }

    return () => {
      console.log("BarcodeScanner (Image): useEffect cleanup triggered for isOpen change or unmount.");
      isActive = false;
      stopEverything();
    };
  }, [isOpen, stopEverything]); // Relies on stopEverything being stable via useCallback

  const handleCaptureAndDecode = async () => {
    if (!isOpen || !videoRef.current || !canvasRef.current || status !== 'preview_active') {
      setErrorMessage("Camera not ready for capture or already processing.");
      console.warn("BarcodeScanner (Image): Capture attempted when not in preview_active state or refs missing. Status:", status);
      toast({ variant: "destructive", title: "Capture Error", description: "Camera not ready." });
      return;
    }

    setStatus("capturing_image");
    setErrorMessage(null);
    setLastScannedValue(null);

    const videoNode = videoRef.current;
    const canvasNode = canvasRef.current;

    canvasNode.width = videoNode.videoWidth;
    canvasNode.height = videoNode.videoHeight;

    // Check if canvas dimensions are valid (should be if video dimensions were checked)
    if (canvasNode.width === 0 || canvasNode.height === 0) {
      console.error("BarcodeScanner (Image): Canvas dimensions are zero before drawing. Cannot decode.");
      setStatus("camera_error"); // Or a more specific canvas error state
      setErrorMessage("Failed to prepare image for scanning (canvas dimensions zero).");
      toast({ variant: "destructive", title: "Capture Error", description: "Canvas dimensions invalid." });
      // Allow retry by resetting status
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
    console.log("BarcodeScanner (Image): Image captured on canvas.");
    setStatus("decoding_image");

    let currentReader = codeReaderRef.current;

    if (!currentReader) {
      console.log("BarcodeScanner (Image): Initializing ZXing Reader for this session (first capture attempt).");
      const hints = new Map();
      const formats = [
          DecodeHintType.EAN_13, DecodeHintType.EAN_8, DecodeHintType.CODE_128,
          DecodeHintType.QR_CODE, DecodeHintType.DATA_MATRIX, DecodeHintType.UPC_A,
          DecodeHintType.UPC_E, DecodeHintType.CODE_39, DecodeHintType.CODE_93,
          DecodeHintType.ITF, DecodeHintType.PDF_417, DecodeHintType.AZTEC,
      ];
      hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
      hints.set(DecodeHintType.TRY_HARDER, true);
      try {
        currentReader = new BrowserMultiFormatReader(hints);
        // Check if the method exists immediately after instantiation
        if (typeof currentReader.decodeFromCanvas !== 'function') {
            console.error("BarcodeScanner (Image): CRITICAL - decodeFromCanvas method NOT FOUND on new reader instance.", currentReader);
            throw new Error("decodeFromCanvas method missing on BrowserMultiFormatReader instance.");
        }
        codeReaderRef.current = currentReader; // Store it in the ref
        console.log("BarcodeScanner (Image): ZXing Reader initialized and decodeFromCanvas method confirmed:", currentReader);
      } catch (initError: any) {
        console.error("BarcodeScanner (Image): CRITICAL - Failed to initialize BrowserMultiFormatReader", initError);
        setStatus("error");
        setErrorMessage(`Failed to initialize barcode reader: ${initError.message}`);
        if (onScanErrorRef.current) onScanErrorRef.current(new Error(`Failed to initialize barcode reader: ${initError.message}`));
        toast({ variant: "destructive", title: "Scanner Critical Error", description: `Reader could not be created: ${initError.message}` });
        return;
      }
    }
    
    // Final check before using currentReader
    if (!currentReader || typeof currentReader.decodeFromCanvas !== 'function') {
      console.error("BarcodeScanner (Image): CRITICAL - Reader is invalid or decodeFromCanvas is not a function just before use. Reader object:", currentReader);
      setStatus("error");
      setErrorMessage("Barcode reader is not working correctly. Please try reopening the scanner or report this issue.");
      if (onScanErrorRef.current) onScanErrorRef.current(new Error("Barcode reader method unavailable post-initialization."));
      toast({ variant: "destructive", title: "Scanner Critical Error", description: "Reader method is missing after init attempt." });
      return;
    }

    try {
      console.log("BarcodeScanner (Image): Attempting to decode from canvas...");
      const result = await currentReader.decodeFromCanvas(canvasNode);
      const scannedText = result.getText();
      console.log("BarcodeScanner (Image): Scan successful! Value:", scannedText);
      setLastScannedValue(scannedText);
      setStatus("scan_success_image");
      
      setTimeout(() => {
        if (isOpen) { // Check if modal is still open before calling success and closing
          onScanSuccessRef.current(scannedText);
          toast({ title: "Barcode Scanned!", description: `Value: ${scannedText}` });
          onOpenChangeRef.current(false);
        }
      }, 1000); // Show success briefly

    } catch (error: any) {
      if (!isOpen) { // If modal closed during decode, just log and exit
          console.log("BarcodeScanner (Image): Modal closed during decoding.");
          return;
      }
      if (error instanceof NotFoundException) {
        console.log("BarcodeScanner (Image): No barcode found in captured image.");
        setStatus("scan_failed_image");
        setErrorMessage("No barcode found in the image. Please adjust camera and try again.");
        toast({ variant: "default", title: "Scan Attempt", description: "No barcode detected in the captured image." });
      } else {
        console.error("BarcodeScanner (Image): Error during decodeFromCanvas:", error);
        setStatus("error");
        setErrorMessage(`Error decoding barcode: ${error.message}`);
        if (onScanErrorRef.current) onScanErrorRef.current(error);
        toast({ variant: "destructive", title: "Decoding Error", description: error.message });
      }
      // Allow user to try again by resetting to preview_active after a short delay if scan failed
      // This state transition is now handled by the "Try Capture Again" button visibility
    }
  };


  let statusOverlayContent = null;
  switch (status) {
    case "requesting_permission":
    case "permission_granted": // Intermediate state, usually brief
    case "initializing_video":
    case "capturing_image":
    case "decoding_image":
      statusOverlayContent = (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-primary-foreground p-4 text-center z-10">
          <Loader2 className="h-10 w-10 text-primary/80 animate-spin mb-3" />
          <p className="text-sm px-2">
            {status === 'requesting_permission' ? 'Requesting camera permission...' :
             status === 'permission_granted' ? 'Permission granted, starting camera...' :
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
        </div>
      );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) { // If dialog is being closed
          stopEverything();
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
                autoPlay={false}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
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
            {errorMessage && (status === 'error' || status === 'camera_error') && !statusOverlayContent && (
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
