import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Announcement, ExchangeId } from '../types';
import { EXCHANGES } from '../constants';
import { allAnnouncementServices } from '../components/services/announcements';
import PremiumLayout from '../components/layouts/PremiumLayout';

const ANNOUNCEMENT_LIMIT = 40;
const ANNOUNCEMENT_CACHE_KEY = 'announcements_cache_v1';

const AnnouncementsPage: React.FC = () => {
    const { t } = useTranslation();
    const [announcements, setAnnouncements] = useState<Record<string, Announcement[]>>({});
    const [activeExchange, setActiveExchange] = useState<ExchangeId>(EXCHANGES[0].id);

    const handleNewAnnouncement = useCallback((update: { exchangeId: ExchangeId; announcement: Announcement }) => {
        setAnnouncements(prev => {
            const currentAnnouncements = prev[update.exchangeId] || [];

            if (currentAnnouncements.some(a => a.id === update.announcement.id)) {
                return prev;
            }

            const newAnnouncementsList = [...currentAnnouncements, update.announcement];
            newAnnouncementsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            return { ...prev, [update.exchangeId]: newAnnouncementsList.slice(0, ANNOUNCEMENT_LIMIT) };
        });
    }, []);

    useEffect(() => {
        const disconnectors = allAnnouncementServices.map(service => service.connect(handleNewAnnouncement));

        return () => {
            disconnectors.forEach(disconnect => disconnect());
            allAnnouncementServices.forEach(service => service.disconnect());
        };
    }, [handleNewAnnouncement]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            const cached = window.sessionStorage.getItem(ANNOUNCEMENT_CACHE_KEY);
            if (!cached) {
                return;
            }

            const parsed = JSON.parse(cached) as Record<string, Announcement[]>;

            setAnnouncements(prev => {
                if (Object.keys(prev).length > 0) {
                    return prev;
                }

                return parsed;
            });
        } catch (error) {
            console.error('Failed to read cached announcements:', error);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        const abortController = new AbortController();

        const fetchInitialAnnouncements = async () => {
            const results = await Promise.all(
                allAnnouncementServices.map(async service => {
                    try {
                        const response = await fetch(`/api/announcements/${service.id}.json`, {
                            signal: abortController.signal,
                            cache: 'no-store',
                        });

                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}`);
                        }

                        const data: Announcement[] = await response.json();
                        const sorted = data
                            .slice()
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .slice(0, ANNOUNCEMENT_LIMIT);

                        return { exchangeId: service.id, items: sorted };
                    } catch (error) {
                        if ((error as DOMException)?.name !== 'AbortError') {
                            console.error(`[${service.id}] Failed to prefetch announcements:`, error);
                        }
                        return null;
                    }
                })
            );

            if (!isMounted) {
                return;
            }

            setAnnouncements(prev => {
                const next = { ...prev };
                results.forEach(result => {
                    if (!result) {
                        return;
                    }

                    const existing = next[result.exchangeId] || [];
                    const mergedMap = new Map<string, Announcement>();
                    [...result.items, ...existing].forEach(item => {
                        mergedMap.set(item.id, item);
                    });
                    const merged = Array.from(mergedMap.values())
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, ANNOUNCEMENT_LIMIT);

                    next[result.exchangeId] = merged;
                });
                return next;
            });
        };

        fetchInitialAnnouncements();

        return () => {
            isMounted = false;
            abortController.abort();
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const entries = Object.entries(announcements);
        if (entries.length === 0) {
            return;
        }

        try {
            const payload = JSON.stringify(
                Object.fromEntries(
                    entries.map(([exchangeId, items]) => [exchangeId, items.slice(0, ANNOUNCEMENT_LIMIT)])
                )
            );
            window.sessionStorage.setItem(ANNOUNCEMENT_CACHE_KEY, payload);
        } catch (error) {
            console.error('Failed to cache announcements:', error);
        }
    }, [announcements]);

    const currentAnnouncements = announcements[activeExchange] || [];

    return (
        <PremiumLayout>
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
                {currentAnnouncements.length > 0 ? (
                    currentAnnouncements.map(ann => (
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
        </PremiumLayout>
    );
};

export default AnnouncementsPage;
