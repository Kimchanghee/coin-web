import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { EXCHANGES } from '../constants';
import type { Activity, AdminTab, Stats, ExchangeId, Announcement } from '../types';
import Card from '../components/common/Card';
import ToggleSwitch from '../components/common/ToggleSwitch';
import AdminLayout from '../components/layouts/AdminLayout';
import { dashboardService } from '../components/services/dashboardService';

const StatCard: React.FC<{ icon: string; title: string; value: string | number; color: string }> = ({ icon, title, value, color }) => (
    <Card className="flex items-center p-4">
        <div className={`p-3 rounded-full mr-4 ${color}`}>
            <i className={`fas ${icon} text-xl text-white`}></i>
        </div>
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-black dark:text-white">{value}</p>
        </div>
    </Card>
);

const DashboardTab: React.FC<{ stats: Stats | null; activities: Activity[] }> = ({ stats, activities }) => {
    const { t } = useTranslation();
    const getExchange = (id: string) => EXCHANGES.find(e => e.id === id);
    return (
        <div>
            <h2 className="text-2xl font-bold mb-6 text-black dark:text-white">{t('admin.dashboard.title')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                <StatCard icon="fa-bullhorn" title={t('admin.dashboard.total_announcements')} value={stats?.totalAnnouncements ?? '...'} color="bg-blue-600" />
                <StatCard icon="fa-newspaper" title={t('admin.dashboard.total_news')} value={stats?.totalNews ?? '-'} color="bg-gray-500" />
                <StatCard icon="fa-store" title={t('admin.dashboard.active_exchanges')} value={stats ? `${stats.activeExchanges} ${t('admin.dashboard.exchanges_unit')}` : '...'} color="bg-green-600" />
                <StatCard icon="fa-clock" title={t('admin.dashboard.last_update')} value={stats?.lastUpdate ?? '...'} color="bg-purple-600" />
            </div>
            <Card>
                <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">{t('admin.dashboard.recent_activity')}</h3>
                <ul className="space-y-3">
                    {activities.map(activity => {
                       const exchange = getExchange(activity.exchange);
                       return (
                        <li key={activity.id} className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md">
                            <div className="flex items-center">
                                <span className="text-lg mr-3">{exchange?.icon}</span>
                                <div>
                                    <p className="font-medium text-black dark:text-white">{activity.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{exchange?.name}</p>
                                </div>
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">{activity.timestamp.toLocaleTimeString('ko-KR')}</span>
                        </li>
                       )
                    })}
                </ul>
            </Card>
        </div>
    )
};

const AnnouncementsTab: React.FC = () => {
    const { t } = useTranslation();
    const [allAnnouncements, setAllAnnouncements] = useState<Record<ExchangeId, Announcement[]>>({} as Record<ExchangeId, Announcement[]>);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const announcementsPromises = EXCHANGES.map(exchange =>
                    fetch(`/api/announcements/${exchange.id}.json`)
                        .then(res => res.json())
                        .then(data => ({ [exchange.id]: data }))
                );
                const announcementsArray = await Promise.all(announcementsPromises);
                const announcementsData = announcementsArray.reduce((acc, current) => ({ ...acc, ...current }), {});
                // FIX: Cast the result of reduce to the correct type. TypeScript has trouble inferring
                // the precise type from this pattern and widens it to `{[x: string]: any}`.
                setAllAnnouncements(announcementsData as Record<ExchangeId, Announcement[]>);
            } catch (error) {
                console.error("Failed to fetch announcements for admin page:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnnouncements();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6 text-black dark:text-white">{t('admin.announcements.title')}</h2>
            <div className="space-y-8">
                {EXCHANGES.map(exchange => (
                    <Card key={exchange.id}>
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center">
                                <span className="text-2xl mr-3">{exchange.icon}</span>
                                <h3 className="text-xl font-semibold text-black dark:text-white">{exchange.name}</h3>
                            </div>
                            <button className="px-3 py-1 text-sm font-semibold bg-blue-600 rounded-md hover:bg-blue-700 text-white transition-colors">
                                <i className="fas fa-sync-alt mr-2"></i>{t('admin.announcements.refresh')}
                            </button>
                        </div>
                        <ul className="space-y-2">
                            {(allAnnouncements[exchange.id] || []).slice(0, 10).map(ann => (
                                <li key={ann.id} className="flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md">
                                    <div>
                                        <a href={ann.url} target="_blank" rel="noopener noreferrer" className="font-medium text-black dark:text-white hover:underline">{ann.title}</a>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            <span className="bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 px-2 py-0.5 rounded-full text-xs mr-2">{ann.category}</span>
                                            {ann.date}
                                        </p>
                                    </div>
                                    <a href={ann.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-black dark:hover:text-white">
                                        <i className="fas fa-external-link-alt"></i>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </Card>
                ))}
            </div>
        </div>
    );
}

const NewsTab: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div>
            <h2 className="text-2xl font-bold mb-6 text-black dark:text-white">{t('admin.news.title')}</h2>
            <Card className="text-center">
                <i className="fas fa-tools text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
                <h3 className="text-xl font-semibold text-black dark:text-white">{t('admin.news.wip_title')}</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">{t('admin.news.wip_desc')}</p>
            </Card>
        </div>
    );
};

const SettingsTab: React.FC = () => {
    const { t } = useTranslation();
    const [settings, setSettings] = useState({
        interval: 5,
        retention: 30,
        exchanges: EXCHANGES.reduce((acc, e) => ({ ...acc, [e.id]: true }), {})
    });

    const handleToggle = (id: string, checked: boolean) => {
        setSettings(prev => ({
            ...prev,
            exchanges: { ...prev.exchanges, [id]: checked }
        }));
    };
    
    return (
        <div>
            <h2 className="text-2xl font-bold mb-6 text-black dark:text-white">{t('admin.settings.title')}</h2>
            <div className="space-y-8">
                <Card>
                    <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">{t('admin.settings.auto_collection_title')}</h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <label htmlFor="interval" className="w-40 text-gray-700 dark:text-gray-300">{t('admin.settings.collection_interval')}</label>
                            <input type="number" id="interval" value={settings.interval} onChange={e => setSettings(s=>({...s, interval: +e.target.value}))} className="w-24 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md p-2 text-black dark:text-white" />
                        </div>
                         <div className="flex items-center gap-4">
                            <label htmlFor="retention" className="w-40 text-gray-700 dark:text-gray-300">{t('admin.settings.retention_days')}</label>
                            <input type="number" id="retention" value={settings.retention} onChange={e => setSettings(s=>({...s, retention: +e.target.value}))} className="w-24 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md p-2 text-black dark:text-white" />
                        </div>
                    </div>
                </Card>
                 <Card>
                    <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">{t('admin.settings.enable_exchanges_title')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {EXCHANGES.map(exchange => (
                            <ToggleSwitch
                                key={exchange.id}
                                id={`toggle-${exchange.id}`}
                                label={exchange.name}
                                checked={settings.exchanges[exchange.id]}
                                onChange={(checked) => handleToggle(exchange.id, checked)}
                            />
                        ))}
                    </div>
                </Card>
                 <div className="flex justify-end">
                    <button className="px-6 py-2 font-bold bg-orange-600 rounded-md hover:bg-orange-700 text-white transition-colors">{t('admin.settings.save_button')}</button>
                </div>
            </div>
        </div>
    );
};


const AdminPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
    const [stats, setStats] = useState<Stats | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);

    useEffect(() => {
        if (activeTab === 'dashboard') {
            const handleStatsUpdate = (newStats: Stats) => setStats(newStats);
            const handleActivityUpdate = (newActivities: Activity[]) => setActivities(newActivities);
            
            dashboardService.connect(handleStatsUpdate, handleActivityUpdate);

            return () => {
                dashboardService.disconnect();
            };
        }
    }, [activeTab]);
    
    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <DashboardTab stats={stats} activities={activities} />;
            case 'announcements': return <AnnouncementsTab />;
            case 'news': return <NewsTab />;
            case 'settings': return <SettingsTab />;
            default: return null;
        }
    };

    return (
        <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab}>
            {renderContent()}
        </AdminLayout>
    );
};

export default AdminPage;
