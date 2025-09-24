import React from 'react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <i className="fas fa-sun"></i> : <i className="fas fa-moon"></i>}
    </button>
  );
};

export default ThemeToggle;