
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScanLine, VideoOff, Loader2 } from 'lucide-react';
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

  // Memoized function to handle video errors
  const handleVideoError = useCallback((e: Event) => {
    console.error("Video element reported an error:", e);
    if (!isOpen) return;
    setErrorMessage("The video stream encountered an error. Please check camera connection or try again.");
    if (onScanError) onScanError(new Error("Video element encountered an error."));
    setHasCameraPermission(false);
    setIsLoadingStream(false);
    setIsScanningActive(false);
  }, [isOpen, onScanError]);


  // Effect 1: Camera Setup (permissions, stream, play)
  useEffect(() => {
    if (!isOpen) {
      // Cleanup when modal is closed
      setIsLoadingStream(false);
      setHasCameraPermission(null);
      setErrorMessage(null);
      setIsScanningActive(false); // Ensure scanning active flag is also reset
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      if (codeReaderRef.current) { // Also reset ZXing reader if it was initialized
        codeReaderRef.current.reset();
      }
      return;
    }

    // Reset states for a fresh start each time the modal opens
    setIsLoadingStream(true);
    setHasCameraPermission(null);
    setErrorMessage("Requesting camera permission...");
    setIsScanningActive(false);

    let streamTracks: MediaStreamTrack[] = [];
    const videoElement = videoRef.current;

    const initCamera = async () => {
      if (!videoElement) {
        setErrorMessage("Video element not ready.");
        setIsLoadingStream(false);
        return;
      }

      // Remove previous listeners if any, before adding new ones
      videoElement.removeEventListener('error', handleVideoError);
      // 'canplay' listener is added with {once: true}, so it auto-removes.

      videoElement.addEventListener('error', handleVideoError);


      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        streamTracks = stream.getTracks();

        if (!isOpen) { // Modal closed during/after permission
          streamTracks.forEach(track => track.stop());
          setIsLoadingStream(false);
          return;
        }

        videoElement.srcObject = stream;
        setErrorMessage("Starting video stream...");

        const onCanPlay = async () => {
          try {
            // Ensure video element is still mounted and modal is open
            if (!videoRef.current || !isOpen) {
                if (streamTracks) streamTracks.forEach(track => track.stop());
                return;
            }
            await videoRef.current.play(); // Wait for play to complete
            
            if (!isOpen) { // Check again after play()
                if (videoRef.current && videoRef.current.srcObject) {
                   (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
                }
                return;
            }

            setHasCameraPermission(true);
            setIsLoadingStream(false);
            setErrorMessage(null);
          } catch (playError: any) {
            console.error("Error playing video:", playError);
            if (!isOpen) return;
            let specificErrorMsg = "Could not play video stream.";
            if (playError.name === 'NotAllowedError') {
                specificErrorMsg = "Video playback was not allowed. Ensure autoplay is enabled or interact with the page.";
            } else if (playError.message) {
                specificErrorMsg += ` ${playError.message}`;
            }
            setErrorMessage(specificErrorMsg);
            toast({variant: "destructive", title: "Video Playback Error", description: specificErrorMsg});
            setHasCameraPermission(false);
            setIsLoadingStream(false);
            streamTracks.forEach(track => track.stop());
            if (videoRef.current) videoRef.current.srcObject = null;
          }
        };
        
        videoElement.addEventListener('canplay', onCanPlay, { once: true });

      } catch (permError: any) {
        if (!isOpen) return;
        let userMessage = 'Could not access camera.';
        if (permError.name === "NotAllowedError" || permError.name === "PermissionDeniedError") {
            userMessage = 'Camera permission denied. Please enable camera access in your browser settings.';
        } else if (permError.name === "NotFoundError" || permError.name === "DevicesNotFoundError"){
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
      // Cleanup for this effect
      streamTracks.forEach(track => track.stop());
      if (videoElement) {
        videoElement.removeEventListener('error', handleVideoError);
        // 'canplay' with {once: true} removes itself
        if (videoElement.srcObject) { // Ensure srcObject is cleared
            const currentStream = videoElement.srcObject as MediaStream;
            currentStream.getTracks().forEach(track => track.stop());
            videoElement.srcObject = null;
        }
      }
    };
  }, [isOpen, handleVideoError, toast, onScanError]); // Dependencies for camera setup


  // Effect 2: ZXing Scanner Initialization and Operation
  useEffect(() => {
    if (!isOpen || !hasCameraPermission || isLoadingStream) {
      if (isScanningActive && codeReaderRef.current) {
        codeReaderRef.current.reset();
        setIsScanningActive(false);
      }
      return;
    }

    // At this point: isOpen=true, hasCameraPermission=true, isLoadingStream=false
    // Video should be playing.

    const videoElement = videoRef.current;
    if (!codeReaderRef.current) {
      codeReaderRef.current = new BrowserMultiFormatReader();
    }
    const reader = codeReaderRef.current;

    if (!videoElement || !reader) {
      setErrorMessage("Scanner components not ready.");
      return;
    }
    
    const startDecoding = () => {
      if (!isOpen || !hasCameraPermission || !videoElement || !reader) return; // Re-check before async operation

      if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        setErrorMessage("Initializing scanner (waiting for video dimensions)...");
        // Retry logic if dimensions aren't immediately available
        const checkAgainTimeout = setTimeout(() => {
            if (isOpen && hasCameraPermission && !isScanningActive) { // Ensure still valid to try
                 startDecoding(); // Recursive call, ensure this has an exit or max retries in a real app
            }
        }, 300); 
        return () => clearTimeout(checkAgainTimeout); // Cleanup timeout if effect re-runs or component unmounts
      }
      
      setIsScanningActive(true);
      setErrorMessage(null); // Clear "Initializing scanner..."

      reader.decodeFromVideoDevice(undefined, videoElement, (result, error) => {
        if (!isOpen || !isScanningActive) return; // Check if still active and open
        
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
        setHasCameraPermission(false); // Indicate an issue with using the camera for scanning
        setIsScanningActive(false);
      });
    };

    startDecoding();
    
    return () => {
      if (reader) {
        reader.reset();
      }
      setIsScanningActive(false);
    };
  }, [isOpen, hasCameraPermission, isLoadingStream, onScanSuccess, onOpenChange, onScanError]); // Added onOpenChange

  const getHelperText = () => {
    if (errorMessage) return null; // Error message takes precedence
    if (isLoadingStream) return "Requesting camera permission...";
    if (hasCameraPermission && !isScanningActive) return "Initializing scanner...";
    if (isScanningActive) return "Position barcode within the frame.";
    return "Preparing scanner..."; // Default fallback
  };


  return (
    <Dialog open={isOpen} onOpenChange={(openState) => {
        if (!openState) { // If dialog is being closed
          // Stop scanner and stream through the main useEffect cleanup by toggling isOpen
        }
        onOpenChange(openState);
    }}>
      <DialogContent className="sm:max-w-md p-0 border-t-4 border-primary">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" /> Scan Barcode
          </DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-3">
          {errorMessage && hasCameraPermission === false && ( // Only show if permission is definitively false
            <Alert variant="destructive">
              <VideoOff className="h-4 w-4" />
              <AlertTitle>Camera Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          {errorMessage && hasCameraPermission !== false && ( // Other errors when permission might be true or null
             <Alert variant="destructive">
                <VideoOff className="h-4 w-4" />
                <AlertTitle>Scanner Problem</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
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
            {/* Overlays for different states */}
            {(isLoadingStream || (hasCameraPermission && !isScanningActive && !errorMessage)) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                  <Loader2 className="h-10 w-10 text-primary/70 animate-spin" />
                  <p className="text-sm text-primary-foreground/80 mt-2">{getHelperText()}</p>
              </div>
            )}
            {isScanningActive && !errorMessage && (
              <>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3/4 h-1/2 border-2 border-primary/60 rounded-lg animate-pulse" style={{animationDuration: '2s'}}></div>
                </div>
              </>
            )}
          </div>
           {(!errorMessage && (hasCameraPermission || isLoadingStream || isScanningActive)) && (
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

