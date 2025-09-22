import React from 'react';
import { useTranslation } from 'react-i18next';
import PremiumLayout from '../components/layouts/PremiumLayout';
import { EXCHANGE_NAV_TRANSLATIONS } from '../constants';

type FeatureKey = 'exchange_arbitrage' | 'tradingview_auto' | 'listing_auto';

type FeaturePageTemplateProps = {
    featureKey: FeatureKey;
};

const featureIcons: Record<FeatureKey, string> = {
    exchange_arbitrage: 'fa-scale-balanced',
    tradingview_auto: 'fa-chart-line',
    listing_auto: 'fa-robot',
};

const FeaturePageTemplate: React.FC<FeaturePageTemplateProps> = ({ featureKey }) => {
    const { t } = useTranslation();
    const icon = featureIcons[featureKey];
    const translationKeys = EXCHANGE_NAV_TRANSLATIONS[featureKey];
    const featureLabel = t(translationKeys.primary, {
        defaultValue: t(translationKeys.fallback)
    });
    const highlightKeys = [0, 1, 2].map(index => `feature_pages.${featureKey}.points.${index}`);

    return (
        <PremiumLayout>
            <div className="mb-6">
                <span className="inline-flex items-center gap-2 rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-600 dark:text-yellow-300">
                    <i className="fas fa-sparkles"></i>
                    {t('feature_pages.coming_soon')}
                </span>
                <h1 className="mt-4 text-2xl font-bold text-black dark:text-white">{featureLabel}</h1>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t(`feature_pages.${featureKey}.intro`)}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                    <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400/20 text-yellow-500">
                            <i className={`fas ${icon} text-xl`}></i>
                        </span>
                        <div>
                            <h2 className="text-lg font-semibold text-black dark:text-white">{featureLabel}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('feature_pages.coming_soon')}</p>
                        </div>
                    </div>
                    <ul className="mt-4 space-y-3">
                        {highlightKeys.map(key => (
                            <li key={key} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                                <span className="mt-1 text-yellow-500">
                                    <i className="fas fa-check-circle"></i>
                                </span>
                                <span>{t(key)}</span>
                            </li>
                        ))}
                    </ul>
                    <button
                        type="button"
                        className="mt-6 inline-flex items-center justify-center gap-2 rounded-md bg-yellow-400 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                    >
                        <i className="fas fa-bell"></i>
                        {t('feature_pages.notify_me')}
                    </button>
                </section>
                <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                    <h2 className="text-lg font-semibold text-black dark:text-white">{t('feature_pages.early_access_title')}</h2>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('feature_pages.early_access_description')}</p>
                    <form className="mt-4 space-y-3" onSubmit={event => event.preventDefault()}>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300" htmlFor={`${featureKey}-email`}>
                            {t('auth.email')}
                        </label>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <input
                                id={`${featureKey}-email`}
                                type="email"
                                placeholder={t('feature_pages.email_placeholder')}
                                className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-yellow-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                            <button
                                type="submit"
                                className="inline-flex items-center justify-center gap-2 rounded-md border border-yellow-400 px-4 py-2 text-sm font-semibold text-yellow-600 transition-colors hover:border-yellow-500 hover:text-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500/40 dark:border-yellow-500 dark:text-yellow-300 dark:hover:border-yellow-400 dark:hover:text-yellow-200"
                            >
                                <i className="fas fa-paper-plane"></i>
                                {t('feature_pages.notify_me')}
                            </button>
                        </div>
                    </form>
                    <div className="mt-6 rounded-md bg-yellow-400/10 p-4 text-sm text-yellow-700 dark:text-yellow-300">
                        <i className="fas fa-info-circle mr-2"></i>
                        {t(`feature_pages.${featureKey}.intro`)}
                    </div>
                </section>
            </div>
        </PremiumLayout>
    );
};

export const ExchangeArbitragePage: React.FC = () => <FeaturePageTemplate featureKey="exchange_arbitrage" />;

export const TradingviewAutoPage: React.FC = () => <FeaturePageTemplate featureKey="tradingview_auto" />;

export const ListingAutoPage: React.FC = () => <FeaturePageTemplate featureKey="listing_auto" />;
