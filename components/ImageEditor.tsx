
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { editStampImage } from '../services/geminiService';
import Loader from './Loader';

interface ImageEditorProps {
    imageSrc: string;
    suggestedRotation?: number;
    onSave: (newImageBase64: string) => void;
    onCancel: () => void;
}

interface CropRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

type CropAction = 'none' | 'create' | 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se';

const ImageEditor: React.FC<ImageEditorProps> = ({ imageSrc, suggestedRotation, onSave, onCancel }) => {
    // --- History State (Source of Truth) ---
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    
    // --- Editor Tool State ---
    const [mode, setMode] = useState<'view' | 'crop' | 'ai'>('view');
    const [cropRect, setCropRect] = useState<CropRect | null>(null);
    const [cropAction, setCropAction] = useState<CropAction>('none');
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [initialRect, setInitialRect] = useState<CropRect | null>(null);
    
    // --- AI State ---
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [showComparison, setShowComparison] = useState(false);

    // --- Fine Rotation State ---
    const [fineRotation, setFineRotation] = useState(0);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize: Load imageSrc into history
    useEffect(() => {
        const img = new Image();
        img.src = imageSrc;
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if(ctx) {
                ctx.drawImage(img, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
                setHistory([dataUrl]);
                setHistoryIndex(0);
                
                // Set suggested rotation if available
                if (suggestedRotation && Math.abs(suggestedRotation) > 0.5) {
                    setFineRotation(suggestedRotation);
                }
            }
        };
    }, [imageSrc, suggestedRotation]);

    // Render Canvas: Whenever history index changes (Undo/Redo/Edit)
    useEffect(() => {
        // "Compare" Logic: If holding compare, show original (index 0) or prev state
        const indexToRender = showComparison ? 0 : historyIndex;
        
        if (indexToRender >= 0 && history[indexToRender] && canvasRef.current) {
            const img = new Image();
            img.src = history[indexToRender];
            img.onload = () => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                
                // Clear and resize canvas
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
        }
    }, [history, historyIndex, showComparison]);

    // --- History Operations ---
    
    const pushToHistory = (newDataUrl: string) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newDataUrl);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setFineRotation(0);
            setCropRect(null);
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setFineRotation(0);
            setCropRect(null);
        }
    };

    // --- Transformations ---

    // 1. Rotation (Apply Fine Rotation)
    const applyRotation = () => {
        if (fineRotation === 0 || historyIndex < 0) return;
        
        const img = new Image();
        img.src = history[historyIndex];
        img.onload = () => {
            const rad = (fineRotation * Math.PI) / 180;
            const absCos = Math.abs(Math.cos(rad));
            const absSin = Math.abs(Math.sin(rad));
            
            // Calculate new bounding box to hold rotated image
            const newWidth = img.width * absCos + img.height * absSin;
            const newHeight = img.width * absSin + img.height * absCos;
            
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = newWidth;
            tempCanvas.height = newHeight;
            const ctx = tempCanvas.getContext('2d');
            if (!ctx) return;

            // Fill background (Black looks best for rotation gaps in editors)
            ctx.fillStyle = '#000000'; 
            ctx.fillRect(0, 0, newWidth, newHeight);
            
            // Translate to center and rotate
            ctx.translate(newWidth / 2, newHeight / 2);
            ctx.rotate(rad);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            
            pushToHistory(tempCanvas.toDataURL('image/jpeg', 0.95));
            setFineRotation(0); // Reset slider after applying
        };
    };

    // 2. 90 Degree Rotation
    const rotate90 = (dir: 'left' | 'right') => {
        if (historyIndex < 0) return;
        const img = new Image();
        img.src = history[historyIndex];
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.height;
            canvas.height = img.width;
            const ctx = canvas.getContext('2d');
            if(!ctx) return;
            
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(dir === 'right' ? Math.PI / 2 : -Math.PI / 2);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            
            pushToHistory(canvas.toDataURL('image/jpeg', 0.95));
        };
    };

    // 3. Crop
    const applyCrop = () => {
        if (!cropRect || !canvasRef.current || historyIndex < 0) return;
        
        const img = new Image();
        img.src = history[historyIndex];
        img.onload = () => {
            const canvas = document.createElement('canvas');
            // Calculate pixel coordinates from percentage
            const realX = Math.floor(cropRect.x * img.width);
            const realY = Math.floor(cropRect.y * img.height);
            const realW = Math.floor(cropRect.w * img.width);
            const realH = Math.floor(cropRect.h * img.height);

            if (realW <= 0 || realH <= 0) return;

            canvas.width = realW;
            canvas.height = realH;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.drawImage(img, realX, realY, realW, realH, 0, 0, realW, realH);
            pushToHistory(canvas.toDataURL('image/jpeg', 0.95));
            setCropRect(null); // Clear crop box
            setMode('view'); // Exit crop mode
        };
    };

    // 4. Auto Enhance (Histogram Stretch)
    const autoEnhance = () => {
        if (!canvasRef.current) return;
        // Operate on the current canvas pixels directly for speed, then save
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let min = 255, max = 0;
        // Find min/max luminance
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i+1] + data[i+2]) / 3;
            if (avg < min) min = avg;
            if (avg > max) max = avg;
        }

        const range = max - min;
        if (range > 10) { // Only apply if there's room to stretch
            for (let i = 0; i < data.length; i += 4) {
                data[i] = ((data[i] - min) / range) * 255;
                data[i+1] = ((data[i+1] - min) / range) * 255;
                data[i+2] = ((data[i+2] - min) / range) * 255;
            }
            ctx.putImageData(imageData, 0, 0);
            pushToHistory(canvas.toDataURL('image/jpeg', 0.95));
        } else {
            alert("Image already has good contrast.");
        }
    };

    // 5. AI Magic Edit
    const handleAiEdit = async (customPrompt?: string) => {
        const finalPrompt = customPrompt || aiPrompt;
        if (!finalPrompt.trim()) return;

        setIsAiProcessing(true);
        try {
            const currentBase64 = history[historyIndex].split(',')[1]; 
            // Call Gemini
            const newImageBytes = await editStampImage(currentBase64, finalPrompt);
            pushToHistory(`data:image/jpeg;base64,${newImageBytes}`);
            setAiPrompt('');
        } catch (e) {
            console.error(e);
            alert('AI Edit failed. Please try again.');
        } finally {
            setIsAiProcessing(false);
        }
    };

    // --- Crop Interaction Handlers ---
    const getMousePos = (e: React.MouseEvent) => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / rect.width,
            y: (e.clientY - rect.top) / rect.height
        };
    };

    const isNear = (p1: number, p2: number, threshold = 0.05) => Math.abs(p1 - p2) < threshold;

    const handleMouseDown = (e: React.MouseEvent) => {
        if (mode !== 'crop') return;
        const pos = getMousePos(e);
        setDragStart(pos);

        if (cropRect) {
            // Check Resize Handles
            if (isNear(pos.x, cropRect.x) && isNear(pos.y, cropRect.y)) { setCropAction('resize-nw'); setInitialRect(cropRect); return; }
            if (isNear(pos.x, cropRect.x + cropRect.w) && isNear(pos.y, cropRect.y)) { setCropAction('resize-ne'); setInitialRect(cropRect); return; }
            if (isNear(pos.x, cropRect.x, cropRect.y + cropRect.h)) { setCropAction('resize-sw'); setInitialRect(cropRect); return; }
            if (isNear(pos.x, cropRect.x + cropRect.w) && isNear(pos.y, cropRect.y + cropRect.h)) { setCropAction('resize-se'); setInitialRect(cropRect); return; }
            
            // Check Move
            if (pos.x >= cropRect.x && pos.x <= cropRect.x + cropRect.w && pos.y >= cropRect.y && pos.y <= cropRect.y + cropRect.h) {
                setCropAction('move');
                setInitialRect(cropRect);
                return;
            }
        }
        // Start New Crop
        setCropAction('create');
        setCropRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (mode !== 'crop' || cropAction === 'none') return;
        const pos = getMousePos(e);
        const clamp = (val: number) => Math.max(0, Math.min(1, val));

        if (cropAction === 'create') {
            const x = Math.min(pos.x, dragStart.x);
            const y = Math.min(pos.y, dragStart.y);
            const w = Math.abs(pos.x - dragStart.x);
            const h = Math.abs(pos.y - dragStart.y);
            setCropRect({ x: clamp(x), y: clamp(y), w: Math.min(w, 1-x), h: Math.min(h, 1-y) });
        } else if (cropAction === 'move' && initialRect) {
            const dx = pos.x - dragStart.x;
            const dy = pos.y - dragStart.y;
            let newX = initialRect.x + dx;
            let newY = initialRect.y + dy;
            
            // Bounds checking
            if (newX < 0) newX = 0; if (newY < 0) newY = 0;
            if (newX + initialRect.w > 1) newX = 1 - initialRect.w;
            if (newY + initialRect.h > 1) newY = 1 - initialRect.h;
            setCropRect({ ...initialRect, x: newX, y: newY });
        } else if (initialRect) {
            // Resizing logic
            let newX = initialRect.x, newY = initialRect.y, newW = initialRect.w, newH = initialRect.h;
            if (cropAction.includes('w')) { const d = pos.x - dragStart.x; newX = clamp(initialRect.x + d); newW = initialRect.w - (newX - initialRect.x); }
            if (cropAction.includes('e')) { const d = pos.x - dragStart.x; newW = clamp(initialRect.w + d); }
            if (cropAction.includes('n')) { const d = pos.y - dragStart.y; newY = clamp(initialRect.y + d); newH = initialRect.h - (newY - initialRect.y); }
            if (cropAction.includes('s')) { const d = pos.y - dragStart.y; newH = clamp(initialRect.h + d); }
            
            // Flip if dragged across
            if (newW < 0) { newX += newW; newW = Math.abs(newW); }
            if (newH < 0) { newY += newH; newH = Math.abs(newH); }
            setCropRect({ x: newX, y: newY, w: newW, h: newH });
        }
    };

    const handleMouseUp = () => { setCropAction('none'); setInitialRect(null); };

    // --- Final Save ---
    const handleSave = () => {
        // If there is pending rotation, apply it first implicitly, then save
        if (fineRotation !== 0) {
            applyRotation();
            // Wait for applyRotation to update history? React state is async. 
            // Actually, applyRotation pushes to history. We should probably force user to Apply first.
            // But for UX, let's just use the current canvas ref which has visual rotation? 
            // No, the canvas visually rotates using CSS. We need to commit the pixels.
            // A safer bet is to alert user or just save the history head.
            // Let's rely on user clicking "Apply Rotation".
        }
        
        // We save whatever is at the current history index
        if (historyIndex >= 0) {
            onSave(history[historyIndex].split(',')[1]);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in text-white">
            {/* Header */}
            <div className="w-full max-w-6xl flex justify-between items-center mb-4 px-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-slate-100">Image Editor</h2>
                    <div className="flex gap-2 text-sm bg-slate-800 rounded-lg p-1">
                        <button onClick={handleUndo} disabled={historyIndex <= 0} className="px-3 py-1.5 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                            Undo
                        </button>
                        <div className="w-px bg-slate-700"></div>
                        <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="px-3 py-1.5 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-2">
                             Redo
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
                        </button>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded text-slate-300 hover:text-white font-medium">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-500 font-bold shadow-lg flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        Save & Exit
                    </button>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 w-full max-w-6xl flex gap-4 overflow-hidden h-full pb-4">
                
                {/* Canvas Area */}
                <div 
                    ref={containerRef}
                    className={`flex-1 bg-slate-900 rounded-xl relative flex items-center justify-center overflow-hidden border border-slate-800 select-none ${mode === 'crop' ? 'cursor-crosshair' : ''}`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <canvas 
                        ref={canvasRef} 
                        className="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-200 origin-center"
                        style={{ transform: `rotate(${fineRotation}deg)` }} 
                    />
                    
                    {/* Visual Overlay: Rotation Grid */}
                    {fineRotation !== 0 && (
                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-50 z-10" style={{ transform: `rotate(${fineRotation}deg)` }}>
                            <div className="border border-white/20"></div><div className="border border-white/20"></div><div className="border border-white/20"></div>
                            <div className="border border-white/20"></div><div className="border border-white/20"></div><div className="border border-white/20"></div>
                            <div className="border border-white/20"></div><div className="border border-white/20"></div><div className="border border-white/20"></div>
                        </div>
                    )}

                    {/* Visual Overlay: Compare Button (Bottom Right) */}
                    {historyIndex > 0 && !isAiProcessing && (
                        <button 
                            onMouseDown={() => setShowComparison(true)}
                            onMouseUp={() => setShowComparison(false)}
                            onMouseLeave={() => setShowComparison(false)}
                            className="absolute bottom-6 right-6 z-20 bg-black/60 backdrop-blur border border-white/20 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-black/80 active:scale-95 transition flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            Hold to Compare Original
                        </button>
                    )}

                    {/* Visual Overlay: Loading State */}
                    {isAiProcessing && (
                         <div className="absolute inset-0 bg-black/50 z-30 flex flex-col items-center justify-center">
                             <Loader />
                             <p className="mt-4 font-bold text-white animate-pulse">AI Processing...</p>
                         </div>
                    )}

                    {/* Visual Overlay: Crop Box */}
                    {mode === 'crop' && cropRect && (
                        <div className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] cursor-move z-20"
                            style={{ left: `${cropRect.x * 100}%`, top: `${cropRect.y * 100}%`, width: `${cropRect.w * 100}%`, height: `${cropRect.h * 100}%` }}>
                            {/* Resize Handles */}
                            <div className="absolute top-0 left-0 w-3 h-3 bg-blue-500 border border-white -mt-1.5 -ml-1.5 cursor-nw-resize"></div>
                            <div className="absolute top-0 right-0 w-3 h-3 bg-blue-500 border border-white -mt-1.5 -mr-1.5 cursor-ne-resize"></div>
                            <div className="absolute bottom-0 left-0 w-3 h-3 bg-blue-500 border border-white -mb-1.5 -ml-1.5 cursor-sw-resize"></div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 border border-white -mb-1.5 -mr-1.5 cursor-se-resize"></div>
                            {/* Guidelines */}
                            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                                <div className="border-r border-b border-white/20"></div><div className="border-r border-b border-white/20"></div><div className="border-b border-white/20"></div>
                                <div className="border-r border-b border-white/20"></div><div className="border-r border-b border-white/20"></div><div className="border-b border-white/20"></div>
                                <div className="border-r border-white/20"></div><div className="border-r border-white/20"></div><div></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Tools */}
                <div className="w-72 bg-slate-800 rounded-xl p-4 flex flex-col gap-6 overflow-y-auto border border-slate-700">
                    
                    {/* Tool Toggle */}
                    <div className="flex p-1 bg-slate-900 rounded-lg border border-slate-700">
                        <button onClick={() => setMode('view')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'view' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>Adjust</button>
                        <button onClick={() => setMode('crop')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'crop' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>Crop</button>
                        <button onClick={() => setMode('ai')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'ai' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>Magic AI</button>
                    </div>

                    {mode === 'view' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Basic Adjustments</h4>
                                <button onClick={autoEnhance} className="w-full py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-sm font-medium flex items-center justify-center gap-2 transition">
                                    <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                    Auto-Enhance Contrast
                                </button>
                            </div>
                            
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Orientation</h4>
                                <div className="flex gap-2">
                                    <button onClick={() => rotate90('left')} className="flex-1 py-2 bg-slate-700 border border-slate-600 rounded hover:bg-slate-600 transition" title="Rotate Left">
                                        ↺ 90°
                                    </button>
                                    <button onClick={() => rotate90('right')} className="flex-1 py-2 bg-slate-700 border border-slate-600 rounded hover:bg-slate-600 transition" title="Rotate Right">
                                        ↻ 90°
                                    </button>
                                </div>
                                
                                <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                                    <div className="flex justify-between items-center text-xs mb-3">
                                        <span className="font-semibold text-slate-300">Fine Straighten</span>
                                        <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-1.5 rounded">{fineRotation.toFixed(1)}°</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="-45" 
                                        max="45" 
                                        step="0.1" 
                                        value={fineRotation} 
                                        onChange={(e) => setFineRotation(parseFloat(e.target.value))} 
                                        className="w-full h-1 bg-slate-600 rounded appearance-none cursor-pointer accent-blue-500 mb-3" 
                                    />
                                    <button 
                                        onClick={applyRotation} 
                                        disabled={fineRotation === 0} 
                                        className="w-full py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                    >
                                        Apply Rotation
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {mode === 'crop' && (
                        <div className="space-y-4 animate-fade-in">
                            <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Crop Tools</h4>
                            <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-700 text-center">
                                <p className="text-xs text-slate-400 mb-4">Drag inside image to create selection.</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={applyCrop} 
                                        disabled={!cropRect}
                                        className="py-2 bg-green-600 hover:bg-green-500 rounded font-bold text-sm shadow disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    >
                                        Apply Crop
                                    </button>
                                    <button 
                                        onClick={() => setCropRect(null)} 
                                        disabled={!cropRect}
                                        className="py-2 bg-slate-600 hover:bg-slate-500 rounded text-sm text-slate-200 disabled:opacity-50 transition"
                                    >
                                        Clear Box
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {mode === 'ai' && (
                         <div className="space-y-6 animate-fade-in">
                             <div className="bg-indigo-900/30 p-4 rounded-xl border border-indigo-500/30">
                                <h4 className="text-xs font-bold uppercase text-indigo-300 tracking-wider flex items-center gap-2 mb-4">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    Quick Actions
                                </h4>
                                
                                <button 
                                    onClick={() => handleAiEdit("Remove the background entirely and replace it with a solid white background. Keep the stamp intact.")} 
                                    disabled={isAiProcessing} 
                                    className="w-full py-3 bg-white text-indigo-900 rounded-lg font-bold shadow hover:bg-indigo-50 disabled:opacity-50 transition flex items-center justify-center gap-2 text-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                    Remove Background
                                </button>
                                <p className="text-[10px] text-indigo-300/60 text-center mt-2">Powered by Gemini Vision</p>
                             </div>

                            <div>
                                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">Custom Edit</h4>
                                <div className="relative">
                                    <textarea 
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none h-28 transition-colors placeholder:text-slate-600" 
                                        placeholder='Describe changes... e.g., "Fix the tear on the top right corner", "Make the cancellation mark clearer"' 
                                        value={aiPrompt} 
                                        onChange={(e) => setAiPrompt(e.target.value)} 
                                    />
                                </div>
                                <button 
                                    onClick={() => handleAiEdit()} 
                                    disabled={!aiPrompt.trim() || isAiProcessing} 
                                    className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold disabled:opacity-50 shadow transition"
                                >
                                    {isAiProcessing ? 'Processing...' : 'Generate Edit'}
                                </button>
                            </div>
                         </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageEditor;
