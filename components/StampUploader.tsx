
import React, { useState, useCallback, useRef } from 'react';
import { UploadIcon } from './icons';

interface StampUploaderProps {
  onImageUpload: (file: File) => void;
}

const StampUploader: React.FC<StampUploaderProps> = ({ onImageUpload }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 4 * 1024 * 1024) { // 4MB limit
          alert("File is too large. Please select an image under 4MB.");
          return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = useCallback(() => {
    if (file) {
      onImageUpload(file);
      setFile(null);
      setPreview(null);
      if(fileInputRef.current) {
          fileInputRef.current.value = "";
      }
    }
  }, [file, onImageUpload]);

  const triggerFileSelect = () => {
      fileInputRef.current?.click();
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
        if (droppedFile.size > 4 * 1024 * 1024) { // 4MB limit
            alert("File is too large. Please select an image under 4MB.");
            return;
        }
        setFile(droppedFile);
        setPreview(URL.createObjectURL(droppedFile));
    }
  };

  return (
    <div className="space-y-4">
      {!preview ? (
        <div 
          className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-slate-50 transition-colors"
          onClick={triggerFileSelect}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center text-slate-500">
            <UploadIcon className="w-12 h-12 mb-4" />
            <span className="font-semibold">Drag & drop an image here</span>
            <span className="text-sm">or click to select a file</span>
            <span className="text-xs mt-2">(Max file size: 4MB)</span>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-4">
          <div className="w-48 h-48 border-2 border-slate-200 rounded-md overflow-hidden flex items-center justify-center">
             <img src={preview} alt="Stamp preview" className="object-contain max-w-full max-h-full" />
          </div>
          <div className="flex space-x-4">
            <button
                onClick={triggerFileSelect}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors font-semibold"
            >
                Change Image
            </button>
            <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-bold shadow-sm"
            >
                Identify & Value Stamp
            </button>
          </div>
           <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
          />
        </div>
      )}
    </div>
  );
};

export default StampUploader;
