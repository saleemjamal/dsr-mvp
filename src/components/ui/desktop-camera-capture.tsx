"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CameraService, CapturedPhoto } from "@/services/camera-service"
import { Camera, RotateCcw, CheckCircle, AlertTriangle } from "lucide-react"

interface DesktopCameraCaptureProps {
    onPhotoCapture: (photo: CapturedPhoto) => void;
    onCancel: () => void;
}

export function DesktopCameraCapture({ onPhotoCapture, onCancel }: DesktopCameraCaptureProps) {
    const [cameraReady, setCameraReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const cameraService = useRef(new CameraService());

    useEffect(() => {
        initializeCamera();
        return () => cameraService.current.stopCamera();
    }, []);

    const initializeCamera = async () => {
        try {
            const stream = await cameraService.current.initializeCamera();
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setCameraReady(true);
                setError(null);
            }
        } catch (error) {
            setError((error as Error).message);
        }
    };

    const capturePhoto = async () => {
        if (!videoRef.current || !cameraReady) return;

        setProcessing(true);
        try {
            // Capture raw photo
            const rawDataUrl = cameraService.current.capturePhoto(videoRef.current);
            
            // Compress to target size (500KB for documents)
            const compressedDataUrl = await cameraService.current.compressImage(rawDataUrl, 500);
            
            const photo: CapturedPhoto = {
                dataUrl: compressedDataUrl,
                sizeKB: Math.round(cameraService.current.getImageSizeKB(compressedDataUrl)),
                timestamp: new Date().toISOString()
            };

            setCapturedPhoto(photo);
        } catch (error) {
            setError('Failed to capture photo. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const retakePhoto = () => {
        setCapturedPhoto(null);
        setError(null);
    };

    const confirmPhoto = () => {
        if (capturedPhoto) {
            cameraService.current.stopCamera();
            onPhotoCapture(capturedPhoto);
        }
    };

    if (error) {
        return (
            <div className="space-y-4">
                <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Camera Access Error</h3>
                </div>
                
                <Card>
                    <CardContent className="p-6 text-center">
                        <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
                            {error}
                        </div>
                        <div className="flex gap-2 justify-center">
                            <Button onClick={onCancel} variant="outline">
                                Cancel
                            </Button>
                            <Button onClick={initializeCamera}>
                                Retry Camera Access
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Capture Hand Bill Image</h3>
                <p className="text-sm text-muted-foreground">
                    Position the bill clearly in the frame and capture
                </p>
            </div>

            {!capturedPhoto ? (
                <>
                    {/* Camera Feed */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className={`w-full h-full object-cover ${cameraReady ? 'block' : 'hidden'}`}
                                />
                                {!cameraReady && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                                        <div className="text-center">
                                            <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2 animate-pulse" />
                                            <p className="text-gray-500">Initializing camera...</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Camera Instructions */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">📷 Camera Tips</h4>
                        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                            <li>• Ensure good lighting for clear text visibility</li>
                            <li>• Position the bill flat and fully within the frame</li>
                            <li>• Hold steady and avoid shadows on the document</li>
                            <li>• Make sure all text and numbers are legible</li>
                        </ul>
                    </div>

                    {/* Capture Button */}
                    <div className="flex gap-2 justify-center">
                        <Button onClick={onCancel} variant="outline">
                            Cancel
                        </Button>
                        <Button
                            onClick={capturePhoto}
                            disabled={!cameraReady || processing}
                            className="px-8"
                        >
                            {processing ? (
                                <>
                                    <Camera className="mr-2 h-4 w-4 animate-pulse" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Camera className="mr-2 h-4 w-4" />
                                    Capture Photo
                                </>
                            )}
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    {/* Photo Preview */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="relative">
                                <img
                                    src={capturedPhoto.dataUrl}
                                    alt="Captured hand bill"
                                    className="w-full h-auto rounded-lg border"
                                />
                                <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                                    {capturedPhoto.sizeKB}KB
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Photo Actions */}
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                        <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <p className="text-sm text-green-700 dark:text-green-300">
                            Photo captured successfully! Review and confirm or retake if needed.
                        </p>
                    </div>

                    <div className="flex gap-2 justify-center">
                        <Button onClick={retakePhoto} variant="outline">
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Retake
                        </Button>
                        <Button onClick={confirmPhoto} className="px-8">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Use This Photo
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}