
import React, { useState, useEffect } from 'react';
import { AppSettings, Stamp } from '../types';
import { 
    signInToGoogle, isGoogleConnected, pickFilesFromGoogle, 
    disconnectGoogle, checkGoogleConfig, searchFile
} from '../services/googleService';
import BatchProcessor from './BatchProcessor';
import Loader from './Loader';

interface CloudDashboardProps {
    settings: AppSettings;
    onBatchProcessed: (stamps: Stamp[]) => void;
    onToggleSync: (enabled: boolean) => void;
    isSyncEnabled: boolean;
    lastSyncTime?: Date | null;
}

const CloudDashboard: React.FC<CloudDashboardProps> = ({ 
    settings, 
    onBatchProcessed,
    onToggleSync,
    isSyncEnabled,
    lastSyncTime
}) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [importedFiles, setImportedFiles] = useState<File[]>([]);
    const [activeTab, setActiveTab] = useState<'photos' | 'drive'>('drive');
    const [existingDbFound, setExistingDbFound] = useState<boolean>(false);

    useEffect(() => {
        const connected = isGoogleConnected();
        setIsConnected(connected);
        if (connected) {
            checkForExistingDb();
        }
    }, []);

    const checkForExistingDb = async () => {
        const fileId = await searchFile('stamplicity_collection.json');
        setExistingDbFound(!!fileId);
    };

    const handleConnect = async () => {
        if (!checkGoogleConfig(settings.googleClientId, settings.googleDeveloperKey)) {
            setError("Google Client ID and Developer Key are missing in Settings.");
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            await signInToGoogle(settings.googleClientId!);
            setIsConnected(true);
            await checkForExistingDb();
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to sign in to Google.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = () => {
        disconnectGoogle();
        setIsConnected(false);
        setImportedFiles([]);
        onToggleSync(false); // Disable sync on disconnect
    };

    const handleSyncToggle = () => {
        if (!isSyncEnabled && existingDbFound) {
            if (window.confirm("An existing database was found on your Drive. Enabling sync will overwrite your current local session data with the data from Drive. Continue?")) {
                onToggleSync(true);
            }
        } else if (!isSyncEnabled && !existingDbFound) {
             if (window.confirm("No existing database found. A new file 'stamplicity_collection.json' will be created on your Drive to store your collection. Continue?")) {
                onToggleSync(true);
            }
        } else {
            onToggleSync(false);
        }
    };

    const handlePickFiles = async (source: 'Drive' | 'Photos') => {
        setIsLoading(true);
        setError(null);
        try {
            const files = await pickFilesFromGoogle(source, settings.googleClientId!, settings.googleDeveloperKey!, true);
            if (files.length > 0) {
                setImportedFiles(prev => [...prev, ...files]);
                // Switch tab to processor view implicitly by showing the list
            }
        } catch (e: any) {
            setError(e.message || "Failed to pick files.");
            if (e.message.includes("Not signed in")) {
                setIsConnected(false);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-0 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13h-5v5h-4v-5H3l7-7 7 7z"/></svg>
                            Cloud & Sync
                        </h2>
                        <p className="text-blue-100 mt-2 max-w-lg">Connect your Google account to back up your collection to Drive or import bulk images from Photos.</p>
                    </div>
                    
                     {isConnected ? (
                        <div className="flex items-center gap-4 bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                             <span className="flex items-center text-sm font-bold text-green-300">
                                <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                                Account Connected
                            </span>
                            <button onClick={handleDisconnect} className="text-sm bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded transition">Disconnect</button>
                        </div>
                    ) : (
                        <button 
                            onClick={handleConnect}
                            disabled={isLoading}
                            className="px-6 py-3 bg-white text-blue-700 rounded-lg font-bold hover:bg-blue-50 transition shadow-lg flex items-center gap-2"
                        >
                             {isLoading ? <Loader /> : 'Sign In with Google'}
                        </button>
                    )}
                </div>

                {error && (
                    <div className="bg-red-50 border-b border-red-200 text-red-700 p-4 flex items-start gap-2">
                        <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                {isConnected && (
                    <div className="p-0">
                        {/* Internal Navigation */}
                        <div className="flex border-b border-slate-200">
                            <button 
                                onClick={() => setActiveTab('drive')} 
                                className={`flex-1 py-4 text-center font-bold text-sm border-b-2 transition ${activeTab === 'drive' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                            >
                                Drive Sync & Backup
                            </button>
                            <button 
                                onClick={() => setActiveTab('photos')} 
                                className={`flex-1 py-4 text-center font-bold text-sm border-b-2 transition ${activeTab === 'photos' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                            >
                                Import from Photos/Drive
                            </button>
                        </div>

                        <div className="p-8">
                            {activeTab === 'drive' && (
                                <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex gap-4">
                                                <div className={`p-3 rounded-full ${isSyncEnabled ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-slate-800">Database Synchronization</h3>
                                                    <p className="text-slate-600 text-sm mt-1">
                                                        When enabled, Stamplicity uses <code className="bg-slate-200 px-1 rounded text-xs">stamplicity_collection.json</code> on your Google Drive as the source of truth.
                                                        Changes are automatically saved to Drive, replacing local storage.
                                                    </p>
                                                    {lastSyncTime && (
                                                        <p className="text-xs text-slate-400 mt-2 font-medium">Last synced: {lastSyncTime.toLocaleTimeString()}</p>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <label className="relative inline-flex items-center cursor-pointer mt-1">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer" 
                                                    checked={isSyncEnabled}
                                                    onChange={handleSyncToggle}
                                                />
                                                <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>
                                    </div>

                                    {!isSyncEnabled && (
                                        <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-xl">
                                            <p className="text-slate-400 text-sm">Enable sync to protect your data and access it from multiple devices.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'photos' && (
                                <div className="space-y-8 animate-fade-in">
                                    <div className="flex flex-col md:flex-row gap-6 justify-center">
                                        <button 
                                            onClick={() => handlePickFiles('Photos')}
                                            disabled={isLoading}
                                            className="group flex-1 p-6 bg-slate-50 border border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl transition flex flex-col items-center gap-3"
                                        >
                                            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center group-hover:scale-110 transition">
                                                 <svg className="w-8 h-8 text-blue-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm-2.42 5.09a3.87 3.87 0 0 1 3.87 3.87c0 .41-.07.8-.19 1.17l1.72-1.72A5.8 5.8 0 0 0 9.58 3.16c-3.2 0-5.81 2.6-5.81 5.81a5.79 5.79 0 0 0 1.05 3.3L3.1 14a7.73 7.73 0 0 1-1.35-4.42c0-4.28 3.47-7.74 7.74-7.74h.09v3.25zm8.9 2.05A7.73 7.73 0 0 1 19.83 11.56c0 4.28-3.47 7.74-7.74 7.74h-.09v-3.25a3.87 3.87 0 0 1-3.87-3.87c0-.41.07-.8.19-1.17l-1.72 1.72A5.8 5.8 0 0 0 12.51 19.34c3.2 0 5.81-2.6 5.81-5.81a5.79 5.79 0 0 0-1.05-3.3L19.06 8.5a7.73 7.73 0 0 1 1.35 4.42z"/></svg>
                                            </div>
                                            <h3 className="font-bold text-slate-700">Google Photos</h3>
                                            <p className="text-xs text-slate-500 text-center">Select images from your Photos library</p>
                                        </button>

                                        <button 
                                            onClick={() => handlePickFiles('Drive')}
                                            disabled={isLoading}
                                            className="group flex-1 p-6 bg-slate-50 border border-slate-200 hover:border-green-400 hover:bg-green-50 rounded-xl transition flex flex-col items-center gap-3"
                                        >
                                            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center group-hover:scale-110 transition">
                                                <svg className="w-8 h-8 text-green-600" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg"><path d="m6.6 66.85 3.85 6.65c.8 1.4 1.9 2.5 3.2 3.3l12.3-21.3h-25.3c-.1 1.5.4 3 1.3 4.55zm26.25-45.55 12.3 21.3 12.6-21.8-12.6-21.8c-.8-1.4-1.9-2.5-3.2-3.3l-12.3 21.3zm38.7 6.1-12.6 21.8 13.9 24.1c.9-.5 1.75-1.15 2.45-1.95.7-.8 1.25-1.7 1.6-2.65l10.4-18c.9-1.55.9-3.45 0-5l-3.85-6.65c-.8-1.4-1.9-2.5-3.2-3.3l-8.7-14.35z" fill="currentColor"/></svg>
                                            </div>
                                            <h3 className="font-bold text-slate-700">Google Drive</h3>
                                            <p className="text-xs text-slate-500 text-center">Select images from Drive folders</p>
                                        </button>
                                    </div>

                                    {/* Queue */}
                                    <div className="mt-8 border-t border-slate-100 pt-8">
                                        <h3 className="font-bold text-lg text-slate-800 mb-4">Processing Queue</h3>
                                        <BatchProcessor 
                                            settings={settings}
                                            onProcessed={onBatchProcessed}
                                            embedded={true}
                                            externalFiles={importedFiles}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CloudDashboard;
