
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScanLine, VideoOff, Loader2, CameraOff } from 'lucide-react';
import { BrowserMultiFormatReader, NotFoundException, ChecksumException, FormatException, type IScannerControls } from '@zxing/library';
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
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const { toast } = useToast();

  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [isScanningActive, setIsScanningActive] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null); // null: initial, true: granted, false: denied/error

  const stopEverything = useCallback(() => {
    if (scannerControlsRef.current) {
      try {
        scannerControlsRef.current.stop();
      } catch (e) {
        // console.warn("Minor error stopping scanner controls:", e);
      }
      scannerControlsRef.current = null;
    }
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanningActive(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopEverything();
      // Reset states fully when modal is closed
      setHasCameraPermission(null);
      setErrorMessage(null);
      setIsInitializing(false);
      return;
    }

    // Initialize when modal opens
    setIsInitializing(true);
    setHasCameraPermission(null);
    setErrorMessage("Requesting camera permission...");
    setIsScanningActive(false);

    if (!codeReaderRef.current) {
      codeReaderRef.current = new BrowserMultiFormatReader(undefined, 300);
    }

    const startScannerAsync = async () => {
      if (!videoRef.current || !isOpen) { // Check if modal closed during async ops
        if (isOpen) setErrorMessage("Video element reference became unavailable.");
        setIsInitializing(false);
        return;
      }

      try {
        // 1. Get Camera Permission and Stream
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        
        if (!videoRef.current || !isOpen) {
          stream.getTracks().forEach(track => track.stop());
          setIsInitializing(false);
          return;
        }
        videoRef.current.srcObject = stream;
        
        // 2. Play Video (wait for it to actually start playing)
        setErrorMessage("Starting camera feed...");
        try {
          await videoRef.current.play();
        } catch (playError: any) {
            if (!isOpen) { // If closed during play attempt
                stream.getTracks().forEach(track => track.stop());
                setIsInitializing(false);
                return;
            }
            console.error("Error playing video stream:", playError);
            setErrorMessage(`Camera stream could not be played: ${playError.name || playError.message}. Try another camera or check browser settings.`);
            setHasCameraPermission(false);
            setIsInitializing(false);
            stream.getTracks().forEach(track => track.stop());
            return;
        }

        if (!videoRef.current || !isOpen) { // Check again after play()
          stream.getTracks().forEach(track => track.stop());
          setIsInitializing(false);
          return;
        }

        // At this point, camera permission is granted and video is playing
        setHasCameraPermission(true);
        setErrorMessage(null); // Clear "Starting camera feed..."

        // 3. Ensure video dimensions are valid
        // A short delay can sometimes help if dimensions aren't immediately available after play()
        await new Promise(resolve => setTimeout(resolve, 100)); 

        if (!videoRef.current || !isOpen) {
          stream.getTracks().forEach(track => track.stop());
          setIsInitializing(false);
          return;
        }
        
        if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
          if (isOpen) setErrorMessage("Video stream has no valid dimensions. Check camera connection or permissions.");
          setHasCameraPermission(false); // Indicate problem
          setIsInitializing(false);
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        // 4. Initialize ZXing Scanner and Start Decoding
        if (!codeReaderRef.current) { // Should have been initialized, but as a fallback
             codeReaderRef.current = new BrowserMultiFormatReader(undefined, 300);
        }
        
        setIsScanningActive(true);
        setIsInitializing(false); // Done initializing

        // decodeFromVideoElement returns controls to stop the scan
        // Important: Ensure codeReaderRef.current is valid before calling decodeFromVideoElement
        if (codeReaderRef.current && videoRef.current && isOpen) {
            scannerControlsRef.current = await codeReaderRef.current.decodeFromVideoElement(videoRef.current, (result, error, controls) => {
                if (!isOpen || !isScanningActive) { // If modal closed or scanning stopped elsewhere
                    if (controls) controls.stop(); // Ensure to use the passed controls here
                    return;
                }

                if (result) {
                    onScanSuccess(result.getText());
                    onOpenChange(false); // Close modal on success
                }
                // Only log more critical errors, ignore common scanning "misses"
                if (error && !(error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException)) {
                    console.warn('Minor barcode scan error during continuous decoding:', error);
                    // No need to setErrorMessage here for these common scan "misses", as it can be distracting
                }
            });
        }

      } catch (error: any) {
        if (!isOpen) return; // Don't update state if modal closed

        let userMessage = 'Could not initialize camera or scanner.';
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          userMessage = 'Camera permission denied. Please enable camera access in your browser settings.';
          toast({ variant: "destructive", title: "Camera Access Denied", description: userMessage});
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
          userMessage = 'No camera found. Please ensure a camera is connected and not in use by another application.';
        } else if (error.name === "NotReadableError") {
          userMessage = 'Camera is already in use or unreadable. Try closing other apps using the camera.';
        } else if (error.name === "AbortError") {
          userMessage = "Camera access was aborted. Please try again.";
        } else {
          userMessage = error.message ? `${userMessage} ${error.message}` : userMessage;
        }
        
        setErrorMessage(userMessage);
        setHasCameraPermission(false);
        setIsInitializing(false);
        setIsScanningActive(false);
        if (onScanError) onScanError(error);
      }
    };

    startScannerAsync();

    return () => {
      stopEverything();
    };
  }, [isOpen, onOpenChange, onScanSuccess, onScanError, stopEverything, toast]);


  let displayContent;
  if (isInitializing) {
    displayContent = (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-primary-foreground p-4">
        <Loader2 className="h-10 w-10 text-primary/80 animate-spin" />
        <p className="text-sm mt-2 text-center px-2">{errorMessage || "Initializing camera..."}</p>
      </div>
    );
  } else if (hasCameraPermission === false) {
    displayContent = (
      <Alert variant="destructive" className="m-4">
        <CameraOff className="h-4 w-4" />
        <AlertTitle>Camera Error</AlertTitle>
        <AlertDescription>{errorMessage || "Camera access was denied or an error occurred. Please check permissions and ensure your camera is working."}</AlertDescription>
      </Alert>
    );
  } else if (hasCameraPermission === true && isScanningActive) {
    displayContent = (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-3/4 h-1/2 border-2 border-primary/60 rounded-lg animate-pulse" style={{ animationDuration: '2s' }}></div>
      </div>
    );
  } else if (hasCameraPermission === true && !isScanningActive && !errorMessage) {
     // Camera permission granted, but scanner not yet active (e.g., waiting for dimensions or ZXing init)
     displayContent = (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-primary-foreground p-4">
        <Loader2 className="h-8 w-8 text-primary/70 animate-spin" />
        <p className="text-xs mt-2 text-center">Preparing scanner...</p>
      </div>
    );
  } else if (errorMessage) { // General error if not initializing and permission not explicitly false
     displayContent = (
      <Alert variant="destructive" className="m-4">
        <CameraOff className="h-4 w-4" />
        <AlertTitle>Scanner Error</AlertTitle>
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    );
  }


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) stopEverything();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md p-0 border-t-4 border-primary">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" /> Scan Barcode
          </DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-3">
          <div className="relative w-full aspect-[4/3] bg-muted rounded-md overflow-hidden shadow-inner">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline // Important for iOS
              muted // Mute to avoid echo, not strictly necessary for scanning
              data-ai-hint="barcode scanner camera"
            />
            {displayContent}
          </div>
           {hasCameraPermission === true && isScanningActive && (
             <p className="text-center text-xs text-muted-foreground -mt-1">
              Position barcode within the frame.
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

