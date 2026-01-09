
import React from 'react';
import type { Stamp, StampData, Collection } from '../types';
import { TagIcon, DollarSignIcon, GavelIcon, InfoIcon, XIcon, PencilIcon } from './icons';

interface StampCardProps {
  stamp: Stamp;
  collections: Collection[];
  onRemove: (id: number) => void;
  onUpdate: (id: number, updatedData: Partial<StampData & { collectionId?: string }>) => void;
  onEditImage: (id: number) => void;
}

const StampCard: React.FC<StampCardProps> = ({ stamp, collections, onRemove, onUpdate, onEditImage }) => {
  const [localData, setLocalData] = React.useState<StampData & { collectionId?: string }>({ ...stamp });
  const [isDirty, setIsDirty] = React.useState(false);
  const [isShareOpen, setIsShareOpen] = React.useState(false);

  // Check privacy setting from local storage indirectly (since prop drilling is heavy, quick read or use context)
  const isPrivate = JSON.parse(localStorage.getItem('stamp-valuer-settings') || '{}').isPrivateCollection;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    setLocalData(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    onUpdate(stamp.id, localData);
    setIsDirty(false);
  };

  const handleDiscard = () => {
    setLocalData({ ...stamp });
    setIsDirty(false);
  };

  const shareItem = (platform: 'facebook' | 'twitter' | 'copy') => {
      const text = `Check out this rare ${localData.year} ${localData.country} stamp! Value: ${localData.estimatedValue}`;
      const url = window.location.href; // In real app, this would be a specific item ID URL
      
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
  
  // Market Search Links
  const searchTerm = encodeURIComponent(`${localData.country} ${localData.name} ${localData.faceValue || ''} ${localData.year || ''}`.trim());
  const markets = [
    { name: 'eBay', url: `https://www.ebay.com/sch/i.html?_nkw=${searchTerm}`, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { name: 'Colnect', url: `https://colnect.com/en/stamps/list/q/${searchTerm}`, color: 'text-sky-600 bg-sky-50 border-sky-100' },
    { name: 'Delcampe', url: `https://www.delcampe.net/en_US/collectibles/search?term=${searchTerm}&categories%5B%5D=30002`, color: 'text-blue-800 bg-blue-50 border-blue-200' },
    { name: 'Catawiki', url: `https://www.catawiki.com/en/s?q=${searchTerm}`, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    { name: 'Facebook', url: `https://www.facebook.com/marketplace/search?query=${searchTerm}`, color: 'text-blue-700 bg-slate-50 border-slate-200' },
    { name: '5miles', url: `https://www.5miles.com/search?q=${searchTerm}`, color: 'text-orange-600 bg-orange-50 border-orange-100' },
  ];

  const inlineInputBase = "bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-1 -ml-1 w-full transition-all";
  const inlineTitle = `${inlineInputBase} text-xl md:text-2xl font-black text-slate-900 leading-tight`;
  const inlineMeta = `${inlineInputBase} text-sm font-medium text-slate-500`;
  const inlineTextArea = `${inlineInputBase} resize-none min-h-[60px]`;

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden transition-shadow hover:shadow-xl relative mb-6 ${stamp.duplicateOf ? 'ring-2 ring-red-500' : ''}`}>
       
       {stamp.duplicateOf && (
           <div className="bg-red-50 text-red-700 px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-between border-b border-red-100">
               <span className="flex items-center">
                   <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                   Possible Duplicate (Score: {(stamp.similarityScore || 0).toFixed(2)})
               </span>
           </div>
       )}

       <div className="absolute top-2 right-2 flex space-x-2 z-10">
        {!isPrivate && (
            <div className="relative">
                <button 
                    onClick={() => setIsShareOpen(!isShareOpen)}
                    className="p-1.5 bg-slate-100 text-slate-500 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    title="Share"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                </button>
                {isShareOpen && (
                    <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-20">
                        <button onClick={() => shareItem('facebook')} className="block w-full text-left px-4 py-2 text-xs hover:bg-slate-50 text-blue-700 font-bold">Facebook</button>
                        <button onClick={() => shareItem('twitter')} className="block w-full text-left px-4 py-2 text-xs hover:bg-slate-50 text-sky-500 font-bold">X (Twitter)</button>
                        <button onClick={() => shareItem('copy')} className="block w-full text-left px-4 py-2 text-xs hover:bg-slate-50 text-slate-600">Copy Link</button>
                    </div>
                )}
            </div>
        )}
        <button 
          onClick={() => onEditImage(stamp.id)} 
          className="p-1.5 bg-slate-100 text-slate-500 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          title="Edit Image (Crop, Rotate, Enhance)"
        >
          {/* Image/Photo Icon */}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </button>
        <button 
          onClick={() => onRemove(stamp.id)} 
          className="p-1.5 bg-slate-100 text-slate-500 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
          title="Remove Stamp"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
        <div className="md:col-span-1 flex flex-col gap-2">
            <div className="w-full aspect-square bg-slate-100 rounded-md flex items-center justify-center p-4 border border-slate-200 overflow-hidden shadow-inner relative group">
                <img src={stamp.imageUrl} alt={localData.name} className="max-w-full max-h-full object-contain" />
                
                {/* Image Side Badge */}
                <div className="absolute top-2 left-2 z-10">
                    <select 
                        name="imageSide" 
                        value={localData.imageSide || 'front'} 
                        onChange={handleChange}
                        className={`text-[10px] font-bold px-1 py-0.5 rounded shadow-sm uppercase tracking-wider border-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${localData.imageSide === 'back' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-800 text-white'}`}
                    >
                        <option value="front" className="text-black bg-white">FRONT</option>
                        <option value="back" className="text-black bg-white">BACK</option>
                        <option value="piece" className="text-black bg-white">ON PIECE</option>
                    </select>
                </div>

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                     <button 
                        onClick={() => onEditImage(stamp.id)}
                        className="bg-white text-slate-900 px-4 py-2 rounded-full font-bold text-sm shadow-lg hover:bg-blue-50 transition"
                     >
                        Open Editor
                     </button>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
                {localData.catalogNumber && (
                    <div className="text-center font-mono bg-slate-100 py-1 rounded border border-slate-200 text-slate-600 col-span-2">
                        CAT#: {localData.catalogNumber}
                    </div>
                )}
                {localData.perforations && (
                    <div className="text-center bg-slate-50 py-1 rounded border border-slate-100 text-slate-500" title="Perforations">
                        Perf: {localData.perforations}
                    </div>
                )}
                {localData.faceValue && (
                    <div className="text-center bg-slate-50 py-1 rounded border border-slate-100 text-slate-500" title="Face Value">
                        Val: {localData.faceValue}
                    </div>
                )}
            </div>

            {collections.length > 0 && (
                <select 
                    name="collectionId" 
                    value={localData.collectionId || ''} 
                    onChange={handleChange}
                    className="w-full text-xs border border-slate-300 rounded p-1 text-slate-700 mt-1"
                >
                    <option value="">Unsorted</option>
                    {collections.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            )}

            {localData.confidenceBreakdown && (
                <div className="mt-3 bg-slate-50 p-2 rounded border border-slate-100">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-1">AI Confidence</h5>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                                <span>ID</span>
                                <span>{Math.round(localData.confidenceBreakdown.identification * 100)}%</span>
                            </div>
                            <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${localData.confidenceBreakdown.identification * 100}%` }}></div>
                            </div>
                        </div>
                         <div className="flex-1">
                            <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                                <span>Cond</span>
                                <span>{Math.round(localData.confidenceBreakdown.condition * 100)}%</span>
                            </div>
                            <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${localData.confidenceBreakdown.condition * 100}%` }}></div>
                            </div>
                        </div>
                         <div className="flex-1">
                            <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                                <span>Value</span>
                                <span>{Math.round(localData.confidenceBreakdown.valuation * 100)}%</span>
                            </div>
                            <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500" style={{ width: `${localData.confidenceBreakdown.valuation * 100}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        
        <div className="md:col-span-2 space-y-4">
            <div>
                <input 
                    name="name" 
                    value={localData.name} 
                    onChange={handleChange} 
                    className={inlineTitle}
                    placeholder="Stamp Name"
                />
                <div className="flex gap-2">
                    <input 
                        name="country" 
                        value={localData.country} 
                        onChange={handleChange} 
                        className={inlineMeta} 
                        placeholder="Country"
                    />
                    <input 
                        name="year" 
                        value={localData.year} 
                        onChange={handleChange} 
                        className={inlineMeta} 
                        placeholder="Year"
                    />
                </div>
                
                <div className="flex flex-wrap gap-1 mt-2">
                    {localData.itemType && localData.itemType !== 'stamp' && (
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider border flex items-center gap-1
                            ${localData.itemType === 'cover' || localData.itemType === 'fdc' ? 'bg-orange-100 text-orange-800 border-orange-200' : 
                              localData.itemType === 'block' || localData.itemType === 'pane' ? 'bg-purple-100 text-purple-800 border-purple-200' : 
                              'bg-slate-100 text-slate-700 border-slate-200'}`}>
                             {/* Icon for Covers/FDCs */}
                             {(localData.itemType === 'cover' || localData.itemType === 'fdc') && (
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                             )}
                            {localData.itemType}
                        </span>
                    )}
                    {localData.tags && localData.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-slate-100 text-[10px] font-bold text-slate-500 rounded uppercase tracking-wider border border-slate-200">
                        {tag}
                      </span>
                    ))}
                    {localData.condition && (
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded uppercase tracking-wider border border-indigo-100">
                            Cond: {localData.condition}
                        </span>
                    )}
                    {localData.colorShade && (
                         <span className="px-2 py-0.5 bg-pink-50 text-pink-700 text-[10px] font-bold rounded uppercase tracking-wider border border-pink-100">
                            {localData.colorShade}
                        </span>
                    )}
                </div>
            </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg flex items-start space-x-3 shadow-sm transition-colors ${isSingular ? 'bg-emerald-50 border-emerald-200 border' : 'bg-indigo-50 border-indigo-200 border'}`}>
              <div className={`p-2 rounded-full ${isSingular ? 'bg-emerald-100' : 'bg-indigo-100'}`}>
                <GavelIcon className={`w-5 h-5 ${isSingular ? 'text-emerald-600' : 'text-indigo-600'}`} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">eBay Strategy</p>
                <select 
                    name="auctionType" 
                    value={localData.auctionType} 
                    onChange={handleChange} 
                    className="w-full bg-transparent font-bold border-none p-0 focus:ring-0 text-sm"
                    style={{ color: isSingular ? '#065f46' : '#3730a3' }}
                >
                    <option value="Singular Auction">Singular Auction</option>
                    <option value="Lot Auction">Lot Auction</option>
                </select>
              </div>
            </div>

            <div className="p-4 rounded-lg flex items-start space-x-3 bg-amber-50 border-amber-200 border shadow-sm">
              <div className="p-2 rounded-full bg-amber-100">
                <DollarSignIcon className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Market Value</p>
                <input 
                    name="estimatedValue" 
                    value={localData.estimatedValue} 
                    onChange={handleChange} 
                    className="w-full bg-transparent font-bold text-amber-800 border-none p-0 focus:ring-0 text-lg"
                />
              </div>
            </div>
          </div>
          
          <div>
            <div className="flex items-center space-x-2 mb-2">
                <InfoIcon className="w-4 h-4 text-slate-400" />
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Philatelic History & Condition</h4>
            </div>
            <textarea 
                name="description" 
                value={localData.description} 
                onChange={handleChange} 
                className={`${inlineTextArea} text-slate-600 text-sm`} 
            />
             {localData.overprint && (
                <p className="text-xs text-slate-500 mt-1"><strong>Overprint:</strong> {localData.overprint}</p>
             )}
              {localData.plateFlaw && (
                <p className="text-xs text-red-500 mt-1"><strong>Plate Flaw:</strong> {localData.plateFlaw}</p>
             )}
             {localData.alternateCatalogNumbers && localData.alternateCatalogNumbers.length > 0 && (
                <p className="text-xs text-slate-500 mt-2">
                    <strong>Alt. Cats:</strong> {localData.alternateCatalogNumbers.join(', ')}
                </p>
             )}
          </div>

          {/* AI Verification Notes Section */}
          {localData.verificationNotes && localData.verificationNotes.length > 0 && (
              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                  <h4 className="text-[10px] font-bold text-blue-400 uppercase mb-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      AI Verification Notes
                  </h4>
                  <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5">
                      {localData.verificationNotes.map((note, i) => (
                          <li key={i}>{note}</li>
                      ))}
                  </ul>
              </div>
          )}

          <div className="mt-4 pt-3 border-t border-slate-100">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Marketplace Connectivity</h4>
              <div className="flex flex-wrap gap-2">
                  {markets.map(m => (
                      <a 
                          key={m.name} 
                          href={m.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className={`px-3 py-1 rounded-full text-[10px] font-bold border hover:shadow-sm transition-shadow ${m.color}`}
                      >
                          {m.name}
                      </a>
                  ))}
              </div>
          </div>

          {!isDirty && localData.sources && localData.sources.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-100">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">Sources</h4>
              <div className="flex flex-wrap gap-2">
                {localData.sources.slice(0, 3).map((source, idx) => (
                  <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline truncate max-w-[150px]">
                    {source.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          {isDirty && (
            <div className="flex justify-end space-x-3 pt-2 animate-fade-in">
                <button onClick={handleDiscard} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors font-semibold text-xs">
                    Discard Changes
                </button>
                <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-bold shadow-md text-xs">
                    Save Updates
                </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default StampCard;
