
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
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

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
      codeReaderRef.current.reset(); // Resets the instance for potential reuse
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
      // Reset all states when modal is closed
      setHasCameraPermission(null);
      setErrorMessage(null);
      setIsInitializing(false);
      setIsScanningActive(false); // Ensure this is reset too
      return;
    }

    // Initialize when modal opens
    setIsInitializing(true);
    setHasCameraPermission(null);
    setErrorMessage("Requesting camera permission...");
    setIsScanningActive(false);

    if (!codeReaderRef.current) {
      codeReaderRef.current = new BrowserMultiFormatReader(undefined, 300); // 300ms scan interval
    }

    const startScannerAsync = async () => {
      if (!videoRef.current || !isOpen) { // Double check ref and modal state
        if (isOpen) setErrorMessage("Video element reference became unavailable during setup.");
        setIsInitializing(false);
        return;
      }

      try {
        // 1. Get Camera Permission and Stream
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        
        if (!videoRef.current || !isOpen) { // Check again after permission potentially taking time
          stream.getTracks().forEach(track => track.stop());
          setIsInitializing(false);
          return;
        }
        videoRef.current.srcObject = stream;
        
        // 2. Play Video (wait for it to actually start playing)
        setErrorMessage("Starting camera feed...");
        await videoRef.current.play(); // This promise resolves when playback begins or if it can't play

        // At this point, camera permission is granted AND video is playing
        setHasCameraPermission(true); 
        setErrorMessage(null); // Clear "Starting camera feed..." message

        // 3. Ensure video dimensions are valid (wait for loadedmetadata)
        // This can be tricky; sometimes `play()` resolves but dimensions aren't immediately available.
        // We'll wait for `loadedmetadata` if dimensions are initially 0.
        if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
            setErrorMessage("Waiting for video metadata...");
            await new Promise<void>((resolve, reject) => {
                if (!videoRef.current || !isOpen) { reject(new Error("Modal closed or video ref lost while waiting for metadata.")); return; }
                const onLoadedMetadata = () => {
                    if (videoRef.current && (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0)) {
                        resolve();
                    } else if (videoRef.current) {
                         // Still no dimensions, try a short delay then recheck
                        setTimeout(() => {
                            if (videoRef.current && (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0)) {
                                resolve();
                            } else {
                                reject(new Error("Video stream has no valid dimensions after waiting."));
                            }
                        }, 300);
                    } else {
                         reject(new Error("Video ref lost after metadata event."));
                    }
                };
                videoRef.current.onloadedmetadata = onLoadedMetadata;
                // Timeout if metadata doesn't load
                setTimeout(() => reject(new Error("Timeout waiting for video metadata.")), 3000);
            });
        }
        
        if (!videoRef.current || !isOpen) { // Check again after metadata handling
          stream.getTracks().forEach(track => track.stop());
          setIsInitializing(false);
          return;
        }
        
        // 4. Initialize ZXing Scanner and Start Decoding
        if (!codeReaderRef.current) {
             codeReaderRef.current = new BrowserMultiFormatReader(undefined, 300);
        }
        
        setIsInitializing(false); // Done initializing, ready to scan

        // decodeFromVideoElement returns controls to stop the scan
        if (codeReaderRef.current && videoRef.current && isOpen) { // Final check
            setIsScanningActive(true); // Set scanning active right before starting decode
            scannerControlsRef.current = await codeReaderRef.current.decodeFromVideoElement(videoRef.current, (result, error, controls) => {
                if (!isOpen) { // Modal closed during scan attempt
                    if (scannerControlsRef.current) scannerControlsRef.current.stop(); // Use the stored controls to stop
                    return;
                }

                if (result) {
                    onScanSuccess(result.getText());
                    onOpenChange(false); // Close modal on success
                }
                
                if (error && !(error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException)) {
                    console.warn('Barcode scan error during continuous decoding:', error);
                    // Optionally set a transient error message here if desired for specific errors
                }
            });
        } else if (isOpen) {
             setErrorMessage("Could not start scanner due to missing references.");
             setIsScanningActive(false);
        }

      } catch (error: any) {
        if (!isOpen) return; // Don't update state if modal closed

        let userMessage = 'Could not initialize camera or scanner.';
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          userMessage = 'Camera permission denied. Please enable camera access in your browser settings.';
          toast({ variant: "destructive", title: "Camera Access Denied", description: userMessage});
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
          userMessage = 'No camera found. Please ensure a camera is connected and not in use by another application.';
        } else if (error.name === "NotReadableError" || error.name === "OverconstrainedError") {
          userMessage = 'Camera is already in use, unreadable, or selected settings are not supported by your camera. Try closing other apps using the camera or check browser settings.';
        } else if (error.name === "AbortError") {
          userMessage = "Camera access was aborted. Please try again.";
        } else {
          userMessage = error.message ? `${error.message}` : userMessage;
        }
        
        setErrorMessage(userMessage);
        setHasCameraPermission(false);
        setIsInitializing(false);
        setIsScanningActive(false);
        if (onScanError) onScanError(error);
      }
    };

    startScannerAsync();

    // Cleanup function
    return () => {
      stopEverything();
      // Explicitly remove event listeners if attached outside async flow (not the case here anymore)
      if (videoRef.current) {
        videoRef.current.onloadedmetadata = null;
      }
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
    // Only show viewfinder if scanning is truly active
    displayContent = (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-3/4 h-1/2 border-2 border-primary/60 rounded-lg animate-pulse" style={{ animationDuration: '2s' }}></div>
      </div>
    );
  } else if (hasCameraPermission === true && !isScanningActive && !errorMessage) {
     // Camera permission granted, video might be playing, but scanner not yet active (e.g., waiting for ZXing init or final checks)
     displayContent = (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-primary-foreground p-4">
        <Loader2 className="h-8 w-8 text-primary/70 animate-spin" />
        <p className="text-xs mt-2 text-center">Preparing scanner...</p>
      </div>
    );
  } else if (errorMessage && hasCameraPermission !== false) { // General error if not initializing and permission not explicitly false (e.g. ZXing setup error)
     displayContent = (
      <Alert variant="destructive" className="m-4">
        <CameraOff className="h-4 w-4" />
        <AlertTitle>Scanner Error</AlertTitle>
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    );
  }
  // If hasCameraPermission is null and not initializing, it's an edge case (should be covered by initializing)
  // or the initial state before useEffect runs. Default to no overlay or a minimal loading.


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

