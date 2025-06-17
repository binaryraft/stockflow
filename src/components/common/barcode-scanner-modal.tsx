
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

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    setErrorMessage(null); // Reset error on open
    const reader = new BrowserMultiFormatReader();
    codeReaderRef.current = reader;

    const startScanner = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Wait for video metadata to load to get correct dimensions
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current && codeReaderRef.current && isOpen) { // Check isOpen again
              codeReaderRef.current.decodeFromVideoDevice(undefined, videoRef.current, (result, error) => {
                if (result) {
                  onScanSuccess(result.getText());
                  stopScanner(); // Stop after successful scan
                  onOpenChange(false); // Close modal
                }
                if (error) {
                  if (!(error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException)) {
                    console.error('Barcode scan error:', error);
                    if (onScanError) {
                      onScanError(error);
                    } else {
                      // Only show toast for unexpected errors, not for normal scan failures
                      // toast({ variant: 'destructive', title: 'Scan Error', description: 'Could not decode barcode.' });
                    }
                  }
                }
              }).catch(err => {
                console.error("Error starting decodeFromVideoDevice: ", err);
                setErrorMessage("Could not start barcode scanner. Please ensure camera is not in use by another app.");
                if (onScanError) onScanError(err as Error);
              });
            }
          };
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setHasCameraPermission(false);
        if (err instanceof Error && err.name === "NotAllowedError") {
            setErrorMessage('Camera permission denied. Please enable camera access in your browser settings.');
        } else {
            setErrorMessage('Could not access camera. Please ensure it is connected and not in use.');
        }
        if (onScanError) onScanError(err as Error);
      }
    };

    startScanner();

    return () => {
      stopScanner();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // onScanSuccess, onScanError, onOpenChange are stable

  const stopScanner = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={(openState) => {
        if (!openState) {
            stopScanner(); // Ensure scanner stops if dialog is closed externally
        }
        onOpenChange(openState);
    }}>
      <DialogContent className="sm:max-w-md p-0 border-t-4 border-primary">
        <DialogHeader className="p-4 border-b flex flex-row justify-between items-center">
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" /> Scan Barcode
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close scanner">
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
                playsInline
                muted
                data-ai-hint="barcode scanner camera" // Added data-ai-hint here
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
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
