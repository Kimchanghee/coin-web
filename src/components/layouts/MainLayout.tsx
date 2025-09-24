import React from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../ThemeToggle';

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    
  const handleRefresh = () => {
     window.location.reload();
  };
    
  return (
    <div className="min-h-screen bg-slate-900 text-gray-200">
      <header className="flex flex-wrap justify-between items-center p-4 border-b border-slate-700 bg-slate-800/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-satellite-dish text-2xl text-blue-500"></i>
            <h1 className="text-lg md:text-2xl font-bold text-white">Crypto Monitor</h1>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <button className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors"><i className="fas fa-globe mr-1"></i> KO</button>
            <button onClick={handleRefresh} className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors"><i className="fas fa-sync-alt"></i></button>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2 md:mt-0">
          <Link to="/admin" className="px-4 py-2 text-sm font-semibold bg-orange-600 rounded-md hover:bg-orange-700 transition-colors">
            <i className="fas fa-user-shield md:mr-2"></i> 
            <span className="hidden md:inline">관리자 페이지</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>
      {children}
    </div>
  );
};

export default MainLayout;