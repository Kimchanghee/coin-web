import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Clock from '../Clock';
import LanguageSwitcher from '../LanguageSwitcher';
import ThemeToggle from '../ThemeToggle';
import type { User } from '../../types';

interface SimpleExchangeHeaderProps {
  onMenuClick: () => void;
  user: User | null;
}

const SimpleExchangeHeader: React.FC<SimpleExchangeHeaderProps> = ({ onMenuClick, user }) => {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onMenuClick} className="lg:hidden text-xl text-gray-600 dark:text-gray-300">
            <i className="fas fa-bars"></i>
          </button>
          <Link to="/" className="font-bold text-black dark:text-white text-xl">
            TeamYM
          </Link>
        </div>
        <div className="hidden md:flex items-center gap-4 text-xs text-gray-600 dark:text-gray-300">
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400">{t('header.tether_premium')}</p>
            <p className="font-bold text-green-500">0.90%</p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400">{t('header.coinbase_premium')}</p>
            <p className="font-bold text-green-500">0.01%</p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400">USD/KRW</p>
            <p className="font-bold text-gray-800 dark:text-gray-200">1,385</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock />
          <div className="relative hidden sm:block">
            <input
              type="text"
              placeholder={t('header.search_placeholder')}
              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full px-4 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-black dark:text-white"
            />
            <i className="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
          </div>
          <LanguageSwitcher />
          <ThemeToggle />
          {user ? null : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3 py-1.5 text-sm font-semibold text-black dark:text-white bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                {t('auth.login')}
              </Link>
              <Link
                to="/signup"
                className="px-3 py-1.5 text-sm font-semibold text-black bg-yellow-400 hover:bg-yellow-500 rounded-md transition-colors"
              >
                {t('auth.signup')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default SimpleExchangeHeader;
