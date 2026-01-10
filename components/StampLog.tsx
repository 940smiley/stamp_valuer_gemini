
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
    onRescan: (id: number, notes?: string) => void;
    onEditImage: (id: number) => void;
    sortBy: SortBy;
    sortOrder: SortOrder;
    onSortByChange: (sortBy: SortBy) => void;
    onSortOrderChange: () => void;
}

const StampLog: React.FC<StampLogProps> = ({
    stamps, collections, onRemove, onUpdate, onRescan, onEditImage,
    sortBy, sortOrder, onSortByChange, onSortOrderChange
}) => {
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Advanced Filters
    const [filterCountry, setFilterCountry] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [filterCondition, setFilterCondition] = useState('all');
    const [filterAuctionType, setFilterAuctionType] = useState('all');
    const [filterItemType, setFilterItemType] = useState('all'); // New
    const [filterMinPrice, setFilterMinPrice] = useState('');
    const [filterMaxPrice, setFilterMaxPrice] = useState('');
    const [filterTags, setFilterTags] = useState('');
    const [filterCollection, setFilterCollection] = useState<string>('all');
    const [filterMintOnly, setFilterMintOnly] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Modal States
    const [isBulkEditing, setIsBulkEditing] = useState(false);
    const [isEbayListing, setIsEbayListing] = useState(false);
    const [isComparing, setIsComparing] = useState(false);

    // Bulk Edit State
    const [bulkForm, setBulkForm] = useState({
        country: '',
        year: '',
        auctionType: '',
        collectionId: '',
        addTags: '',
        removeTags: '',
        renameTagFrom: '',
        renameTagTo: '',
        overwriteTags: false
    });
    // Track which fields are enabled for bulk edit
    const [enabledFields, setEnabledFields] = useState<Record<string, boolean>>({
        country: false,
        year: false,
        auctionType: false,
        collectionId: false,
        addTags: false,
        removeTags: false,
        renameTags: false
    });

    const parsePrice = (priceStr: string) => {
        const match = priceStr.replace(/[$,]/g, '').match(/(\d+(\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
    };

    const resetFilters = () => {
        setFilterCountry('');
        setFilterYear('');
        setFilterCondition('all');
        setFilterAuctionType('all');
        setFilterItemType('all');
        setFilterMinPrice('');
        setFilterMaxPrice('');
        setFilterTags('');
        setFilterCollection('all');
        setFilterMintOnly(false);
    };

    const hasActiveFilters = filterCountry || filterYear || filterCondition !== 'all' || filterAuctionType !== 'all' || filterItemType !== 'all' || filterMinPrice || filterMaxPrice || filterTags || filterCollection !== 'all' || filterMintOnly;

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

            // Condition Filtering
            const condLower = s.condition?.toLowerCase() || '';
            const matchesCondition = filterCondition === 'all' ? true : condLower.includes(filterCondition.toLowerCase());

            // Mint Toggle (Specific Shortcut)
            const matchesMint = filterMintOnly ? (condLower.includes('mint') || condLower.includes('nh') || condLower.includes('unused')) : true;

            const matchesAuction = filterAuctionType === 'all' ? true : s.auctionType === filterAuctionType;
            const matchesItemType = filterItemType === 'all' ? true : s.itemType === filterItemType;
            const matchesCollection = filterCollection === 'all' ? true : s.collectionId === filterCollection;

            const price = parsePrice(s.estimatedValue);
            const matchesMinPrice = filterMinPrice ? price >= parseFloat(filterMinPrice) : true;
            const matchesMaxPrice = filterMaxPrice ? price <= parseFloat(filterMaxPrice) : true;

            const matchesTags = filterTags ? s.tags?.some(t => t.toLowerCase().includes(filterTags.toLowerCase())) : true;

            return matchesSearch && matchesCountry && matchesYear && matchesCondition && matchesMint && matchesAuction && matchesItemType && matchesCollection && matchesMinPrice && matchesMaxPrice && matchesTags;
        });
    }, [stamps, search, filterCountry, filterYear, filterCondition, filterMintOnly, filterAuctionType, filterItemType, filterCollection, filterMinPrice, filterMaxPrice, filterTags]);

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

    const toggleFieldEnabled = (field: string) => {
        setEnabledFields(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleBulkSave = () => {
        const fieldsToUpdate = Object.entries(enabledFields).filter(([_, enabled]) => enabled).map(([key]) => key);

        if (fieldsToUpdate.length === 0) {
            alert("No fields selected for update.");
            return;
        }

        if (!window.confirm(`Are you sure you want to update ${fieldsToUpdate.length} fields for ${selectedIds.size} items? This cannot be undone.`)) {
            return;
        }

        selectedIds.forEach(id => {
            const currentStamp = stamps.find(s => s.id === id);
            const updates: any = {};
            if (enabledFields.country) updates.country = bulkForm.country;
            if (enabledFields.year) updates.year = bulkForm.year;
            if (enabledFields.auctionType) updates.auctionType = bulkForm.auctionType;
            if (enabledFields.collectionId) updates.collectionId = bulkForm.collectionId === 'none' ? undefined : bulkForm.collectionId;

            // Tag Logic
            if (currentStamp) {
                let currentTags = currentStamp.tags || [];

                // 1. Rename
                if (enabledFields.renameTags && bulkForm.renameTagFrom && bulkForm.renameTagTo) {
                    currentTags = currentTags.map(t => t.toLowerCase() === bulkForm.renameTagFrom.toLowerCase() ? bulkForm.renameTagTo : t);
                }

                // 2. Remove
                if (enabledFields.removeTags && bulkForm.removeTags) {
                    const tagsToRemove = bulkForm.removeTags.split(',').map(t => t.trim().toLowerCase());
                    currentTags = currentTags.filter(t => !tagsToRemove.includes(t.toLowerCase()));
                }

                // 3. Add
                if (enabledFields.addTags && bulkForm.addTags) {
                    const tagsToAdd = bulkForm.addTags.split(',').map(t => t.trim()).filter(Boolean);
                    if (bulkForm.overwriteTags) {
                        currentTags = tagsToAdd;
                    } else {
                        currentTags = [...currentTags, ...tagsToAdd];
                    }
                }

                // Only update if changes were made to tags
                if (enabledFields.renameTags || enabledFields.removeTags || enabledFields.addTags) {
                    updates.tags = Array.from(new Set(currentTags)); // Dedupe
                }
            }

            if (Object.keys(updates).length > 0) {
                onUpdate(id, updates);
            }
        });

        setIsBulkEditing(false);
        // Reset form
        setBulkForm({ country: '', year: '', auctionType: '', collectionId: '', addTags: '', removeTags: '', renameTagFrom: '', renameTagTo: '', overwriteTags: false });
        setEnabledFields({ country: false, year: false, auctionType: false, collectionId: false, addTags: false, removeTags: false, renameTags: false });
        setSelectedIds(new Set());
    };

    const handleLocalExport = () => {
        const itemsToExport = stamps.filter(s => selectedIds.has(s.id));
        if (itemsToExport.length === 0) return;

        const dataStr = JSON.stringify(itemsToExport, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `stamplicity_export_selected_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExportAll = () => {
        if (stamps.length === 0) return;
        const dataStr = JSON.stringify(stamps, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `stamplicity_full_collection_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDriveExport = async () => {
        const itemsToExport = stamps.filter(s => selectedIds.has(s.id));
        await exportToGoogleDrive(itemsToExport);
        alert(`Successfully exported ${itemsToExport.length} stamps to Google Drive.`);
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

                            {/* Export All Button */}
                            {stamps.length > 0 && (
                                <button
                                    onClick={handleExportAll}
                                    className="ml-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-2 py-1 rounded border border-slate-200"
                                    title="Export entire collection to JSON"
                                >
                                    Export All
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
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Item Type</label>
                                    <select
                                        className="w-full border border-slate-300 rounded p-1.5 text-sm focus:border-blue-500 outline-none"
                                        value={filterItemType}
                                        onChange={e => setFilterItemType(e.target.value)}
                                    >
                                        <option value="all">All Types</option>
                                        <option value="stamp">Stamps</option>
                                        <option value="cover">Covers / Envelopes</option>
                                        <option value="fdc">First Day Covers</option>
                                        <option value="block">Blocks / Panes</option>
                                        <option value="clipping">Clippings</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Condition</label>
                                    <select
                                        className="w-full border border-slate-300 rounded p-1.5 text-sm focus:border-blue-500 outline-none"
                                        value={filterCondition}
                                        onChange={e => setFilterCondition(e.target.value)}
                                    >
                                        <option value="all">Any Condition</option>
                                        <option value="Mint">Mint (All)</option>
                                        <option value="Used">Used / Cancelled</option>
                                        <option value="Fine">Fine</option>
                                        <option value="Very Fine">Very Fine</option>
                                        <option value="Poor">Poor / Damaged</option>
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

                            {/* Mint Toggle Shortcut */}
                            <div className="mt-3 flex items-center gap-2">
                                <label className="inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={filterMintOnly} onChange={e => setFilterMintOnly(e.target.checked)} className="sr-only peer" />
                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 relative"></div>
                                    <span className="ml-2 text-xs font-bold text-emerald-700 uppercase">Mint Condition Only</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {selectedIds.size > 0 && (
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex flex-wrap items-center gap-4 animate-fade-in">
                            <div className="font-bold text-blue-800 text-sm flex items-center">
                                <span className="bg-blue-200 text-blue-800 px-2 py-0.5 rounded mr-2">{selectedIds.size}</span> Selected
                            </div>
                            <div className="h-4 w-px bg-blue-200 hidden sm:block"></div>

                            <div className="flex gap-2 flex-wrap">
                                <button
                                    onClick={() => setIsBulkEditing(true)}
                                    className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded font-semibold text-sm hover:bg-blue-50 shadow-sm"
                                >
                                    Bulk Edit / Tags
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
                                    onClick={handleLocalExport}
                                    className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded font-semibold text-sm hover:bg-blue-50 shadow-sm flex items-center gap-2"
                                    title="Download selected items as JSON"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    Export Selected
                                </button>

                                <button
                                    onClick={handleDriveExport}
                                    className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded font-semibold text-sm hover:bg-blue-50 shadow-sm flex items-center gap-2"
                                    title="Export to Google Drive"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg"><path d="m6.6 66.85 3.85 6.65c.8 1.4 1.9 2.5 3.2 3.3l12.3-21.3h-25.3c-.1 1.5.4 3 1.3 4.55zm26.25-45.55 12.3 21.3 12.6-21.8-12.6-21.8c-.8-1.4-1.9-2.5-3.2-3.3l-12.3 21.3zm38.7 6.1-12.6 21.8 13.9 24.1c.9-.5 1.75-1.15 2.45-1.95.7-.8 1.25-1.7 1.6-2.65l10.4-18c.9-1.55.9-3.45 0-5l-3.85-6.65c-.8-1.4-1.9-2.5-3.2-3.3l-8.7-14.35z" fill="#3b82f6" /></svg>
                                    Drive
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
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in max-h-[90vh] flex flex-col">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
                                <h3 className="font-bold text-lg text-slate-800">Bulk Edit ({selectedIds.size} items)</h3>
                                <button onClick={() => setIsBulkEditing(false)} className="text-slate-400 hover:text-slate-600"><span className="text-2xl">×</span></button>
                            </div>
                            <div className="p-6 space-y-4 overflow-y-auto">
                                <p className="text-sm text-slate-500 mb-4 bg-yellow-50 p-3 rounded border border-yellow-100 text-yellow-800">
                                    Select the fields you want to update. Only checked fields will be applied.
                                </p>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className={`p-3 border rounded-lg ${enabledFields.country ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                                        <div className="flex items-center mb-2">
                                            <input type="checkbox" checked={enabledFields.country} onChange={() => toggleFieldEnabled('country')} className="w-4 h-4 text-blue-600 rounded mr-2" />
                                            <label className="text-xs font-bold text-slate-700 uppercase">Country</label>
                                        </div>
                                        <input
                                            className="w-full border border-slate-300 rounded p-2 text-sm disabled:opacity-50 disabled:bg-slate-100"
                                            value={bulkForm.country}
                                            onChange={e => setBulkForm({ ...bulkForm, country: e.target.value })}
                                            placeholder="Value to apply"
                                            disabled={!enabledFields.country}
                                        />
                                    </div>
                                    <div className={`p-3 border rounded-lg ${enabledFields.year ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                                        <div className="flex items-center mb-2">
                                            <input type="checkbox" checked={enabledFields.year} onChange={() => toggleFieldEnabled('year')} className="w-4 h-4 text-blue-600 rounded mr-2" />
                                            <label className="text-xs font-bold text-slate-700 uppercase">Year</label>
                                        </div>
                                        <input
                                            className="w-full border border-slate-300 rounded p-2 text-sm disabled:opacity-50 disabled:bg-slate-100"
                                            value={bulkForm.year}
                                            onChange={e => setBulkForm({ ...bulkForm, year: e.target.value })}
                                            placeholder="Value to apply"
                                            disabled={!enabledFields.year}
                                        />
                                    </div>
                                </div>

                                <div className={`p-3 border rounded-lg ${enabledFields.collectionId ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                                    <div className="flex items-center mb-2">
                                        <input type="checkbox" checked={enabledFields.collectionId} onChange={() => toggleFieldEnabled('collectionId')} className="w-4 h-4 text-blue-600 rounded mr-2" />
                                        <label className="text-xs font-bold text-slate-700 uppercase">Collection</label>
                                    </div>
                                    <select
                                        className="w-full border border-slate-300 rounded p-2 text-sm disabled:opacity-50 disabled:bg-slate-100"
                                        value={bulkForm.collectionId}
                                        onChange={e => setBulkForm({ ...bulkForm, collectionId: e.target.value })}
                                        disabled={!enabledFields.collectionId}
                                    >
                                        <option value="">Select Collection...</option>
                                        <option value="none">Unsorted (Remove from Collection)</option>
                                        {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>

                                <div className={`p-3 border rounded-lg ${enabledFields.auctionType ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                                    <div className="flex items-center mb-2">
                                        <input type="checkbox" checked={enabledFields.auctionType} onChange={() => toggleFieldEnabled('auctionType')} className="w-4 h-4 text-blue-600 rounded mr-2" />
                                        <label className="text-xs font-bold text-slate-700 uppercase">Auction Type</label>
                                    </div>
                                    <select
                                        className="w-full border border-slate-300 rounded p-2 text-sm disabled:opacity-50 disabled:bg-slate-100"
                                        value={bulkForm.auctionType}
                                        onChange={e => setBulkForm({ ...bulkForm, auctionType: e.target.value })}
                                        disabled={!enabledFields.auctionType}
                                    >
                                        <option value="">Select Type...</option>
                                        <option value="Singular Auction">Singular Auction</option>
                                        <option value="Lot Auction">Lot Auction</option>
                                    </select>
                                </div>

                                {/* Tag Management Section */}
                                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Tag Management</h4>

                                    <div className="space-y-3">
                                        <div className={`flex items-start gap-2 ${!enabledFields.addTags ? 'opacity-75' : ''}`}>
                                            <input type="checkbox" checked={enabledFields.addTags} onChange={() => toggleFieldEnabled('addTags')} className="w-4 h-4 text-blue-600 rounded mt-1" />
                                            <div className="flex-grow">
                                                <label className="text-xs font-semibold text-slate-700 block mb-1">Add Tags</label>
                                                <input
                                                    className="w-full border border-slate-300 rounded p-2 text-sm disabled:bg-slate-100"
                                                    value={bulkForm.addTags}
                                                    onChange={e => setBulkForm({ ...bulkForm, addTags: e.target.value })}
                                                    placeholder="New tags (comma separated)"
                                                    disabled={!enabledFields.addTags}
                                                />
                                                <div className="flex items-center mt-1">
                                                    <input
                                                        type="checkbox"
                                                        id="overwriteTags"
                                                        checked={bulkForm.overwriteTags}
                                                        onChange={e => setBulkForm({ ...bulkForm, overwriteTags: e.target.checked })}
                                                        className="w-3 h-3 rounded border-slate-300 text-blue-600 mr-1"
                                                        disabled={!enabledFields.addTags}
                                                    />
                                                    <label htmlFor="overwriteTags" className="text-[10px] text-slate-500">Overwrite existing tags</label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`flex items-start gap-2 ${!enabledFields.removeTags ? 'opacity-75' : ''}`}>
                                            <input type="checkbox" checked={enabledFields.removeTags} onChange={() => toggleFieldEnabled('removeTags')} className="w-4 h-4 text-blue-600 rounded mt-1" />
                                            <div className="flex-grow">
                                                <label className="text-xs font-semibold text-slate-700 block mb-1">Remove Tags</label>
                                                <input
                                                    className="w-full border border-slate-300 rounded p-2 text-sm disabled:bg-slate-100"
                                                    value={bulkForm.removeTags}
                                                    onChange={e => setBulkForm({ ...bulkForm, removeTags: e.target.value })}
                                                    placeholder="Tags to remove (comma separated)"
                                                    disabled={!enabledFields.removeTags}
                                                />
                                            </div>
                                        </div>

                                        <div className={`flex items-start gap-2 ${!enabledFields.renameTags ? 'opacity-75' : ''}`}>
                                            <input type="checkbox" checked={enabledFields.renameTags} onChange={() => toggleFieldEnabled('renameTags')} className="w-4 h-4 text-blue-600 rounded mt-1" />
                                            <div className="flex-grow">
                                                <label className="text-xs font-semibold text-slate-700 block mb-1">Rename Tag</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        className="w-full border border-slate-300 rounded p-2 text-sm disabled:bg-slate-100"
                                                        value={bulkForm.renameTagFrom}
                                                        onChange={e => setBulkForm({ ...bulkForm, renameTagFrom: e.target.value })}
                                                        placeholder="Find tag..."
                                                        disabled={!enabledFields.renameTags}
                                                    />
                                                    <input
                                                        className="w-full border border-slate-300 rounded p-2 text-sm disabled:bg-slate-100"
                                                        value={bulkForm.renameTagTo}
                                                        onChange={e => setBulkForm({ ...bulkForm, renameTagTo: e.target.value })}
                                                        placeholder="Replace with..."
                                                        disabled={!enabledFields.renameTags}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                                <button onClick={() => setIsBulkEditing(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded">Cancel</button>
                                <button onClick={handleBulkSave} className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 shadow-sm flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                    Apply Changes
                                </button>
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
                                        onRescan={onRescan}
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
