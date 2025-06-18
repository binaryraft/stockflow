
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScanLine, Loader2, CameraOff, CheckCircle, ShieldAlert, Video } from 'lucide-react';
import { BrowserMultiFormatReader, NotFoundException, ChecksumException, FormatException, type IScannerControls } from '@zxing/library';
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
  | "no_camera"
  | "starting_camera"
  | "waiting_for_metadata"
  | "camera_error"
  | "scanner_ready"
  | "scanning"
  | "scan_success_briefly";

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
      // Do not nullify codeReaderRef.current itself, it might be needed if modal reopens quickly
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject = null;
    }
    // Reset status only if it's not an error state that should persist briefly for user to see
    if (status !== 'permission_denied' && status !== 'no_camera' && status !== 'camera_error') {
      setStatus("idle");
    }
    // Do not clear errorMessage here if it's from a persistent error state.
    // It will be cleared when re-initializing.
    setLastScannedValue(null);
  }, [status]); // status is needed here to decide if we reset it.

  useEffect(() => {
    if (!isOpen) {
      stopEverything();
      return;
    }

    // Initialize ZXing reader instance if not already done
    if (!codeReaderRef.current) {
      codeReaderRef.current = new BrowserMultiFormatReader(undefined, 200); // Scan interval hints
    }

    const initializeCameraAndScanner = async () => {
      setStatus('initializing'); // Combined init and permission request visually
      setErrorMessage("Requesting camera permission...");
      setLastScannedValue(null);


      // Give a brief moment for the modal and video element to render.
      await new Promise(resolve => setTimeout(resolve, 50));
      if (!isOpen) { stopEverything(); return; } // Modal closed during the brief delay


      if (!videoRef.current) {
        setStatus('camera_error');
        setErrorMessage("Video element reference is not available. Modal might not be fully rendered.");
        if (onScanError) onScanError(new Error("Video element ref missing."));
        return;
      }
      const currentVideoElement = videoRef.current;

      // --- Stage 1: Camera Permission & Stream ---
      try {
        setStatus('requesting_permission'); // More specific status
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!isOpen) { stopEverything(); return; }
        setStatus('permission_granted');
        setErrorMessage(null); // Clear "requesting permission" message
      } catch (err: any) {
        if (!isOpen) { stopEverything(); return; }
        let userMessage = 'Could not access camera.';
        let newStatus: ScannerStatus = 'camera_error';

        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          userMessage = 'Camera permission denied. Please enable camera access in your browser settings and try again.';
          newStatus = 'permission_denied';
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          userMessage = 'No camera found. Please ensure a camera is connected and not in use by another application.';
          newStatus = 'no_camera';
        } else if (err.name === "NotReadableError" || err.name === "SourceUnavailableError" || err.name === "TrackStartError") {
          userMessage = 'Camera is already in use, unreadable, or selected settings are not supported. Try closing other apps using the camera.';
        }
        
        setStatus(newStatus);
        setErrorMessage(userMessage);
        if (onScanError) onScanError(new Error(userMessage));
        toast({ variant: "destructive", title: "Camera Access Error", description: userMessage, duration: 7000 });
        stopEverything(); // stopEverything will now preserve the error status for display
        return;
      }

      // --- Stage 2: Attach Stream and Play Video ---
      if (!currentVideoElement || !mediaStreamRef.current) {
        setStatus('camera_error');
        setErrorMessage("Video element or media stream became unavailable after permission grant.");
        if (onScanError) onScanError(new Error("Video element or media stream unavailable post-permission."));
        stopEverything();
        return;
      }

      currentVideoElement.srcObject = mediaStreamRef.current;
      try {
        setStatus('starting_camera');
        setErrorMessage("Starting camera feed...");
        await currentVideoElement.play();
        if (!isOpen) { stopEverything(); return; }
        setErrorMessage(null); // Clear "starting camera" message
      } catch (playError: any) {
        if (!isOpen) { stopEverything(); return; }
        setStatus('camera_error');
        const detailedPlayErrorMessage = `Failed to play video stream: ${playError.message}. Ensure camera is not obstructed, in use by another app, or that the browser has necessary codecs.`;
        setErrorMessage(detailedPlayErrorMessage);
        if (onScanError) onScanError(new Error(detailedPlayErrorMessage));
        toast({ variant: "destructive", title: "Camera Playback Error", description: detailedPlayErrorMessage, duration: 7000 });
        stopEverything();
        return;
      }

      // --- Stage 3: Wait for Video Metadata and Check Dimensions ---
      try {
        setStatus('waiting_for_metadata');
        setErrorMessage("Camera started, verifying video dimensions...");
        await new Promise<void>((resolve, reject) => {
          if (!currentVideoElement) { reject(new Error("Video element lost before metadata.")); return; }
          
          const onLoadedMetadata = () => {
            cleanupListeners();
            if (currentVideoElement.videoWidth > 0 && currentVideoElement.videoHeight > 0) {
              resolve();
            } else {
              reject(new Error("Video dimensions are zero after metadata loaded."));
            }
          };
          const onVideoElementError = (ev: Event) => {
            cleanupListeners();
            reject(new Error(`Video element error: ${ (ev.target as HTMLVideoElement)?.error?.message || 'Unknown video error'}`));
          };
          const cleanupListeners = () => {
            currentVideoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
            currentVideoElement.removeEventListener('error', onVideoElementError);
          };

          currentVideoElement.addEventListener('loadedmetadata', onLoadedMetadata);
          currentVideoElement.addEventListener('error', onVideoElementError);

          // Fallback timeout if loadedmetadata doesn't fire
          const timeoutId = setTimeout(() => {
            cleanupListeners();
            if (currentVideoElement.videoWidth > 0 && currentVideoElement.videoHeight > 0) {
              resolve();
            } else {
              reject(new Error("Timeout waiting for video metadata; dimensions still zero."));
            }
          }, 3000); // 3-second timeout

          // If dimensions are already available (e.g., play() implies metadata for some browsers)
          if (currentVideoElement.videoWidth > 0 && currentVideoElement.videoHeight > 0) {
            clearTimeout(timeoutId);
            cleanupListeners();
            resolve();
          }
        });

        if (!isOpen) { stopEverything(); return; }
        setErrorMessage(null); // Clear "waiting for metadata"
      } catch (metadataError: any) {
        if (!isOpen) { stopEverything(); return; }
        setStatus('camera_error');
        setErrorMessage(`Failed to get valid video dimensions: ${metadataError.message}`);
        if (onScanError) onScanError(new Error(`Video metadata/dimensions error: ${metadataError.message}`));
        toast({ variant: "destructive", title: "Camera Stream Error", description: `Could not get valid video dimensions: ${metadataError.message}`, duration: 7000 });
        stopEverything();
        return;
      }
      
      // --- Stage 4: Start ZXing Decoding ---
      if (!codeReaderRef.current || !currentVideoElement || !(currentVideoElement.videoWidth > 0) || !(currentVideoElement.videoHeight > 0)) {
        setStatus('camera_error');
        setErrorMessage("Scanner or video element became unready before decoding could start.");
        if (onScanError) onScanError(new Error("Scanner or video element unready for ZXing."));
        stopEverything();
        return;
      }
      
      setStatus('scanner_ready'); // Indicate scanner is about to start
      try {
        scannerControlsRef.current = await codeReaderRef.current.decodeFromVideoElement(
          currentVideoElement,
          (result, error, controls) => { // error is ZxingError, controls is IScannerControls
            if (!isOpen) return; 

            if (result) {
              setStatus('scan_success_briefly');
              setLastScannedValue(result.getText());
              // Delay calling onScanSuccess to show the scanned value briefly
              setTimeout(() => {
                if (isOpen) { // Check again before calling, modal might close
                    onScanSuccess(result.getText());
                    onOpenChange(false); // This will trigger cleanup via useEffect
                }
              }, 500); // Show for 0.5 seconds
            }
            
            if (error && !(error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException)) {
              console.warn('Barcode scan error (non-critical, ZXing):', error);
              // Avoid setting a persistent error message for these common scanning fluctuations
            }
          }
        );
        if (!isOpen) { stopEverything(); return; }
        setStatus('scanning'); // Now officially scanning
      } catch (zxingError: any) {
        if (!isOpen) { stopEverything(); return; }
        setStatus('camera_error'); // Could be a 'scanner_error' status
        const zxingErrorMessage = `Failed to start barcode scanner: ${zxingError.message}. This might be due to camera compatibility or a library issue.`;
        setErrorMessage(zxingErrorMessage);
        if (onScanError) onScanError(new Error(zxingErrorMessage));
        toast({ variant: "destructive", title: "Scanner Initialization Error", description: zxingErrorMessage, duration: 7000 });
        stopEverything();
      }
    };

    initializeCameraAndScanner();

    return () => {
      stopEverything();
    };
  // IMPORTANT: `stopEverything` and `toast` are memoized or stable. `onScanSuccess`, `onScanError`, `onOpenChange` must be stable from parent.
  }, [isOpen, onOpenChange, onScanSuccess, onScanError, stopEverything, toast]);


  let statusOverlayContent;
  switch (status) {
    case "initializing":
    case "requesting_permission":
      statusOverlayContent = (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-primary-foreground p-4 text-center">
          <Loader2 className="h-10 w-10 text-primary/80 animate-spin" />
          <p className="text-sm mt-2 px-2">{errorMessage || "Initializing scanner..."}</p>
        </div>
      );
      break;
    case "permission_denied":
    case "no_camera":
    case "camera_error":
      statusOverlayContent = (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4 text-center">
            <Alert variant="destructive" className="m-4 text-destructive-foreground bg-destructive/80 border-destructive-foreground/30 max-w-sm">
              <CameraOff className="h-5 w-5" />
              <AlertTitle className="font-semibold">Camera or Scanner Error</AlertTitle>
              <AlertDescription className="text-xs">{errorMessage || "An unknown error occurred."}</AlertDescription>
            </Alert>
        </div>
      );
      break;
    case "permission_granted":
    case "starting_camera":
    case "waiting_for_metadata":
      statusOverlayContent = (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-primary-foreground p-4 text-center">
          <Video className="h-10 w-10 text-primary/80 mb-2" />
          <p className="text-sm mt-1 px-2">{errorMessage || "Preparing camera..."}</p>
        </div>
      );
      break;
    case "scanner_ready": // Brief state before 'scanning' if all goes well
      statusOverlayContent = (
         <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-primary-foreground p-4 text-center">
          <CheckCircle className="h-8 w-8 text-green-400 mb-2" />
          <p className="text-xs mt-1">Camera active. Scanner ready.</p>
        </div>
      );
      break;
    case "scanning":
      statusOverlayContent = (
        <>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-3/4 h-1/2 border-2 border-primary/60 rounded-lg animate-pulse" style={{ animationDuration: '1.5s', boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }}></div>
          </div>
          <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white bg-black/50 px-2 py-0.5 rounded">
            Position barcode within the frame.
          </p>
        </>
      );
      break;
     case "scan_success_briefly":
      statusOverlayContent = (
        <>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-3/4 h-1/2 border-2 border-green-500 rounded-lg shadow-2xl" style={{boxShadow: '0 0 0 9999px rgba(0,128,0,0.2)' }}></div>
          </div>
           {lastScannedValue && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-green-600 text-white px-3 py-1 rounded-md text-sm font-semibold shadow-lg">
              Scanned: {lastScannedValue}
            </div>
          )}
        </>
      );
      break;
    default: // idle
      statusOverlayContent = null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) stopEverything(); // Ensure cleanup if closed via X or overlay click
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md p-0 border-t-4 border-primary shadow-xl">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" /> Scan Product Barcode
          </DialogTitle>
        </DialogHeader>
        <div className="p-1 sm:p-2 space-y-2"> {/* Reduced padding slightly */}
          <div className="relative w-full aspect-[4/3] bg-muted rounded-md overflow-hidden shadow-inner">
            <video
              ref={videoRef}
              className="w-full h-full object-cover" // Ensures video covers the area
              playsInline // Important for mobile
              muted // Often required for autoplay
            />
            {statusOverlayContent}
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
  );
}

