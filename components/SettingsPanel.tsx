
import React, { useState } from 'react';
import type { AppSettings } from '../types';
import { verifyEbayConnection } from '../services/ebayService';

interface SettingsPanelProps {
  settings: AppSettings;
  onUpdate: (newSettings: AppSettings) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onUpdate }) => {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;
    
    onUpdate({
      ...settings,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleTestConnection = async () => {
      setTestStatus('testing');
      const result = await verifyEbayConnection(settings.ebayApiKey, settings.ebayOAuthToken || '');
      setTestStatus(result ? 'success' : 'failed');
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 border border-slate-200">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
        <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Application Settings
      </h2>

      <div className="space-y-8">
        <section>
          <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">eBay Integration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Developer API Key</label>
                <input 
                type="password" 
                name="ebayApiKey"
                value={settings.ebayApiKey}
                onChange={handleChange}
                placeholder="Client ID"
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition shadow-sm"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">OAuth Token</label>
                <input 
                type="password" 
                name="ebayOAuthToken"
                value={settings.ebayOAuthToken || ''}
                onChange={handleChange}
                placeholder="User Access Token"
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition shadow-sm"
                />
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
             <button 
                onClick={handleTestConnection} 
                disabled={testStatus === 'testing' || !settings.ebayApiKey}
                className={`px-4 py-2 rounded text-sm font-bold transition ${testStatus === 'success' ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
             >
                {testStatus === 'testing' ? 'Testing...' : testStatus === 'success' ? 'Connection Verified' : 'Test Connection'}
             </button>
             {testStatus === 'failed' && <span className="text-red-500 text-sm font-medium">Connection Failed. Check Credentials.</span>}
          </div>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">AI Intelligence Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="font-semibold text-slate-800 block">Thinking Mode</span>
                <span className="text-xs text-slate-500">Enable deep reasoning for complex items.</span>
              </div>
              <input 
                type="checkbox" 
                name="useThinkingMode"
                checked={settings.useThinkingMode}
                onChange={handleChange}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="font-semibold text-slate-800 block">Search Grounding</span>
                <span className="text-xs text-slate-500">Real-time web data for market pricing.</span>
              </div>
              <input 
                type="checkbox" 
                name="useSearchGrounding"
                checked={settings.useSearchGrounding}
                onChange={handleChange}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-slate-600 mb-2">Analysis Quality Model</label>
              <select 
                name="modelQuality"
                value={settings.modelQuality}
                onChange={handleChange}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="fast">Standard (Gemini 2.5 Flash Lite) - Fastest</option>
                <option value="pro">Pro (Gemini 3 Pro) - Most Intelligent</option>
              </select>
              <p className="mt-2 text-sm text-slate-500">
                "Pro" is recommended for high-value items or difficult-to-identify issues.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPanel;
