
import React, { useState, useCallback, useMemo } from 'react';
import Header from './components/Header';
import StampUploader from './components/StampUploader';
import StampLog from './components/StampLog';
import { identifyAndValueStamp } from './services/geminiService';
import type { Stamp, StampData, SortBy, SortOrder } from './types';
import Loader from './components/Loader';

const App: React.FC = () => {
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

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
            const newStampData = await identifyAndValueStamp(base64Image);
            const newStamp: Stamp = {
                ...newStampData,
                id: Date.now(),
                imageUrl: URL.createObjectURL(file),
            };
            setStamps(prevStamps => [newStamp, ...prevStamps]);
        } catch(apiError) {
             if (apiError instanceof Error) {
                setError(`Failed to analyze stamp: ${apiError.message}`);
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
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
      setIsLoading(false);
    }
  }, []);
  
  const handleRemoveStamp = (id: number) => {
    setStamps(prevStamps => prevStamps.filter(stamp => stamp.id !== id));
  };

  const handleUpdateStamp = useCallback((id: number, updatedData: Partial<StampData>) => {
    setStamps(prevStamps =>
      prevStamps.map(stamp =>
        stamp.id === id ? { ...stamp, ...updatedData } : stamp
      )
    );
  }, []);

  const sortedStamps = useMemo(() => {
    const parseValue = (valueStr: string): number => {
      const match = valueStr.replace(/[$,]/g, '').match(/(\d+(\.\d+)?)/);
      return match ? parseFloat(match[1]) : 0;
    };

    const newStamps = [...stamps];

    newStamps.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'country':
          comparison = a.country.localeCompare(b.country);
          break;
        case 'value':
          comparison = parseValue(a.estimatedValue) - parseValue(b.estimatedValue);
          break;
        case 'date':
        default:
          comparison = b.id - a.id; // b - a for descending (newest first)
          break;
      }
      
      if (sortBy === 'date') {
        return sortOrder === 'asc' ? -comparison : comparison;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return newStamps;
  }, [stamps, sortBy, sortOrder]);


  return (
    <div className="bg-slate-100 min-h-screen font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-8 border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Analyze a New Stamp</h2>
            <p className="text-slate-600 mb-6">
              Upload a clear image of a stamp. Our AI will identify it, estimate its value, and suggest the best way to list it on eBay.
            </p>
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-48 bg-slate-50 rounded-lg">
                    <Loader />
                    <p className="mt-4 text-slate-600">Analyzing stamp... this may take a moment.</p>
                </div>
            ) : (
                <StampUploader onImageUpload={handleStampAnalysis} />
            )}
            {error && <div className="mt-4 text-red-600 bg-red-100 p-3 rounded-md">{error}</div>}
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
      </main>
    </div>
  );
};

export default App;
