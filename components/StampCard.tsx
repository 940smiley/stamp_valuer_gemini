
import React from 'react';
import type { Stamp, StampData, Collection } from '../types';
import { TagIcon, DollarSignIcon, GavelIcon, InfoIcon, XIcon, PencilIcon } from './icons';

interface StampCardProps {
    stamp: Stamp;
    collections: Collection[];
    onRemove: (id: number) => void;
    onUpdate: (id: number, updatedData: Partial<StampData & { collectionId?: string }>) => void;
    onRescan: (id: number, notes?: string) => void;
    onEditImage: (id: number) => void;
}

const StampCard: React.FC<StampCardProps> = ({ stamp, collections, onRemove, onUpdate, onRescan, onEditImage }) => {
    const [localData, setLocalData] = React.useState<StampData & { collectionId?: string }>({ ...stamp });
    const [isEditing, setIsEditing] = React.useState(false);
    const [newTag, setNewTag] = React.useState('');
    const [isShareOpen, setIsShareOpen] = React.useState(false);

    // Sync local data when stamp changes externally (e.g. after rescan)
    React.useEffect(() => {
        setLocalData({ ...stamp });
    }, [stamp]);

    const isPrivate = JSON.parse(localStorage.getItem('stamp-valuer-settings') || '{}').isPrivateCollection;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target as HTMLInputElement;
        setLocalData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        onUpdate(stamp.id, localData);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setLocalData({ ...stamp });
        setIsEditing(false);
    };

    const handleAddTag = () => {
        if (!newTag.trim()) return;
        const tags = localData.tags || [];
        if (!tags.includes(newTag.trim())) {
            setLocalData(prev => ({ ...prev, tags: [...tags, newTag.trim()] }));
        }
        setNewTag('');
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setLocalData(prev => ({
            ...prev,
            tags: (prev.tags || []).filter(t => t !== tagToRemove)
        }));
    };

    const handleRescan = () => {
        if (window.confirm("This will overwrite the current AI identification using your notes. Continue?")) {
            onRescan(stamp.id, localData.aiNotes);
            setIsEditing(false);
        }
    };

    const shareItem = (platform: 'facebook' | 'twitter' | 'copy') => {
        const text = `Check out this rare ${localData.year} ${localData.country} stamp! Value: ${localData.estimatedValue}`;
        const url = window.location.href;

        if (platform === 'facebook') {
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, '_blank');
        } else if (platform === 'twitter') {
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        } else {
            navigator.clipboard.writeText(`${text} ${url}`);
            alert("Link copied to clipboard!");
        }
        setIsShareOpen(false);
    };

    const isSingular = localData.auctionType === 'Singular Auction';

    const searchTerm = encodeURIComponent(`${localData.country} ${localData.name} ${localData.faceValue || ''} ${localData.year || ''}`.trim());
    const markets = [
        { name: 'eBay', url: `https://www.ebay.com/sch/i.html?_nkw=${searchTerm}`, color: 'text-blue-600 bg-blue-50 border-blue-100' },
        { name: 'Colnect', url: `https://colnect.com/en/stamps/list/q/${searchTerm}`, color: 'text-sky-600 bg-sky-50 border-sky-100' },
        { name: 'Delcampe', url: `https://www.delcampe.net/en_US/collectibles/search?term=${searchTerm}&categories%5B%5D=30002`, color: 'text-blue-800 bg-blue-50 border-blue-200' },
        { name: 'Catawiki', url: `https://www.catawiki.com/en/s?q=${searchTerm}`, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    ];

    const inputClass = "w-full bg-white border border-slate-200 rounded px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none";
    const labelClass = "block text-[10px] font-bold text-slate-400 uppercase mb-1 mt-2";

    return (
        <div className={`bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden transition-all relative mb-6 ${stamp.duplicateOf ? 'ring-2 ring-red-500' : ''} ${isEditing ? 'ring-2 ring-blue-500 shadow-2xl' : ''}`}>

            {stamp.duplicateOf && (
                <div className="bg-red-50 text-red-700 px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-between border-b border-red-100">
                    <span className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Possible Duplicate
                    </span>
                </div>
            )}

            <div className="absolute top-2 right-2 flex space-x-2 z-10">
                {!isEditing && (
                    <>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md font-bold text-[10px] uppercase flex items-center gap-1.5"
                        >
                            <PencilIcon className="w-3.5 h-3.5" />
                            Edit Details
                        </button>
                        {!isPrivate && (
                            <div className="relative">
                                <button
                                    onClick={() => setIsShareOpen(!isShareOpen)}
                                    className="p-1.5 bg-slate-100 text-slate-500 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors shadow-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                </button>
                                {isShareOpen && (
                                    <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-20">
                                        <button onClick={() => shareItem('facebook')} className="block w-full text-left px-4 py-2 text-xs hover:bg-slate-50 text-blue-700 font-bold">Facebook</button>
                                        <button onClick={() => shareItem('twitter')} className="block w-full text-left px-4 py-2 text-xs hover:bg-slate-50 text-sky-500 font-bold">Twitter</button>
                                        <button onClick={() => shareItem('copy')} className="block w-full text-left px-4 py-2 text-xs hover:bg-slate-50 text-slate-600">Copy Link</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
                <button
                    onClick={() => onRemove(stamp.id)}
                    className="p-1.5 bg-slate-100 text-slate-500 rounded-full hover:bg-red-100 hover:text-red-600 shadow-sm"
                >
                    <XIcon className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
                <div className="md:col-span-1 flex flex-col gap-2">
                    <div className="w-full aspect-square bg-slate-100 rounded-xl flex items-center justify-center p-4 border border-slate-200 overflow-hidden shadow-inner relative group">
                        <img src={stamp.imageUrl} alt={localData.name} className="max-w-full max-h-full object-contain" />

                        {isEditing ? (
                            <div className="absolute top-2 left-2 z-10">
                                <select
                                    name="imageSide"
                                    value={localData.imageSide || 'front'}
                                    onChange={handleChange}
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm bg-slate-800 text-white border-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="front">FRONT</option>
                                    <option value="back">BACK</option>
                                    <option value="piece">ON PIECE</option>
                                </select>
                            </div>
                        ) : (
                            <div className={`absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm uppercase ${localData.imageSide === 'back' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-800 text-white'}`}>
                                {localData.imageSide || 'front'}
                            </div>
                        )}

                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                                onClick={() => onEditImage(stamp.id)}
                                className="bg-white text-slate-900 px-4 py-2 rounded-full font-bold text-sm shadow-lg hover:bg-blue-50 transition"
                            >
                                Open Editor
                            </button>
                        </div>
                    </div>

                    {!isEditing ? (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            {localData.catalogNumber && (
                                <div className="text-center font-mono bg-slate-100 py-1 rounded border border-slate-200 text-slate-600 col-span-2">
                                    CAT#: {localData.catalogNumber}
                                </div>
                            )}
                            {localData.perforations && (
                                <div className="text-center bg-slate-50 py-1 rounded border border-slate-100 text-slate-500">
                                    Perf: {localData.perforations}
                                </div>
                            )}
                            {localData.faceValue && (
                                <div className="text-center bg-slate-50 py-1 rounded border border-slate-100 text-slate-500">
                                    Val: {localData.faceValue}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <label className={labelClass}>Catalog Number</label>
                            <input name="catalogNumber" value={localData.catalogNumber || ''} onChange={handleChange} className={inputClass} placeholder="e.g. Scott #123" />
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className={labelClass}>Denomination</label>
                                    <input name="faceValue" value={localData.faceValue || ''} onChange={handleChange} className={inputClass} placeholder="e.g. 5c" />
                                </div>
                                <div>
                                    <label className={labelClass}>Perfs</label>
                                    <input name="perforations" value={localData.perforations || ''} onChange={handleChange} className={inputClass} placeholder="e.g. 11x12" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-2">
                        <label className={labelClass}>Collection</label>
                        <select
                            name="collectionId"
                            value={localData.collectionId || ''}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className={`${inputClass} disabled:bg-transparent disabled:border-transparent disabled:p-0 disabled:text-slate-600 font-medium`}
                        >
                            <option value="">Unsorted</option>
                            {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {!isEditing && localData.confidenceBreakdown && (
                        <div className="mt-4 bg-slate-50 p-2 rounded border border-slate-100">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2">AI Confidence</h5>
                            <div className="flex gap-3">
                                {Object.entries(localData.confidenceBreakdown).map(([k, v]) => (
                                    <div key={k} className="flex-1">
                                        <div className="flex justify-between text-[8px] text-slate-400 mb-0.5 font-bold uppercase">
                                            <span>{k.slice(0, 4)}</span>
                                            <span>{Math.round(v * 100)}%</span>
                                        </div>
                                        <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                                            <div className={`h-full ${k === 'identification' ? 'bg-blue-500' : k === 'condition' ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${v * 100}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="md:col-span-2 space-y-4">
                    <div>
                        {isEditing ? (
                            <div className="space-y-2">
                                <label className={labelClass}>Stamp Title</label>
                                <input name="name" value={localData.name} onChange={handleChange} className="w-full text-xl font-black rounded border-slate-200 p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className={labelClass}>Country</label>
                                        <input name="country" value={localData.country} onChange={handleChange} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Year</label>
                                        <input name="year" value={localData.year} onChange={handleChange} className={inputClass} />
                                    </div>
                                </div>
                                <label className={labelClass}>Item Classification</label>
                                <select name="itemType" value={localData.itemType || 'stamp'} onChange={handleChange} className={inputClass}>
                                    <option value="stamp">Stamp</option>
                                    <option value="cover">Postal Cover</option>
                                    <option value="fdc">First Day Cover</option>
                                    <option value="block">Block / Multiple</option>
                                    <option value="pane">Sheet / Pane</option>
                                    <option value="clipping">On Piece (Clipping)</option>
                                </select>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-2xl font-black text-slate-900 leading-tight">{localData.name}</h3>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">{localData.country} • {localData.year}</p>
                            </>
                        )}

                        <div className="flex flex-wrap gap-1 mt-3">
                            {/* Inline Tag Management */}
                            {(localData.tags || []).map((tag, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-slate-100 text-[10px] font-bold text-slate-500 rounded uppercase tracking-wider border border-slate-200 flex items-center gap-1 group">
                                    {tag}
                                    {isEditing && (
                                        <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500 transition-colors">
                                            <XIcon className="w-3 h-3" />
                                        </button>
                                    )}
                                </span>
                            ))}
                            {isEditing && (
                                <div className="flex items-center gap-1">
                                    <input
                                        value={newTag}
                                        onChange={e => setNewTag(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                                        className="px-2 py-0.5 text-[10px] bg-white border border-slate-300 rounded outline-none w-20 focus:border-emerald-500"
                                        placeholder="Add tag..."
                                    />
                                    <button onClick={handleAddTag} className="bg-emerald-500 text-white rounded p-0.5 hover:bg-emerald-600 transition">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className={`p-4 rounded-xl flex items-start space-x-3 shadow-sm transition-colors border ${isSingular ? 'bg-emerald-50 border-emerald-100' : 'bg-indigo-50 border-indigo-100'}`}>
                            <div className={`p-2 rounded-lg ${isSingular ? 'bg-emerald-100' : 'bg-indigo-100'}`}>
                                <GavelIcon className={`w-5 h-5 ${isSingular ? 'text-emerald-600' : 'text-indigo-600'}`} />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Selling Strategy</p>
                                {isEditing ? (
                                    <select name="auctionType" value={localData.auctionType} onChange={handleChange} className="w-full bg-transparent font-bold text-sm outline-none border-b border-slate-300">
                                        <option value="Singular Auction">Singular Auction</option>
                                        <option value="Lot Auction">Lot Auction</option>
                                    </select>
                                ) : (
                                    <span className={`font-bold text-sm ${isSingular ? 'text-emerald-700' : 'text-indigo-700'}`}>{localData.auctionType}</span>
                                )}
                            </div>
                        </div>

                        <div className="p-4 rounded-xl flex items-start space-x-3 bg-amber-50 border-amber-100 border shadow-sm">
                            <div className="p-2 rounded-lg bg-amber-100">
                                <DollarSignIcon className="w-5 h-5 text-amber-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Market Value</p>
                                {isEditing ? (
                                    <input name="estimatedValue" value={localData.estimatedValue} onChange={handleChange} className="w-full bg-transparent font-black text-amber-800 text-lg outline-none border-b border-amber-200" />
                                ) : (
                                    <span className="font-black text-lg text-amber-800">{localData.estimatedValue}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Analysis & Historical Context</label>
                        {isEditing ? (
                            <textarea name="description" value={localData.description} onChange={handleChange} className="w-full h-24 p-2 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                        ) : (
                            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-100">{localData.description}</p>
                        )}
                    </div>

                    {isEditing && (
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-3">
                            <h4 className="text-xs font-bold text-blue-700 uppercase flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                AI Feedback Loop
                            </h4>
                            <p className="text-xs text-blue-600 font-medium">Add notes to guide the AI for a better re-scan (e.g. "This is 1920s era", "Correct the catalog # to Scott 45").</p>
                            <textarea
                                name="aiNotes"
                                value={localData.aiNotes || ''}
                                onChange={handleChange}
                                placeholder="Type notes for the AI here..."
                                className="w-full h-20 p-2 text-sm border border-blue-200 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            />
                            <button
                                onClick={handleRescan}
                                className="w-full py-2 bg-blue-600 text-white rounded font-bold text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                Re-Analyze with AI Notes
                            </button>
                        </div>
                    )}

                    {!isEditing ? (
                        localData.verificationNotes && localData.verificationNotes.length > 0 && (
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">AI Verification Notes</h4>
                                <ul className="list-disc list-inside text-xs text-slate-500 space-y-1">
                                    {localData.verificationNotes.map((note, i) => <li key={i}>{note}</li>)}
                                </ul>
                            </div>
                        )
                    ) : null}

                    {isEditing ? (
                        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                            <button onClick={handleCancel} className="px-6 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200 transition">
                                Cancel
                            </button>
                            <button onClick={handleSave} className="px-8 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-lg transition">
                                Save Details
                            </button>
                        </div>
                    ) : (
                        <div className="mt-4 pt-3 border-t border-slate-100">
                            <h4 className="text-[10px] font-bold text-slate-300 uppercase mb-2">Marketplace Connectivity</h4>
                            <div className="flex flex-wrap gap-2">
                                {markets.map(m => (
                                    <a key={m.name} href={m.url} target="_blank" rel="noopener noreferrer" className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all hover:scale-105 ${m.color}`}>
                                        {m.name}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StampCard;
