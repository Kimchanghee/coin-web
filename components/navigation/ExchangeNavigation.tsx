import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EXCHANGE_NAV_ITEMS } from '../../constants';
import { useAuth } from '../../context/AuthContext';

interface ExchangeSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExchangeSidebar: React.FC<ExchangeSidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <aside
        className={`fixed z-40 inset-y-0 left-0 bg-gray-50 dark:bg-[#111111] w-64 p-4 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:relative lg:translate-x-0 lg:w-56 border-r border-gray-200 dark:border-gray-800 flex-shrink-0 flex flex-col`}
      >
        <nav className="flex flex-col flex-grow">
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-black dark:text-white">{t('sidebar.premium_header')}</h2>
          </div>
          <ul className="space-y-4">
            {EXCHANGE_NAV_ITEMS.map((item) => {
              const isActive = item.path ? location.pathname === item.path : false;
              const baseClasses = 'flex items-center gap-3 p-2 rounded-md transition-colors';
              const activeClasses = 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white';
              const inactiveClasses = 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400';

              if (item.path) {
                return (
                  <li key={item.key}>
                    <Link
                      to={item.path}
                      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
                      onClick={onClose}
                    >
                      <i className={`fas ${item.icon} w-5`}></i>
                      <span>{t(`sidebar.${item.key}`)}</span>
                    </Link>
                  </li>
                );
              }

              return (
                <li key={item.key}>
                  <button
                    type="button"
                    className={`${baseClasses} ${inactiveClasses} cursor-not-allowed`}
                    disabled
                  >
                    <i className={`fas ${item.icon} w-5`}></i>
                    <span>{t(`sidebar.${item.key}`)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-auto border-t border-gray-200 dark:border-gray-800 pt-4">
          {user ? (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{t('sidebar.logged_in_as')}</p>
              <p className="font-semibold text-black dark:text-white truncate">{user.email}</p>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 mt-4 p-2 rounded-md bg-red-600/20 text-red-400 hover:bg-red-600/40 transition-colors"
              >
                <i className="fas fa-sign-out-alt"></i>
                <span>{t('auth.logout')}</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
            >
              <i className="fas fa-sign-in-alt w-5"></i>
              <span>{t('sidebar.login_required')}</span>
            </Link>
          )}
        </div>
      </aside>
      {isOpen && <div onClick={onClose} className="fixed inset-0 bg-black/60 z-30 lg:hidden"></div>}
    </>
  );
};

export const ExchangeBottomNav: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#161616] border-t border-gray-200 dark:border-gray-800 flex justify-around p-2 lg:hidden z-20">
      {EXCHANGE_NAV_ITEMS.map((item) => {
        const isActive = item.path ? location.pathname === item.path : false;
        const baseClasses = 'flex flex-col items-center gap-1 flex-1 text-xs transition-colors';
        const activeClasses = 'text-yellow-400';
        const inactiveClasses = 'text-gray-500 hover:text-black dark:hover:text-white';

        if (item.path) {
          return (
            <Link
              to={item.path}
              key={item.key}
              className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
            >
              <i className={`fas ${item.icon} text-lg`}></i>
              <span>{t(`bottom_nav.${item.key}`)}</span>
            </Link>
          );
        }

        return (
          <button
            type="button"
            key={item.key}
            className={`${baseClasses} ${inactiveClasses} cursor-not-allowed`}
            disabled
          >
            <i className={`fas ${item.icon} text-lg`}></i>
            <span>{t(`bottom_nav.${item.key}`)}</span>
          </button>
        );
      })}
    </nav>
  );
};
