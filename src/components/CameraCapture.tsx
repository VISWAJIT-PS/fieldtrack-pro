import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, RotateCcw, Check, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CameraCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (blob: Blob) => void;
  title?: string;
}

export function CameraCapture({ open, onOpenChange, onCapture, title = 'Take Selfie' }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: 'Camera Error',
        description: 'Unable to access camera. Please check permissions.',
        variant: 'destructive',
      });
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
    }

    return () => {
      stopCamera();
    };
  }, [open, startCamera, stopCamera]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Mirror the image for front camera
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        
        ctx.drawImage(video, 0, 0);
        const imageUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageUrl);
        stopCamera();
      }
    }
  }, [facingMode, stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const confirmPhoto = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.toBlob(
        (blob) => {
          if (blob) {
            onCapture(blob);
            onOpenChange(false);
          }
        },
        'image/jpeg',
        0.8
      );
    }
  }, [onCapture, onOpenChange]);

  const switchCamera = useCallback(() => {
    stopCamera();
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, [stopCamera]);

  useEffect(() => {
    if (isStreaming === false && !capturedImage && open) {
      startCamera();
    }
  }, [facingMode, isStreaming, capturedImage, open, startCamera]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
            {capturedImage ? (
              <img
                src={capturedImage}
                alt="Captured"
                className="h-full w-full object-cover"
              />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="flex justify-center gap-3">
            {capturedImage ? (
              <>
                <Button variant="outline" onClick={retakePhoto} className="flex-1">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Retake
                </Button>
                <Button onClick={confirmPhoto} className="flex-1 gradient-primary">
                  <Check className="mr-2 h-4 w-4" />
                  Confirm
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={switchCamera}
                  disabled={!isStreaming}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  onClick={capturePhoto}
                  disabled={!isStreaming}
                  className="flex-1 gradient-primary"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Capture
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
