import { supabase } from './supabase'

/**
 * Compresses an image using HTML5 Canvas with progressive compression
 * @param file - The image file to compress
 * @param quality - Initial compression quality (0.1 to 1.0, default: 0.6)
 * @param maxWidth - Maximum width in pixels (default: 800)
 * @param maxHeight - Maximum height in pixels (default: 800)
 * @param maxFileSize - Maximum file size in bytes (default: 4MB)
 * @returns Promise that resolves to compressed File
 */
async function compressImage(
  file: File,
  quality: number = 0.6,
  maxWidth: number = 800,
  maxHeight: number = 800,
  maxFileSize: number = 4 * 1024 * 1024 // 4MB
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    
    const compress = async (currentQuality: number, currentMaxWidth: number, currentMaxHeight: number): Promise<File> => {
      return new Promise((resolveInner) => {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img
        
        if (width > height) {
          if (width > currentMaxWidth) {
            height = (height * currentMaxWidth) / width
            width = currentMaxWidth
          }
        } else {
          if (height > currentMaxHeight) {
            width = (width * currentMaxHeight) / height
            height = currentMaxHeight
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob!], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })
            resolveInner(compressedFile)
          },
          'image/jpeg',
          currentQuality
        )
      })
    }
    
    img.onload = async () => {
      try {
        let compressedFile = await compress(quality, maxWidth, maxHeight)
        console.log(`Initial compressed file size: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`)
        
        // If still too large, progressively reduce quality and size
        const compressionLevels = [
          { quality: 0.4, width: 600, height: 600 },
          { quality: 0.3, width: 400, height: 400 },
          { quality: 0.2, width: 300, height: 300 },
          { quality: 0.1, width: 200, height: 200 }
        ]
        
        for (const level of compressionLevels) {
          if (compressedFile.size <= maxFileSize) break
          console.log(`File too large (${(compressedFile.size / 1024 / 1024).toFixed(2)}MB), trying more aggressive compression...`)
          compressedFile = await compress(level.quality, level.width, level.height)
        }
        
        console.log(`Final compressed file size: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`)
        resolve(compressedFile)
      } catch (error) {
        reject(error)
      }
    }
    
    img.onerror = () => reject(new Error('Failed to load image for compression'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Converts a base64 data URL to a File object
 */
function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  
  return new File([u8arr], filename, { type: mime })
}

/**
 * Uploads an image to Supabase storage with aggressive compression
 * @param bucket - The storage bucket name ('handbills' or 'expenses')
 * @param path - The file path within the bucket (e.g., 'store-id/2025/01/filename.jpg')
 * @param imageData - Either a File object or base64 data URL string
 * @param compress - Whether to compress the image (default: true)
 * @param quality - Initial compression quality 0.1-1.0 (default: 0.6 for better size)
 * @returns The public URL of the uploaded image or null if failed
 */
export async function uploadImage(
  bucket: 'handbills' | 'expenses',
  path: string,
  imageData: File | string,
  compress: boolean = true,
  quality: number = 0.6
): Promise<string | null> {
  try {
    let file: File
    
    // Convert base64 data URL to File if needed
    if (typeof imageData === 'string') {
      const filename = path.split('/').pop() || 'image.jpg'
      file = dataURLtoFile(imageData, filename)
    } else {
      file = imageData
    }

    console.log(`Original file size: ${(file.size / 1024 / 1024).toFixed(2)}MB (${file.size} bytes)`)
    console.log('Original file type:', file.type)

    // Compress image if requested and it's an image file
    if (compress && file.type.startsWith('image/')) {
      try {
        file = await compressImage(file, quality)
        // Update path to have .jpg extension after compression
        path = path.replace(/\.[^.]+$/, '.jpg')
        console.log(`Uploading compressed file: ${(file.size / 1024 / 1024).toFixed(2)}MB (${file.size} bytes)`)
        console.log('Compressed file type:', file.type)
      } catch (compressionError) {
        console.warn('Image compression failed, uploading original:', compressionError)
      }
    }

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false // Don't overwrite existing files
      })

    if (error) {
      console.error('Error uploading image:', error)
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        bucket: bucket,
        path: path,
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`
      })
      
      // Check if it's a bucket not found error
      if (error.message?.includes('Bucket not found') || error.message?.includes('404')) {
        console.error(`Storage bucket '${bucket}' does not exist. Please run the create_storage_buckets.sql migration.`)
      }
      
      return null
    }

    // Get the public URL for the uploaded image
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return urlData.publicUrl
  } catch (error) {
    console.error('Error in uploadImage:', error)
    return null
  }
}

/**
 * Deletes an image from Supabase storage
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 */
export async function deleteImage(
  bucket: 'handbills' | 'expenses',
  path: string
): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      console.error('Error deleting image:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in deleteImage:', error)
    return false
  }
}

/**
 * Generates a unique file path for storing images
 * @param storeId - The store ID
 * @param type - The type of image (handbill or expense)
 * @param originalName - The original file name (optional)
 */
export function generateImagePath(
  storeId: string,
  type: 'handbill' | 'expense',
  originalName?: string
): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const timestamp = now.getTime()
  
  const extension = originalName?.split('.').pop() || 'jpg'
  const filename = `${type}_${timestamp}.${extension}`
  
  return `${storeId}/${year}/${month}/${day}/${filename}`
}

/**
 * Gets a signed URL for private bucket access
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @param expiresIn - Expiry time in seconds (default: 3600 = 1 hour)
 */
export async function getSignedUrl(
  bucket: 'handbills' | 'expenses',
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)

    if (error) {
      console.error('Error creating signed URL:', error)
      return null
    }

    return data.signedUrl
  } catch (error) {
    console.error('Error in getSignedUrl:', error)
    return null
  }
}