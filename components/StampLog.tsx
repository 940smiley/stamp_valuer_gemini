
import React from 'react';
import type { Stamp, StampData, SortBy, SortOrder } from '../types';
import StampCard from './StampCard';
import SortControls from './SortControls';

interface StampLogProps {
  stamps: Stamp[];
  onRemove: (id: number) => void;
  onUpdate: (id: number, updatedData: Partial<StampData>) => void;
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortByChange: (sortBy: SortBy) => void;
  onSortOrderChange: () => void;
}

const StampLog: React.FC<StampLogProps> = ({ stamps, onRemove, onUpdate, sortBy, sortOrder, onSortByChange, onSortOrderChange }) => {
  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center border-b-2 border-slate-200 pb-2">
        <h2 className="text-2xl font-bold text-slate-800">
          My Stamp Log ({stamps.length})
        </h2>
        {stamps.length > 1 && (
            <SortControls 
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortByChange={onSortByChange}
                onSortOrderChange={onSortOrderChange}
            />
        )}
      </div>
      {stamps.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg border border-slate-200">
          <p className="text-slate-500">Your identified stamps will appear here.</p>
        </div>
      ) : (
        stamps.map(stamp => (
          <StampCard key={stamp.id} stamp={stamp} onRemove={onRemove} onUpdate={onUpdate} />
        ))
      )}
    </div>
  );
};

export default StampLog;
