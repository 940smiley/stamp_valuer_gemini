
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Header from './components/Header';
import StampUploader from './components/StampUploader';
import StampLog from './components/StampLog';
import SettingsPanel from './components/SettingsPanel';
import BatchProcessor from './components/BatchProcessor';
import ImageEditor from './components/ImageEditor';
import DuplicateReview from './components/DuplicateReview'; // New
import { identifyAndValueStamp, analyzeCollectionVideo } from './services/geminiService';
import type { Stamp, StampData, SortBy, SortOrder, AppSettings, AppView, Collection } from './types';
import Loader from './components/Loader';

// Removed conflicting global declaration
// If window.aistudio exists in the environment, we access it safely using casting.

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [collections, setCollections] = useState<Collection[]>([
    { id: 'favs', name: 'Favorites' },
    { id: 'sell', name: 'To Sell' }
  ]);
  const [newCollectionName, setNewCollectionName] = useState('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [videoResult, setVideoResult] = useState<any | null>(null);
  const [isVideoResultOpen, setIsVideoResultOpen] = useState(true);

  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);

  // Image Editing State
  const [editingImageId, setEditingImageId] = useState<number | null>(null);

  const videoInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('stamp-valuer-settings');
    // Combine saved settings with baked-in defaults for credentials if they are missing
    const defaultSettings = {
      // eBay Production Credentials (Recovered treasure)
      ebayApiKey: import.meta.env.VITE_EBAY_API_KEY || '', // App ID
      ebayDevId: import.meta.env.VITE_EBAY_DEV_ID || '',
      ebayCertId: import.meta.env.VITE_EBAY_CERT_ID || '', // Client Secret

      // Google Credentials (Stamplicity)
      googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      googleDeveloperKey: import.meta.env.VITE_GOOGLE_DEVELOPER_KEY || '',
      geminiApiKey: '',
      useThinkingMode: false,
      useSearchGrounding: true,
      modelQuality: 'fast' as const
    };

    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure defaults populate if saved settings are missing specific keys
      return { ...defaultSettings, ...parsed };
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('stamp-valuer-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const checkKey = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
      // Re-check key status after selection interaction
      const hasKey = await aistudio.hasSelectedApiKey();
      setHasApiKey(hasKey);
    }
  };

  const handleAddCollection = () => {
    if (!newCollectionName.trim()) return;
    setCollections(prev => [...prev, { id: Date.now().toString(), name: newCollectionName }]);
    setNewCollectionName('');
  };

  const handleStampAnalysis = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setVideoResult(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Image = (reader.result as string).split(',')[1];
        if (!base64Image) throw new Error("Failed to read image file.");

        try {
          const newStampData = await identifyAndValueStamp(base64Image, settings);

          if (newStampData.isRejected) {
            setError("The analyzed image is not recognized as a postage stamp or philatelic item.");
            setIsLoading(false);
            return;
          }

          const newId = Date.now();

          // Simple Client-side Duplicate Check (Basic Name/Country Match)
          const possibleDuplicate = stamps.find(s =>
            s.name === newStampData.name &&
            s.country === newStampData.country &&
            s.year === newStampData.year &&
            !s.duplicateOf // Don't match against something already marked duplicate
          );

          const newStamp: Stamp = {
            ...newStampData,
            id: newId,
            imageUrl: URL.createObjectURL(file),
            duplicateOf: possibleDuplicate ? possibleDuplicate.id : undefined,
            similarityScore: possibleDuplicate ? 0.85 : 0
          };

          const isPremium = false; // Placeholder for premium status check
          if (!isPremium && stamps.length >= 10) {
            setError("Logging limit reached. Free accounts are limited to 10 objects. Please upgrade to premium to add more.");
            setIsLoading(false);
            return;
          }

          setStamps(prevStamps => [newStamp, ...prevStamps]);
        } catch (apiError) {
          if (apiError instanceof Error) {
            if (apiError.message.includes("Requested entity was not found.")) {
              setHasApiKey(false);
              setError("API Configuration error. Please select a valid paid project API key.");
            } else {
              setError(`Failed to analyze stamp: ${apiError.message}`);
            }
          } else {
            setError('An unknown error occurred during stamp analysis.');
          }
        } finally {
          setIsLoading(false);
        }
      };
      reader.onerror = () => {
        setError('Failed to process the image file.');
        setIsLoading(false);
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setIsLoading(false);
    }
  }, [settings, stamps]);

  const handleVideoAnalysis = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setVideoResult(null);
    setIsVideoResultOpen(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Video = (reader.result as string).split(',')[1];
        try {
          const result = await analyzeCollectionVideo(base64Video, file.type);
          setVideoResult(result);
        } catch (e: any) {
          setError("Video analysis failed: " + e.message);
        } finally {
          setIsLoading(false);
        }
      };
    } catch (err) {
      setError("Failed to read video file.");
      setIsLoading(false);
    }
  }, []);

  const handleBatchProcessed = (newStamps: Stamp[]) => {
    setStamps(prev => [...newStamps, ...prev]);
  };

  const handleRemoveStamp = (id: number) => {
    setStamps(prevStamps => prevStamps.filter(stamp => stamp.id !== id));
  };

  const handleUpdateStamp = useCallback((id: number, updatedData: Partial<StampData>) => {
    setStamps(prevStamps =>
      prevStamps.map(stamp =>
        stamp.id === id ? { ...stamp, ...updatedData } as Stamp : stamp
      )
    );
  }, []);

  const handleDuplicateResolve = (keepId: number, removeId: number) => {
    setStamps(prev => prev.filter(s => s.id !== removeId));
  };

  const handleDuplicateIgnore = (duplicateId: number) => {
    setStamps(prev => prev.map(s => s.id === duplicateId ? { ...s, duplicateOf: undefined } : s));
  };

  const handleDiscardAllDuplicates = () => {
    if (window.confirm("Are you sure you want to discard all detected duplicates? This will delete the newly scanned items that are marked as duplicates.")) {
      setStamps(prev => prev.filter(s => !s.duplicateOf));
    }
  };

  const handleIgnoreAllDuplicates = () => {
    if (window.confirm("Are you sure you want to keep all duplicates as separate items? This will remove the duplicate warning from all items.")) {
      setStamps(prev => prev.map(s => s.duplicateOf ? { ...s, duplicateOf: undefined, similarityScore: undefined } : s));
    }
  };

  const handleDuplicateMerge = (originalId: number, duplicateId: number) => {
    setStamps(prev => {
      const original = prev.find(s => s.id === originalId);
      const duplicate = prev.find(s => s.id === duplicateId);
      if (!original || !duplicate) return prev;

      // Merge logic: Keep original ID and image, but overwrite metadata with new scan (duplicate)
      const merged: Stamp = {
        ...original,
        ...duplicate, // Overwrite properties with new data
        id: original.id, // FORCE keep original ID
        imageUrl: original.imageUrl, // Keep original Image
        duplicateOf: undefined,
        similarityScore: undefined
      };

      // Remove duplicate, update original in place
      return prev
        .filter(s => s.id !== duplicateId)
        .map(s => s.id === originalId ? merged : s);
    });
  };

  const handleDuplicateReplace = (originalId: number, duplicateId: number) => {
    setStamps(prev => {
      // Remove original, keep duplicate but clean it up
      return prev
        .filter(s => s.id !== originalId)
        .map(s => s.id === duplicateId ? { ...s, duplicateOf: undefined } : s);
    });
  };

  const sortedStamps = useMemo(() => {
    const parseValue = (valueStr: string): number => {
      if (!valueStr) return 0;
      const match = valueStr.replace(/[$,]/g, '').match(/(\d+(\.\d+)?)/);
      return match ? parseFloat(match[1]) : 0;
    };
    const newStamps = [...stamps];
    newStamps.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name': comparison = (a.name || '').localeCompare(b.name || ''); break;
        case 'country': comparison = (a.country || '').localeCompare(b.country || ''); break;
        case 'value': comparison = parseValue(a.estimatedValue) - parseValue(b.estimatedValue); break;
        case 'date':
        default: comparison = b.id - a.id; break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return newStamps;
  }, [stamps, sortBy, sortOrder]);

  // Image Editing Handlers
  const handleSaveEditedImage = (newBase64: string) => {
    if (!editingImageId) return;
    const newImageUrl = `data:image/jpeg;base64,${newBase64}`;

    setStamps(prev => {
      const original = prev.find(s => s.id === editingImageId);
      if (!original) return prev;

      const variant: Stamp = {
        ...original,
        id: Date.now(),
        name: `${original.name} (Edited)`,
        imageUrl: newImageUrl
      };
      return [variant, ...prev];
    });
    setEditingImageId(null);
  };

  if (!hasApiKey) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md border border-slate-200">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
          </div>
          <h1 className="text-2xl font-bold mb-4 text-slate-800">API Key Selection Required</h1>
          <p className="mb-6 text-slate-600 text-sm">
            This application requires a Google Gemini API key from a paid GCP project to access advanced AI models like Gemini 3 Pro.
          </p>
          <button onClick={handleOpenKeySelector} className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-md">
            Open Key Selector
          </button>
        </div>
      </div>
    );
  }

  const editingStamp = stamps.find(s => s.id === editingImageId);
  const duplicateCount = stamps.filter(s => s.duplicateOf).length;

  return (
    <div className="bg-slate-100 min-h-screen font-sans flex flex-col">
      <Header />

      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm overflow-x-auto">
        <nav className="container mx-auto px-4 md:px-8 flex space-x-6 min-w-max">
          <button onClick={() => setActiveView('dashboard')} className={`py-4 px-2 border-b-2 font-semibold text-sm transition ${activeView === 'dashboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Dashboard</button>
          <button onClick={() => setActiveView('batch')} className={`py-4 px-2 border-b-2 font-semibold text-sm transition ${activeView === 'batch' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Batch Processor</button>
          <button onClick={() => setActiveView('duplicates')} className={`py-4 px-2 border-b-2 font-semibold text-sm transition flex items-center ${activeView === 'duplicates' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            Duplicates
            {duplicateCount > 0 && <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-bold">{duplicateCount}</span>}
          </button>
          <button onClick={() => setActiveView('collection')} className={`py-4 px-2 border-b-2 font-semibold text-sm transition ${activeView === 'collection' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>My Collection</button>
          <button onClick={() => setActiveView('settings')} className={`py-4 px-2 border-b-2 font-semibold text-sm transition ${activeView === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Settings</button>

          {/* Quick Collection Add & Video Upload */}
          <div className="flex items-center ml-auto gap-2">
            <div className="flex items-center">
              <input
                type="text"
                placeholder="New Collection..."
                className="text-xs border rounded-l p-1.5 w-32 border-r-0"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCollection()}
              />
              <button onClick={handleAddCollection} className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-2 py-1.5 rounded-r border border-l-0 border-slate-300">+</button>
            </div>

            <div className="h-6 w-px bg-slate-200 mx-1"></div>

            <button
              onClick={() => videoInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded transition font-semibold"
              title="Analyze Collection Video"
            >
              <svg className="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              Analyze Video
            </button>
            <input
              type="file"
              ref={videoInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleVideoAnalysis(file);
                e.target.value = ''; // Reset
              }}
              accept="video/*"
              hidden
            />
          </div>
        </nav>
      </div>

      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {activeView === 'dashboard' && (
            <div className="space-y-8">
              <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Analyze Single Stamp or Video</h2>
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-48 bg-slate-50 rounded-lg">
                    <Loader />
                    <p className="mt-4 text-slate-600 text-center max-w-md">
                      AI is analyzing media...<br />
                      <span className="text-sm text-slate-400">Large videos may take a minute to process using Gemini Pro Vision.</span>
                    </p>
                  </div>
                ) : (
                  <StampUploader onImageUpload={handleStampAnalysis} onVideoUpload={handleVideoAnalysis} />
                )}

                {error && <div className="mt-4 text-red-600 bg-red-100 p-3 rounded-md border border-red-200">{error}</div>}
              </div>
            </div>
          )}

          {activeView === 'collection' && (
            <div className="space-y-8">
              <StampLog
                stamps={sortedStamps}
                collections={collections}
                onRemove={handleRemoveStamp}
                onUpdate={handleUpdateStamp}
                onEditImage={setEditingImageId}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortByChange={setSortBy}
                onSortOrderChange={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              />

              {videoResult && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg mt-8 animate-fade-in">
                  <button
                    onClick={() => setIsVideoResultOpen(!isVideoResultOpen)}
                    className="w-full px-6 py-4 flex items-center justify-between bg-purple-50 hover:bg-purple-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-200 rounded-full text-purple-700">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">Latest Video Analysis Result</h3>
                        <p className="text-xs text-slate-500">Click to {isVideoResultOpen ? 'collapse' : 'expand'} report</p>
                      </div>
                    </div>
                    <svg className={`w-6 h-6 text-slate-400 transition-transform ${isVideoResultOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </button>

                  {isVideoResultOpen && (
                    <div className="p-6 border-t border-purple-100">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <span className="block text-xs font-bold text-slate-400 uppercase">Est. Stamp Count</span>
                          <span className="text-3xl font-black text-blue-600">{videoResult.totalStampsDetected}</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <span className="block text-xs font-bold text-slate-400 uppercase">Overall Condition</span>
                          <span className="text-lg font-bold text-slate-700">{videoResult.overallCondition}</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <span className="block text-xs font-bold text-slate-400 uppercase">Countries Found</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {videoResult.countries.map((c: string, i: number) => (
                              <span key={i} className="text-xs bg-white border border-slate-200 px-2 py-1 rounded shadow-sm">{c}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                        <h4 className="font-bold text-slate-700 mb-2">Summary</h4>
                        <p className="text-slate-600 leading-relaxed text-sm">{videoResult.summary}</p>

                        {videoResult.notableItems && videoResult.notableItems.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-200">
                            <h5 className="font-bold text-slate-700 mb-2 text-sm">Notable / High Value Items Detected</h5>
                            <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                              {videoResult.notableItems.map((item: string, i: number) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeView === 'batch' && <BatchProcessor settings={settings} onProcessed={handleBatchProcessed} />}

          {activeView === 'duplicates' && (
            <DuplicateReview
              stamps={stamps}
              onResolve={handleDuplicateResolve}
              onMerge={handleDuplicateMerge}
              onReplace={handleDuplicateReplace}
              onIgnore={handleDuplicateIgnore}
              onDiscardAll={handleDiscardAllDuplicates}
              onIgnoreAll={handleIgnoreAllDuplicates}
            />
          )}

          {activeView === 'settings' && (
            <SettingsPanel settings={settings} onUpdate={setSettings} />
          )}
        </div>
      </main>

      {/* Image Editor Modal */}
      {
        editingImageId && editingStamp && (
          <ImageEditor
            imageSrc={editingStamp.imageUrl}
            suggestedRotation={editingStamp.suggestedRotation}
            onSave={handleSaveEditedImage}
            onCancel={() => setEditingImageId(null)}
          />
        )
      }
    </div >
  );
};

export default App;
