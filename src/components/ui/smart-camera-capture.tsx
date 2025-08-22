"use client"

import { useState, useEffect } from "react"
import { MobileCameraInput, CapturedPhoto } from "@/components/ui/mobile-camera-input"
import { DesktopCameraCapture } from "@/components/ui/desktop-camera-capture"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Smartphone, Monitor, Camera } from "lucide-react"

interface SmartCameraCaptureProps {
    onPhotoCapture: (photo: CapturedPhoto) => void;
    onCancel: () => void;
}

export function SmartCameraCapture({ onPhotoCapture, onCancel }: SmartCameraCaptureProps) {
    const [isMobile, setIsMobile] = useState(false)
    const [forceMode, setForceMode] = useState<'mobile' | 'desktop' | null>(null)
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
        
        // Detect screen size and touch capability
        const checkIfMobile = () => {
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
            const isSmallScreen = window.innerWidth < 768
            const isMobileUserAgent = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            
            return isTouchDevice && (isSmallScreen || isMobileUserAgent)
        }

        setIsMobile(checkIfMobile())

        // Listen for screen size changes
        const handleResize = () => {
            setIsMobile(checkIfMobile())
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Don't render until client-side hydration is complete
    if (!isClient) {
        return (
            <div className="space-y-4">
                <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Loading Camera...</h3>
                </div>
                <Card>
                    <CardContent className="p-6 text-center">
                        <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-pulse" />
                        <p className="text-muted-foreground">Preparing camera interface...</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const effectiveMode = forceMode || (isMobile ? 'mobile' : 'desktop')

    // Show mode selection if user hasn't forced a specific mode
    if (!forceMode) {
        return (
            <div className="space-y-4">
                <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Choose Camera Mode</h3>
                    <p className="text-sm text-muted-foreground">
                        Select the camera interface that works best for your device
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Mobile Camera Option */}
                    <Card className={`cursor-pointer transition-all hover:shadow-md ${isMobile ? 'ring-2 ring-primary' : ''}`}>
                        <CardContent className="p-6 text-center">
                            <Smartphone className="h-12 w-12 mx-auto mb-3 text-blue-600" />
                            <h4 className="font-semibold mb-2">
                                Mobile Camera
                                {isMobile && <span className="text-xs text-primary ml-2">(Recommended)</span>}
                            </h4>
                            <p className="text-sm text-muted-foreground mb-4">
                                Uses native camera app with file picker. Works great on phones and tablets.
                            </p>
                            <Button 
                                onClick={() => setForceMode('mobile')}
                                variant={isMobile ? "default" : "outline"}
                                className="w-full"
                            >
                                Use Mobile Camera
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Desktop Camera Option */}
                    <Card className={`cursor-pointer transition-all hover:shadow-md ${!isMobile ? 'ring-2 ring-primary' : ''}`}>
                        <CardContent className="p-6 text-center">
                            <Monitor className="h-12 w-12 mx-auto mb-3 text-green-600" />
                            <h4 className="font-semibold mb-2">
                                Desktop Camera
                                {!isMobile && <span className="text-xs text-primary ml-2">(Recommended)</span>}
                            </h4>
                            <p className="text-sm text-muted-foreground mb-4">
                                Live camera preview with manual capture. Perfect for desktops and laptops.
                            </p>
                            <Button 
                                onClick={() => setForceMode('desktop')}
                                variant={!isMobile ? "default" : "outline"}
                                className="w-full"
                            >
                                Use Desktop Camera
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <p className="text-xs text-muted-foreground text-center">
                        <strong>Auto-detected:</strong> {isMobile ? 'Mobile device' : 'Desktop device'} • 
                        Screen: {typeof window !== 'undefined' ? window.innerWidth : 0}px • 
                        Touch: {typeof window !== 'undefined' && 'ontouchstart' in window ? 'Yes' : 'No'}
                    </p>
                </div>

                <div className="flex justify-center">
                    <Button onClick={onCancel} variant="outline">
                        Cancel
                    </Button>
                </div>
            </div>
        )
    }

    // Render the selected camera mode
    return (
        <div className="space-y-4">
            {/* Mode indicator and switch option */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                    {effectiveMode === 'mobile' ? (
                        <Smartphone className="h-4 w-4 text-blue-600" />
                    ) : (
                        <Monitor className="h-4 w-4 text-green-600" />
                    )}
                    <span className="text-sm font-medium">
                        {effectiveMode === 'mobile' ? 'Mobile Camera Mode' : 'Desktop Camera Mode'}
                    </span>
                </div>
                <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setForceMode(null)}
                >
                    Switch Mode
                </Button>
            </div>

            {/* Render appropriate camera component */}
            {effectiveMode === 'mobile' ? (
                <MobileCameraInput 
                    onPhotoCapture={onPhotoCapture}
                    onCancel={onCancel}
                />
            ) : (
                <DesktopCameraCapture 
                    onPhotoCapture={onPhotoCapture}
                    onCancel={onCancel}
                />
            )}
        </div>
    )
}