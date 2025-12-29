
import React, { useState } from 'react';
import type { Stamp, StampData } from '../types';
import { TagIcon, DollarSignIcon, GavelIcon, InfoIcon, XIcon, PencilIcon } from './icons';

interface StampCardProps {
  stamp: Stamp;
  onRemove: (id: number) => void;
  onUpdate: (id: number, updatedData: Partial<StampData>) => void;
}

const StampCard: React.FC<StampCardProps> = ({ stamp, onRemove, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editableStamp, setEditableStamp] = useState<StampData>({
        name: stamp.name,
        country: stamp.country,
        year: stamp.year,
        description: stamp.description,
        estimatedValue: stamp.estimatedValue,
        auctionType: stamp.auctionType,
        justification: stamp.justification,
        tags: stamp.tags || [],
        sources: stamp.sources || [],
    });

    const isSingular = isEditing ? editableStamp.auctionType === 'Singular Auction' : stamp.auctionType === 'Singular Auction';

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditableStamp(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        onUpdate(stamp.id, editableStamp);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditableStamp({
            name: stamp.name,
            country: stamp.country,
            year: stamp.year,
            description: stamp.description,
            estimatedValue: stamp.estimatedValue,
            auctionType: stamp.auctionType,
            justification: stamp.justification,
            tags: stamp.tags || [],
            sources: stamp.sources || [],
        });
        setIsEditing(false);
    };
    
    const inputClass = "w-full p-2 border bg-white border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-slate-800";
    const textareaClass = `${inputClass} min-h-[100px] resize-y`;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden transition-shadow hover:shadow-xl relative mb-6">
       <div className="absolute top-2 right-2 flex space-x-1.5 z-10">
        {!isEditing && (
             <button 
                onClick={() => setIsEditing(true)} 
                className="p-1.5 bg-slate-100 text-slate-500 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                aria-label="Edit stamp"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
        )}
        <button 
          onClick={() => onRemove(stamp.id)} 
          className="p-1.5 bg-slate-100 text-slate-500 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          aria-label="Remove stamp"
          disabled={isEditing}
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
        <div className="md:col-span-1 flex items-start justify-center">
            <div className="w-full aspect-square bg-slate-100 rounded-md flex items-center justify-center p-4 border border-slate-200 overflow-hidden shadow-inner">
                <img src={stamp.imageUrl} alt={stamp.name} className="max-w-full max-h-full object-contain" />
            </div>
        </div>
        <div className="md:col-span-2 space-y-4">
          {isEditing ? (
            <div className='space-y-3'>
                <div>
                    <label className='text-xs font-bold text-slate-400 uppercase block mb-1' htmlFor={`name-${stamp.id}`}>Official Identification</label>
                    <input id={`name-${stamp.id}`} type="text" name="name" value={editableStamp.name} onChange={handleInputChange} className={inputClass} />
                </div>
                <div className='grid grid-cols-2 gap-3'>
                    <div>
                        <label className='text-xs font-bold text-slate-400 uppercase block mb-1' htmlFor={`country-${stamp.id}`}>Country</label>
                        <input id={`country-${stamp.id}`} type="text" name="country" value={editableStamp.country} onChange={handleInputChange} className={inputClass} />
                    </div>
                    <div>
                        <label className='text-xs font-bold text-slate-400 uppercase block mb-1' htmlFor={`year-${stamp.id}`}>Year</label>
                        <input id={`year-${stamp.id}`} type="text" name="year" value={editableStamp.year} onChange={handleInputChange} className={inputClass} />
                    </div>
                </div>
            </div>
          ) : (
            <div>
                <h3 className="text-2xl font-black text-slate-900 leading-tight">{stamp.name}</h3>
                <p className="text-md font-medium text-slate-500">{stamp.country}, {stamp.year}</p>
                {stamp.tags && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {stamp.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-slate-100 text-[10px] font-bold text-slate-500 rounded uppercase tracking-wider border border-slate-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg flex items-start space-x-3 shadow-sm ${isSingular ? 'bg-emerald-50 border-emerald-200 border' : 'bg-indigo-50 border-indigo-200 border'}`}>
              <div className={`p-2 rounded-full ${isSingular ? 'bg-emerald-100' : 'bg-indigo-100'}`}>
                <GavelIcon className={`w-5 h-5 ${isSingular ? 'text-emerald-600' : 'text-indigo-600'}`} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">eBay Strategy</p>
                {isEditing ? (
                    <select name="auctionType" value={editableStamp.auctionType} onChange={handleInputChange} className={`${inputClass} font-bold ${isSingular ? 'text-emerald-800' : 'text-indigo-800'}`}>
                        <option value="Singular Auction">Singular Auction</option>
                        <option value="Lot Auction">Lot Auction</option>
                    </select>
                ) : (
                    <p className={`text-lg font-bold ${isSingular ? 'text-emerald-800' : 'text-indigo-800'}`}>{stamp.auctionType}</p>
                )}
              </div>
            </div>

            <div className="p-4 rounded-lg flex items-start space-x-3 bg-amber-50 border-amber-200 border shadow-sm">
              <div className="p-2 rounded-full bg-amber-100">
                <DollarSignIcon className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Market Value</p>
                {isEditing ? (
                    <input type="text" name="estimatedValue" value={editableStamp.estimatedValue} onChange={handleInputChange} className={`${inputClass} font-bold text-amber-800`} />
                ) : (
                    <p className="text-lg font-bold text-amber-800">{stamp.estimatedValue}</p>
                )}
              </div>
            </div>
          </div>
          
          <div>
            <div className="flex items-center space-x-2 mb-2">
                <InfoIcon className="w-4 h-4 text-slate-400" />
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Philatelic History</h4>
            </div>
            {isEditing ? (
                <textarea name="description" value={editableStamp.description} onChange={handleInputChange} className={textareaClass} />
            ) : (
                <p className="text-slate-600 text-sm leading-relaxed border-l-2 border-slate-100 pl-3">{stamp.description}</p>
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-2">
                <TagIcon className="w-4 h-4 text-slate-400" />
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-tighter">AI Justification</h4>
            </div>
            {isEditing ? (
                <textarea name="justification" value={editableStamp.justification} onChange={handleInputChange} className={textareaClass} />
            ) : (
                <p className="text-slate-600 text-xs italic bg-slate-50 p-3 rounded-md border border-slate-200">"{stamp.justification}"</p>
            )}
          </div>

          {!isEditing && stamp.sources && stamp.sources.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Verified Sources</h4>
              <ul className="space-y-1">
                {stamp.sources.map((source, idx) => (
                  <li key={idx} className="text-xs">
                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      {source.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isEditing && (
            <div className="flex justify-end space-x-3 pt-2">
                <button onClick={handleCancel} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors font-semibold text-sm">
                    Discard
                </button>
                <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-bold shadow-md text-sm">
                    Apply Changes
                </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default StampCard;
