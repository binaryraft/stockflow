
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
      scannerControlsRef.current.stop();
      scannerControlsRef.current = null;
    }
    if (codeReaderRef.current) {
      // ZXing's reset can be more thorough for some internal state.
      // No explicit public 'stop' or 'release' on the reader itself, controls handle it.
      codeReaderRef.current.reset();
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanningActive(false);
    setIsInitializing(false);
    // Do not reset hasCameraPermission here if you want to retain the denied/error state for UI
  }, []);


  useEffect(() => {
    if (!isOpen) {
      stopEverything();
      // Fully reset states when modal is definitively closed
      setHasCameraPermission(null);
      setErrorMessage(null);
      return;
    }

    // Reset states for a fresh start each time the modal opens
    setIsInitializing(true);
    setHasCameraPermission(null); // Reset to trigger permission request UI
    setErrorMessage("Requesting camera permission...");
    setIsScanningActive(false);

    let localStream: MediaStream | null = null;

    const initializeCameraAndScanner = async () => {
      // Guard: Ensure modal is still open and video ref exists
      if (!isOpen || !videoRef.current) {
        if (isOpen) setErrorMessage("Video element reference is not available. Modal might have closed prematurely.");
        setIsInitializing(false);
        return;
      }

      try {
        // Step 1: Get Camera Permission and Stream
        localStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });

        if (!isOpen || !videoRef.current) { // Check again after await
          if (localStream) localStream.getTracks().forEach(track => track.stop());
          setIsInitializing(false);
          return;
        }
        videoRef.current.srcObject = localStream;
        setHasCameraPermission(true);

        // Step 2: Play Video
        setErrorMessage("Starting camera feed...");
        await videoRef.current.play();

        if (!isOpen || !videoRef.current) { // Check again
          if (localStream) localStream.getTracks().forEach(track => track.stop());
          setIsInitializing(false);
          return;
        }
        
        // Step 3: Ensure video dimensions are valid (wait for metadata implicitly via play() and short delay)
        await new Promise(resolve => setTimeout(resolve, 150)); // Small delay for metadata

        if (!isOpen || !videoRef.current) {
             if (localStream) localStream.getTracks().forEach(track => track.stop());
             setIsInitializing(false);
             return;
        }

        if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
          if (isOpen) setErrorMessage("Video stream has no valid dimensions. Check camera connection or permissions.");
          setHasCameraPermission(false); // Indicate problem
          setIsInitializing(false);
          if (localStream) localStream.getTracks().forEach(track => track.stop());
          return;
        }

        // Step 4: Initialize ZXing Scanner and Start Decoding
        setErrorMessage("Preparing scanner...");
        if (!codeReaderRef.current) {
          codeReaderRef.current = new BrowserMultiFormatReader(undefined, 300); // Scan interval
        }
        
        setIsScanningActive(true);
        setIsInitializing(false);
        setErrorMessage(null); // Clear initialization messages

        // decodeFromVideoDevice returns controls to stop the scan
        scannerControlsRef.current = await codeReaderRef.current.decodeFromVideoElement(videoRef.current, (result, error, controls) => {
          if (!isOpen || !isScanningActive) { // If modal closed or scanning stopped elsewhere
            if (controls) controls.stop();
            return;
          }

          if (result) {
            onScanSuccess(result.getText());
            onOpenChange(false); // Close modal on success
          }
          if (error && !(error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException)) {
            console.error('Barcode scan error during continuous decoding:', error);
            if (isOpen) setErrorMessage("Error during scanning. Try repositioning barcode.");
            if (onScanError && isOpen) onScanError(error);
          }
        });

      } catch (error: any) {
        if (!isOpen) return; // Don't update state if modal closed

        let userMessage = 'Could not initialize camera or scanner.';
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          userMessage = 'Camera permission denied. Please enable camera access in your browser settings.';
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
          userMessage = 'No camera found. Please ensure a camera is connected and not in use by another application.';
        } else if (error.name === "NotReadableError") {
          userMessage = 'Camera is already in use or unreadable. Try closing other apps using the camera.';
        } else if (error.name === "AbortError" || error.message?.includes("The play() request was interrupted")) {
          userMessage = "Camera access was interrupted. Please try again.";
        } else {
          userMessage = error.message ? `${userMessage} ${error.message}` : userMessage;
        }
        
        setErrorMessage(userMessage);
        if (userMessage !== "Camera access was interrupted. Please try again."){ // Avoid toast for self-interruption from closing
          toast({ variant: "destructive", title: "Scanner Error", description: userMessage });
        }
        setHasCameraPermission(false);
        setIsInitializing(false);
        setIsScanningActive(false);
        if (onScanError) onScanError(error);
        if (localStream) localStream.getTracks().forEach(track => track.stop());
      }
    };

    initializeCameraAndScanner();

    return () => { // Cleanup function for this effect
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      stopEverything(); // General cleanup
    };
  }, [isOpen, onOpenChange, onScanSuccess, onScanError, stopEverything, toast]);


  const getDisplayState = () => {
    if (isInitializing) return 'initializing';
    if (hasCameraPermission === false && errorMessage) return 'error'; // Specific error shown
    if (hasCameraPermission === false) return 'permission_denied'; // Generic permission denied
    if (hasCameraPermission === null) return 'requesting_permission'; // Should be brief
    if (hasCameraPermission && !isScanningActive && !errorMessage) return 'preparing_scanner'; // Camera on, scanner not yet active
    if (isScanningActive) return 'scanning';
    if (errorMessage) return 'error'; // General error if not initializing
    return 'idle';
  };

  const displayState = getDisplayState();
  let helperText = "";
  if (displayState === 'error' && errorMessage) helperText = ""; // Error shown in Alert
  else if (displayState === 'initializing') helperText = errorMessage || "Initializing camera & scanner...";
  else if (displayState === 'requesting_permission') helperText = "Requesting camera permission...";
  else if (displayState === 'permission_denied') helperText = "Camera access denied or unavailable.";
  else if (displayState === 'preparing_scanner') helperText = "Preparing scanner...";
  else if (displayState === 'scanning') helperText = "Position barcode within the frame.";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) stopEverything(); // Ensure cleanup if closed via X or overlay click
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
           {displayState === 'permission_denied' && !errorMessage && ( // Generic permission denied if no specific error
            <Alert variant="destructive">
              <VideoOff className="h-4 w-4" />
              <AlertTitle>Camera Access Denied</AlertTitle>
              <AlertDescription>Please enable camera permissions in your browser settings to use the scanner.</AlertDescription>
            </Alert>
          )}

          <div className="relative w-full aspect-[4/3] bg-muted rounded-md overflow-hidden shadow-inner">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline 
              muted
              data-ai-hint="barcode scanner camera"
            />
            
            {(displayState === 'initializing' || displayState === 'requesting_permission' || displayState === 'preparing_scanner') && !errorMessage && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-primary-foreground p-4">
                <Loader2 className="h-10 w-10 text-primary/80 animate-spin" />
                <p className="text-sm mt-2 text-center px-2">{helperText || "Setting up camera..."}</p>
              </div>
            )}

            {displayState === 'scanning' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/4 h-1/2 border-2 border-primary/60 rounded-lg animate-pulse" style={{ animationDuration: '2s' }}></div>
              </div>
            )}
          </div>

          {helperText && displayState !== 'error' && displayState !== 'permission_denied' && (
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
