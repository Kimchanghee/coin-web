import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { EXCHANGE_NAV_ITEMS, type ExchangeNavKey } from '../constants';
import SimpleExchangeHeader from '../components/navigation/SimpleExchangeHeader';
import { ExchangeSidebar, ExchangeBottomNav } from '../components/navigation/ExchangeNavigation';

export type FeatureKey = Exclude<ExchangeNavKey, 'exchange_announcements'>;

interface FeaturePlaceholderTemplateProps {
  featureKey: FeatureKey;
}

const FeaturePlaceholderTemplate: React.FC<FeaturePlaceholderTemplateProps> = ({ featureKey }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const navItem = EXCHANGE_NAV_ITEMS.find((item) => item.key === featureKey);
  const featureLabel = t(`sidebar.${featureKey}`);

  return (
    <div className="bg-gray-50 dark:bg-black min-h-screen text-gray-600 dark:text-gray-300 font-sans">
      <div className="flex">
        <ExchangeSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <SimpleExchangeHeader onMenuClick={() => setSidebarOpen(true)} user={user} />
          <main className="p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
            <div className="max-w-4xl mx-auto bg-white dark:bg-[#121212] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 sm:p-10 text-center space-y-6">
              <span className="inline-flex items-center gap-2 px-3 py-1 text-sm font-semibold uppercase tracking-wide text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 rounded-full">
                <i className="fas fa-sparkles"></i>
                {t('feature_page.coming_soon')}
              </span>
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center shadow-inner">
                  <i className={`fas ${navItem?.icon ?? 'fa-rocket'} text-2xl text-yellow-500 dark:text-yellow-300`}></i>
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-black dark:text-white">{featureLabel}</h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                {t('feature_page.description', { feature: featureLabel })}
              </p>
              <div className="grid gap-3 sm:grid-cols-3 text-left">
                <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1b1b1b] p-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('feature_page.progress_label')}</p>
                  <p className="mt-1 text-sm font-medium text-black dark:text-white">{t('feature_page.progress_value')}</p>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1b1b1b] p-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('feature_page.eta_label')}</p>
                  <p className="mt-1 text-sm font-medium text-black dark:text-white">{t('feature_page.eta_value')}</p>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1b1b1b] p-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('feature_page.update_label')}</p>
                  <p className="mt-1 text-sm font-medium text-black dark:text-white">{t('feature_page.update_value')}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  to="/"
                  className="px-5 py-2.5 rounded-full text-sm font-semibold bg-gray-900 text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-100 transition-colors duration-200"
                >
                  {t('feature_page.cta_dashboard')}
                </Link>
                <Link
                  to="/subscribe"
                  className="px-5 py-2.5 rounded-full text-sm font-semibold border border-yellow-400 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 transition-colors duration-200"
                >
                  {t('feature_page.cta_subscribe')}
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
      <ExchangeBottomNav />
    </div>
  );
};

export default FeaturePlaceholderTemplate;
