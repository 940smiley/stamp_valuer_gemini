
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-md border-b-2 border-slate-200">
      <div className="container mx-auto px-4 md:px-8 py-4">
        <div className="flex items-center space-x-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H4V4h16v12zM6 10h3v3H6zm5-2h6v2h-6zm0 3h6v2h-6z"/>
            </svg>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
            Stamp Valuer AI
            </h1>
        </div>
      </div>
    </header>
  );
};

export default Header;
