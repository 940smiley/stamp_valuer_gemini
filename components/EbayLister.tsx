
import React, { useState } from 'react';
import type { Stamp } from '../types';
import { generateEbayListing } from '../services/geminiService';
import { postBulkListings, EbayListingDraft } from '../services/ebayService';
import Loader from './Loader';

interface EbayListerProps {
    stamps: Stamp[];
    onClose: () => void;
}

const EbayLister: React.FC<EbayListerProps> = ({ stamps, onClose }) => {
    const [drafts, setDrafts] = useState<EbayListingDraft[]>([]);
    const [status, setStatus] = useState<'idle' | 'generating' | 'review' | 'posting' | 'success'>('idle');
    const [progress, setProgress] = useState(0);

    const generateDrafts = async () => {
        setStatus('generating');
        const newDrafts: EbayListingDraft[] = [];
        let done = 0;
        
        for (const stamp of stamps) {
            try {
                const listing = await generateEbayListing(stamp);
                newDrafts.push({
                    stampId: stamp.id,
                    title: listing.title,
                    description: listing.description,
                    price: listing.suggestedPrice || 0,
                    conditionID: 1000,
                    itemSpecifics: listing.itemSpecifics || [],
                    categoryId: listing.categoryId || "260"
                });
            } catch (e) {
                console.error("Failed to generate draft for stamp", stamp.id);
            }
            done++;
            setProgress((done / stamps.length) * 100);
        }
        setDrafts(newDrafts);
        setStatus('review');
    };

    const handlePost = async () => {
        setStatus('posting');
        await postBulkListings(drafts);
        setStatus('success');
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-fade-in">
                <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold">eBay Listing Manager ({stamps.length} Items)</h2>
                    <button onClick={onClose} className="text-white hover:text-blue-100">×</button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                    {status === 'idle' && (
                        <div className="text-center py-12">
                            <p className="text-slate-600 mb-6 text-lg">Ready to generate optimized listings using Gemini AI.</p>
                            <button onClick={generateDrafts} className="px-8 py-4 bg-blue-600 text-white rounded-lg font-bold shadow-lg hover:bg-blue-700 transition text-lg">
                                Generate {stamps.length} Drafts
                            </button>
                        </div>
                    )}

                    {status === 'generating' && (
                        <div className="flex flex-col items-center justify-center h-full">
                            <Loader />
                            <p className="mt-4 text-slate-600 font-medium">Generating Listings... {Math.round(progress)}%</p>
                            <div className="w-64 h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                                <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    )}

                    {status === 'review' && (
                        <div className="space-y-6">
                            {drafts.map((draft, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-lg shadow border border-slate-200">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-slate-800 text-lg">{draft.title}</h3>
                                        <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded border border-green-100">${draft.price.toFixed(2)}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-xs text-slate-500 mb-2">
                                        <div>Category: {draft.categoryId}</div>
                                        <div>Condition ID: {draft.conditionID}</div>
                                    </div>
                                    <div className="p-2 bg-slate-50 rounded text-xs text-slate-600 font-mono h-20 overflow-y-auto border border-slate-100">
                                        {draft.description}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 mb-2">Listings Posted!</h3>
                            <p className="text-slate-600 mb-6">Successfully posted {drafts.length} items to eBay.</p>
                            <button onClick={onClose} className="px-6 py-2 bg-slate-800 text-white rounded font-bold">Close</button>
                        </div>
                    )}
                </div>

                {status === 'review' && (
                    <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded">Cancel</button>
                        <button onClick={handlePost} className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 shadow-sm flex items-center">
                           Post All to eBay
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EbayLister;
