
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
  | "permission_granted"
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

  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
    onScanErrorRef.current = onScanError;
  }, [onScanSuccess, onScanError]);

  const stopEverything = useCallback(() => {
    if (scannerControlsRef.current) {
      try { scannerControlsRef.current.stop(); } catch (e) { console.warn("Minor error stopping scanner controls:", e); }
      scannerControlsRef.current = null;
    }
    if (codeReaderRef.current) {
      try { codeReaderRef.current.reset(); } catch (e) { console.warn("Minor error resetting code reader:", e); }
      // codeReaderRef.current = null; // Optionally nullify to re-create on next open
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject = null;
    }
    // Only reset status if it's not a persistent error state we want the user to see briefly upon close.
    if (status !== 'permission_denied' && status !== 'no_camera_found' && status !== 'camera_error' && status !== 'error') {
      setStatus("idle");
    }
    setLastScannedValue(null);
  }, [status]); // status is included to decide if it should be reset to idle.

  useEffect(() => {
    if (!isOpen) {
      stopEverything();
      return;
    }

    const initializeCameraAndScanner = async () => {
      setStatus("requesting_permission");
      setErrorMessage("Requesting camera permission...");
      setLastScannedValue(null);

      // Give React a moment to render the modal and video element
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!isOpen) { stopEverything(); return; } // Modal might have closed during the delay

      if (!videoRef.current) {
        setStatus("error");
        const errMessage = "Video element reference is not available. Modal might not be fully rendered.";
        setErrorMessage(errMessage);
        if (onScanErrorRef.current) onScanErrorRef.current(new Error(errMessage));
        stopEverything();
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
        codeReaderRef.current = new BrowserMultiFormatReader(hints, 200);
      }

      // 1. Request Camera Permission and Get Stream
      try {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!isOpen || !videoRef.current) { stopEverything(); return; }
        setStatus("permission_granted");
        setErrorMessage(null);
      } catch (err: any) {
        if (!isOpen) { stopEverything(); return; }
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
        stopEverything(); // Ensure cleanup on error
        return;
      }

      // 2. Attach Stream and Play Video
      if (!videoRef.current || !mediaStreamRef.current) {
        setStatus("error");
        const errMessage = "Video element or media stream became unavailable after permission grant.";
        setErrorMessage(errMessage);
        if (onScanErrorRef.current) onScanErrorRef.current(new Error(errMessage));
        stopEverything();
        return;
      }
      videoRef.current.srcObject = mediaStreamRef.current;
      setStatus("initializing_video");
      setErrorMessage("Starting camera feed...");

      try {
        await videoRef.current.play();
        if (!isOpen || !videoRef.current) { stopEverything(); return; }
        // videoRef.current.onloadedmetadata is not strictly needed if play() succeeds and dimensions are checked
      } catch (playError: any) {
        if (!isOpen) { stopEverything(); return; }
        setStatus("camera_error");
        const detailedPlayErrorMessage = `Failed to play video stream: ${playError.message}. Check browser console for details.`;
        setErrorMessage(detailedPlayErrorMessage);
        if (onScanErrorRef.current) onScanErrorRef.current(new Error(detailedPlayErrorMessage));
        toast({ variant: "destructive", title: "Camera Playback Error", description: detailedPlayErrorMessage, duration: 7000 });
        stopEverything();
        return;
      }
      
      // 3. Ensure Video Dimensions are Valid
      let attempts = 0;
      const maxAttempts = 20; // Wait up to 2 seconds (20 * 100ms)
      while (attempts < maxAttempts) {
        if (!isOpen || !videoRef.current) { stopEverything(); return; }
        if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
          setStatus("video_ready");
          setErrorMessage(null); // Clear "Starting camera feed..."
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!isOpen || !videoRef.current) { stopEverything(); return; }

      if (!(videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0)) {
        setStatus("camera_error");
        const errMessage = "Failed to get valid video dimensions. Camera stream might be corrupted or not fully initialized.";
        setErrorMessage(errMessage);
        if (onScanErrorRef.current) onScanErrorRef.current(new Error(errMessage));
        toast({ variant: "destructive", title: "Camera Stream Error", description: errMessage, duration: 7000 });
        stopEverything();
        return;
      }
      
      // 4. Start ZXing Decoding
      if (!codeReaderRef.current || !videoRef.current) {
        setStatus("error");
        const errMessage = "Code reader or video element became unavailable before scanning.";
        setErrorMessage(errMessage);
        if (onScanErrorRef.current) onScanErrorRef.current(new Error(errMessage));
        stopEverything();
        return;
      }
      
      setStatus("scanner_initializing");
      setErrorMessage("Initializing barcode scanner...");

      try {
        scannerControlsRef.current = await codeReaderRef.current.decodeFromVideoElement(
          videoRef.current,
          (result, error, controls) => {
            if (!isOpen) { // If modal closed during scan callback
              if (scannerControlsRef.current === controls) { // Ensure we only stop our own controls
                stopEverything();
              }
              return;
            }

            if (result) {
              setStatus('scan_success_briefly');
              setLastScannedValue(result.getText());
              setTimeout(() => {
                if (isOpen) { // Check again before calling success and closing
                    onScanSuccessRef.current(result.getText());
                    onOpenChange(false); // This will trigger cleanup via useEffect
                }
              }, 300);
            }
            
            if (error && !(error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException)) {
              console.warn('Barcode scan error (non-critical, ZXing):', error);
              // Potentially update UI to show transient scanning issues without full error state
            }
          }
        );
        if (!isOpen) { stopEverything(); return; }
        setStatus('scanning');
        setErrorMessage(null); // Clear "initializing scanner"
      } catch (zxingError: any) {
        if (!isOpen) { stopEverything(); return; }
        setStatus('error');
        const zxingErrorMessage = `Failed to start barcode scanner: ${zxingError.message}.`;
        setErrorMessage(zxingErrorMessage);
        if (onScanErrorRef.current) onScanErrorRef.current(new Error(zxingErrorMessage));
        toast({ variant: "destructive", title: "Scanner Error", description: zxingErrorMessage, duration: 7000 });
        stopEverything();
      }
    };

    initializeCameraAndScanner();

    return () => {
      stopEverything();
    };
  }, [isOpen, onOpenChange, stopEverything, toast]); // Dependencies now only include isOpen and stable callbacks/refs

  let statusOverlayContent = null;
  switch (status) {
    case "requesting_permission":
    case "initializing_video":
    case "scanner_initializing":
    case "video_ready": // Added video_ready here for consistent loading feedback
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
                 animation: status === 'scanning' ? 'pulseBorder 1.5s infinite ease-in-out' : 'none'
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
        if (!open) stopEverything(); // Ensure cleanup when modal is closed by any means
        onOpenChange(open);
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
