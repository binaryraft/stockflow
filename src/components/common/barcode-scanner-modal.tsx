
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScanLine, VideoOff, XCircle } from 'lucide-react';
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const { toast } = useToast();

  const stopScanner = useCallback(() => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    // Reset states when modal opens
    setErrorMessage(null);
    setHasCameraPermission(null);

    if (!codeReaderRef.current) {
      codeReaderRef.current = new BrowserMultiFormatReader();
    }
    const reader = codeReaderRef.current;
    const currentVideoElement = videoRef.current;

    const handleMetadataLoaded = () => {
      if (!currentVideoElement || !reader || !isOpen) {
        return;
      }

      if (currentVideoElement.videoWidth === 0 || currentVideoElement.videoHeight === 0) {
        console.warn("BarcodeScannerModal: Video metadata loaded but dimensions are zero.");
        setErrorMessage("Video stream has invalid dimensions. Cannot start scanner.");
        if (onScanError) onScanError(new Error("Video stream has invalid dimensions (0x0)."));
        stopScanner();
        return;
      }

      currentVideoElement.play().then(() => {
        if (reader && currentVideoElement && isOpen) {
          reader.decodeFromVideoDevice(undefined, currentVideoElement, (result, error) => {
            if (!isOpen || !reader) return; // Check if modal closed or reader reset

            if (result) {
              onScanSuccess(result.getText());
              stopScanner();
              onOpenChange(false);
            }
            if (error) {
              if (!(error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException)) {
                console.error('Barcode scan error during continuous decoding:', error);
                // Optionally set a non-critical error message here if needed for continuous scanning issues
                // setErrorMessage("Temporary issue reading barcode. Please try again.");
                if (onScanError) {
                  onScanError(error);
                }
              }
            }
          }).catch(decodeSetupError => {
            console.error("Error setting up decoding from video device: ", decodeSetupError);
            if (isOpen) {
              setErrorMessage("Could not start barcode reader. Ensure camera is not obstructed.");
              if (onScanError) onScanError(decodeSetupError as Error);
              stopScanner();
            }
          });
        }
      }).catch(playError => {
        console.error("Error playing video for scanner:", playError);
        if (isOpen) {
          setErrorMessage("Could not play video stream for scanning. Please ensure camera is connected and permissions are granted.");
          if (onScanError) onScanError(playError as Error);
          stopScanner();
        }
      });
    };

    const handleVideoError = (e: Event) => {
        console.error("Video element reported an error:", e);
        if (isOpen) {
            setErrorMessage("The video stream encountered an error. Please try again or check camera connection.");
            if (onScanError) onScanError(new Error("Video element encountered an error during playback or streaming."));
            stopScanner();
        }
    };

    const startScanner = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setHasCameraPermission(true);
        if (currentVideoElement) {
          currentVideoElement.srcObject = stream;
          currentVideoElement.addEventListener('loadedmetadata', handleMetadataLoaded);
          currentVideoElement.addEventListener('error', handleVideoError);
        } else {
            if (isOpen) { // Check isOpen before setting error
                 setErrorMessage("Video element not available to start scanner.");
                 if(onScanError) onScanError(new Error("Video element ref is null."));
                 stopScanner();
            }
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        if (isOpen) { // Check isOpen before setting state
            setHasCameraPermission(false);
            let userMessage = 'Could not access camera. Please ensure it is connected and not in use by another application.';
            if (err instanceof Error) {
                if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                    userMessage = 'Camera permission denied. Please enable camera access in your browser settings.';
                } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError"){
                    userMessage = 'No camera found. Please ensure a camera is connected and enabled.';
                }
            }
            setErrorMessage(userMessage);
            toast({ variant: "destructive", title: "Camera Error", description: userMessage });
            if (onScanError) onScanError(err as Error);
            stopScanner(); // Ensure scanner is stopped if permission fails
        }
      }
    };

    startScanner();

    return () => {
      stopScanner();
      if (currentVideoElement) {
        currentVideoElement.removeEventListener('loadedmetadata', handleMetadataLoaded);
        currentVideoElement.removeEventListener('error', handleVideoError);
      }
    };
  }, [isOpen, onOpenChange, onScanSuccess, onScanError, stopScanner, toast]);


  return (
    <Dialog open={isOpen} onOpenChange={(openState) => {
        if (!openState) {
            stopScanner(); // Ensure scanner is stopped if dialog is closed externally
        }
        onOpenChange(openState);
    }}>
      <DialogContent className="sm:max-w-md p-0 border-t-4 border-primary">
        <DialogHeader className="p-4 border-b flex flex-row justify-between items-center">
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" /> Scan Barcode
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close scanner" onClick={stopScanner}>
              <XCircle className="h-5 w-5" />
            </Button>
          </DialogClose>
        </DialogHeader>
        <div className="p-4 space-y-4">
          {hasCameraPermission === false && ( // Explicitly false, not null
            <Alert variant="destructive">
              <VideoOff className="h-4 w-4" />
              <AlertTitle>Camera Access Problem</AlertTitle>
              <AlertDescription>
                {errorMessage || "Camera permission is required. Please enable it in your browser settings."}
              </AlertDescription>
            </Alert>
          )}
          {hasCameraPermission === true && errorMessage && ( // Permission granted, but other error occurred
             <Alert variant="destructive">
                <VideoOff className="h-4 w-4" />
                <AlertTitle>Scanner Error</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          {hasCameraPermission === true && !errorMessage && ( // Ideal state: permission granted, no errors
            <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden shadow-inner">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
                data-ai-hint="barcode scanner camera"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/4 h-1/3 border-2 border-primary/50 rounded-lg animate-pulse" style={{animationDuration: '2s'}}></div>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-2">Position barcode within the frame.</p>
            </div>
          )}
           {hasCameraPermission === null && !errorMessage && ( // Initial state: loading/requesting permission
             <div className="flex flex-col items-center justify-center h-48 bg-muted rounded-md">
                <ScanLine className="h-12 w-12 text-muted-foreground animate-ping" style={{animationDuration: '1.5s'}}/>
                <p className="mt-2 text-muted-foreground">Initializing scanner & requesting camera...</p>
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

