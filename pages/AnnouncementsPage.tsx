import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.js';
import type { Announcement, ExchangeId } from '../types.js';
import { EXCHANGES } from '../constants';
import { allAnnouncementServices } from '../components/services/announcements/index.js';
import SimpleExchangeHeader from '../components/navigation/SimpleExchangeHeader';
import { ExchangeSidebar, ExchangeBottomNav } from '../components/navigation/ExchangeNavigation';

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
                <ExchangeSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
                <div className="flex-1 flex flex-col min-w-0">
                    <SimpleExchangeHeader onMenuClick={() => setSidebarOpen(true)} user={user} />
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
            <ExchangeBottomNav />
        </div>
    );
};

export default AnnouncementsPage;
