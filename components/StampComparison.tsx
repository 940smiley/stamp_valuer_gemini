
import React from 'react';
import type { Stamp } from '../types';

interface StampComparisonProps {
    stamps: [Stamp, Stamp]; // Tuple of exactly 2 stamps
    onClose: () => void;
}

const StampComparison: React.FC<StampComparisonProps> = ({ stamps, onClose }) => {
    const [left, right] = stamps;

    // Helper to highlight differences
    const compare = (val1: any, val2: any) => {
        const isDiff = val1 !== val2;
        return isDiff ? 'bg-yellow-50 text-yellow-900 font-semibold' : 'text-slate-600';
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
                <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                        Stamp Comparison Tool
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition">
                        <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6">
                    <div className="grid grid-cols-2 gap-8 h-full">
                        {/* Headers */}
                        <div className="text-center font-bold text-lg text-blue-700 pb-2 border-b-2 border-blue-600">{left.name}</div>
                        <div className="text-center font-bold text-lg text-purple-700 pb-2 border-b-2 border-purple-600">{right.name}</div>

                        {/* Images */}
                        <div className="h-64 flex items-center justify-center bg-slate-100 rounded-lg border border-slate-200">
                            <img src={left.imageUrl} className="max-h-full max-w-full object-contain" />
                        </div>
                        <div className="h-64 flex items-center justify-center bg-slate-100 rounded-lg border border-slate-200">
                            <img src={right.imageUrl} className="max-h-full max-w-full object-contain" />
                        </div>

                        {/* Data Grid */}
                        <div className="col-span-2">
                             <table className="w-full text-sm border-collapse">
                                 <thead>
                                     <tr className="bg-slate-50 text-slate-500 uppercase text-xs">
                                         <th className="p-3 text-left w-1/4">Attribute</th>
                                         <th className="p-3 text-left w-1/3 border-l border-slate-200">Item A (Left)</th>
                                         <th className="p-3 text-left w-1/3 border-l border-slate-200">Item B (Right)</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                     <tr>
                                         <td className="p-3 font-semibold text-slate-700">Country</td>
                                         <td className={`p-3 border-l border-slate-200 ${compare(left.country, right.country)}`}>{left.country}</td>
                                         <td className={`p-3 border-l border-slate-200 ${compare(left.country, right.country)}`}>{right.country}</td>
                                     </tr>
                                     <tr>
                                         <td className="p-3 font-semibold text-slate-700">Year</td>
                                         <td className={`p-3 border-l border-slate-200 ${compare(left.year, right.year)}`}>{left.year}</td>
                                         <td className={`p-3 border-l border-slate-200 ${compare(left.year, right.year)}`}>{right.year}</td>
                                     </tr>
                                     <tr>
                                         <td className="p-3 font-semibold text-slate-700">Face Value</td>
                                         <td className={`p-3 border-l border-slate-200 ${compare(left.faceValue, right.faceValue)}`}>{left.faceValue}</td>
                                         <td className={`p-3 border-l border-slate-200 ${compare(left.faceValue, right.faceValue)}`}>{right.faceValue}</td>
                                     </tr>
                                     <tr>
                                         <td className="p-3 font-semibold text-slate-700">Condition</td>
                                         <td className={`p-3 border-l border-slate-200 ${compare(left.condition, right.condition)}`}>{left.condition}</td>
                                         <td className={`p-3 border-l border-slate-200 ${compare(left.condition, right.condition)}`}>{right.condition}</td>
                                     </tr>
                                     <tr>
                                         <td className="p-3 font-semibold text-slate-700">Perforations</td>
                                         <td className={`p-3 border-l border-slate-200 ${compare(left.perforations, right.perforations)}`}>{left.perforations}</td>
                                         <td className={`p-3 border-l border-slate-200 ${compare(left.perforations, right.perforations)}`}>{right.perforations}</td>
                                     </tr>
                                     <tr>
                                         <td className="p-3 font-semibold text-slate-700">Est. Value</td>
                                         <td className={`p-3 border-l border-slate-200 font-bold ${compare(left.estimatedValue, right.estimatedValue)}`}>{left.estimatedValue}</td>
                                         <td className={`p-3 border-l border-slate-200 font-bold ${compare(left.estimatedValue, right.estimatedValue)}`}>{right.estimatedValue}</td>
                                     </tr>
                                     <tr>
                                         <td className="p-3 font-semibold text-slate-700">Catalog #</td>
                                         <td className={`p-3 border-l border-slate-200 font-mono ${compare(left.catalogNumber, right.catalogNumber)}`}>{left.catalogNumber || '-'}</td>
                                         <td className={`p-3 border-l border-slate-200 font-mono ${compare(left.catalogNumber, right.catalogNumber)}`}>{right.catalogNumber || '-'}</td>
                                     </tr>
                                 </tbody>
                             </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StampComparison;
