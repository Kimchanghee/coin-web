import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.js';
import type { Announcement, ExchangeId, User } from '../types.js';
import { EXCHANGES, EXCHANGE_NAV_ITEMS } from '../constants';
import { allAnnouncementServices } from '../components/services/announcements/index.js';
import LanguageSwitcher from '../components/LanguageSwitcher.js';
import Clock from '../components/Clock.js';
import ThemeToggle from '../components/ThemeToggle.js';

// Header Component (copied from HomePage)
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

// Sidebar Component (copied from HomePage)
const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const handleLogout = () => {
        logout();
        navigate('/');
    }

    const location = useLocation();

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

// Bottom Navigation Component (copied and adapted from HomePage)
const BottomNav: React.FC = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navItems = EXCHANGE_NAV_ITEMS;
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#161616] border-t border-gray-200 dark:border-gray-800 flex justify-around p-2 lg:hidden z-20">
            {navItems.map(item => {
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


const AnnouncementsPage: React.FC = () => {
    const { t } = useTranslation();
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const { user } = useAuth();
    const [announcements, setAnnouncements] = useState<Record<string, Announcement[]>>({});
    const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
    const [activeExchange, setActiveExchange] = useState<ExchangeId>(EXCHANGES[0].id);

    const handleNewAnnouncement = useCallback((update: { exchangeId: ExchangeId; announcement: Announcement }) => {
        setAnnouncements(prev => {
            const currentAnnouncements = prev[update.exchangeId] || [];
            
            // Add new announcement if it doesn't exist to prevent duplicates
            if (currentAnnouncements.some(a => a.id === update.announcement.id)) {
                return prev;
            }
            
            const newAnnouncementsList = [...currentAnnouncements, update.announcement];
            
            // Sort by date (descending)
            newAnnouncementsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            return { ...prev, [update.exchangeId]: newAnnouncementsList };
        });
    }, []);

    useEffect(() => {
        // Find the service for the currently active exchange
        const service = allAnnouncementServices.find(s => s.id === activeExchange);
        if (!service) return;

        // Do not fetch if data already exists
        if (announcements[activeExchange]) {
            return;
        }

        setIsLoading(prev => ({ ...prev, [activeExchange]: true }));
        
        // Clear previous announcements for this exchange before fetching
        setAnnouncements(prev => ({...prev, [activeExchange]: []}));

        const disconnect = service.connect(handleNewAnnouncement);
        
        // This is a rough way to detect end of initial load since our mock service doesn't signal it.
        // In a real scenario, an API call would resolve a promise.
        setTimeout(() => {
             setIsLoading(prev => ({ ...prev, [activeExchange]: false }));
        }, 1000); // Assume fetch takes about 1s max for all items to stream in

        // Return the disconnect function for cleanup
        return () => {
            disconnect();
        };
    }, [activeExchange, handleNewAnnouncement, announcements]);


    return (
        <div className="bg-gray-50 dark:bg-black min-h-screen text-gray-600 dark:text-gray-300 font-sans">
            <div className="flex">
                <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
                <div className="flex-1 flex flex-col min-w-0">
                    <Header onMenuClick={() => setSidebarOpen(true)} user={user} />
                    <main className="p-2 sm:p-4 lg:p-6 pb-20 lg:pb-6">
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-black dark:text-white">{t('announcements_page.title')}</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('announcements_page.subtitle')}</p>
                        </div>

                        <div className="flex space-x-1 overflow-x-auto mb-4 border-b border-gray-200 dark:border-gray-800 pb-px">
                            {EXCHANGES.map(exchange => (
                                <button
                                    key={exchange.id}
                                    onClick={() => setActiveExchange(exchange.id)}
                                    className={`px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors rounded-t-md ${
                                        activeExchange === exchange.id
                                            ? 'border-b-2 border-yellow-400 text-black dark:text-white'
                                            : 'text-gray-500 hover:text-black dark:hover:text-white border-b-2 border-transparent'
                                    }`}
                                >
                                    {exchange.name}
                                </button>
                            ))}
                        </div>
                        
                        <div className="space-y-3">
                            {isLoading[activeExchange] ? (
                                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <i className="fas fa-spinner fa-spin text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>
                                    <p className="text-gray-500 dark:text-gray-400">Loading...</p>
                                </div>
                            ) : (announcements[activeExchange] || []).length > 0 ? (
                                (announcements[activeExchange] || []).map(ann => (
                                    <a 
                                      key={ann.id} 
                                      href={ann.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="block p-4 bg-white dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/70 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md announcement-item"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold text-black dark:text-white">{ann.title}</p>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
                                                    <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200 px-2 py-0.5 rounded-full">{ann.category}</span>
                                                    <span>{ann.date}</span>
                                                </div>
                                            </div>
                                            <i className="fas fa-external-link-alt text-gray-400 text-sm ml-4 mt-1"></i>
                                        </div>
                                    </a>
                                ))
                            ) : (
                                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <i className="fas fa-inbox text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>
                                    <p className="text-gray-500 dark:text-gray-400">{t('announcements_page.no_announcements')}</p>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
            <BottomNav />
        </div>
    );
};

export default AnnouncementsPage;
