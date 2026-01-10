
import React, { useState, useEffect } from 'react';
import type { Stamp, AppSettings } from '../types';
import { generateEbayListing } from '../services/geminiService';
import { postBulkListings, EbayListingDraft } from '../services/ebayService';
import Loader from './Loader';

interface EbayListerProps {
    stamps: Stamp[];
    settings: AppSettings;
    onClose: () => void;
}

interface ListingGroup {
    id: string;
    stampIds: number[];
}

const EbayLister: React.FC<EbayListerProps> = ({ stamps, settings, onClose }) => {
    const [groups, setGroups] = useState<ListingGroup[]>([]);
    const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
    const [drafts, setDrafts] = useState<EbayListingDraft[]>([]);
    const [status, setStatus] = useState<'grouping' | 'generating' | 'review' | 'posting' | 'success'>('grouping');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Initialize with each stamp as its own group (Singles)
        setGroups(stamps.map(s => ({ id: Math.random().toString(36).substr(2, 9), stampIds: [s.id] })));
    }, [stamps]);

    const toggleSelect = (groupId: string) => {
        setSelectedGroupIds(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    };

    const handleMerge = () => {
        const groupIds = Array.from(selectedGroupIds);
        if (groupIds.length < 2) return;
        const mainGroupId = groupIds[0];
        const otherGroupIds = groupIds.slice(1);

        const mainGroup = groups.find(g => g.id === mainGroupId);
        if (!mainGroup) return;

        const combinedIds = [...mainGroup.stampIds];
        otherGroupIds.forEach(id => {
            const g = groups.find(x => x.id === id);
            if (g) combinedIds.push(...g.stampIds);
        });

        setGroups(prev => [
            ...prev.filter(g => !groupIds.includes(g.id)),
            { id: mainGroupId, stampIds: combinedIds }
        ]);
        setSelectedGroupIds(new Set());
    };

    const handleSplit = (groupId: string) => {
        const group = groups.find(g => g.id === groupId);
        if (!group || group.stampIds.length < 2) return;

        const newGroups = group.stampIds.map(id => ({ id: Math.random().toString(36).substr(2, 9), stampIds: [id] }));
        setGroups(prev => [...prev.filter(g => g.id !== groupId), ...newGroups]);
        setSelectedGroupIds(new Set());
    };

    const generateDrafts = async () => {
        setStatus('generating');
        const newDrafts: EbayListingDraft[] = [];
        let done = 0;

        for (const group of groups) {
            try {
                const groupStamps = stamps.filter(s => group.stampIds.includes(s.id));
                const listing = await generateEbayListing(groupStamps, settings);
                newDrafts.push({
                    stampIds: group.stampIds,
                    title: listing.title,
                    description: listing.description,
                    price: listing.suggestedPrice || 0,
                    conditionID: 1000,
                    itemSpecifics: listing.itemSpecifics || [],
                    categoryId: listing.categoryId || "260"
                });
            } catch (e) {
                console.error("Failed to generate draft for group", group.id, e);
            }
            done++;
            setProgress((done / groups.length) * 100);
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="bg-slate-900 text-white px-8 py-5 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                            eBay Listing Wizard
                        </h2>
                        <p className="text-sm text-slate-400">Step: {status.charAt(0).toUpperCase() + status.slice(1)}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-8 bg-slate-50">
                    {status === 'grouping' && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <div>
                                    <p className="font-semibold text-blue-900">Configure Your Listings</p>
                                    <p className="text-sm text-blue-700">Decide which stamps should be sold individually or grouped into lots. Gemini AI will create unique optimized content for each listing.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {groups.map((group, idx) => {
                                    const groupStamps = stamps.filter(s => group.stampIds.includes(s.id));
                                    const isLot = group.stampIds.length > 1;

                                    return (
                                        <div key={group.id} className={`p-4 rounded-xl border-2 transition-all ${isLot ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'} relative group`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isLot ? 'bg-amber-200 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
                                                    {isLot ? `LOT of ${group.stampIds.length}` : 'Single Item'}
                                                </span>
                                                {isLot && (
                                                    <button onClick={() => handleSplit(group.id)} className="text-xs text-red-600 font-medium hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                                                        Split Lot
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex -space-x-3 mb-3 overflow-hidden">
                                                {groupStamps.slice(0, 3).map(s => (
                                                    <img key={s.id} src={s.imageUrl} alt="" className="w-12 h-12 rounded-lg border-2 border-white object-cover shadow-sm bg-white" />
                                                ))}
                                                {groupStamps.length > 3 && (
                                                    <div className="w-12 h-12 rounded-lg border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shadow-sm">
                                                        +{groupStamps.length - 3}
                                                    </div>
                                                )}
                                            </div>

                                            <h4 className="font-bold text-slate-800 truncate text-sm">
                                                {isLot ? 'Mixed Group Listing' : groupStamps[0]?.name}
                                            </h4>

                                            <div className="mt-3 flex gap-2">
                                                <input
                                                    type="checkbox"
                                                    id={`group-${group.id}`}
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                    checked={selectedGroupIds.has(group.id)}
                                                    onChange={() => toggleSelect(group.id)}
                                                />
                                                <label htmlFor={`group-${group.id}`} className="text-xs text-slate-500 cursor-pointer">Select to Merge</label>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {status === 'generating' && (
                        <div className="flex flex-col items-center justify-center h-full py-20">
                            <div className="w-24 h-24 mb-6">
                                <Loader />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800">Gemini is writing your listings...</h3>
                            <p className="mt-2 text-slate-500 font-medium">{Math.round(progress)}% Complete</p>
                            <div className="w-80 h-3 bg-slate-200 rounded-full mt-6 overflow-hidden shadow-inner">
                                <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
                            </div>
                            <p className="mt-4 text-xs text-slate-400 animate-pulse">Analyzing historical data & optimizing SEO titles</p>
                        </div>
                    )}

                    {status === 'review' && (
                        <div className="space-y-6 max-w-4xl mx-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-slate-800">Review Drafted Listings</h3>
                                <p className="text-sm text-slate-500">{drafts.length} Listings Generated</p>
                            </div>

                            {drafts.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                    <p className="text-slate-400">No listings were successfully generated. Please check your AI settings.</p>
                                </div>
                            ) : (
                                drafts.map((draft, idx) => (
                                    <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 transition-colors">
                                        <div className="flex justify-between items-start gap-4 mb-4">
                                            <div className="flex-grow">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">DRAFT</span>
                                                    <span className="text-xs text-slate-400">ID: {idx + 1}</span>
                                                </div>
                                                <h3 className="font-bold text-slate-900 text-xl leading-snug">{draft.title}</h3>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="text-3xl font-black text-emerald-600 tracking-tight">${draft.price.toFixed(2)}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Suggested Start</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <div>
                                                <div className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Category</div>
                                                <div className="text-xs font-semibold text-slate-700">Stamps ({draft.categoryId})</div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Condition</div>
                                                <div className="text-xs font-semibold text-slate-700">{draft.conditionID === 1000 ? 'New' : 'Used'}</div>
                                            </div>
                                            <div>
                                                <div className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Items in Lot</div>
                                                <div className="text-xs font-semibold text-slate-700">{draft.stampIds.length}</div>
                                            </div>
                                            <div className="text-right">
                                                <button className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase">Edit Specs</button>
                                            </div>
                                        </div>

                                        <div className="relative group">
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-1 bg-white shadow-md rounded border border-slate-200 text-slate-600 hover:text-blue-600"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                            </div>
                                            <div className="p-4 bg-slate-900 rounded-xl prose prose-sm prose-invert max-w-none max-h-48 overflow-y-auto border border-slate-800 text-slate-300 font-serif text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: draft.description }}>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="text-center py-20 flex flex-col items-center">
                            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-8 shadow-inner animate-bounce">
                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 mb-3">Listings Live on eBay!</h3>
                            <p className="text-lg text-slate-600 mb-10 max-w-md">Gemini has successfully synchronized {drafts.length} listings to your eBay Seller Hub.</p>
                            <div className="flex gap-4">
                                <button onClick={onClose} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition transform hover:scale-105">Return to Collection</button>
                                <button className="px-8 py-3 bg-white text-slate-900 border-2 border-slate-900 rounded-xl font-bold hover:bg-slate-50 transition transform hover:scale-105">View on eBay</button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-200 bg-white flex justify-between items-center shrink-0 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
                    <button onClick={onClose} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition">
                        {status === 'success' ? 'Close' : 'Discard All'}
                    </button>

                    <div className="flex gap-3">
                        {status === 'grouping' && (
                            <>
                                <button
                                    onClick={handleMerge}
                                    disabled={selectedGroupIds.size < 2}
                                    className={`px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl shadow-md transition flex items-center gap-2 ${selectedGroupIds.size < 2 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-900'}`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                    Merge Selected to Lot
                                </button>
                                <button
                                    onClick={generateDrafts}
                                    className="px-8 py-2.5 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition transform hover:scale-105 flex items-center gap-2"
                                >
                                    Generate AI Listings
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </button>
                            </>
                        )}

                        {status === 'review' && (
                            <>
                                <button onClick={() => setStatus('grouping')} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition">Back to Grouping</button>
                                <button onClick={handlePost} className="px-10 py-2.5 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition transform hover:scale-105">
                                    Publish All to eBay
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EbayLister;
