import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types';
import Clock from '../components/Clock';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ThemeToggle from '../components/ThemeToggle';
import { EXCHANGE_NAV_ITEMS } from '../constants';

const Header: React.FC<{ onMenuClick: () => void; user: User | null }> = ({ onMenuClick, user }) => {
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
                        <input type="text" placeholder={t('header.search_placeholder')} className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full px-4 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-black dark:text-white"/>
                        <i className="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
                    </div>
                     <LanguageSwitcher />
                     <ThemeToggle />
                    {user ? null : (
                        <div className="flex items-center gap-2">
                            <Link to="/login" className="px-3 py-1.5 text-sm font-semibold text-black dark:text-white bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors">{t('auth.login')}</Link>
                            <Link to="/signup" className="px-3 py-1.5 text-sm font-semibold text-black bg-yellow-400 hover:bg-yellow-500 rounded-md transition-colors">{t('auth.signup')}</Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const menuItems = EXCHANGE_NAV_ITEMS;

    return (
        <>
            <aside className={`fixed z-40 inset-y-0 left-0 bg-gray-50 dark:bg-[#111111] w-64 p-4 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:w-56 border-r border-gray-200 dark:border-gray-800 flex-shrink-0 flex flex-col`}>
                <nav className="flex flex-col flex-grow">
                    <div className="mb-8">
                         <h2 className="text-lg font-semibold text-black dark:text-white">{t('sidebar.premium_header')}</h2>
                    </div>
                    <ul className="space-y-4">
                        {menuItems.map(item => {
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

                            return null;
                        })}
                    </ul>
                </nav>
                 <div className="mt-auto border-t border-gray-200 dark:border-gray-800 pt-4">
                    {user ? (
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{t('sidebar.logged_in_as')}</p>
                            <p className="font-semibold text-black dark:text-white truncate">{user.email}</p>
                            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 mt-4 p-2 rounded-md bg-red-600/20 text-red-400 hover:bg-red-600/40 transition-colors">
                                <i className="fas fa-sign-out-alt"></i>
                                <span>{t('auth.logout')}</span>
                            </button>
                        </div>
                    ) : (
                        <Link to="/login" className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400">
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

const BottomNav: React.FC = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navItems = EXCHANGE_NAV_ITEMS;

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#161616] border-t border-gray-200 dark:border-gray-800 flex justify-around p-2 lg:hidden z-20">
            {navItems.map(item => {
                if (!item.path) {
                    return null;
                }

                const isActive = location.pathname === item.path;
                const baseClasses = 'flex flex-col items-center gap-1 flex-1 text-xs transition-colors';
                const activeClasses = 'text-yellow-400';
                const inactiveClasses = 'text-gray-500 hover:text-black dark:hover:text-white';

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
            })}
        </nav>
    );
};

type FeatureKey = 'exchange_arbitrage' | 'tradingview_auto' | 'listing_auto';

const PlaceholderContent: React.FC<{ featureKey: FeatureKey }> = ({ featureKey }) => {
    const { t } = useTranslation();
    const navItem = EXCHANGE_NAV_ITEMS.find(item => item.key === featureKey);

    return (
        <div className="max-w-3xl mx-auto p-6 lg:p-10">
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-8 text-center">
                {navItem ? (
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
                            <i className={`fas ${navItem.icon} text-2xl text-yellow-500`}></i>
                        </div>
                    </div>
                ) : null}
                <h1 className="text-2xl font-bold text-black dark:text-white mb-3">
                    {t(`sidebar.${featureKey}`)}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                    {t('admin.news.wip_desc')}
                </p>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 text-yellow-500 font-semibold">
                    <i className="fas fa-hammer"></i>
                    {t('admin.news.wip_title')}
                </span>
            </div>
        </div>
    );
};

const FeaturePlaceholderLayout: React.FC<{ featureKey: FeatureKey }> = ({ featureKey }) => {
    const { user } = useAuth();
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-black flex flex-col">
            <Header onMenuClick={() => setSidebarOpen(true)} user={user} />
            <div className="flex flex-1">
                <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
                <main className="flex-1 pb-20 lg:pb-0">
                    <PlaceholderContent featureKey={featureKey} />
                </main>
            </div>
            <BottomNav />
        </div>
    );
};

export const ExchangeArbitragePage: React.FC = () => (
    <FeaturePlaceholderLayout featureKey="exchange_arbitrage" />
);

export const TradingviewAutoPage: React.FC = () => (
    <FeaturePlaceholderLayout featureKey="tradingview_auto" />
);

export const ListingAutoPage: React.FC = () => (
    <FeaturePlaceholderLayout featureKey="listing_auto" />
);
