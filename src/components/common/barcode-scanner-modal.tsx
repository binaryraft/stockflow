
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

type ScannerStatus = "idle" | "initializing" | "permission_denied" | "no_camera" | "camera_error" | "scanner_ready" | "scanning";

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
      // Do not nullify codeReaderRef itself here, it might be needed if modal reopens quickly
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
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

      // Give a brief moment for the modal and video element to render.
      await new Promise(resolve => setTimeout(resolve, 50));

      if (!isOpen) { // Check if modal was closed during the brief delay
        stopEverything();
        return;
      }

      if (!videoRef.current) {
        setStatus("camera_error");
        setErrorMessage("Video element reference is not available. Modal might not be fully rendered.");
        if (onScanError) onScanError(new Error("Video element reference not available."));
        return;
      }

      if (!codeReaderRef.current) {
        codeReaderRef.current = new BrowserMultiFormatReader(undefined, 200); // Scan interval
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!isOpen || !videoRef.current) { // Check after potentially long permission request
          stream.getTracks().forEach(track => track.stop());
          stopEverything();
          return;
        }
        mediaStreamRef.current = stream;
        videoRef.current.srcObject = stream;
        setErrorMessage("Starting camera feed...");

        await videoRef.current.play(); // Crucial to await play

        if (!isOpen || !videoRef.current) {
          stopEverything();
          return;
        }
        
        // Ensure dimensions are valid before attempting to scan
        if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
            await new Promise(resolve => setTimeout(resolve, 100)); // Brief delay for dimensions
            if (!isOpen || !videoRef.current || (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0)) {
                setStatus("camera_error");
                setErrorMessage("Video stream has no valid dimensions. Camera might be initializing or blocked.");
                if (onScanError) onScanError(new Error("Video stream has no valid dimensions."));
                stopEverything();
                return;
            }
        }
        
        setStatus("scanner_ready");
        setErrorMessage(null);

        if (!codeReaderRef.current || !videoRef.current) { // Final check before decode
            setStatus("camera_error");
            setErrorMessage("Scanner or video element became unavailable before decoding could start.");
            if (onScanError) onScanError(new Error("Scanner or video unavailable."));
            stopEverything();
            return;
        }

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
              // Optionally set a transient error message for minor scan issues if desired
            }
          }
        );
        setStatus("scanning");

      } catch (error: any) {
        if (!isOpen) { stopEverything(); return; }
        
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
            userMessage = "Camera startup was interrupted. This can happen if the modal was closed or another operation started. Please try again.";
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
        stopEverything(); // Ensure cleanup on error
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
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-primary-foreground p-4 text-center">
          <Loader2 className="h-10 w-10 text-primary/80 animate-spin" />
          <p className="text-sm mt-2 px-2">{errorMessage || "Initializing..."}</p>
        </div>
      );
      break;
    case "permission_denied":
    case "no_camera":
    case "camera_error":
      displayContent = (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-4 text-center">
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
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-primary-foreground p-4 text-center">
          <CheckCircle className="h-8 w-8 text-green-400 mb-2" />
          <p className="text-xs mt-1">Camera active. Preparing to scan...</p>
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
              playsInline 
              muted
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
