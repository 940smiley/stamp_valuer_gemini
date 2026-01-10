
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
    // Use configured token or fallback to check availability
    const apiKey = settings.ebayApiKey || process.env.EBAY_API_KEY || '';
    const token = settings.ebayOAuthToken || process.env.EBAY_OAUTH_TOKEN || '';

    const result = await verifyEbayConnection(apiKey, token);
    setTestStatus(result ? 'success' : 'failed');
  };

  // Mock Facebook Login
  const handleFacebookConnect = () => {
    alert("Facebook OAuth Flow would start here.\n\nSimulating connection...");
    onUpdate({
      ...settings,
      facebookPageId: "123456789",
      facebookAccessToken: "mock_fb_token_xyz"
    });
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
        {/* Privacy Section */}
        <section>
          <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">Collection Privacy</h3>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <span className="font-semibold text-slate-800 flex items-center gap-2">
                {settings.isPrivateCollection ? (
                  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                ) : (
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                )}
                Private Collection Mode
              </span>
              <span className="text-xs text-slate-500 block mt-1">When enabled, sharing options are hidden and public API endpoints are disabled.</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="isPrivateCollection"
                checked={settings.isPrivateCollection}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </section>

        {/* eBay Section */}
        <section>
          <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">eBay Integration</h3>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
            <p className="text-sm text-slate-500 mb-4">
              Configure your eBay Developer credentials to enable direct listing.
              {process.env.EBAY_API_KEY ? <span className="text-green-600 font-bold ml-1">✓ Backend keys detected in environment.</span> : <span>You can also enter them manually below.</span>}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">App ID (Client ID)</label>
                <input
                  type="password"
                  name="ebayApiKey"
                  value={settings.ebayApiKey}
                  onChange={handleChange}
                  placeholder={process.env.EBAY_API_KEY ? "Loaded from Env" : "Enter App ID"}
                  disabled={!!process.env.EBAY_API_KEY}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition shadow-sm disabled:bg-slate-200 disabled:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Dev ID</label>
                <input
                  type="password"
                  name="ebayDevId"
                  value={settings.ebayDevId || ''}
                  onChange={handleChange}
                  placeholder="Enter Dev ID"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Cert ID (Client Secret)</label>
                <input
                  type="password"
                  name="ebayCertId"
                  value={settings.ebayCertId || ''}
                  onChange={handleChange}
                  placeholder="Enter Cert ID"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">User OAuth Token</label>
                <input
                  type="password"
                  name="ebayOAuthToken"
                  value={settings.ebayOAuthToken || ''}
                  onChange={handleChange}
                  placeholder="Paste User Access Token"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition shadow-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
              className={`px-4 py-2 rounded text-sm font-bold transition ${testStatus === 'success' ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
            >
              {testStatus === 'testing' ? 'Testing API...' : testStatus === 'success' ? 'Connection Verified' : 'Test eBay Connection'}
            </button>
            {testStatus === 'failed' && <span className="text-red-500 text-sm font-medium">Connection Failed. Check Credentials.</span>}
          </div>
        </section>

        {/* Social Section */}
        <section>
          <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">Social Connectivity</h3>
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white p-2 rounded-full">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
              </div>
              <div>
                <h4 className="font-bold text-slate-800">Facebook Page</h4>
                <p className="text-xs text-slate-600">Connect to automatically post new finds.</p>
              </div>
            </div>
            {settings.facebookAccessToken ? (
              <button onClick={() => onUpdate({ ...settings, facebookAccessToken: '', facebookPageId: '' })} className="text-sm text-red-600 font-bold hover:underline">Disconnect</button>
            ) : (
              <button onClick={handleFacebookConnect} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700">Connect Page</button>
            )}
          </div>
        </section>

        {/* Google Section */}
        <section>
          <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">Google Integration (Drive / Photos)</h3>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-500 mb-4">
              To use the Cloud Picker for Drive or Photos, you must configure a Google Cloud Project with the <strong>Google Picker API</strong> enabled.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Google Client ID</label>
                <input
                  type="text"
                  name="googleClientId"
                  value={settings.googleClientId || ''}
                  onChange={handleChange}
                  placeholder="apps.googleusercontent.com"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Developer API Key</label>
                <input
                  type="password"
                  name="googleDeveloperKey"
                  value={settings.googleDeveloperKey || ''}
                  onChange={handleChange}
                  placeholder="API Key"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition shadow-sm"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Gemini API Section - Dev Only */}
        {import.meta.env.DEV && (
          <section className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h3 className="text-lg font-semibold text-amber-800 mb-4 border-b border-amber-100 pb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              Developer: Gemini AI Overrides
            </h3>
            <div className="space-y-4">
              <p className="text-xs text-amber-700">
                This section is only visible in development. You can manually override the API key here if the .env key is failing.
              </p>
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">Gemini API Key Override</label>
                <input
                  type="password"
                  name="geminiApiKey"
                  value={settings.geminiApiKey || ''}
                  onChange={handleChange}
                  placeholder="Paste special dev key here..."
                  className="w-full p-2.5 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 transition shadow-sm bg-white"
                />
              </div>
            </div>
          </section>
        )}

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
