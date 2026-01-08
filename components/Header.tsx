
import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Stamp Body */}
    <rect x="10" y="10" width="80" height="80" rx="4" fill="currentColor" />
    
    {/* Perforations (White circles to simulate serrated edges) */}
    {/* Top Row */}
    <circle cx="10" cy="10" r="6" fill="white" />
    <circle cx="30" cy="10" r="6" fill="white" />
    <circle cx="50" cy="10" r="6" fill="white" />
    <circle cx="70" cy="10" r="6" fill="white" />
    <circle cx="90" cy="10" r="6" fill="white" />
    
    {/* Bottom Row */}
    <circle cx="10" cy="90" r="6" fill="white" />
    <circle cx="30" cy="90" r="6" fill="white" />
    <circle cx="50" cy="90" r="6" fill="white" />
    <circle cx="70" cy="90" r="6" fill="white" />
    <circle cx="90" cy="90" r="6" fill="white" />

    {/* Left Column */}
    <circle cx="10" cy="30" r="6" fill="white" />
    <circle cx="10" cy="50" r="6" fill="white" />
    <circle cx="10" cy="70" r="6" fill="white" />

    {/* Right Column */}
    <circle cx="90" cy="30" r="6" fill="white" />
    <circle cx="90" cy="50" r="6" fill="white" />
    <circle cx="90" cy="70" r="6" fill="white" />

    {/* Inner Design Area Background */}
    <rect x="22" y="22" width="56" height="56" fill="white" rx="2" />
    
    {/* Inner Border Line */}
    <rect x="28" y="28" width="44" height="44" stroke="currentColor" strokeWidth="4" />

    {/* Envelope / Digital Icon */}
    <path d="M36 44 L50 54 L64 44" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="36" y="44" width="28" height="20" stroke="currentColor" strokeWidth="4" rx="1" />
  </svg>
);

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-md border-b-2 border-slate-200">
      <div className="container mx-auto px-4 md:px-8 py-3">
        <div className="flex items-center space-x-3">
            <Logo className="h-10 w-10 text-blue-600" />
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
            Stamplicity
            </h1>
        </div>
      </div>
    </header>
  );
};

export default Header;
