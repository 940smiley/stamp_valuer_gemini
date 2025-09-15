
import React from 'react';
import type { SortBy, SortOrder } from '../types';
import { ArrowUpIcon, ArrowDownIcon } from './icons';

interface SortControlsProps {
    sortBy: SortBy;
    sortOrder: SortOrder;
    onSortByChange: (sortBy: SortBy) => void;
    onSortOrderChange: () => void;
}

const SortControls: React.FC<SortControlsProps> = ({ sortBy, sortOrder, onSortByChange, onSortOrderChange }) => {
    return (
        <div className="flex items-center space-x-2">
            <select
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value as SortBy)}
                className="bg-white border border-slate-300 rounded-md py-1.5 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                aria-label="Sort by"
            >
                <option value="date">Date Added</option>
                <option value="name">Name</option>
                <option value="country">Country</option>
                <option value="value">Est. Value</option>
            </select>
            <button
                onClick={onSortOrderChange}
                className="p-2 bg-white border border-slate-300 rounded-md text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                aria-label={`Sort in ${sortOrder === 'asc' ? 'descending' : 'ascending'} order`}
            >
                {sortOrder === 'asc' ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
            </button>
        </div>
    );
};

export default SortControls;
