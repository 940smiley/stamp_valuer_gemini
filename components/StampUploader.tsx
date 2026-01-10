
import React, { useState, useCallback, useRef } from 'react';
import { UploadIcon } from './icons';
import Loader from './Loader';
import BatchProcessor from './BatchProcessor';
import type { AppSettings, Stamp } from '../types';

interface StampUploaderProps {
  onImageUpload: (file: File) => void;
  onVideoUpload: (file: File) => void;
  // Added for Batch support
  onBatchProcessed: (stamps: Stamp[]) => void;
  settings: AppSettings;
}

type UploadTab = 'single' | 'batch' | 'video';

const StampUploader: React.FC<StampUploaderProps> = ({ 
    onImageUpload, 
    onVideoUpload, 
    onBatchProcessed, 
    settings 
}) => {
  const [activeTab, setActiveTab] = useState<UploadTab>('single');
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
        const limit = activeTab === 'video' ? 20 : 10;
        if (selectedFile.size > limit * 1024 * 1024) {
            alert(`File is too large. Please select a file under ${limit}MB.`);
            return;
        }

        setFile(selectedFile);
        setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = useCallback(() => {
    if (file) {
      if (activeTab === 'single') {
          onImageUpload(file);
      } else if (activeTab === 'video') {
          onVideoUpload(file);
      }
      setFile(null);
      setPreview(null);
      if(fileInputRef.current) {
          fileInputRef.current.value = "";
      }
    }
  }, [file, onImageUpload, onVideoUpload, activeTab]);

  const triggerFileSelect = (e: React.MouseEvent) => {
      if (!preview && activeTab !== 'batch') {
        const target = e.target as HTMLElement;
        if (target.closest('button')) return;
        fileInputRef.current?.click();
      }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (activeTab === 'batch') return; // Batch has its own drop logic inside BatchProcessor

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
        if (activeTab === 'single' && !droppedFile.type.startsWith('image/')) {
            alert("Please drop an image file.");
            return;
        }
        if (activeTab === 'video' && !droppedFile.type.startsWith('video/')) {
            alert("Please drop a video file.");
            return;
        }

        const limit = activeTab === 'video' ? 20 : 10;
        if (droppedFile.size > limit * 1024 * 1024) {
            alert(`File is too large.`);
            return;
        }
        setFile(droppedFile);
        setPreview(URL.createObjectURL(droppedFile));
    }
  };

  return (
    <div className="space-y-0">
      {/* Tabs */}
      <div className="flex border-b border-slate-200">
          <button 
            onClick={() => { setActiveTab('single'); setFile(null); setPreview(null); }}
            className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'single' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            SINGLE UPLOAD
          </button>
          <button 
            onClick={() => { setActiveTab('batch'); setFile(null); setPreview(null); }}
            className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'batch' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            BATCH / MULTIPLE
          </button>
          <button 
            onClick={() => { setActiveTab('video'); setFile(null); setPreview(null); }}
            className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeTab === 'video' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            COLLECTION VIDEO
          </button>
      </div>

      <div className="bg-white p-6 rounded-b-xl border border-t-0 border-slate-200 min-h-[300px]">
          
          {/* BATCH MODE */}
          {activeTab === 'batch' && (
              <div className="animate-fade-in">
                  <BatchProcessor 
                    settings={settings} 
                    onProcessed={onBatchProcessed} 
                    embedded={true} 
                  />
              </div>
          )}

          {/* SINGLE & VIDEO MODE */}
          {activeTab !== 'batch' && (
             <>
                 {!preview ? (
                    <div 
                      className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-slate-50 transition-all relative group h-full min-h-[250px] flex flex-col justify-center"
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={triggerFileSelect}
                    >
                      <div className="flex flex-col items-center text-slate-500 pointer-events-none">
                        {activeTab === 'single' ? (
                            <UploadIcon className="w-16 h-16 mb-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                        ) : (
                            <svg className="w-16 h-16 mb-4 text-slate-300 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        )}
                        <span className="font-bold text-xl text-slate-700 mb-1">
                            {activeTab === 'single' ? 'Drop single stamp image' : 'Drop collection video'}
                        </span>
                        <span className="text-sm text-slate-400">or click to browse local files</span>
                        <span className="text-xs mt-4 bg-slate-100 px-2 py-1 rounded text-slate-500">Max: {activeTab === 'video' ? '20MB' : '10MB'}</span>
                      </div>
                      
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept={activeTab === 'single' ? "image/png, image/jpeg, image/webp" : "video/mp4, video/quicktime, video/webm"}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-6">
                      <div className="w-full h-64 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center relative group shadow-inner">
                         {activeTab === 'single' ? (
                            <img src={preview} alt="Preview" className="object-contain max-w-full max-h-full" />
                         ) : (
                            <video src={preview} controls className="max-w-full max-h-full" />
                         )}
                      </div>
                      <div className="flex w-full gap-4">
                        <button
                            onClick={() => { setPreview(null); setFile(null); }}
                            className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-bold"
                        >
                            Change File
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-md flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                            {activeTab === 'single' ? 'Analyze Stamp' : 'Analyze Video'}
                        </button>
                      </div>
                    </div>
                  )}
             </>
          )}

      </div>
    </div>
  );
};

export default StampUploader;
