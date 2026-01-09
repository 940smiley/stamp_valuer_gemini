
import React, { useState, useMemo } from 'react';
import type { Stamp, StampData, SortBy, SortOrder, Collection } from '../types';
import StampCard from './StampCard';
import SortControls from './SortControls';
import { exportToGoogleDrive } from '../services/googleService';
import EbayLister from './EbayLister';
import StampComparison from './StampComparison';

interface StampLogProps {
  stamps: Stamp[];
  collections: Collection[];
  onRemove: (id: number) => void;
  onUpdate: (id: number, updatedData: Partial<StampData & { collectionId?: string }>) => void;
  onEditImage: (id: number) => void;
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortByChange: (sortBy: SortBy) => void;
  onSortOrderChange: () => void;
}

const StampLog: React.FC<StampLogProps> = ({ 
    stamps, collections, onRemove, onUpdate, onEditImage,
    sortBy, sortOrder, onSortByChange, onSortOrderChange 
}) => {
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    
    // Advanced Filters
    const [filterCountry, setFilterCountry] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [filterCondition, setFilterCondition] = useState('');
    const [filterAuctionType, setFilterAuctionType] = useState('all');
    const [filterMinPrice, setFilterMinPrice] = useState('');
    const [filterMaxPrice, setFilterMaxPrice] = useState('');
    const [filterTags, setFilterTags] = useState('');
    const [filterCollection, setFilterCollection] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);
    
    // Modal States
    const [isBulkEditing, setIsBulkEditing] = useState(false);
    const [isEbayListing, setIsEbayListing] = useState(false);
    const [isComparing, setIsComparing] = useState(false);

    const [bulkForm, setBulkForm] = useState({
        country: '',
        year: '',
        auctionType: '',
        collectionId: '',
        addTags: '',
        overwriteTags: false // Default to append
    });

    const parsePrice = (priceStr: string) => {
        const match = priceStr.replace(/[$,]/g, '').match(/(\d+(\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
    };

    const resetFilters = () => {
        setFilterCountry('');
        setFilterYear('');
        setFilterCondition('');
        setFilterAuctionType('all');
        setFilterMinPrice('');
        setFilterMaxPrice('');
        setFilterTags('');
        setFilterCollection('all');
    };

    const hasActiveFilters = filterCountry || filterYear || filterCondition || filterAuctionType !== 'all' || filterMinPrice || filterMaxPrice || filterTags || filterCollection !== 'all';

    const filteredStamps = useMemo(() => {
        return stamps.filter(s => {
            // Text Search (Name, Country, Tags)
            const searchLower = search.toLowerCase();
            const matchesSearch = 
                s.name.toLowerCase().includes(searchLower) || 
                s.country.toLowerCase().includes(searchLower) ||
                s.tags?.some(t => t.toLowerCase().includes(searchLower));
            
            // Advanced Filters
            const matchesCountry = filterCountry ? s.country.toLowerCase().includes(filterCountry.toLowerCase()) : true;
            const matchesYear = filterYear ? s.year.includes(filterYear) : true;
            const matchesCondition = filterCondition ? s.condition?.toLowerCase().includes(filterCondition.toLowerCase()) : true;
            const matchesAuction = filterAuctionType === 'all' ? true : s.auctionType === filterAuctionType;
            const matchesCollection = filterCollection === 'all' ? true : s.collectionId === filterCollection;
            
            const price = parsePrice(s.estimatedValue);
            const matchesMinPrice = filterMinPrice ? price >= parseFloat(filterMinPrice) : true;
            const matchesMaxPrice = filterMaxPrice ? price <= parseFloat(filterMaxPrice) : true;

            const matchesTags = filterTags ? s.tags?.some(t => t.toLowerCase().includes(filterTags.toLowerCase())) : true;

            return matchesSearch && matchesCountry && matchesYear && matchesCondition && matchesAuction && matchesCollection && matchesMinPrice && matchesMaxPrice && matchesTags;
        });
    }, [stamps, search, filterCountry, filterYear, filterCondition, filterAuctionType, filterCollection, filterMinPrice, filterMaxPrice, filterTags]);

    const toggleSelect = (id: number) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const selectAllFiltered = () => {
        if (selectedIds.size === filteredStamps.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredStamps.map(s => s.id)));
        }
    };

    const handleBulkSave = () => {
        if (!window.confirm(`Apply changes to ${selectedIds.size} items?`)) return;

        selectedIds.forEach(id => {
            const updates: any = {};
            if (bulkForm.country) updates.country = bulkForm.country;
            if (bulkForm.year) updates.year = bulkForm.year;
            if (bulkForm.auctionType) updates.auctionType = bulkForm.auctionType;
            if (bulkForm.collectionId) updates.collectionId = bulkForm.collectionId === 'none' ? undefined : bulkForm.collectionId;
            
            if (bulkForm.addTags) {
                const currentStamp = stamps.find(s => s.id === id);
                if (currentStamp) {
                    const newTags = bulkForm.addTags.split(',').map(t => t.trim()).filter(Boolean);
                    if (bulkForm.overwriteTags) {
                        updates.tags = newTags;
                    } else {
                        const existingTags = currentStamp.tags || [];
                        updates.tags = Array.from(new Set([...existingTags, ...newTags]));
                    }
                }
            }
            onUpdate(id, updates);
        });
        
        setIsBulkEditing(false);
        setBulkForm({ country: '', year: '', auctionType: '', collectionId: '', addTags: '', overwriteTags: false });
        setSelectedIds(new Set());
    };

    const handleBulkExport = async () => {
        const itemsToExport = stamps.filter(s => selectedIds.has(s.id));
        const success = await exportToGoogleDrive(itemsToExport);
        if (success) {
            alert(`Successfully exported ${itemsToExport.length} stamps to Drive.`);
        }
    };

    const selectedStampsForListing = useMemo(() => {
        return stamps.filter(s => selectedIds.has(s.id));
    }, [stamps, selectedIds]);

    const itemsToCompare = useMemo(() => {
        return stamps.filter(s => selectedIds.has(s.id));
    }, [stamps, selectedIds]);

    return (
    <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Simple Collection Sidebar */}
        {collections.length > 0 && (
             <div className="hidden lg:block w-48 shrink-0 space-y-2">
                <h3 className="font-bold text-slate-700 uppercase text-xs mb-2">Collections</h3>
                <button 
                    onClick={() => setFilterCollection('all')}
                    className={`w-full text-left px-3 py-2 rounded text-sm font-medium ${filterCollection === 'all' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                    All Items
                </button>
                {collections.map(c => (
                    <button 
                        key={c.id}
                        onClick={() => setFilterCollection(c.id)}
                        className={`w-full text-left px-3 py-2 rounded text-sm font-medium truncate ${filterCollection === c.id ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        {c.name}
                    </button>
                ))}
             </div>
        )}

        <div className="flex-grow space-y-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold text-slate-800 whitespace-nowrap">
                            Log ({filteredStamps.length})
                            </h2>
                            {filteredStamps.length > 0 && (
                                <button 
                                    onClick={selectAllFiltered}
                                    className="text-xs text-blue-600 hover:underline ml-2"
                                >
                                    {selectedIds.size === filteredStamps.length ? 'Deselect All' : 'Select All'}
                                </button>
                            )}
                        </div>
                        
                        <div className="w-full md:w-auto flex-grow flex gap-2">
                            <div className="relative flex-grow">
                                <input 
                                    type="text" 
                                    placeholder="Search name, country..." 
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <svg className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <button 
                                onClick={() => setShowFilters(!showFilters)}
                                className={`px-3 py-2 rounded-lg border flex items-center gap-2 ${showFilters || hasActiveFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-slate-300 text-slate-600'} hover:bg-slate-50`}
                                title="Advanced Filters"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                                {hasActiveFilters && <span className="w-2 h-2 bg-blue-600 rounded-full"></span>}
                            </button>
                            <SortControls 
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                                onSortByChange={onSortByChange}
                                onSortOrderChange={onSortOrderChange}
                            />
                        </div>
                    </div>

                    {/* Advanced Filters Section */}
                    {showFilters && (
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 animate-fade-in relative">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Advanced Filtering</h4>
                                {hasActiveFilters && (
                                    <button 
                                        onClick={resetFilters} 
                                        className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1"
                                    >
                                        <span>×</span> Clear Filters
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Country</label>
                                    <input className="w-full border border-slate-300 rounded p-1.5 text-sm focus:border-blue-500 outline-none" placeholder="Any" value={filterCountry} onChange={e => setFilterCountry(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Year</label>
                                    <input className="w-full border border-slate-300 rounded p-1.5 text-sm focus:border-blue-500 outline-none" placeholder="Any" value={filterYear} onChange={e => setFilterYear(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Condition</label>
                                    <input className="w-full border border-slate-300 rounded p-1.5 text-sm focus:border-blue-500 outline-none" placeholder="e.g. Mint, Used" value={filterCondition} onChange={e => setFilterCondition(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Auction Type</label>
                                    <select className="w-full border border-slate-300 rounded p-1.5 text-sm focus:border-blue-500 outline-none" value={filterAuctionType} onChange={e => setFilterAuctionType(e.target.value)}>
                                        <option value="all">All</option>
                                        <option value="Singular Auction">Singular</option>
                                        <option value="Lot Auction">Lot</option>
                                    </select>
                                </div>
                                 <div className="col-span-2 lg:col-span-1">
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Price Range ($)</label>
                                    <div className="flex gap-1">
                                        <input className="w-full border border-slate-300 rounded p-1.5 text-sm focus:border-blue-500 outline-none" placeholder="Min" type="number" value={filterMinPrice} onChange={e => setFilterMinPrice(e.target.value)} />
                                        <input className="w-full border border-slate-300 rounded p-1.5 text-sm focus:border-blue-500 outline-none" placeholder="Max" type="number" value={filterMaxPrice} onChange={e => setFilterMaxPrice(e.target.value)} />
                                    </div>
                                </div>
                                <div className="col-span-2 lg:col-span-1">
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Tags</label>
                                    <input className="w-full border border-slate-300 rounded p-1.5 text-sm focus:border-blue-500 outline-none" placeholder="Filter by tag..." value={filterTags} onChange={e => setFilterTags(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedIds.size > 0 && (
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex flex-wrap items-center gap-4 animate-fade-in">
                            <div className="font-bold text-blue-800 text-sm flex items-center">
                                <span className="bg-blue-200 text-blue-800 px-2 py-0.5 rounded mr-2">{selectedIds.size}</span> Selected
                            </div>
                            <div className="h-4 w-px bg-blue-200 hidden sm:block"></div>
                            
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setIsBulkEditing(true)}
                                    className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded font-semibold text-sm hover:bg-blue-50 shadow-sm"
                                >
                                    Bulk Edit
                                </button>
                                
                                {selectedIds.size === 2 && (
                                    <button 
                                        onClick={() => setIsComparing(true)}
                                        className="px-3 py-1.5 bg-white border border-purple-300 text-purple-700 rounded font-semibold text-sm hover:bg-purple-50 shadow-sm flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                        Compare (2)
                                    </button>
                                )}

                                <button 
                                    onClick={handleBulkExport}
                                    className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded font-semibold text-sm hover:bg-blue-50 shadow-sm flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg"><path d="m6.6 66.85 3.85 6.65c.8 1.4 1.9 2.5 3.2 3.3l12.3-21.3h-25.3c-.1 1.5.4 3 1.3 4.55zm26.25-45.55 12.3 21.3 12.6-21.8-12.6-21.8c-.8-1.4-1.9-2.5-3.2-3.3l-12.3 21.3zm38.7 6.1-12.6 21.8 13.9 24.1c.9-.5 1.75-1.15 2.45-1.95.7-.8 1.25-1.7 1.6-2.65l10.4-18c.9-1.55.9-3.45 0-5l-3.85-6.65c-.8-1.4-1.9-2.5-3.2-3.3l-8.7-14.35z" fill="#3b82f6"/></svg>
                                    Export
                                </button>
                                <button 
                                    onClick={() => setIsEbayListing(true)}
                                    className="px-3 py-1.5 bg-blue-600 text-white border border-blue-600 rounded font-semibold text-sm hover:bg-blue-700 shadow-sm flex items-center gap-2"
                                >
                                    List on eBay
                                </button>
                            </div>
                            
                            <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-blue-600 hover:underline">Cancel Selection</button>
                        </div>
                    )}
            </div>
            
            {/* Bulk Edit Modal */}
            {isBulkEditing && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">Bulk Edit ({selectedIds.size} items)</h3>
                            <button onClick={() => setIsBulkEditing(false)} className="text-slate-400 hover:text-slate-600"><span className="text-2xl">×</span></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-500 mb-4">Values entered here will be applied to all selected stamps. Leave fields blank to keep existing values.</p>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Country</label>
                                    <input 
                                        className="w-full border border-slate-300 rounded p-2 text-sm"
                                        value={bulkForm.country}
                                        onChange={e => setBulkForm({...bulkForm, country: e.target.value})}
                                        placeholder="No Change"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Year</label>
                                    <input 
                                        className="w-full border border-slate-300 rounded p-2 text-sm"
                                        value={bulkForm.year}
                                        onChange={e => setBulkForm({...bulkForm, year: e.target.value})}
                                        placeholder="No Change"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Collection</label>
                                <select 
                                    className="w-full border border-slate-300 rounded p-2 text-sm"
                                    value={bulkForm.collectionId}
                                    onChange={e => setBulkForm({...bulkForm, collectionId: e.target.value})}
                                >
                                    <option value="">No Change</option>
                                    <option value="none">Unsorted (Remove from Collection)</option>
                                    {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Auction Type</label>
                                    <select 
                                        className="w-full border border-slate-300 rounded p-2 text-sm"
                                        value={bulkForm.auctionType}
                                        onChange={e => setBulkForm({...bulkForm, auctionType: e.target.value})}
                                    >
                                        <option value="">No Change</option>
                                        <option value="Singular Auction">Singular Auction</option>
                                        <option value="Lot Auction">Lot Auction</option>
                                    </select>
                                </div>
                                <div>
                                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Add Tags</label>
                                    <input 
                                        className="w-full border border-slate-300 rounded p-2 text-sm"
                                        value={bulkForm.addTags}
                                        onChange={e => setBulkForm({...bulkForm, addTags: e.target.value})}
                                        placeholder="comma, separated"
                                    />
                                    <div className="flex items-center mt-2">
                                        <input 
                                            type="checkbox"
                                            id="overwriteTags"
                                            checked={bulkForm.overwriteTags}
                                            onChange={e => setBulkForm({...bulkForm, overwriteTags: e.target.checked})}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-2"
                                        />
                                        <label htmlFor="overwriteTags" className="text-xs text-slate-500 cursor-pointer select-none">
                                            Overwrite existing tags? (Default: Append)
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                            <button onClick={() => setIsBulkEditing(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded">Cancel</button>
                            <button onClick={handleBulkSave} className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 shadow-sm">Apply Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Comparison Tool Modal */}
            {isComparing && itemsToCompare.length === 2 && (
                <StampComparison 
                    stamps={[itemsToCompare[0], itemsToCompare[1]]} 
                    onClose={() => setIsComparing(false)} 
                />
            )}

            {/* eBay Lister Modal */}
            {isEbayListing && (
                <EbayLister 
                    stamps={selectedStampsForListing} 
                    onClose={() => setIsEbayListing(false)} 
                />
            )}

            {filteredStamps.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-lg border border-slate-200">
                <p className="text-slate-500">No stamps match your filters.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredStamps.map(stamp => (
                        <div key={stamp.id} className="flex gap-2 items-start">
                            <div className="pt-8">
                                <input 
                                    type="checkbox" 
                                    checked={selectedIds.has(stamp.id)}
                                    onChange={() => toggleSelect(stamp.id)}
                                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex-grow min-w-0">
                                <StampCard 
                                    stamp={stamp}
                                    collections={collections}
                                    onRemove={onRemove} 
                                    onUpdate={onUpdate} 
                                    onEditImage={onEditImage}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default StampLog;
