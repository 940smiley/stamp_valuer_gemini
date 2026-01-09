
import React, { useState, useRef } from 'react';
import type { BatchItem, AppSettings, Stamp } from '../types';
import { identifyAndValueStamp, checkIsPhilatelic } from '../services/geminiService';
import Loader from './Loader';

interface BatchProcessorProps {
  settings: AppSettings;
  onProcessed: (stamps: Stamp[]) => void;
}

const BatchProcessor: React.FC<BatchProcessorProps> = ({ settings, onProcessed }) => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // Track bulk edit state
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedItemIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedItemIds(newSet);
  };

  const selectAll = () => {
    if (selectedItemIds.size === items.length) {
        setSelectedItemIds(new Set());
    } else {
        setSelectedItemIds(new Set(items.map(i => i.id)));
    }
  };

  // --- Common Edit Actions ---

  const processImageOnCanvas = async (dataUrl: string, operation: 'rotateLeft' | 'rotateRight' | 'enhance'): Promise<string> => {
      return new Promise((resolve, reject) => {
          const img = new Image();
          img.src = dataUrl;
          img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              if (!ctx) { reject("Canvas error"); return; }

              if (operation === 'rotateLeft' || operation === 'rotateRight') {
                  canvas.width = img.height;
                  canvas.height = img.width;
                  ctx.translate(canvas.width / 2, canvas.height / 2);
                  ctx.rotate(operation === 'rotateRight' ? Math.PI / 2 : -Math.PI / 2);
                  ctx.drawImage(img, -img.width / 2, -img.height / 2);
              } else if (operation === 'enhance') {
                  canvas.width = img.width;
                  canvas.height = img.height;
                  ctx.drawImage(img, 0, 0);
                  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                  const data = imageData.data;
                  // Simple histogram stretch
                  let min = 255, max = 0;
                  for (let i = 0; i < data.length; i += 4) {
                      const avg = (data[i] + data[i+1] + data[i+2]) / 3;
                      if (avg < min) min = avg;
                      if (avg > max) max = avg;
                  }
                  const range = max - min;
                  if (range > 10) {
                      for (let i = 0; i < data.length; i += 4) {
                          data[i] = ((data[i] - min) / range) * 255;
                          data[i+1] = ((data[i+1] - min) / range) * 255;
                          data[i+2] = ((data[i+2] - min) / range) * 255;
                      }
                      ctx.putImageData(imageData, 0, 0);
                  }
              }
              resolve(canvas.toDataURL('image/jpeg', 0.9));
          };
          img.onerror = () => reject("Image load error");
      });
  };

  const applyBatchEdit = async (operation: 'rotateLeft' | 'rotateRight' | 'enhance') => {
      if (selectedItemIds.size === 0) return;
      setIsEditing(true); // Start loading state
      
      const newItems = [...items];
      
      // Process in parallel for speed using Promise.all
      const updates = items.map(async (item, index) => {
          if (selectedItemIds.has(item.id) && item.status === 'pending') {
               try {
                   const newPreview = await processImageOnCanvas(item.preview, operation);
                   return { index, preview: newPreview };
               } catch (e) {
                   console.error(`Failed to edit item ${index}`, e);
                   return null;
               }
          }
          return null;
      });

      const results = await Promise.all(updates);
      
      results.forEach(res => {
          if (res) {
              newItems[res.index] = { ...newItems[res.index], preview: res.preview };
          }
      });
      
      setItems(newItems);
      setIsEditing(false); // End loading state
  };

  const processBatch = async () => {
    setIsProcessing(true);
    const results: Stamp[] = [];

    for (const item of items) {
      if (item.status !== 'pending') continue;

      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'checking' } : i));

      try {
        // Handle Base64 from Blob URL
        const base64Promise = new Promise<string>(async (resolve, reject) => {
             try {
                const response = await fetch(item.preview);
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.readAsDataURL(blob);
             } catch (e) { reject(e); }
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
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Batch Directory Processor</h2>
        <p className="text-slate-600 mb-6">
          Upload multiple images, apply quick edits, and let AI categorize them automatically.
        </p>

        <div className="flex flex-wrap gap-4 items-center">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition flex items-center shadow-md"
            disabled={isProcessing || isEditing}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Add Images
          </button>

          {items.length > 0 && (
            <>
                <div className="h-8 w-px bg-slate-300 mx-2"></div>
                <button 
                    onClick={processBatch}
                    disabled={isProcessing || isEditing || items.every(i => i.status !== 'pending')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition flex items-center shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                    {isProcessing ? (
                        <span className="flex items-center"><Loader /><span className="ml-2">Processing...</span></span>
                    ) : (
                        <>Start AI Analysis</>
                    )}
                </button>
                <button 
                    onClick={() => { setItems([]); setSelectedItemIds(new Set()); }}
                    className="text-red-500 font-semibold hover:underline text-sm ml-auto"
                    disabled={isProcessing || isEditing}
                >
                    Clear All
                </button>
            </>
          )}

          <input 
            type="file" 
            multiple 
            ref={fileInputRef} 
            onChange={handleFiles} 
            className="hidden" 
            accept="image/*"
          />
        </div>
      </div>
      
      {items.length > 0 && (
          <div className="flex items-center justify-between bg-slate-100 p-2 rounded-lg border border-slate-200">
              <div className="flex items-center gap-4">
                  <button onClick={selectAll} className="text-sm font-bold text-slate-600 hover:text-blue-600 px-2" disabled={isEditing || isProcessing}>
                      {selectedItemIds.size === items.length && items.length > 0 ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="text-xs text-slate-400">|</span>
                  <span className="text-sm font-medium text-slate-500">{selectedItemIds.size} Selected</span>
              </div>
              <div className="flex gap-2">
                  <button 
                    onClick={() => applyBatchEdit('rotateLeft')} 
                    disabled={selectedItemIds.size === 0 || isProcessing || isEditing}
                    className="p-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 transition" 
                    title="Rotate Left"
                  >
                      {isEditing ? '...' : '↺'}
                  </button>
                   <button 
                    onClick={() => applyBatchEdit('rotateRight')} 
                    disabled={selectedItemIds.size === 0 || isProcessing || isEditing}
                    className="p-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 transition" 
                    title="Rotate Right"
                  >
                      {isEditing ? '...' : '↻'}
                  </button>
                   <button 
                    onClick={() => applyBatchEdit('enhance')} 
                    disabled={selectedItemIds.size === 0 || isProcessing || isEditing}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
                  >
                      {isEditing ? 'Enhancing...' : 'Auto-Enhance'}
                  </button>
              </div>
          </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map(item => (
          <div 
            key={item.id} 
            className={`relative bg-white rounded-lg border overflow-hidden group shadow-sm transition-all cursor-pointer ${selectedItemIds.has(item.id) ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-200'}`}
            onClick={() => !isEditing && !isProcessing && toggleSelect(item.id)}
          >
            <div className="absolute top-2 left-2 z-10">
                <input 
                    type="checkbox" 
                    checked={selectedItemIds.has(item.id)}
                    onChange={() => {}} // Handled by div click
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none"
                    disabled={isEditing || isProcessing}
                />
            </div>

            <img src={item.preview} className="w-full h-32 object-cover" alt={item.file.name} />
            
            <div className="p-2 text-xs truncate font-medium text-slate-600">
              {item.file.name}
            </div>

            <div className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${item.status === 'pending' ? 'opacity-0 hover:opacity-10' : 'opacity-100'}`}>
               {item.status !== 'pending' && item.status !== 'checking' && item.status !== 'processing' && (
                   <span className="text-white text-[10px] font-bold uppercase tracking-wider bg-black/50 px-2 py-1 rounded">
                      {item.status}
                   </span>
               )}
            </div>

            {item.status === 'completed' && (
              <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-1 shadow-sm z-10">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>
              </div>
            )}
            {item.status === 'rejected' && (
              <div className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-sm z-10">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" /></svg>
              </div>
            )}
            {(item.status === 'checking' || item.status === 'processing') && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-20">
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
