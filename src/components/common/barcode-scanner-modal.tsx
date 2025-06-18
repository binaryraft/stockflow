
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScanLine, Loader2, VideoOff, CameraOff, CheckCircle2, AlertTriangle } from 'lucide-react';
import { BrowserMultiFormatReader, NotFoundException, ChecksumException, FormatException, type IScannerControls, DecodeHintType } from '@zxing/library';
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
  | "permission_granted" // Permission obtained, camera not yet necessarily active
  | "permission_denied"
  | "no_camera_found"
  | "camera_error" // General camera issues (not permission, not found)
  | "initializing_video" // Stream obtained, trying to play
  | "video_ready" // Video playing, metadata loaded, ready for ZXing
  | "scanner_initializing" // ZXing attempting to start
  | "scanning"
  | "scan_success_briefly"
  | "error"; // Generic error not covered by specific camera errors

export function BarcodeScannerModal({
  isOpen,
  onOpenChange,
  onScanSuccess,
  onScanError,
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastScannedValue, setLastScannedValue] = useState<string | null>(null);

  // Store latest callbacks in refs to prevent useEffect re-runs if parent doesn't memoize them
  const onScanSuccessRef = useRef(onScanSuccess);
  const onScanErrorRef = useRef(onScanError);
  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);
  useEffect(() => {
    onScanErrorRef.current = onScanError;
  }, [onScanError]);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);


  const stopEverything = useCallback(() => {
    if (scannerControlsRef.current) {
      try { scannerControlsRef.current.stop(); } catch (e) { console.warn("Minor error stopping scanner controls:", e); }
      scannerControlsRef.current = null;
    }
    if (codeReaderRef.current) {
      try { codeReaderRef.current.reset(); } catch (e) { console.warn("Minor error resetting code reader:", e); }
      // Keep codeReaderRef.current instance for next open to avoid re-creating hints map
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject = null;
    }
    // Reset status only if it's not a persistent error state meant to be seen briefly upon close.
    if (status !== 'permission_denied' && status !== 'no_camera_found' && status !== 'camera_error' && status !== 'error') {
      setStatus("idle");
    }
    setLastScannedValue(null);
    // Don't clear errorMessage here if it's a persistent error state from above
  }, [status]); // status is included to decide if it should be reset to idle.

  useEffect(() => {
    if (!isOpen) {
      stopEverything();
      return;
    }

    let isActive = true; // Flag to manage async operations against component unmount/re-run

    const initializeCameraAndScanner = async () => {
      if (!isActive) return;
      setStatus("requesting_permission");
      setErrorMessage("Requesting camera permission...");
      setLastScannedValue(null);

      // Give React a moment to render the modal and video element
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!isActive || !isOpen) { stopEverything(); return; }

      if (!videoRef.current) {
        if (!isActive) return;
        setStatus("error");
        const errMessage = "Video element reference is not available. Modal might not be fully rendered.";
        setErrorMessage(errMessage);
        if (onScanErrorRef.current) onScanErrorRef.current(new Error(errMessage));
        // stopEverything(); // Cleanup will handle if !isActive
        return;
      }

      // Initialize ZXing reader instance if not already done
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
        codeReaderRef.current = new BrowserMultiFormatReader(hints, 200); // 200ms scan interval
      }

      // 1. Request Camera Permission and Get Stream
      try {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!isActive || !isOpen || !videoRef.current) { /* stopEverything(); */ return; }
        setStatus("permission_granted");
        setErrorMessage(null);
      } catch (err: any) {
        if (!isActive || !isOpen) { /* stopEverything(); */ return; }
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
        // stopEverything(); // Cleanup will handle
        return;
      }

      if (!isActive || !isOpen || !videoRef.current || !mediaStreamRef.current) { /* stopEverything(); */ return; }
      videoRef.current.srcObject = mediaStreamRef.current;
      setStatus("initializing_video");
      setErrorMessage("Starting camera feed...");

      try {
        await videoRef.current.play();
        if (!isActive || !isOpen || !videoRef.current) { /* stopEverything(); */ return; }
      } catch (playError: any) {
        if (!isActive || !isOpen) { /* stopEverything(); */ return; }
        setStatus("camera_error");
        const detailedPlayErrorMessage = `Failed to play video stream: ${playError.message}. Ensure camera is not in use by another app.`;
        setErrorMessage(detailedPlayErrorMessage);
        if (onScanErrorRef.current) onScanErrorRef.current(new Error(detailedPlayErrorMessage));
        toast({ variant: "destructive", title: "Camera Playback Error", description: detailedPlayErrorMessage, duration: 7000 });
        // stopEverything(); // Cleanup will handle
        return;
      }
      
      if (!isActive || !isOpen || !videoRef.current) { /* stopEverything(); */ return; }
      let attempts = 0;
      const maxAttempts = 30; // Wait up to 3 seconds (30 * 100ms)
      while (attempts < maxAttempts) {
        if (!isActive || !isOpen || !videoRef.current) { /* stopEverything(); */ return; }
        if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
          setStatus("video_ready");
          setErrorMessage(null);
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!isActive || !isOpen || !videoRef.current) { /* stopEverything(); */ return; }
      if (!(videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0)) {
        setStatus("camera_error");
        const errMessage = "Failed to get valid video dimensions. Camera stream might be corrupted or not fully initialized.";
        setErrorMessage(errMessage);
        if (onScanErrorRef.current) onScanErrorRef.current(new Error(errMessage));
        toast({ variant: "destructive", title: "Camera Stream Error", description: errMessage, duration: 7000 });
        // stopEverything(); // Cleanup will handle
        return;
      }
      
      if (!isActive || !isOpen || !codeReaderRef.current || !videoRef.current) { /* stopEverything(); */ return; }
      setStatus("scanner_initializing");
      setErrorMessage("Initializing barcode scanner...");

      try {
        // decodeFromVideoElement is preferred for continuous scanning from a video element
        scannerControlsRef.current = await codeReaderRef.current.decodeFromVideoElement(
          videoRef.current,
          (result, error, controls) => {
            if (!isActive || !isOpen) { // If modal closed or effect cleaned up during scan callback
              // No need to call stopEverything() here, as the main effect's cleanup will handle it.
              // Just prevent further processing.
              return;
            }

            if (result) {
              setStatus('scan_success_briefly');
              setLastScannedValue(result.getText());
              setTimeout(() => {
                if (isActive && isOpen) { // Check again before calling success and closing
                    onScanSuccessRef.current(result.getText());
                    onOpenChangeRef.current(false); 
                }
              }, 300); // Brief delay to show success
            }
            
            // Only log critical errors, not common NotFoundException
            if (error && !(error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException)) {
              console.warn('Barcode scan error (non-critical, ZXing):', error);
            }
          }
        );
        if (!isActive || !isOpen) { /* stopEverything(); */ return; }
        setStatus('scanning');
        setErrorMessage(null);
      } catch (zxingError: any) {
        if (!isActive || !isOpen) { /* stopEverything(); */ return; }
        setStatus('error');
        const zxingErrorMessage = `Failed to start barcode scanner: ${zxingError.message}.`;
        setErrorMessage(zxingErrorMessage);
        if (onScanErrorRef.current) onScanErrorRef.current(new Error(zxingErrorMessage));
        toast({ variant: "destructive", title: "Scanner Error", description: zxingErrorMessage, duration: 7000 });
        // stopEverything(); // Cleanup will handle
      }
    };

    initializeCameraAndScanner();

    return () => {
      isActive = false;
      stopEverything();
    };
  }, [isOpen, stopEverything, toast]);


  let statusOverlayContent = null;
  switch (status) {
    case "requesting_permission":
    case "initializing_video":
    case "scanner_initializing":
    case "video_ready":
      statusOverlayContent = (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-primary-foreground p-4 text-center z-10">
          <Loader2 className="h-10 w-10 text-primary/80 animate-spin mb-3" />
          <p className="text-sm px-2">{errorMessage || (status === "video_ready" ? "Camera ready. Initializing scanner..." : "Initializing...")}</p>
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
            <AlertTitle className="font-semibold">Scanner Error</AlertTitle>
            <AlertDescription className="text-xs">{errorMessage || "An unknown error occurred."}</AlertDescription>
          </Alert>
        </div>
      );
      break;
    case "scanning":
      statusOverlayContent = (
        <>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className={cn(
                "w-3/4 h-1/2 border-2 border-primary/60 rounded-lg",
                "animate-pulse-border" 
            )} 
            style={{ 
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
            }}></div>
          </div>
          <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white bg-black/60 px-2 py-1 rounded z-10">
            Point camera at a barcode
          </p>
        </>
      );
      break;
     case "scan_success_briefly":
      statusOverlayContent = (
        <>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-3/4 h-1/2 border-4 border-green-500 rounded-lg shadow-2xl" style={{boxShadow: '0 0 0 9999px rgba(0,128,0,0.2)' }}></div>
          </div>
           {lastScannedValue && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white px-3 py-1 rounded-md text-sm font-semibold shadow-lg z-10">
              Scanned: {lastScannedValue}
            </div>
          )}
        </>
      );
      break;
    default: 
      statusOverlayContent = null;
  }

  return (
    <>
      <style jsx global>{`
        @keyframes pulseBorder {
          0%, 100% { border-color: hsla(var(--primary-hsl) / 0.6); }
          50% { border-color: hsla(var(--primary-hsl) / 1); }
        }
        .animate-pulse-border {
          animation: pulseBorder 1.5s infinite ease-in-out;
        }
      `}</style>
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open && status !== "idle") { // If closing and not already idle (meaning stopEverything wasn't fully run by effect cleanup yet)
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
                playsInline // Important for mobile
                muted // Often required for autoplay without user gesture
                autoPlay={false} // Explicitly call play()
              />
              {statusOverlayContent}
              {(status === 'idle' || (status !== 'scanning' && status !== 'scan_success_briefly' && !errorMessage && !statusOverlayContent)) && 
               !mediaStreamRef.current && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-primary-foreground p-4 text-center z-10">
                  <VideoOff className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm">Camera preview will appear here.</p>
                </div>
              )}
            </div>
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
