
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScanLine, VideoOff, Loader2, CameraOff } from 'lucide-react';
import { BrowserMultiFormatReader, NotFoundException, ChecksumException, FormatException } from '@zxing/library';
import { useToast } from '@/hooks/use-toast';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: Error) => void;
}

export function BarcodeScannerModal({
  isOpen,
  onOpenChange,
  onScanSuccess,
  onScanError,
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const { toast } = useToast();

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isLoadingStream, setIsLoadingStream] = useState<boolean>(false);
  const [isScanningActive, setIsScanningActive] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stopScannerAndStream = useCallback(() => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      // codeReaderRef.current = null; // Consider if re-initialization is needed on reopen
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanningActive(false);
  }, []);

  // Effect 1: Camera Setup (permissions, stream, play)
  useEffect(() => {
    if (!isOpen) {
      stopScannerAndStream();
      setHasCameraPermission(null); // Reset permission status when closed
      setIsLoadingStream(false);
      setErrorMessage(null);
      return;
    }

    // Reset states for a fresh start each time the modal opens
    setIsLoadingStream(true);
    setHasCameraPermission(null);
    setErrorMessage("Requesting camera permission...");
    setIsScanningActive(false);

    const videoElement = videoRef.current;

    if (!videoElement) {
      setErrorMessage("Video element reference is not available. Modal might not be fully rendered.");
      setIsLoadingStream(false);
      return;
    }

    const localVideoRefCurrent = videoElement; // Capture ref for cleanup

    const handleCanPlay = async () => {
      if (!isOpen || !localVideoRefCurrent.srcObject) return;
      try {
        await localVideoRefCurrent.play();
        setHasCameraPermission(true);
        setIsLoadingStream(false);
        setErrorMessage(null); // Clear "requesting permission"
      } catch (playError: any) {
        console.error("Error playing video:", playError);
        if (!isOpen) return;
        setErrorMessage(`Could not play video stream: ${playError.message}`);
        setHasCameraPermission(false);
        setIsLoadingStream(false);
        stopScannerAndStream(); // Ensure stream is stopped on play error
      }
    };

    const handleVideoErrorEvent = (e: Event) => {
      console.error("Video element reported an error:", e);
      if (!isOpen) return;
      setErrorMessage("The video stream encountered an error. Please check camera connection or try again.");
      setHasCameraPermission(false);
      setIsLoadingStream(false);
      stopScannerAndStream();
    };

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!isOpen) { // Modal closed during/after permission
          stream.getTracks().forEach(track => track.stop());
          setIsLoadingStream(false);
          return;
        }

        if (localVideoRefCurrent) {
          localVideoRefCurrent.srcObject = stream;
          localVideoRefCurrent.addEventListener('canplay', handleCanPlay, { once: true });
          localVideoRefCurrent.addEventListener('error', handleVideoErrorEvent);
        } else {
            setErrorMessage("Video element became unavailable during setup.");
            setIsLoadingStream(false);
            stream.getTracks().forEach(track => track.stop());
        }

      } catch (permError: any) {
        if (!isOpen) return;
        let userMessage = 'Could not access camera.';
        if (permError.name === "NotAllowedError" || permError.name === "PermissionDeniedError") {
          userMessage = 'Camera permission denied. Please enable camera access in your browser settings.';
        } else if (permError.name === "NotFoundError" || permError.name === "DevicesNotFoundError") {
          userMessage = 'No camera found. Please ensure a camera is connected.';
        } else if (permError.name === "NotReadableError") {
          userMessage = 'Camera is already in use or unreadable. Try closing other apps using the camera.';
        } else if (permError.message) {
          userMessage += ` ${permError.message}`;
        }
        setErrorMessage(userMessage);
        toast({ variant: "destructive", title: "Camera Access Error", description: userMessage });
        setHasCameraPermission(false);
        setIsLoadingStream(false);
        if (onScanError) onScanError(permError);
      }
    };

    initCamera();

    return () => {
      stopScannerAndStream();
      if (localVideoRefCurrent) {
        localVideoRefCurrent.removeEventListener('canplay', handleCanPlay);
        localVideoRefCurrent.removeEventListener('error', handleVideoErrorEvent);
      }
    };
  }, [isOpen, stopScannerAndStream, toast, onScanError]);


  // Effect 2: ZXing Scanner Initialization and Operation
  useEffect(() => {
    if (!isOpen || !hasCameraPermission || isLoadingStream) {
      if (isScanningActive && codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
      setIsScanningActive(false);
      return;
    }

    const videoElement = videoRef.current;
    if (!videoElement) {
        setErrorMessage("Scanner initialization failed: Video element not found.");
        setIsScanningActive(false);
        return;
    }
    
    // Ensure video has dimensions before starting decoder
    if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        setErrorMessage("Waiting for video dimensions to initialize scanner...");
        // This state should ideally be resolved by the `canplay` and `play()` in Effect 1.
        // If it persists, it indicates a deeper issue with the stream or video element.
        // A short timeout to re-check, then fail if still no dimensions.
        const dimensionCheckTimeout = setTimeout(() => {
            if (isOpen && videoRef.current && (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0)) {
                setErrorMessage("Video stream has no valid dimensions. Cannot start scanner.");
                setHasCameraPermission(false); // Re-evaluate camera state
                setIsScanningActive(false);
            } else if (isOpen && videoRef.current && hasCameraPermission && !isLoadingStream && !isScanningActive) {
                // Dimensions became available, trigger re-run of this effect
                // This might cause a flicker, but ensures scanner starts if dimensions appear late
                setErrorMessage(null); // Clear the "waiting for dimensions" message
            }
        }, 700); // Increased timeout slightly
        return () => clearTimeout(dimensionCheckTimeout);
    }


    if (!codeReaderRef.current) {
      codeReaderRef.current = new BrowserMultiFormatReader(undefined, 500); // Added hints, timeout
    }
    const reader = codeReaderRef.current;

    if (isScanningActive) return; // Prevent re-starting if already active

    setIsScanningActive(true);
    setErrorMessage(null); // Clear any "waiting for dimensions" or previous messages

    reader.decodeFromVideoDevice(undefined, videoElement, (result, error) => {
      if (!isOpen || !isScanningActive) return;

      if (result) {
        onScanSuccess(result.getText());
        onOpenChange(false); // Close modal on success
      }
      if (error && !(error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException)) {
        console.error('Barcode scan error during continuous decoding:', error);
        setErrorMessage("Error during scanning. Try repositioning.");
        if (onScanError) onScanError(error);
      }
    }).catch(decodeSetupError => {
      console.error("Error setting up decoding from video device: ", decodeSetupError);
      if (!isOpen) return;
      setErrorMessage("Could not start barcode reader: " + (decodeSetupError as Error).message);
      if (onScanError) onScanError(decodeSetupError as Error);
      setHasCameraPermission(false);
      setIsScanningActive(false);
    });

    return () => {
      if (reader && isScanningActive) { // Only reset if it was actively scanning
        reader.reset();
      }
      setIsScanningActive(false);
    };
  }, [isOpen, hasCameraPermission, isLoadingStream, onScanSuccess, onOpenChange, onScanError, isScanningActive]);

  const getHelperText = () => {
    if (errorMessage) return null; // Error message takes precedence
    if (isLoadingStream) return "Initializing camera...";
    if (hasCameraPermission === null && !isLoadingStream) return "Requesting camera permission..."; // Before permission result
    if (hasCameraPermission && !isScanningActive && !isLoadingStream) return "Preparing scanner...";
    if (isScanningActive) return "Position barcode within the frame.";
    return "Scanner status unknown.";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 border-t-4 border-primary">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" /> Scan Barcode
          </DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-3">
          {errorMessage && (
            <Alert variant="destructive">
              <CameraOff className="h-4 w-4" />
              <AlertTitle>Scanner Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="relative w-full aspect-[4/3] bg-muted rounded-md overflow-hidden shadow-inner">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline // Essential for mobile
              muted // Often required for autoplay
              data-ai-hint="barcode scanner camera"
            />
            {/* Overlays for different states */}
            {(!hasCameraPermission && !errorMessage) || isLoadingStream ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-primary-foreground">
                <Loader2 className="h-10 w-10 text-primary/80 animate-spin" />
                <p className="text-sm mt-2">{isLoadingStream ? "Initializing camera..." : "Requesting permission..."}</p>
              </div>
            ) : hasCameraPermission === false && !isLoadingStream ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-destructive-foreground">
                <VideoOff className="h-10 w-10" />
                <p className="text-sm mt-2 text-center px-2">{errorMessage || "Camera access denied or unavailable."}</p>
              </div>
            ) : hasCameraPermission && !isScanningActive && !isLoadingStream && !errorMessage ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-primary-foreground">
                <Loader2 className="h-10 w-10 text-primary/80 animate-spin" />
                <p className="text-sm mt-2">Preparing scanner...</p>
              </div>
            ) : null}

            {hasCameraPermission && isScanningActive && !errorMessage && (
              <>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3/4 h-1/2 border-2 border-primary/60 rounded-lg animate-pulse" style={{ animationDuration: '2s' }}></div>
                </div>
              </>
            )}
          </div>
          {hasCameraPermission && !errorMessage && (
            <p className="text-center text-xs text-muted-foreground -mt-1">
              {getHelperText()}
            </p>
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

