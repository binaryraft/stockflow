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
  const [isInitializing, setIsInitializing] = useState<boolean>(false); // Combined loading state
  const [isScanningActive, setIsScanningActive] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stopEverything = useCallback(() => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanningActive(false);
    // Don't reset hasCameraPermission here, as it might be needed for UI feedback
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopEverything();
      // Reset states when modal is closed
      setHasCameraPermission(null);
      setIsInitializing(false);
      setErrorMessage(null);
      return;
    }

    // Start initialization when modal opens
    setIsInitializing(true);
    setHasCameraPermission(null);
    setErrorMessage("Requesting camera permission...");
    setIsScanningActive(false);

    let localStream: MediaStream | null = null; // To manage the stream within this effect

    const initializeCameraAndScanner = async () => {
      if (!videoRef.current) {
        if (isOpen) setErrorMessage("Video element reference is not available. Modal might not be fully rendered.");
        setIsInitializing(false);
        return;
      }

      try {
        // 1. Get Camera Permission and Stream
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        localStream = stream; // Store for cleanup

        if (!isOpen || !videoRef.current) { // Check again after await
          stream.getTracks().forEach(track => track.stop());
          setIsInitializing(false);
          return;
        }
        videoRef.current.srcObject = stream;

        // 2. Play Video
        await videoRef.current.play();
        if (!isOpen) { // Check again after play
            stream.getTracks().forEach(track => track.stop());
            setIsInitializing(false);
            return;
        }
        setHasCameraPermission(true); // Permission granted and video playing
        setErrorMessage(null); // Clear "requesting permission"

        // 3. Check Video Dimensions (wait a moment for metadata)
        // A short delay can sometimes help ensure dimensions are available
        await new Promise(resolve => setTimeout(resolve, 100)); 

        if (!isOpen || !videoRef.current) {
          setIsInitializing(false);
          return;
        }

        if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
          if (isOpen) setErrorMessage("Video stream has no valid dimensions. Cannot start scanner.");
          setHasCameraPermission(false); // Indicate problem with camera/stream
          setIsInitializing(false);
          stream.getTracks().forEach(track => track.stop()); // Stop the problematic stream
          return;
        }

        // 4. Initialize and Start ZXing Scanner
        if (!codeReaderRef.current) {
          codeReaderRef.current = new BrowserMultiFormatReader(undefined, 500);
        }
        const reader = codeReaderRef.current;
        setIsScanningActive(true);
        setIsInitializing(false); // Initialization complete, now scanning
        setErrorMessage(null); // Clear any previous messages like "waiting for dimensions"

        reader.decodeFromVideoDevice(undefined, videoRef.current, (result, error) => {
          if (!isOpen || !isScanningActive) return; // Check if still relevant

          if (result) {
            onScanSuccess(result.getText());
            onOpenChange(false); // Close modal on success
          }
          if (error && !(error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException)) {
            console.error('Barcode scan error during continuous decoding:', error);
            if (isOpen) setErrorMessage("Error during scanning. Try repositioning.");
            if (onScanError && isOpen) onScanError(error);
          }
        });

      } catch (error: any) {
        if (!isOpen) return; // Don't update state if modal closed during error
        let userMessage = 'Could not initialize camera or scanner.';
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          userMessage = 'Camera permission denied. Please enable camera access in your browser settings.';
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
          userMessage = 'No camera found. Please ensure a camera is connected.';
        } else if (error.name === "NotReadableError") {
          userMessage = 'Camera is already in use or unreadable. Try closing other apps using the camera.';
        } else if (error.name === "AbortError" || error.message.includes("The play() request was interrupted")) {
            userMessage = "Camera access was interrupted. Please try again.";
        } else if (error.message) {
          userMessage += ` ${error.message}`;
        }
        setErrorMessage(userMessage);
        toast({ variant: "destructive", title: "Scanner Error", description: userMessage });
        setHasCameraPermission(false);
        setIsInitializing(false);
        setIsScanningActive(false);
        if (onScanError) onScanError(error);
        if (localStream) localStream.getTracks().forEach(track => track.stop()); // Ensure stream from this attempt is stopped
      }
    };

    initializeCameraAndScanner();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      stopEverything(); // General cleanup
    };
  }, [isOpen, onOpenChange, onScanSuccess, onScanError, stopEverything, toast]);


  const getDisplayState = () => {
    if (errorMessage) return 'error';
    if (isInitializing) return 'initializing';
    if (hasCameraPermission === null && !isInitializing) return 'requesting_permission'; // Should be brief
    if (hasCameraPermission === false && !isInitializing) return 'permission_denied';
    if (hasCameraPermission && !isScanningActive && !isInitializing) return 'preparing_scanner';
    if (isScanningActive) return 'scanning';
    return 'idle'; // Should ideally not be seen when modal is open
  };

  const displayState = getDisplayState();
  let helperText = "";
  if (displayState === 'error') helperText = ""; // Error shown in Alert
  else if (displayState === 'initializing') helperText = "Initializing camera & requesting permission...";
  else if (displayState === 'requesting_permission') helperText = "Waiting for camera permission response...";
  else if (displayState === 'permission_denied') helperText = "Camera access denied or unavailable."; // Also covered by Alert
  else if (displayState === 'preparing_scanner') helperText = "Preparing scanner...";
  else if (displayState === 'scanning') helperText = "Position barcode within the frame.";


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
          {displayState === 'error' && errorMessage && (
            <Alert variant="destructive">
              <CameraOff className="h-4 w-4" />
              <AlertTitle>Scanner Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="relative w-full aspect-[4/3] bg-muted rounded-md overflow-hidden shadow-inner">
            {/* Video element is always rendered when modal is open to ensure ref is available */}
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline 
              muted
              data-ai-hint="barcode scanner camera"
            />
            
            {/* Overlays based on displayState */}
            {(displayState === 'initializing' || displayState === 'requesting_permission' || displayState === 'preparing_scanner') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-primary-foreground">
                <Loader2 className="h-10 w-10 text-primary/80 animate-spin" />
                <p className="text-sm mt-2 text-center px-2">{helperText}</p>
              </div>
            )}
            {displayState === 'permission_denied' && !errorMessage && ( // Show this only if no specific error message is displayed by Alert
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-destructive-foreground">
                <VideoOff className="h-10 w-10" />
                <p className="text-sm mt-2 text-center px-2">Camera access denied or unavailable.</p>
              </div>
            )}

            {displayState === 'scanning' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/4 h-1/2 border-2 border-primary/60 rounded-lg animate-pulse" style={{ animationDuration: '2s' }}></div>
              </div>
            )}
          </div>

          {helperText && displayState !== 'error' && (
            <p className="text-center text-xs text-muted-foreground -mt-1">
              {helperText}
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
