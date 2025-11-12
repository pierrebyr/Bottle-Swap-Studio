import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { UploadedImage } from '../types';

interface ImageUploaderProps {
  id: string;
  label: string;
  onImageUpload: (image: UploadedImage | null) => void;
  // Fix for "Cannot find namespace 'JSX'". Using React.ReactElement is a safe alternative.
  icon: React.ReactElement;
}

const MAX_FILE_SIZE_MB = 10; // Maximum file size in MB
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const compressImage = (file: File, maxWidth: number = 1920, maxHeight: number = 1920, quality: number = 0.9): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Failed to get canvas context'));
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          file.type.startsWith('image/png') ? 'image/png' : 'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

const fileToUploadedImage = async (file: File): Promise<UploadedImage> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Invalid file type. Please upload an image.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE_MB}MB. Please upload a smaller image.`);
  }

  // Compress the image if it's larger than 2MB
  let processedFile: Blob = file;
  if (file.size > 2 * 1024 * 1024) {
    processedFile = await compressImage(file);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(processedFile);
  });
};

export const ImageUploader: React.FC<ImageUploaderProps> = ({ id, label, onImageUpload, icon }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup preview URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    try {
        const uploadedImage = await fileToUploadedImage(file);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(URL.createObjectURL(file));
        onImageUpload(uploadedImage);
    } catch (error) {
        console.error("Error reading file:", error);
        alert(error instanceof Error ? error.message : 'Failed to read file.');
        onImageUpload(null);
    } finally {
        setIsProcessing(false);
    }
  }, [onImageUpload, previewUrl]);

  const handleFileChange = useCallback(async (files: FileList | null) => {
    if (files && files.length > 0) {
      await processFile(files[0]);
    } else {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      onImageUpload(null);
    }
  }, [processFile, previewUrl, onImageUpload]);

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  }, [handleFileChange]);
  
  const handleRemoveImage = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onImageUpload(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }, [previewUrl, onImageUpload]);


  return (
    <div className="w-full">
      <label
        htmlFor={id}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ease-in-out
          ${isDragging ? 'border-zinc-600 bg-zinc-900/50' : 'border-zinc-800 bg-transparent hover:bg-zinc-900/50'}
          ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center">
            <svg className="animate-spin h-10 w-10 text-zinc-300 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm text-zinc-400">Processing image...</p>
          </div>
        ) : previewUrl ? (
          <>
            <img src={previewUrl} alt={label} className="object-contain w-full h-full p-2 rounded-lg" />
            <button
              onClick={(e) => {
                e.preventDefault();
                handleRemoveImage();
              }}
              className="absolute top-2 right-2 bg-zinc-900/60 backdrop-blur-sm text-zinc-200 rounded-full p-1.5 hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-red-500 transition-all transform hover:scale-105"
              aria-label="Remove image"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center pointer-events-none">
            {icon}
            <p className="mb-2 text-sm text-zinc-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
            <p className="text-xs text-zinc-500">{label}</p>
            <p className="text-xs text-zinc-600 mt-2">Max {MAX_FILE_SIZE_MB}MB • Images will be compressed automatically</p>
          </div>
        )}
        <input
          id={id}
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={(e) => handleFileChange(e.target.files)}
          disabled={isProcessing}
        />
      </label>
    </div>
  );
};