"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Camera, X, CheckCircle } from "lucide-react"

export interface CapturedPhoto {
  dataUrl: string
  sizeKB: number
  timestamp: string
}

interface MobileCameraInputProps {
  onPhotoCapture: (photo: CapturedPhoto) => void
  onCancel: () => void
}

export function MobileCameraInput({ onPhotoCapture, onCancel }: MobileCameraInputProps) {
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image too large. Please use an image under 5MB.")
        return
      }

      // Convert to base64
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        const newPhoto: CapturedPhoto = {
          dataUrl,
          sizeKB: Math.round(file.size / 1024),
          timestamp: new Date().toISOString()
        }
        
        setPhoto(newPhoto)
        setError(null)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setError("Failed to process photo. Please try again.")
    }
  }

  const handleSubmit = () => {
    if (photo) {
      onPhotoCapture(photo)
    }
  }

  const handleRetake = () => {
    setPhoto(null)
    setError(null)
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Capture Hand Bill Image</h3>
        <p className="text-sm text-muted-foreground">
          Take a clear photo of the handwritten bill
        </p>
      </div>
      
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      
      {!photo ? (
        <Card>
          <CardContent className="p-6">
            <Button
              asChild
              variant="outline"
              className="w-full h-32 border-dashed border-2 hover:border-primary"
            >
              <label className="cursor-pointer flex flex-col items-center justify-center gap-2">
                <Camera className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">Tap to Take Photo</span>
                <span className="text-xs text-muted-foreground">Or select from gallery</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={handleFileSelect}
                />
              </label>
            </Button>
            <div className="mt-4 text-xs text-muted-foreground text-center">
              <p>• Ensure the bill is clearly visible and legible</p>
              <p>• Use good lighting for best results</p>
              <p>• Maximum file size: 5MB</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="relative">
              <img 
                src={photo.dataUrl} 
                alt="Captured hand bill"
                className="w-full h-auto rounded-lg border"
              />
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                onClick={handleRetake}
              >
                <X className="h-4 w-4 mr-1" />
                Retake
              </Button>
            </div>
            <div className="mt-3 text-center">
              <p className="text-sm text-muted-foreground">
                Image size: {photo.sizeKB}KB
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="flex gap-2">
        <Button onClick={onCancel} variant="outline" className="flex-1">
          Cancel
        </Button>
        {photo && (
          <Button onClick={handleSubmit} className="flex-1">
            <CheckCircle className="h-4 w-4 mr-2" />
            Use This Photo
          </Button>
        )}
      </div>
    </div>
  )
}