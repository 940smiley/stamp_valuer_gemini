
import React, { useState, useRef } from 'react';
import type { BatchItem, AppSettings, StampData, Stamp } from '../types';
import { identifyAndValueStamp, checkIsPhilatelic } from '../services/geminiService';
import Loader from './Loader';

interface BatchProcessorProps {
  settings: AppSettings;
  onProcessed: (stamps: Stamp[]) => void;
}

const BatchProcessor: React.FC<BatchProcessorProps> = ({ settings, onProcessed }) => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Fix: Explicitly cast and map files to resolve 'unknown' type issues
    const fileList = e.target.files;
    if (!fileList) return;
    
    const files: File[] = Array.from(fileList);
    const newItems: BatchItem[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file: file,
      preview: URL.createObjectURL(file),
      status: 'pending'
    }));
    setItems(prev => [...prev, ...newItems]);
  };

  const processBatch = async () => {
    setIsProcessing(true);
    const results: Stamp[] = [];

    for (const item of items) {
      if (item.status !== 'pending') continue;

      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'checking' } : i));

      try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(item.file);
        });
        const base64 = await base64Promise;

        // Step 1: Sanitize (Check if philatelic)
        const isPhilatelic = await checkIsPhilatelic(base64);

        if (!isPhilatelic) {
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'rejected' } : i));
          continue;
        }

        // Step 2: Identify and Value
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'processing' } : i));
        const data = await identifyAndValueStamp(base64, settings);
        
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'completed', result: data } : i));
        
        results.push({
          ...data,
          id: Date.now() + Math.random(),
          imageUrl: item.preview
        });

      } catch (err) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', error: String(err) } : i));
      }
    }

    onProcessed(results);
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Batch Directory Sanitization</h2>
        <p className="text-slate-600 mb-6">
          Select a folder or group of images. Our AI will filter out non-philatelic images and automatically categorize the rest.
        </p>

        <div className="flex flex-wrap gap-4">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition flex items-center shadow-md"
            disabled={isProcessing}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Select Images / Folder
          </button>

          {items.length > 0 && (
            <button 
              onClick={processBatch}
              disabled={isProcessing}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition flex items-center shadow-md disabled:bg-slate-400"
            >
              {isProcessing ? (
                <span className="flex items-center"><Loader /><span className="ml-2">Processing...</span></span>
              ) : (
                <>Start AI Categorization</>
              )}
            </button>
          )}

          <button 
            onClick={() => setItems([])}
            className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 transition"
          >
            Clear List
          </button>
        </div>

        <input 
          type="file" 
          multiple 
          ref={fileInputRef} 
          onChange={handleFiles} 
          className="hidden" 
          accept="image/*"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map(item => (
          <div key={item.id} className="relative bg-white rounded-lg border border-slate-200 overflow-hidden group shadow-sm">
            <img src={item.preview} className="w-full h-32 object-cover" alt={item.file.name} />
            
            <div className="p-2 text-xs truncate font-medium text-slate-600">
              {item.file.name}
            </div>

            <div className={`absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity`}>
               <span className="text-white text-[10px] font-bold uppercase tracking-wider">
                  {item.status}
               </span>
            </div>

            {item.status === 'completed' && (
              <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>
              </div>
            )}
            {item.status === 'rejected' && (
              <div className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" /></svg>
              </div>
            )}
            {(item.status === 'checking' || item.status === 'processing') && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BatchProcessor;
