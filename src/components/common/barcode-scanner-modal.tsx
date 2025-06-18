
"use client";

import React, { useEffect, useRef, useState } from 'react';
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

  const stopScanner = React.useCallback(() => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      // According to zxing-js/library docs, reset should be enough.
      // No explicit 'stop' method on BrowserMultiFormatReader itself.
      // Streams are stopped below.
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

    setErrorMessage(null); 
    setHasCameraPermission(null); // Reset permission status on open
    const reader = new BrowserMultiFormatReader();
    codeReaderRef.current = reader;

    const startScanner = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          videoRef.current.onloadedmetadata = () => {
            // Ensure the modal is still open and references are valid
            if (videoRef.current && codeReaderRef.current && isOpen) {
              if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
                console.warn("BarcodeScannerModal: Video metadata loaded but dimensions are zero.");
                setErrorMessage("Video stream has invalid dimensions (0x0). Cannot start scanner.");
                if(onScanError) onScanError(new Error("Video stream has invalid dimensions (0x0)."));
                stopScanner(); 
                return;
              }
              
              // Explicitly play the video after metadata is loaded
              videoRef.current.play().then(() => {
                if (codeReaderRef.current && videoRef.current && isOpen) { // Re-check isOpen before decoding
                  codeReaderRef.current.decodeFromVideoDevice(undefined, videoRef.current, (result, error) => {
                    if (!isOpen || !codeReaderRef.current) return; // Check if modal closed during async op

                    if (result) {
                      onScanSuccess(result.getText());
                      stopScanner(); 
                      onOpenChange(false); 
                    }
                    if (error) {
                      if (!(error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException)) {
                        console.error('Barcode scan error:', error);
                        if (onScanError) {
                          onScanError(error);
                        }
                      }
                    }
                  }).catch(decodeErr => {
                    console.error("Error during decodeFromVideoDevice: ", decodeErr);
                    if (isOpen) { // Only set error if modal is still relevant
                        setErrorMessage("Could not start barcode reader. Ensure camera is not obstructed and page has focus.");
                        if (onScanError) onScanError(decodeErr as Error);
                    }
                  });
                }
              }).catch(playError => {
                console.error("Error playing video for scanner:", playError);
                if (isOpen) {
                    setErrorMessage("Could not play video stream for scanning.");
                    if (onScanError) onScanError(playError as Error);
                }
              });
            }
          };
           videoRef.current.onerror = (e) => {
             console.error("Video error:", e);
             if (isOpen) {
                setErrorMessage("Video element encountered an error.");
                if (onScanError) onScanError(new Error("Video element error"));
             }
           };
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        if (isOpen) {
            setHasCameraPermission(false);
            if (err instanceof Error && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
                setErrorMessage('Camera permission denied. Please enable camera access in your browser settings.');
            } else if (err instanceof Error && err.name === "NotFoundError"){
                 setErrorMessage('No camera found. Please ensure a camera is connected.');
            } else {
                setErrorMessage('Could not access camera. Please ensure it is connected and not in use.');
            }
            if (onScanError) onScanError(err as Error);
        }
      }
    };

    startScanner();

    return () => {
      stopScanner();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, onOpenChange, onScanSuccess, onScanError, stopScanner]);


  return (
    <Dialog open={isOpen} onOpenChange={(openState) => {
        if (!openState) {
            stopScanner();
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
          {hasCameraPermission === false && (
            <Alert variant="destructive">
              <VideoOff className="h-4 w-4" />
              <AlertTitle>Camera Access Problem</AlertTitle>
              <AlertDescription>
                {errorMessage || "Camera permission is required to scan barcodes. Please enable it in your browser settings and refresh the page."}
              </AlertDescription>
            </Alert>
          )}
          {hasCameraPermission === true && !errorMessage && (
            <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden shadow-inner">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline // Important for iOS
                muted // Important for autoPlay without user interaction
                data-ai-hint="barcode scanner camera"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/4 h-1/3 border-2 border-primary/50 rounded-lg animate-pulse" style={{animationDuration: '2s'}}></div>
              </div>
            </div>
          )}
           {hasCameraPermission === true && errorMessage && (
             <Alert variant="destructive">
                <VideoOff className="h-4 w-4" />
                <AlertTitle>Scanner Error</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          {hasCameraPermission === null && !errorMessage && (
             <div className="flex flex-col items-center justify-center h-48 bg-muted rounded-md">
                <ScanLine className="h-12 w-12 text-muted-foreground animate-ping" />
                <p className="mt-2 text-muted-foreground">Requesting camera access...</p>
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
