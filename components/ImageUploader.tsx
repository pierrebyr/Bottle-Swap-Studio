import React, { useState, useCallback, useRef } from 'react';
import type { UploadedImage } from '../types';

interface ImageUploaderProps {
  id: string;
  label: string;
  onImageUpload: (image: UploadedImage | null) => void;
  // Fix for "Cannot find namespace 'JSX'". Using React.ReactElement is a safe alternative.
  icon: React.ReactElement;
}

const fileToUploadedImage = (file: File): Promise<UploadedImage> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
        return reject(new Error('Invalid file type. Please upload an image.'));
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export const ImageUploader: React.FC<ImageUploaderProps> = ({ id, label, onImageUpload, icon }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
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
          ${isDragging ? 'border-zinc-600 bg-zinc-900/50' : 'border-zinc-800 bg-transparent hover:bg-zinc-900/50'}`}
      >
        {previewUrl ? (
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
          </div>
        )}
        <input
          id={id}
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={(e) => handleFileChange(e.target.files)}
        />
      </label>
    </div>
  );
};