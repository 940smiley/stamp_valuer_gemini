
import React, { useState } from 'react';
import type { Stamp } from '../types';

interface DuplicateReviewProps {
    stamps: Stamp[];
    onResolve: (keepId: number, removeId: number) => void;
    onMerge: (originalId: number, duplicateId: number) => void;
    onReplace: (originalId: number, duplicateId: number) => void;
    onIgnore: (duplicateId: number) => void;
}

const DuplicateReview: React.FC<DuplicateReviewProps> = ({ stamps, onResolve, onMerge, onReplace, onIgnore }) => {
    // Find stamps that are marked as duplicateOf
    const duplicates = stamps.filter(s => s.duplicateOf);
    
    // Helper to highlight differences in the table
    const getDiffClass = (val1: any, val2: any) => {
        return val1 !== val2 ? 'bg-yellow-50 text-yellow-900 font-bold' : 'text-slate-600';
    };

    if (duplicates.length === 0) {
        return (
            <div className="text-center py-16 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col items-center">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">No Duplicates Detected</h3>
                <p className="text-slate-500 max-w-sm">Your collection is clean! AI hasn't found any conflicting or identical items.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Review Duplicates <span className="text-slate-400 text-lg font-normal">({duplicates.length} items)</span>
                </h2>
            </div>
            
            <div className="grid gap-8">
                {duplicates.map(dup => {
                    const original = stamps.find(s => s.id === dup.duplicateOf);
                    if (!original) return null;

                    return (
                        <div key={dup.id} className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                            {/* Header / Score */}
                            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                                <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">Potential Match Found</span>
                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${ (dup.similarityScore || 0) > 0.9 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                    Similarity Score: {Math.round((dup.similarityScore || 0) * 100)}%
                                </span>
                            </div>

                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                                    {/* Original Card */}
                                    <div className="flex flex-col">
                                        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-4 rounded-r">
                                            <h3 className="font-bold text-blue-900 text-sm uppercase">Existing Item (Original)</h3>
                                            <p className="text-xs text-blue-700">In your collection since {new Date(original.id).toLocaleDateString()}</p>
                                        </div>
                                        <div className="h-48 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center p-4 mb-4">
                                            <img src={original.imageUrl} className="max-h-full max-w-full object-contain shadow-sm" alt="Original" />
                                        </div>
                                    </div>

                                    {/* Duplicate Card */}
                                    <div className="flex flex-col">
                                        <div className="bg-amber-50 border-l-4 border-amber-500 p-3 mb-4 rounded-r">
                                            <h3 className="font-bold text-amber-900 text-sm uppercase">New Scan (Duplicate)</h3>
                                            <p className="text-xs text-amber-700">Just analyzed</p>
                                        </div>
                                        <div className="h-48 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center p-4 mb-4">
                                            <img src={dup.imageUrl} className="max-h-full max-w-full object-contain shadow-sm" alt="Duplicate" />
                                        </div>
                                    </div>
                                </div>

                                {/* Comparison Table */}
                                <div className="overflow-x-auto rounded-lg border border-slate-200 mb-6">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3 w-1/4">Attribute</th>
                                                <th className="px-4 py-3 w-1/3 border-l border-slate-200">Original</th>
                                                <th className="px-4 py-3 w-1/3 border-l border-slate-200">New Scan</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            <tr>
                                                <td className="px-4 py-3 font-semibold text-slate-700">Identity</td>
                                                <td className={`px-4 py-3 border-l border-slate-100 ${getDiffClass(original.name, dup.name)}`}>{original.name}</td>
                                                <td className={`px-4 py-3 border-l border-slate-100 ${getDiffClass(original.name, dup.name)}`}>{dup.name}</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-3 font-semibold text-slate-700">Country & Year</td>
                                                <td className={`px-4 py-3 border-l border-slate-100 ${getDiffClass(original.year, dup.year)}`}>{original.country}, {original.year}</td>
                                                <td className={`px-4 py-3 border-l border-slate-100 ${getDiffClass(original.year, dup.year)}`}>{dup.country}, {dup.year}</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-3 font-semibold text-slate-700">Condition</td>
                                                <td className={`px-4 py-3 border-l border-slate-100 ${getDiffClass(original.condition, dup.condition)}`}>{original.condition || 'N/A'}</td>
                                                <td className={`px-4 py-3 border-l border-slate-100 ${getDiffClass(original.condition, dup.condition)}`}>{dup.condition || 'N/A'}</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-3 font-semibold text-slate-700">Valuation</td>
                                                <td className={`px-4 py-3 border-l border-slate-100 ${getDiffClass(original.estimatedValue, dup.estimatedValue)}`}>{original.estimatedValue}</td>
                                                <td className={`px-4 py-3 border-l border-slate-100 ${getDiffClass(original.estimatedValue, dup.estimatedValue)}`}>{dup.estimatedValue}</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-3 font-semibold text-slate-700">Catalog #</td>
                                                <td className={`px-4 py-3 border-l border-slate-100 font-mono ${getDiffClass(original.catalogNumber, dup.catalogNumber)}`}>{original.catalogNumber || '-'}</td>
                                                <td className={`px-4 py-3 border-l border-slate-100 font-mono ${getDiffClass(original.catalogNumber, dup.catalogNumber)}`}>{dup.catalogNumber || '-'}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Actions Toolbar */}
                                <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4 border-t border-slate-100">
                                    <button 
                                        onClick={() => onIgnore(dup.id)}
                                        className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition shadow-sm text-sm flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                        Keep Both (Ignore)
                                    </button>
                                     <button 
                                        onClick={() => onMerge(original.id, dup.id)}
                                        className="px-4 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg font-bold hover:bg-indigo-100 transition shadow-sm text-sm flex items-center justify-center gap-2"
                                        title="Updates original item with data from the new scan"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        Merge (Update Data)
                                    </button>
                                     <button 
                                        onClick={() => onReplace(original.id, dup.id)}
                                        className="px-4 py-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg font-bold hover:bg-amber-100 transition shadow-sm text-sm flex items-center justify-center gap-2"
                                        title="Deletes original, keeps the new scan"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                        Replace Original
                                    </button>
                                    <button 
                                        onClick={() => onResolve(original.id, dup.id)}
                                        className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition shadow-md text-sm flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        Discard New
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DuplicateReview;
