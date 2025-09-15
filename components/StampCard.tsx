
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
        });
        setIsEditing(false);
    };
    
    const inputClass = "w-full p-2 border bg-white border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-slate-800";
    const textareaClass = `${inputClass} min-h-[100px] resize-y`;


  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden transition-shadow hover:shadow-xl relative">
       <div className="absolute top-2 right-2 flex space-x-1.5">
        {!isEditing && (
             <button 
                onClick={() => setIsEditing(true)} 
                className="p-1.5 bg-slate-100 text-slate-500 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Edit stamp"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
        )}
        <button 
          onClick={() => onRemove(stamp.id)} 
          className="p-1.5 bg-slate-100 text-slate-500 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Remove stamp"
          disabled={isEditing}
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
        <div className="md:col-span-1 flex items-center justify-center">
            <div className="w-48 h-48 bg-slate-100 rounded-md flex items-center justify-center p-2 border border-slate-200">
                <img src={stamp.imageUrl} alt={stamp.name} className="max-w-full max-h-full object-contain" />
            </div>
        </div>
        <div className="md:col-span-2 space-y-4">
          {isEditing ? (
            <div className='space-y-2'>
                <label className='text-sm font-semibold text-slate-600 block' htmlFor={`name-${stamp.id}`}>Name</label>
                <input id={`name-${stamp.id}`} type="text" name="name" value={editableStamp.name} onChange={handleInputChange} className={inputClass} />
                <div className='grid grid-cols-2 gap-2'>
                    <div>
                        <label className='text-sm font-semibold text-slate-600 block' htmlFor={`country-${stamp.id}`}>Country</label>
                        <input id={`country-${stamp.id}`} type="text" name="country" value={editableStamp.country} onChange={handleInputChange} className={inputClass} />
                    </div>
                    <div>
                        <label className='text-sm font-semibold text-slate-600 block' htmlFor={`year-${stamp.id}`}>Year</label>
                        <input id={`year-${stamp.id}`} type="text" name="year" value={editableStamp.year} onChange={handleInputChange} className={inputClass} />
                    </div>
                </div>
            </div>
          ) : (
            <div>
                <h3 className="text-2xl font-bold text-slate-900">{stamp.name}</h3>
                <p className="text-md text-slate-500">{stamp.country}, {stamp.year}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg flex items-start space-x-3 ${isSingular ? 'bg-green-50 border-green-200 border' : 'bg-blue-50 border-blue-200 border'}`}>
              <div className={`p-2 rounded-full ${isSingular ? 'bg-green-100' : 'bg-blue-100'}`}>
                <GavelIcon className={`w-5 h-5 ${isSingular ? 'text-green-600' : 'text-blue-600'}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600">Recommendation</p>
                {isEditing ? (
                    <select name="auctionType" value={editableStamp.auctionType} onChange={handleInputChange} className={`${inputClass} mt-1 text-lg font-bold ${isSingular ? 'text-green-800' : 'text-blue-800'}`}>
                        <option value="Singular Auction">Singular Auction</option>
                        <option value="Lot Auction">Lot Auction</option>
                    </select>
                ) : (
                    <p className={`text-lg font-bold ${isSingular ? 'text-green-800' : 'text-blue-800'}`}>{stamp.auctionType}</p>
                )}
              </div>
            </div>

            <div className="p-4 rounded-lg flex items-start space-x-3 bg-yellow-50 border-yellow-200 border">
              <div className="p-2 rounded-full bg-yellow-100">
                <DollarSignIcon className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600">Est. Value</p>
                {isEditing ? (
                    <input type="text" name="estimatedValue" value={editableStamp.estimatedValue} onChange={handleInputChange} className={`${inputClass} mt-1 text-lg font-bold text-yellow-800`} />
                ) : (
                    <p className="text-lg font-bold text-yellow-800">{stamp.estimatedValue}</p>
                )}
              </div>
            </div>
          </div>
          
          <div>
            <div className="flex items-center space-x-2 mb-2">
                <InfoIcon className="w-5 h-5 text-slate-400" />
                <h4 className="font-semibold text-slate-700">Description</h4>
            </div>
            {isEditing ? (
                <textarea name="description" value={editableStamp.description} onChange={handleInputChange} className={textareaClass} />
            ) : (
                <p className="text-slate-600 text-sm leading-relaxed">{stamp.description}</p>
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-2">
                <TagIcon className="w-5 h-5 text-slate-400" />
                <h4 className="font-semibold text-slate-700">Justification</h4>
            </div>
            {isEditing ? (
                <textarea name="justification" value={editableStamp.justification} onChange={handleInputChange} className={textareaClass} />
            ) : (
                <p className="text-slate-600 text-sm italic bg-slate-50 p-3 rounded-md border border-slate-200">"{stamp.justification}"</p>
            )}
          </div>

          {isEditing && (
            <div className="flex justify-end space-x-3 pt-2">
                <button onClick={handleCancel} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors font-semibold">
                    Cancel
                </button>
                <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-bold shadow-sm">
                    Save Changes
                </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default StampCard;
