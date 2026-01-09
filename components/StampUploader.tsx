
import React, { useState, useCallback, useRef } from 'react';
import { UploadIcon } from './icons';
import { pickFileFromGoogle, checkGoogleConfig } from '../services/googleService';
import Loader from './Loader';

interface StampUploaderProps {
  onImageUpload: (file: File) => void;
  onVideoUpload?: (file: File) => void;
}

const StampUploader: React.FC<StampUploaderProps> = ({ onImageUpload, onVideoUpload }) => {
  const [mode, setMode] = useState<'image' | 'video'>('image');
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  
  // Cloud State
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [configError, setConfigError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read settings from localStorage to check for Google config (simple solution without prop drilling)
  const getSettings = () => {
      const saved = localStorage.getItem('stamp-valuer-settings');
      return saved ? JSON.parse(saved) : {};
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
        const limit = mode === 'image' ? 4 : 20;
        if (selectedFile.size > limit * 1024 * 1024) {
            alert(`File is too large. Please select a ${mode} under ${limit}MB.`);
            return;
        }

        setFile(selectedFile);
        if (mode === 'image') {
            setPreview(URL.createObjectURL(selectedFile));
        } else {
             setPreview(URL.createObjectURL(selectedFile));
        }
    }
  };

  const handleSubmit = useCallback(() => {
    if (file) {
      if (mode === 'image') {
          onImageUpload(file);
      } else if (onVideoUpload) {
          onVideoUpload(file);
      }
      setFile(null);
      setPreview(null);
      if(fileInputRef.current) {
          fileInputRef.current.value = "";
      }
    }
  }, [file, onImageUpload, onVideoUpload, mode]);

  const triggerFileSelect = (e: React.MouseEvent) => {
      if (!preview) {
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
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
        if (mode === 'image' && !droppedFile.type.startsWith('image/')) {
            alert("Please drop an image file.");
            return;
        }
        if (mode === 'video' && !droppedFile.type.startsWith('video/')) {
            alert("Please drop a video file.");
            return;
        }

        const limit = mode === 'image' ? 4 : 20;
        if (droppedFile.size > limit * 1024 * 1024) {
            alert(`File is too large. Please select a ${mode} under ${limit}MB.`);
            return;
        }
        setFile(droppedFile);
        setPreview(URL.createObjectURL(droppedFile));
    }
  };

  // Cloud Picker Handler
  const handleCloudPick = async (source: 'Drive' | 'Photos') => {
      if (mode === 'video') { alert("Cloud import not supported for video in this version."); return; }
      
      const settings = getSettings();
      if (!checkGoogleConfig(settings.googleClientId, settings.googleDeveloperKey)) {
          setConfigError(true);
          return;
      }

      setIsCloudLoading(true);
      try {
          const pickedFile = await pickFileFromGoogle(source, settings.googleClientId, settings.googleDeveloperKey);
          if (pickedFile) {
              setFile(pickedFile);
              setPreview(URL.createObjectURL(pickedFile));
          }
      } catch (e) {
          console.error(e);
          alert("Failed to load file from Google. Please check your credentials and network.");
      } finally {
          setIsCloudLoading(false);
      }
  };

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg w-fit mx-auto md:mx-0">
          <button 
            onClick={() => { setMode('image'); setFile(null); setPreview(null); }}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${mode === 'image' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Single Stamp Image
          </button>
          <button 
            onClick={() => { setMode('video'); setFile(null); setPreview(null); }}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${mode === 'video' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Collection Video
          </button>
      </div>

      {/* Main Drop Area */}
      {!preview ? (
        <div 
          className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-slate-50 transition-all relative group"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
        >
           {isCloudLoading && (
              <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
                  <Loader />
                  <p className="mt-2 text-slate-600 font-bold animate-pulse">Connecting to Google...</p>
              </div>
           )}

          <div className="flex flex-col items-center text-slate-500 pointer-events-none">
            {mode === 'image' ? (
                <UploadIcon className="w-12 h-12 mb-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
            ) : (
                <svg className="w-12 h-12 mb-4 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            )}
            <span className="font-semibold text-lg text-slate-700">Drag & drop a {mode} here</span>
            <span className="text-sm">or click anywhere to select a file</span>
            <span className="text-xs mt-2 text-slate-400 mb-4">(Max: {mode === 'image' ? '4MB' : '20MB'})</span>
          </div>
          
          <div 
            className="flex items-center justify-center gap-4 mt-6 border-t pt-6 border-slate-200 z-10 relative" 
            onClick={(e) => { e.stopPropagation(); }}
          >
              <button 
                type="button"
                onClick={() => handleCloudPick('Drive')} 
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 hover:shadow-sm text-sm font-bold text-slate-700 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={mode === 'video' || isCloudLoading}
              >
                 <svg className="w-5 h-5" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg"><path d="m6.6 66.85 3.85 6.65c.8 1.4 1.9 2.5 3.2 3.3l12.3-21.3h-25.3c-.1 1.5.4 3 1.3 4.55zm26.25-45.55 12.3 21.3 12.6-21.8-12.6-21.8c-.8-1.4-1.9-2.5-3.2-3.3l-12.3 21.3zm38.7 6.1-12.6 21.8 13.9 24.1c.9-.5 1.75-1.15 2.45-1.95.7-.8 1.25-1.7 1.6-2.65l10.4-18c.9-1.55.9-3.45 0-5l-3.85-6.65c-.8-1.4-1.9-2.5-3.2-3.3l-8.7-14.35z" fill="currentColor"/></svg>
                 Google Drive
              </button>
              <button 
                type="button"
                onClick={() => handleCloudPick('Photos')}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 hover:shadow-sm text-sm font-bold text-slate-700 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={mode === 'video' || isCloudLoading}
              >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm-2.42 5.09a3.87 3.87 0 0 1 3.87 3.87c0 .41-.07.8-.19 1.17l1.72-1.72A5.8 5.8 0 0 0 9.58 3.16c-3.2 0-5.81 2.6-5.81 5.81a5.79 5.79 0 0 0 1.05 3.3L3.1 14a7.73 7.73 0 0 1-1.35-4.42c0-4.28 3.47-7.74 7.74-7.74h.09v3.25zm8.9 2.05A7.73 7.73 0 0 1 19.83 11.56c0 4.28-3.47 7.74-7.74 7.74h-.09v-3.25a3.87 3.87 0 0 1-3.87-3.87c0-.41.07-.8.19-1.17l-1.72 1.72A5.8 5.8 0 0 0 12.51 19.34c3.2 0 5.81-2.6 5.81-5.81a5.79 5.79 0 0 0-1.05-3.3L19.06 8.5a7.73 7.73 0 0 1 1.35 4.42z" fill="currentColor"/></svg>
                  Google Photos
              </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={mode === 'image' ? "image/png, image/jpeg, image/webp" : "video/mp4, video/quicktime, video/webm"}
            className="hidden"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-4">
          <div className="w-64 h-48 border-2 border-slate-200 rounded-md overflow-hidden flex items-center justify-center bg-black relative group">
             {mode === 'image' ? (
                <img src={preview} alt="Preview" className="object-contain max-w-full max-h-full" />
             ) : (
                <video src={preview} controls className="max-w-full max-h-full" />
             )}
          </div>
          <div className="flex space-x-4">
            <button
                onClick={() => { setPreview(null); setFile(null); }}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors font-semibold"
            >
                Change File
            </button>
            <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-bold shadow-sm"
            >
                {mode === 'image' ? 'Identify & Value Stamp' : 'Analyze Collection Video'}
            </button>
          </div>
        </div>
      )}

      {/* Missing Config Modal */}
      {configError && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-center p-8">
                  <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                       <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Configuration Required</h3>
                  <p className="text-slate-600 mb-6 text-sm">
                      To access your files, you must configure your <strong>Google Client ID</strong> and <strong>Developer Key</strong> in the settings.
                  </p>
                  <div className="flex justify-center gap-3">
                      <button onClick={() => setConfigError(false)} className="px-4 py-2 text-slate-500 font-medium hover:bg-slate-100 rounded">Cancel</button>
                      <button onClick={() => { setConfigError(false); document.querySelector('button[onClick*="settings"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })); alert("Please go to the Settings tab."); }} className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">
                          Go to Settings
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default StampUploader;
