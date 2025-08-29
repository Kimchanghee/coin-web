import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ThemeToggle from '../ThemeToggle';
import type { AdminTab } from '../../types';

interface AdminLayoutProps {
    children: React.ReactNode;
    activeTab: AdminTab;
    setActiveTab: (tab: AdminTab) => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activeTab, setActiveTab }) => {
    const { t } = useTranslation();
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const tabs: {id: AdminTab, nameKey: string, icon: string, disabled?: boolean}[] = [
        { id: 'dashboard', nameKey: 'admin.tabs.dashboard', icon: 'fa-tachometer-alt' },
        { id: 'announcements', nameKey: 'admin.tabs.announcements', icon: 'fa-bullhorn' },
        { id: 'news', nameKey: 'admin.tabs.news', icon: 'fa-newspaper', disabled: true },
        { id: 'settings', nameKey: 'admin.tabs.settings', icon: 'fa-cog' },
    ];

    const SidebarContent = () => (
        <>
            <div className="flex items-center gap-2 mb-8 px-2">
               <i className="fa-solid fa-user-shield text-2xl text-orange-500"></i>
               <h1 className="text-xl font-bold text-black dark:text-white">{t('admin.title')}</h1>
            </div>
            <nav className="flex flex-col space-y-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            if (!tab.disabled) {
                                setActiveTab(tab.id);
                                setSidebarOpen(false);
                            }
                        }}
                        disabled={tab.disabled}
                        className={`flex items-center px-4 py-2 rounded-md text-left transition-colors ${
                            activeTab === tab.id ? 'bg-orange-600 text-white' 
                            : tab.disabled ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' 
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                        }`}
                    >
                        <i className={`fas ${tab.icon} w-6`}></i>
                        <span>{t(tab.nameKey)}</span>
                    </button>
                ))}
            </nav>
            <div className="mt-auto">
                 <Link to="/" className="flex items-center px-4 py-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                    <i className="fas fa-arrow-left w-6"></i>
                    <span>{t('admin.back_to_main')}</span>
                </Link>
            </div>
        </>
    );

    return (
        <div className="relative min-h-screen md:flex bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-gray-200">
            <div className="md:hidden flex justify-between items-center p-4 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                 <button onClick={() => setSidebarOpen(!isSidebarOpen)}>
                    <i className="fas fa-bars text-xl"></i>
                 </button>
                 <ThemeToggle />
            </div>

            <aside className={`fixed inset-y-0 left-0 bg-white dark:bg-slate-800 w-64 p-4 flex flex-col border-r border-gray-200 dark:border-slate-700 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-200 ease-in-out z-30`}>
                <SidebarContent />
            </aside>

            <div className="flex-1 flex flex-col">
                <header className="hidden md:flex justify-end items-center p-4 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                     <ThemeToggle />
                </header>
                <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;