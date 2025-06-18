
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScanLine, VideoOff, Loader2, CameraOff, CheckCircle } from 'lucide-react';
import { BrowserMultiFormatReader, NotFoundException, ChecksumException, FormatException, type IScannerControls } from '@zxing/library';
import { useToast } from '@/hooks/use-toast';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: Error) => void;
}

type ScannerStatus = "idle" | "initializing" | "permission_denied" | "no_camera" | "camera_error" | "scanner_ready" | "scanning" | "scan_error";

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

  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stopEverything = useCallback(() => {
    if (scannerControlsRef.current) {
      try {
        scannerControlsRef.current.stop();
      } catch (e) { /* console.warn("Minor error stopping scanner controls:", e); */ }
      scannerControlsRef.current = null;
    }
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (e) { /* console.warn("Minor error resetting code reader:", e); */ }
      codeReaderRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setStatus("idle");
    setErrorMessage(null);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopEverything();
      return;
    }

    const initializeCameraAndScanner = async () => {
      setStatus("initializing");
      setErrorMessage("Requesting camera permission...");

      if (!videoRef.current) {
        setErrorMessage("Video element reference is not available. Modal might not be fully rendered.");
        setStatus("camera_error");
        return;
      }

      codeReaderRef.current = new BrowserMultiFormatReader(undefined, 200); // Scan interval

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });

        if (!isOpen || !videoRef.current) { // Check after potentially long permission request
          stream.getTracks().forEach(track => track.stop());
          setStatus("idle"); // Or an error if appropriate
          return;
        }

        videoRef.current.srcObject = stream;
        setErrorMessage("Starting camera feed..."); // Update status for user

        await videoRef.current.play(); // Crucial to await play

        // Video is playing
        if (!isOpen || !videoRef.current) { // Check again
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        // Ensure dimensions are valid before attempting to scan
        if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
            await new Promise(resolve => setTimeout(resolve, 100)); // Brief delay for dimensions
            if (videoRef.current && (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0)) {
                setErrorMessage("Video stream has no valid dimensions. Camera might be initializing or blocked.");
                setStatus("camera_error");
                stream.getTracks().forEach(track => track.stop());
                return;
            }
        }
        
        setStatus("scanner_ready"); // Camera is ready, preparing to scan
        setErrorMessage(null); // Clear previous messages

        // Start ZXing decoding
        scannerControlsRef.current = await codeReaderRef.current.decodeFromVideoElement(
          videoRef.current,
          (result, error) => {
            if (!isOpen) return; // Modal closed during scanning

            if (result) {
              onScanSuccess(result.getText());
              onOpenChange(false); // Close modal on success
            }
            
            if (error && !(error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException)) {
              console.warn('Barcode scan error (non-critical):', error);
              // Don't flood UI with errors for missed scans
            }
          }
        );
        setStatus("scanning"); // Actively scanning

      } catch (error: any) {
        if (!isOpen) return; // Don't update state if modal closed during error handling
        
        let userMessage = 'Could not initialize camera or scanner.';
        let newStatus: ScannerStatus = "camera_error";

        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          userMessage = 'Camera permission denied. Please enable camera access in your browser settings.';
          newStatus = "permission_denied";
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
          userMessage = 'No camera found. Please ensure a camera is connected and not in use by another application.';
          newStatus = "no_camera";
        } else if (error.name === "NotReadableError" || error.name === "SourceUnavailableError" || error.name === "TrackStartError") {
          userMessage = 'Camera is already in use, unreadable, or selected settings are not supported. Try closing other apps using the camera.';
          newStatus = "camera_error";
        } else if (error.message && error.message.toLowerCase().includes("play() request was interrupted")) {
            userMessage = "Camera startup was interrupted. This can sometimes happen; please try again.";
            newStatus = "camera_error";
        } else {
          userMessage = error.message || userMessage;
        }
        
        setErrorMessage(userMessage);
        setStatus(newStatus);
        if (onScanError) onScanError(new Error(userMessage));
        if (newStatus === "permission_denied" || newStatus === "no_camera" || newStatus === "camera_error") {
            toast({ variant: "destructive", title: "Scanner Error", description: userMessage });
        }
      }
    };

    initializeCameraAndScanner();

    return () => {
      stopEverything();
    };
  }, [isOpen, onOpenChange, onScanSuccess, onScanError, stopEverything, toast]);

  let displayContent;
  switch (status) {
    case "initializing":
      displayContent = (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-primary-foreground p-4">
          <Loader2 className="h-10 w-10 text-primary/80 animate-spin" />
          <p className="text-sm mt-2 text-center px-2">{errorMessage || "Initializing..."}</p>
        </div>
      );
      break;
    case "permission_denied":
    case "no_camera":
    case "camera_error":
    case "scan_error":
      displayContent = (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-4">
            <Alert variant="destructive" className="m-4 text-destructive-foreground bg-destructive/80 border-destructive-foreground/30 max-w-sm">
              <CameraOff className="h-5 w-5" />
              <AlertTitle className="font-semibold">Camera or Scanner Error</AlertTitle>
              <AlertDescription className="text-xs">{errorMessage || "An unknown error occurred."}</AlertDescription>
            </Alert>
        </div>
      );
      break;
    case "scanner_ready":
      displayContent = (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-primary-foreground p-4">
          <CheckCircle className="h-8 w-8 text-green-400 mb-2" />
          <p className="text-xs mt-1 text-center">Camera active. Preparing to scan...</p>
        </div>
      );
      break;
    case "scanning":
      displayContent = (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-3/4 h-1/2 border-2 border-primary/60 rounded-lg animate-pulse" style={{ animationDuration: '2s', boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)' }}></div>
        </div>
      );
      break;
    default: // idle
      displayContent = null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) stopEverything(); // Ensure cleanup if closed via 'X' or overlay click
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
              muted // Mute to avoid echo
              data-ai-hint="barcode scanner camera"
            />
            {displayContent}
          </div>
           {status === "scanning" && (
             <p className="text-center text-xs text-muted-foreground -mt-1">
              Position barcode within the highlighted area.
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
