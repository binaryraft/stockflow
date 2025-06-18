
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
  | "permission_denied"
  | "no_camera_found"
  | "camera_error"
  | "initializing_video"
  | "video_ready"
  | "scanner_initializing"
  | "scanning"
  | "scan_success_briefly"
  | "error";

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

  const stopEverything = useCallback(() => {
    if (scannerControlsRef.current) {
      try { scannerControlsRef.current.stop(); } catch (e) { console.warn("Minor error stopping scanner controls:", e); }
      scannerControlsRef.current = null;
    }
    if (codeReaderRef.current) {
      try { codeReaderRef.current.reset(); } catch (e) { console.warn("Minor error resetting code reader:", e); }
      // Keep codeReaderRef.current instance for potential reuse if modal reopens quickly
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
    // Keep errorMessage if it's from a persistent error state. It will be cleared on next open.
  }, [status]); // status included to make decision on resetting it

  useEffect(() => {
    if (!isOpen) {
      stopEverything();
      return;
    }

    // Initialize ZXing reader instance if not already done.
    // Consider specific hints for better performance if needed.
    if (!codeReaderRef.current) {
        const hints = new Map();
        const formats = [
            DecodeHintType.EAN_13, DecodeHintType.EAN_8, DecodeHintType.CODE_128,
            DecodeHintType.QR_CODE, DecodeHintType.DATA_MATRIX, DecodeHintType.UPC_A,
            DecodeHintType.UPC_E, DecodeHintType.CODE_39, DecodeHintType.CODE_93,
            DecodeHintType.ITF, DecodeHintType.PDF_417, DecodeHintType.AZTEC,
        ];
        hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
        hints.set(DecodeHintType.TRY_HARDER, true); // Can increase scan success but might impact performance
        codeReaderRef.current = new BrowserMultiFormatReader(hints, 200); // Scan interval: 200ms
    }

    const initializeCameraAndScanner = async () => {
      setStatus("requesting_permission");
      setErrorMessage("Requesting camera permission...");
      setLastScannedValue(null);

      // Brief delay to allow modal and video element to render.
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!isOpen) { stopEverything(); return; }

      if (!videoRef.current) {
        setStatus("error");
        setErrorMessage("Video element reference is not available. Modal might not be fully rendered.");
        if (onScanError) onScanError(new Error("Video element ref missing."));
        stopEverything();
        return;
      }
      const currentVideoElement = videoRef.current;

      // 1. Request Camera Permission and Get Stream
      try {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!isOpen) { stopEverything(); return; }
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
        if (onScanError) onScanError(new Error(userMessage));
        toast({ variant: "destructive", title: "Camera Access Error", description: userMessage, duration: 7000 });
        stopEverything();
        return;
      }

      // 2. Attach Stream and Play Video
      if (!videoRef.current || !mediaStreamRef.current) { // Re-check after await
        setStatus("error");
        setErrorMessage("Video element or media stream became unavailable after permission grant.");
        if (onScanError) onScanError(new Error("Video or stream lost post-permission."));
        stopEverything();
        return;
      }
      videoRef.current.srcObject = mediaStreamRef.current;
      setStatus("initializing_video");
      setErrorMessage("Starting camera feed...");

      try {
        await videoRef.current.play();
        if (!isOpen) { stopEverything(); return; }
        setStatus("video_ready"); // Video is playing, now check dimensions.
        setErrorMessage("Camera active. Verifying stream...");
      } catch (playError: any) {
        if (!isOpen) { stopEverything(); return; }
        setStatus("camera_error");
        const detailedPlayErrorMessage = `Failed to play video stream: ${playError.message}.`;
        setErrorMessage(detailedPlayErrorMessage);
        if (onScanError) onScanError(new Error(detailedPlayErrorMessage));
        toast({ variant: "destructive", title: "Camera Playback Error", description: detailedPlayErrorMessage, duration: 7000 });
        stopEverything();
        return;
      }

      // 3. Ensure Video Dimensions are Valid before starting ZXing
      // Wait a bit for metadata like videoWidth/Height to be available
      let attempts = 0;
      const maxAttempts = 20; // Wait up to 2 seconds (20 * 100ms)
      while (attempts < maxAttempts) {
        if (!isOpen || !videoRef.current) { stopEverything(); return; }
        if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
          break; 
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!isOpen || !videoRef.current) { stopEverything(); return; } // Check again after loop

      if (!(videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0)) {
        setStatus("camera_error");
        setErrorMessage("Failed to get valid video dimensions. Camera stream might be corrupted or not fully initialized.");
        if (onScanError) onScanError(new Error("Invalid video dimensions."));
        toast({ variant: "destructive", title: "Camera Stream Error", description: "Could not get valid video dimensions.", duration: 7000 });
        stopEverything();
        return;
      }
      
      setStatus("scanner_initializing");
      setErrorMessage("Initializing barcode scanner...");

      // 4. Start ZXing Decoding
      if (!codeReaderRef.current) { // Should have been initialized earlier
        setStatus("error");
        setErrorMessage("Code reader not initialized.");
        if (onScanError) onScanError(new Error("Code reader missing."));
        stopEverything();
        return;
      }

      try {
        scannerControlsRef.current = await codeReaderRef.current.decodeFromVideoElement(
          videoRef.current,
          (result, error, controls) => {
            if (!isOpen) return; 

            if (result) {
              setStatus('scan_success_briefly');
              setLastScannedValue(result.getText());
              setTimeout(() => {
                if (isOpen) {
                    onScanSuccess(result.getText());
                    onOpenChange(false); // This will trigger cleanup via useEffect
                }
              }, 300); // Briefly show success
            }
            
            if (error && !(error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException)) {
              console.warn('Barcode scan error (non-critical, ZXing):', error);
              // Avoid setting persistent error message for these common scanning fluctuations
              // You might want to add a subtle UI indicator if scanning is having trouble.
            }
          }
        );
        if (!isOpen) { stopEverything(); return; }
        setStatus('scanning');
        setErrorMessage(null); // Clear "initializing scanner"
      } catch (zxingError: any) {
        if (!isOpen) { stopEverything(); return; }
        setStatus('error'); // More generic error for ZXing init issues
        const zxingErrorMessage = `Failed to start barcode scanner: ${zxingError.message}.`;
        setErrorMessage(zxingErrorMessage);
        if (onScanError) onScanError(new Error(zxingErrorMessage));
        toast({ variant: "destructive", title: "Scanner Error", description: zxingErrorMessage, duration: 7000 });
        stopEverything();
      }
    };

    initializeCameraAndScanner();

    return () => {
      stopEverything();
    };
  // Ensure onOpenChange, onScanSuccess, onScanError are stable if passed as props
  }, [isOpen, onOpenChange, onScanSuccess, onScanError, stopEverything, toast]);


  let statusOverlayContent = null;
  switch (status) {
    case "requesting_permission":
    case "initializing_video":
    case "scanner_initializing":
      statusOverlayContent = (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-primary-foreground p-4 text-center z-10">
          <Loader2 className="h-10 w-10 text-primary/80 animate-spin mb-3" />
          <p className="text-sm px-2">{errorMessage || "Initializing..."}</p>
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
    case "video_ready": // Intermediate state, video is playing, waiting for ZXing
       statusOverlayContent = (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-primary-foreground p-4 text-center z-10">
          <CheckCircle2 className="h-10 w-10 text-green-400 mb-2" />
          <p className="text-sm mt-1 px-2">{errorMessage || "Camera ready. Initializing scanner..."}</p>
        </div>
      );
      break;
    case "scanning":
      statusOverlayContent = (
        <>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className={cn(
                "w-3/4 h-1/2 border-2 border-primary/60 rounded-lg",
                "animate-pulse-border" // Custom animation if needed
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
    default: // idle or other non-overlay states
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
        if (!open) stopEverything();
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
                playsInline
                muted
                autoPlay={false} // Autoplay can be problematic; we explicitly call play()
              />
              {statusOverlayContent}
              {/* Fallback UI if video doesn't load and no specific error message shown by status overlay */}
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
    