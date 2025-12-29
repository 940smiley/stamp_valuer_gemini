
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Header from './components/Header';
import StampUploader from './components/StampUploader';
import StampLog from './components/StampLog';
import SettingsPanel from './components/SettingsPanel';
import BatchProcessor from './components/BatchProcessor';
import { identifyAndValueStamp } from './services/geminiService';
import type { Stamp, StampData, SortBy, SortOrder, AppSettings, AppView } from './types';
import Loader from './components/Loader';

// Declaring global window helper for API key selection
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('stamp-valuer-settings');
    return saved ? JSON.parse(saved) : {
      ebayApiKey: '',
      useThinkingMode: false,
      useSearchGrounding: true,
      modelQuality: 'fast'
    };
  });

  useEffect(() => {
    localStorage.setItem('stamp-valuer-settings', JSON.stringify(settings));
  }, [settings]);

  // Initial API Key check
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true); // Assume success as per guideline
    }
  };

  const handleStampAnalysis = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Image = (reader.result as string).split(',')[1];
        if (!base64Image) {
            throw new Error("Failed to read image file.");
        }
        
        try {
            const newStampData = await identifyAndValueStamp(base64Image, settings);
            
            if (newStampData.isRejected) {
              setError("The analyzed image is not recognized as a postage stamp or philatelic item.");
              setIsLoading(false);
              return;
            }

            const newStamp: Stamp = {
                ...newStampData,
                id: Date.now(),
                imageUrl: URL.createObjectURL(file),
            };
            setStamps(prevStamps => [newStamp, ...prevStamps]);
        } catch(apiError) {
             if (apiError instanceof Error) {
                // Handle missing API key or project errors
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
  }, [settings]);
  
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
                <p className="mt-4 text-xs text-slate-400">
                    Learn about <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline text-blue-500">GCP project billing</a>.
                </p>
            </div>
        </div>
    );
  }

  return (
    <div className="bg-slate-100 min-h-screen font-sans flex flex-col">
      <Header />
      
      <div className="bg-white border-b border-slate-200">
        <nav className="container mx-auto px-4 md:px-8 flex space-x-8">
            <button 
                onClick={() => setActiveView('dashboard')}
                className={`py-4 px-2 border-b-2 font-semibold text-sm transition ${activeView === 'dashboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
                Dashboard
            </button>
            <button 
                onClick={() => setActiveView('batch')}
                className={`py-4 px-2 border-b-2 font-semibold text-sm transition ${activeView === 'batch' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
                Batch Processor
            </button>
            <button 
                onClick={() => setActiveView('settings')}
                className={`py-4 px-2 border-b-2 font-semibold text-sm transition ${activeView === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
                Settings
            </button>
        </nav>
      </div>

      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          {activeView === 'dashboard' && (
            <div className="space-y-8">
              <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Analyze Single Stamp</h2>
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-48 bg-slate-50 rounded-lg">
                        <Loader />
                        <p className="mt-4 text-slate-600">AI is analyzing with {settings.useSearchGrounding ? 'Search Grounding' : (settings.modelQuality === 'pro' ? 'Pro' : 'Standard')} engine...</p>
                    </div>
                ) : (
                    <StampUploader onImageUpload={handleStampAnalysis} />
                )}
                {error && <div className="mt-4 text-red-600 bg-red-100 p-3 rounded-md border border-red-200">{error}</div>}
              </div>
              
              <StampLog 
                stamps={sortedStamps} 
                onRemove={handleRemoveStamp}
                onUpdate={handleUpdateStamp}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortByChange={setSortBy}
                onSortOrderChange={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              />
            </div>
          )}

          {activeView === 'batch' && (
            <BatchProcessor 
              settings={settings} 
              onProcessed={handleBatchProcessed} 
            />
          )}

          {activeView === 'settings' && (
            <SettingsPanel 
                settings={settings} 
                onUpdate={setSettings} 
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
