import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../i18n';
import PremiumLayout from '../components/layouts/PremiumLayout';

const FeatureListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <li className="flex items-center gap-3">
        <i className="fas fa-check-circle text-green-500"></i>
        <span>{children}</span>
    </li>
);

const PricingCard: React.FC<{
    plan: string;
    price: string;
    period: string;
    isBestValue?: boolean;
    children: React.ReactNode;
}> = ({ plan, price, period, isBestValue = false, children }) => {
    const { t } = useTranslation();
    return (
        <div className={`relative bg-white dark:bg-[#1a1a1a] p-8 rounded-lg border ${isBestValue ? 'border-2 border-yellow-400' : 'border-gray-200 dark:border-gray-800'}`}>
            {isBestValue && (
                <span className="absolute top-0 -translate-y-1/2 bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{t('subscription.best_value')}</span>
            )}
            <h3 className="text-2xl font-semibold text-black dark:text-white">{plan}</h3>
            <p className="mt-4">
                <span className="text-4xl font-bold text-black dark:text-white">${price}</span>
                <span className="text-gray-500 dark:text-gray-400"> / {period}</span>
            </p>
            <p className="text-sm text-gray-500 mt-2">{children}</p>
            <button className={`w-full mt-8 py-3 rounded-lg font-bold transition-colors ${
                isBestValue 
                ? 'bg-yellow-400 text-black hover:bg-yellow-500' 
                : 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}>
                {t('subscription.choose_plan', { plan })}
            </button>
        </div>
    );
}

const SubscriptionPage: React.FC = () => {
    const { t } = useTranslation();
    return (
        <PremiumLayout>
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-12">
                <header className="text-center">
                    <Link to="/" className="text-yellow-400 hover:text-yellow-300 transition-colors">
                        &larr; {t('subscription.back_to_dashboard')}
                    </Link>
                    <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-black dark:text-white sm:text-5xl">
                        {t('subscription.title')}
                    </h1>
                    <p className="mt-3 mx-auto max-w-2xl text-gray-500 dark:text-gray-400">
                        {t('subscription.subtitle')}
                    </p>
                </header>

                <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
                    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-[#1a1a1a] lg:col-span-1">
                        <h2 className="text-xl font-semibold text-black dark:text-white">{t('subscription.features_title')}</h2>
                        <ul className="mt-6 space-y-4 text-gray-700 dark:text-gray-300">
                            <FeatureListItem>{t('subscription.feature1')}</FeatureListItem>
                            <FeatureListItem>{t('subscription.feature2')}</FeatureListItem>
                            <FeatureListItem>{t('subscription.feature3')}</FeatureListItem>
                            <FeatureListItem>{t('subscription.feature4')}</FeatureListItem>
                            <FeatureListItem>{t('subscription.feature5')}</FeatureListItem>
                            <FeatureListItem>{t('subscription.feature6')}</FeatureListItem>
                        </ul>
                    </div>

                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:col-span-2">
                        <PricingCard plan={t('subscription.monthly_plan')} price="19" period={t('subscription.month')}>
                            {t('subscription.monthly_desc')}
                        </PricingCard>
                        <PricingCard plan={t('subscription.yearly_plan')} price="14" period={t('subscription.month')} isBestValue>
                            {t('subscription.yearly_desc')}
                        </PricingCard>
                    </div>
                </div>
            </div>
        </PremiumLayout>
    );
};

export default SubscriptionPage;