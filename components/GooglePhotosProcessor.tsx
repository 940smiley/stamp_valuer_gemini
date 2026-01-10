
import React, { useState, useEffect } from 'react';
import { AppSettings, Stamp } from '../types';
import { signInToGoogle, isGoogleConnected, pickFilesFromGoogle, disconnectGoogle, checkGoogleConfig } from '../services/googleService';
import BatchProcessor from './BatchProcessor';
import Loader from './Loader';

interface GooglePhotosProcessorProps {
    settings: AppSettings;
    onBatchProcessed: (stamps: Stamp[]) => void;
}

const GooglePhotosProcessor: React.FC<GooglePhotosProcessorProps> = ({ settings, onBatchProcessed }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [importedFiles, setImportedFiles] = useState<File[]>([]);

    useEffect(() => {
        setIsConnected(isGoogleConnected());
    }, []);

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
    };

    const handlePickPhotos = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const files = await pickFilesFromGoogle('Photos', settings.googleClientId!, settings.googleDeveloperKey!, true);
            if (files.length > 0) {
                // Append new files to existing ones (if any) or just replace? 
                // BatchProcessor adds to existing, but here we pass props.
                // We'll pass a NEW array to trigger updates in BatchProcessor
                setImportedFiles(prev => [...prev, ...files]);
            }
        } catch (e: any) {
            setError(e.message || "Failed to pick photos.");
            if (e.message.includes("Not signed in")) {
                setIsConnected(false);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 border-b border-slate-100 pb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-blue-50 rounded-full">
                            <svg className="w-8 h-8 text-blue-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm-2.42 5.09a3.87 3.87 0 0 1 3.87 3.87c0 .41-.07.8-.19 1.17l1.72-1.72A5.8 5.8 0 0 0 9.58 3.16c-3.2 0-5.81 2.6-5.81 5.81a5.79 5.79 0 0 0 1.05 3.3L3.1 14a7.73 7.73 0 0 1-1.35-4.42c0-4.28 3.47-7.74 7.74-7.74h.09v3.25zm8.9 2.05A7.73 7.73 0 0 1 19.83 11.56c0 4.28-3.47 7.74-7.74 7.74h-.09v-3.25a3.87 3.87 0 0 1-3.87-3.87c0-.41.07-.8.19-1.17l-1.72 1.72A5.8 5.8 0 0 0 12.51 19.34c3.2 0 5.81-2.6 5.81-5.81a5.79 5.79 0 0 0-1.05-3.3L19.06 8.5a7.73 7.73 0 0 1 1.35 4.42z"/></svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Process Your Google Photos</h2>
                            <p className="text-slate-500">Connect your account to analyze stamps directly from your cloud library.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {isConnected ? (
                            <>
                                <span className="flex items-center text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                    Connected
                                </span>
                                <button 
                                    onClick={handleDisconnect}
                                    className="text-sm text-red-500 hover:text-red-700 font-semibold px-3 py-1"
                                >
                                    Disconnect
                                </button>
                            </>
                        ) : (
                            <button 
                                onClick={handleConnect}
                                disabled={isLoading}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-md disabled:opacity-50"
                            >
                                {isLoading ? <Loader /> : 'Sign In with Google'}
                            </button>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex items-start gap-2">
                         <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        <div>
                            <p className="font-bold">Connection Error</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    </div>
                )}

                {isConnected && (
                    <div className="animate-fade-in">
                        <div className="flex flex-col items-center justify-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 mb-8">
                            <button 
                                onClick={handlePickPhotos}
                                disabled={isLoading}
                                className="px-8 py-4 bg-white text-blue-600 border border-blue-200 hover:border-blue-400 hover:shadow-md rounded-xl font-bold text-lg transition flex flex-col items-center gap-2"
                            >
                                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm-2.42 5.09a3.87 3.87 0 0 1 3.87 3.87c0 .41-.07.8-.19 1.17l1.72-1.72A5.8 5.8 0 0 0 9.58 3.16c-3.2 0-5.81 2.6-5.81 5.81a5.79 5.79 0 0 0 1.05 3.3L3.1 14a7.73 7.73 0 0 1-1.35-4.42c0-4.28 3.47-7.74 7.74-7.74h.09v3.25zm8.9 2.05A7.73 7.73 0 0 1 19.83 11.56c0 4.28-3.47 7.74-7.74 7.74h-.09v-3.25a3.87 3.87 0 0 1-3.87-3.87c0-.41.07-.8.19-1.17l-1.72 1.72A5.8 5.8 0 0 0 12.51 19.34c3.2 0 5.81-2.6 5.81-5.81a5.79 5.79 0 0 0-1.05-3.3L19.06 8.5a7.73 7.73 0 0 1 1.35 4.42z"/></svg>
                                {isLoading ? 'Downloading...' : 'Select Photos from Google Library'}
                            </button>
                            <p className="text-slate-400 text-sm mt-3">Select one or more images to add to the processing queue.</p>
                        </div>

                        {/* Embed BatchProcessor to handle the files */}
                        <div className="mt-8">
                            <h3 className="font-bold text-lg text-slate-800 mb-4 border-b border-slate-100 pb-2">Processing Queue</h3>
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
    );
};

export default GooglePhotosProcessor;
