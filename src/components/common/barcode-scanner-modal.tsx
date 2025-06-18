
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScanLine, VideoOff } from 'lucide-react'; // Removed XCircle
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
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isScanningActive, setIsScanningActive] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const { toast } = useToast();

  const stopScanner = useCallback(() => {
    setIsScanningActive(false);
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleMetadataLoaded = useCallback(() => {
    if (!videoRef.current || !codeReaderRef.current || !isOpen || !hasCameraPermission) return;

    const currentVideoEl = videoRef.current;
    const reader = codeReaderRef.current;

    if (currentVideoEl.videoWidth === 0 || currentVideoEl.videoHeight === 0) {
      console.warn("BarcodeScannerModal: Video metadata loaded but dimensions are zero.");
      setErrorMessage("Video stream has invalid dimensions. Cannot start scanner.");
      if (onScanError) onScanError(new Error("Video stream has invalid dimensions (0x0)."));
      setHasCameraPermission(false); // Critical: update permission state
      setIsScanningActive(false);
      stopScanner();
      return;
    }
    
    setIsScanningActive(true); // Indicate scanning can now begin

    reader.decodeFromVideoDevice(undefined, currentVideoEl, (result, error) => {
      if (!isOpen || !reader) return; // Check again in callback
      if (result) {
        onScanSuccess(result.getText());
        // stopScanner(); // StopScanner is called in useEffect cleanup or when modal closes
        onOpenChange(false); // Close modal on success
      }
      if (error && !(error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException)) {
        console.error('Barcode scan error during continuous decoding:', error);
        if (onScanError) onScanError(error);
        // Potentially set a transient error message if decode errors are frequent
      }
    }).catch(decodeSetupError => {
      console.error("Error setting up decoding from video device: ", decodeSetupError);
      if (isOpen) {
        setErrorMessage("Could not start barcode reader. Ensure camera is not obstructed.");
        if (onScanError) onScanError(decodeSetupError as Error);
        setHasCameraPermission(false);
        setIsScanningActive(false);
        stopScanner();
      }
    });
  }, [isOpen, hasCameraPermission, onScanSuccess, onOpenChange, onScanError, stopScanner]);

  const handleVideoError = useCallback((e: Event) => {
    console.error("Video element reported an error:", e);
    if (isOpen) {
      setErrorMessage("The video stream encountered an error. Please try again or check camera connection.");
      if (onScanError) onScanError(new Error("Video element encountered an error."));
      setHasCameraPermission(false);
      setIsScanningActive(false);
      stopScanner();
    }
  }, [isOpen, onScanError, stopScanner]);

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    setErrorMessage(null);
    setHasCameraPermission(null);
    setIsScanningActive(false);

    if (!codeReaderRef.current) {
      codeReaderRef.current = new BrowserMultiFormatReader();
    }
    const currentVideoEl = videoRef.current; // Capture for cleanup

    const startScannerAsync = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });

        if (!isOpen || !videoRef.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        videoRef.current.srcObject = stream;
        // Add listeners before attempting to play
        videoRef.current.addEventListener('loadedmetadata', handleMetadataLoaded);
        videoRef.current.addEventListener('error', handleVideoError);

        await videoRef.current.play(); // This promise resolves when playback has begun.
        
        // If play() is successful, and no errors occurred:
        setHasCameraPermission(true); 
        // `handleMetadataLoaded` will then set `isScanningActive` and start decoding.

      } catch (err) {
        console.error('Error accessing camera or playing video:', err);
        if (isOpen) { // Check isOpen again in catch block
            let userMessage = 'Could not access camera. Ensure it is connected and not in use.';
            if (err instanceof Error) {
                if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                    userMessage = 'Camera permission denied. Please enable camera access in your browser settings.';
                } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError"){
                    userMessage = 'No camera found. Please ensure a camera is connected and enabled.';
                } else if (err.name === "NotReadableError") {
                    userMessage = 'Camera is already in use or unreadable. Try closing other apps/tabs using the camera.';
                } else if (err.name === "AbortError" || err.name === "SecurityError") {
                    userMessage = 'Camera access was prevented or aborted. Check browser settings.';
                }
            }
            setErrorMessage(userMessage);
            toast({ variant: "destructive", title: "Camera Error", description: userMessage });
            if (onScanError) onScanError(err as Error);
            setHasCameraPermission(false);
            setIsScanningActive(false);
            stopScanner(); // Ensure cleanup on error
        }
      }
    };

    startScannerAsync();

    return () => {
      stopScanner();
      if (currentVideoEl) {
        currentVideoEl.removeEventListener('loadedmetadata', handleMetadataLoaded);
        currentVideoEl.removeEventListener('error', handleVideoError);
      }
    };
  }, [isOpen, onOpenChange, onScanSuccess, onScanError, stopScanner, toast, handleMetadataLoaded, handleVideoError]);

  return (
    <Dialog open={isOpen} onOpenChange={(openState) => {
        if (!openState) {
            stopScanner(); // Ensure scanner stops when dialog is closed by any means
        }
        onOpenChange(openState);
    }}>
      <DialogContent className="sm:max-w-md p-0 border-t-4 border-primary">
        <DialogHeader className="p-4 border-b flex flex-row justify-between items-center">
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" /> Scan Barcode
          </DialogTitle>
          {/* The DialogContent primitive will add its own X close button here */}
        </DialogHeader>
        <div className="p-4 space-y-4">
          {hasCameraPermission === null && !errorMessage && (
             <div className="flex flex-col items-center justify-center h-48 bg-muted rounded-md">
                <ScanLine className="h-12 w-12 text-muted-foreground animate-ping" style={{animationDuration: '1.5s'}}/>
                <p className="mt-2 text-muted-foreground">Initializing scanner & requesting camera...</p>
            </div>
          )}
          {hasCameraPermission === false && errorMessage && (
            <Alert variant="destructive">
              <VideoOff className="h-4 w-4" />
              <AlertTitle>Camera Access Problem</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
           {hasCameraPermission === true && errorMessage && ( // Error occurred after permission was granted (e.g. video dimensions)
             <Alert variant="destructive">
                <VideoOff className="h-4 w-4" />
                <AlertTitle>Scanner Error</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          {hasCameraPermission === true && !errorMessage && (
            <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden shadow-inner">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline // Important for iOS
                muted // Often required for autoplay
                data-ai-hint="barcode scanner camera"
              />
              {!isScanningActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                    <ScanLine className="h-10 w-10 text-primary/70 animate-pulse" />
                    <p className="text-sm text-primary-foreground/80 mt-2">Attempting to start camera...</p>
                </div>
              )}
              {isScanningActive && (
                <>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-3/4 h-1/3 border-2 border-primary/50 rounded-lg animate-pulse" style={{animationDuration: '2s'}}></div>
                  </div>
                  <p className="text-center text-xs text-muted-foreground mt-2">Position barcode within the frame.</p>
                </>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="p-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={stopScanner}>
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
