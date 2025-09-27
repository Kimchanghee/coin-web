import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../i18n';
import { COIN_METADATA, ALL_EXCHANGES_FOR_COMPARISON, COIN_DISPLAY_LIMIT, CURRENCY_RATES, LANGUAGE_CURRENCY_MAP } from '../constants';
import type { CoinMetadata, User } from '../types';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Clock from '../components/Clock';
import ThemeToggle from '../components/ThemeToggle';
import { PremiumSidebar } from '../components/layouts/PremiumLayout';
import { useLiveMarketData } from '../hooks/useLiveMarketData';

type ExchangeOption = { id: string; name: string };
type CurrencyCode = 'KRW' | 'USD' | 'JPY' | 'CNY' | 'THB' | 'VND';
type SortKey = 'name' | 'basePrice' | 'comparisonPrice' | 'priceDifference' | 'change24h' | 'baseVolume' | 'comparisonVolume';
type SortDirection = 'asc' | 'desc';
type VolumeState = 'loading' | 'estimated' | 'live';

const STALE_PRICE_WINDOW_MS = 15000;
const STALE_VOLUME_WINDOW_MS = 20000;
const MIN_EXTENDED_SAMPLES_FOR_LIVE = 2;

// Currency conversion utility
const convertCurrency = (amount: number, fromCurrency: string, toCurrency: CurrencyCode, usdKrw: number): number => {
  // Convert to KRW first
  let amountInKrw = amount;
  if (fromCurrency === 'USD' || fromCurrency.includes('usdt')) {
    amountInKrw = amount * usdKrw;
  }
  
  // Then convert to target currency
  const targetRate = CURRENCY_RATES[toCurrency]?.rate || 1;
  return amountInKrw * targetRate;
};

// Format currency with proper symbol
const formatCurrency = (amount: number, currency: CurrencyCode): string => {
  const currencyInfo = CURRENCY_RATES[currency];
  if (!currencyInfo) return amount.toLocaleString();

  const symbol = currencyInfo.symbol;
  
  if (currency === 'VND') {
    return `${symbol}${Math.round(amount).toLocaleString('vi-VN')}`;
  } else if (currency === 'JPY') {
    return `${symbol}${Math.round(amount).toLocaleString('ja-JP')}`;
  } else if (currency === 'CNY') {
    return `${symbol}${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (currency === 'THB') {
    return `${symbol}${amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (currency === 'USD') {
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  } else { // KRW
    return `${symbol}${Math.round(amount).toLocaleString('ko-KR')}`;
  }
};

// Custom Select Component
const CustomSelect: React.FC<{
    options: ExchangeOption[];
    value: ExchangeOption;
    onChange: (value: ExchangeOption) => void;
}> = ({ options, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-black dark:text-white">
                <span>{value.name}</span>
                <i className={`fas fa-chevron-down transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {isOpen && (
                <div className="absolute z-10 top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {options.map(option => (
                        <div key={option.id} onClick={() => { onChange(option); setIsOpen(false); }} className="px-3 py-2 text-sm text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                            {option.name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Header Component
type HeaderStats = {
    tetherPremium: number | null;
    coinbasePremium: number | null;
};

const Header: React.FC<{ onMenuClick: () => void; user: User | null; usdKrw: number; stats: HeaderStats; isMenuOpen: boolean }> = ({ onMenuClick, user, usdKrw, stats, isMenuOpen }) => {
    const { t } = useTranslation();

    const renderPremium = (value: number | null) => {
        if (typeof value === 'number' && Number.isFinite(value)) {
            const color = value > 0 ? 'text-green-500' : value < 0 ? 'text-red-500' : 'text-gray-800 dark:text-gray-200';
            return <p className={`font-bold ${color}`}>{value.toFixed(2)}%</p>;
        }

        return (
            <p className="font-bold text-gray-400 dark:text-gray-600" aria-live="polite">
                —
            </p>
        );
    };

    return (
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
            <div className="px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={onMenuClick}
                        className="text-xl text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors"
                        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={isMenuOpen}
                        aria-controls="premium-navigation"
                    >
                        <i className="fas fa-bars"></i>
                    </button>
                    <Link to="/" className="font-bold text-black dark:text-white text-xl">
                        TeamYM
                    </Link>
                </div>
                <div className="hidden md:flex items-center gap-4 text-xs text-gray-600 dark:text-gray-300">
                    <div className="text-center">
                        <p className="text-gray-500 dark:text-gray-400">{t('header.tether_premium')}</p>
                        {renderPremium(stats.tetherPremium)}
                    </div>
                    <div className="text-center">
                        <p className="text-gray-500 dark:text-gray-400">{t('header.coinbase_premium')}</p>
                        {renderPremium(stats.coinbasePremium)}
                    </div>
                    <div className="text-center">
                        <p className="text-gray-500 dark:text-gray-400">USD/KRW</p>
                        <p className="font-bold text-gray-800 dark:text-gray-200">{usdKrw.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}</p>
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

// Enhanced coin metadata type for processed data
interface ProcessedCoinData extends CoinMetadata {
    basePrice: number;
    comparisonPrice: number;
    priceDifference: number;
    priceDifferencePercentage: number;
    change24h: number;
    baseVolume: string;
    comparisonVolume: string;
    baseVolumeValue: number;
    comparisonVolumeValue: number;
    baseVolumeState: VolumeState;
    comparisonVolumeState: VolumeState;
    isBasePriceReady: boolean;
    isComparisonPriceReady: boolean;
    isPriceDifferenceReady: boolean;
    isChangeReady: boolean;
}

// Format volume with proper localization
const formatVolume = (volumeNum: number, currency: CurrencyCode, t: any): string => {
    if (currency === 'KRW') {
        if (volumeNum >= 1000000000000) {
            return `${(volumeNum / 1000000000000).toFixed(2)}${t('table.trillion')}`;
        }
        if (volumeNum >= 100000000) {
            return `${(volumeNum / 100000000).toLocaleString('ko-KR', {maximumFractionDigits: 0})}${t('table.hundred_million')}`;
        }
        return volumeNum.toLocaleString('ko-KR');
    } else if (currency === 'VND') {
        if (volumeNum >= 1000000000000) {
            return `${(volumeNum / 1000000000000).toFixed(2)}${t('table.trillion')}`;
        }
        if (volumeNum >= 1000000000) {
            return `${(volumeNum / 1000000000).toFixed(2)}${t('table.billion')}`;
        }
        if (volumeNum >= 1000000) {
            return `${(volumeNum / 1000000).toFixed(2)}${t('table.million')}`;
        }
        return volumeNum.toLocaleString('vi-VN');
    } else {
        // USD, JPY, CNY, THB
        if (volumeNum >= 1000000000) {
            return `${(volumeNum / 1000000000).toFixed(2)}${t('table.billion')}`;
        }
        if (volumeNum >= 1000000) {
            return `${(volumeNum / 1000000).toFixed(2)}${t('table.million')}`;
        }
        if (volumeNum >= 1000) {
            return `${(volumeNum / 1000).toFixed(2)}${t('table.thousand')}`;
        }
        return volumeNum.toFixed(2);
    }
};

// Main Table Component with multi-currency support
const CryptoPriceComparisonTable: React.FC<{ 
    data: ProcessedCoinData[];
    onSort: (key: SortKey) => void;
    sortConfig: { key: SortKey; direction: SortDirection };
    baseExchangeName: string;
    comparisonExchangeName: string;
    currency: CurrencyCode;
}> = ({ data, onSort, sortConfig, baseExchangeName, comparisonExchangeName, currency }) => {
    const { t, i18n } = useTranslation();
    const formatPercentage = (num: number) => `${num.toFixed(2)}%`;
    const getTextColor = (num: number) => num > 0 ? 'text-green-500' : num < 0 ? 'text-red-500' : 'text-gray-800 dark:text-gray-300';

    const getSortIcon = (key: SortKey) => {
        if (sortConfig.key !== key) {
            return <i className="fas fa-sort ml-1 text-gray-400 dark:text-gray-600 text-xs"></i>;
        }
        if (sortConfig.direction === 'asc') {
            return <i className="fas fa-sort-up ml-1 text-black dark:text-white text-xs"></i>;
        }
        return <i className="fas fa-sort-down ml-1 text-black dark:text-white text-xs"></i>;
    };

    return (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs text-gray-500 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-1 sm:px-4 py-3 text-left sticky left-0 bg-gray-50 dark:bg-gray-900/50 z-10" onClick={() => onSort('name')}>
                                <div className="flex items-center cursor-pointer whitespace-nowrap">
                                    {t('table.name')}
                                    {getSortIcon('name')}
                                </div>
                            </th>
                            <th scope="col" className="px-1 sm:px-3 py-3 text-center border-l border-gray-200 dark:border-gray-700" colSpan={2}>
                                <div className="text-gray-600 dark:text-gray-300 font-semibold">{t('table.current_price')}</div>
                            </th>
                            <th scope="col" className="px-1 sm:px-4 py-3 text-right border-l border-gray-200 dark:border-gray-700" onClick={() => onSort('priceDifference')}>
                                <div className="flex items-center justify-end cursor-pointer whitespace-nowrap">
                                    {t('table.price_difference')}
                                    {getSortIcon('priceDifference')}
                                </div>
                            </th>
                            <th scope="col" className="px-1 sm:px-4 py-3 text-right border-l border-gray-200 dark:border-gray-700" onClick={() => onSort('change24h')}>
                                <div className="flex items-center justify-end cursor-pointer whitespace-nowrap">
                                    {t('table.daily_change')}
                                    {getSortIcon('change24h')}
                                </div>
                            </th>
                            <th scope="col" className="px-1 sm:px-3 py-3 text-center border-l border-gray-200 dark:border-gray-700" colSpan={2}>
                                <div className="text-gray-600 dark:text-gray-300 font-semibold">{t('table.trading_volume_24h')}</div>
                            </th>
                        </tr>
                        <tr className="border-t border-gray-200 dark:border-gray-700">
                            <th className="sticky left-0 bg-gray-50 dark:bg-gray-900/50"></th>
                            <th className="px-1 sm:px-3 py-2 text-right text-xs border-l border-gray-200 dark:border-gray-700" onClick={() => onSort('basePrice')}>
                                <div className="flex items-center justify-end cursor-pointer">
                                    <span className="truncate max-w-[80px]">{baseExchangeName.split(' ')[0]}</span>
                                    {getSortIcon('basePrice')}
                                </div>
                            </th>
                            <th className="px-1 sm:px-3 py-2 text-right text-xs" onClick={() => onSort('comparisonPrice')}>
                                <div className="flex items-center justify-end cursor-pointer">
                                    <span className="truncate max-w-[80px]">{comparisonExchangeName.split(' ')[0]}</span>
                                    {getSortIcon('comparisonPrice')}
                                </div>
                            </th>
                            <th className="border-l border-gray-200 dark:border-gray-700"></th>
                            <th className="border-l border-gray-200 dark:border-gray-700"></th>
                            <th className="px-1 sm:px-3 py-2 text-right text-xs border-l border-gray-200 dark:border-gray-700" onClick={() => onSort('baseVolume')}>
                                <div className="flex items-center justify-end cursor-pointer">
                                    <span className="truncate max-w-[80px]">{baseExchangeName.split(' ')[0]}</span>
                                    {getSortIcon('baseVolume')}
                                </div>
                            </th>
                            <th className="px-1 sm:px-3 py-2 text-right text-xs" onClick={() => onSort('comparisonVolume')}>
                                <div className="flex items-center justify-end cursor-pointer">
                                    <span className="truncate max-w-[80px]">{comparisonExchangeName.split(' ')[0]}</span>
                                    {getSortIcon('comparisonVolume')}
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(coin => (
                            <tr key={coin.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50">
                                <td className="px-1 sm:px-4 py-3 font-medium text-black dark:text-white sticky left-0 bg-white dark:bg-[#1a1a1a]">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <span className="text-lg">{coin.logo}</span>
                                        <div>
                                            <p className="font-semibold text-sm sm:text-base">{coin.names[i18n.language] || coin.names['en']}</p>
                                            <p className="text-xs text-gray-500">{coin.symbol}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-1 sm:px-3 py-3 text-right text-gray-800 dark:text-gray-200 border-l border-gray-200 dark:border-gray-700">
                                    {coin.isBasePriceReady ? (
                                        <p className="font-semibold text-xs sm:text-base">{formatCurrency(coin.basePrice, currency)}</p>
                                    ) : (
                                        <div className="flex flex-col items-end gap-1">
                                            <span
                                                className="inline-flex h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700"
                                                aria-hidden="true"
                                            ></span>
                                            <span className="text-[10px] text-gray-500 dark:text-gray-400">{t('table.awaiting_live')}</span>
                                            <span className="sr-only">{t('table.loading')}</span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-1 sm:px-3 py-3 text-right text-gray-800 dark:text-gray-200">
                                    {coin.isComparisonPriceReady ? (
                                        <p className="font-semibold text-xs sm:text-base">{formatCurrency(coin.comparisonPrice, currency)}</p>
                                    ) : (
                                        <div className="flex flex-col items-end gap-1">
                                            <span
                                                className="inline-flex h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700"
                                                aria-hidden="true"
                                            ></span>
                                            <span className="text-[10px] text-gray-500 dark:text-gray-400">{t('table.awaiting_live')}</span>
                                            <span className="sr-only">{t('table.loading')}</span>
                                        </div>
                                    )}
                                </td>
                                <td
                                    className={`px-1 sm:px-4 py-3 text-right font-bold border-l border-gray-200 dark:border-gray-700 ${
                                        coin.isPriceDifferenceReady
                                            ? getTextColor(coin.priceDifferencePercentage)
                                            : 'text-gray-400 dark:text-gray-500'
                                    }`}
                                >
                                    {coin.isPriceDifferenceReady ? (
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs sm:text-base">{formatPercentage(coin.priceDifferencePercentage)}</span>
                                            <span className="text-[10px] sm:text-xs mt-0.5 text-gray-500">
                                                {coin.priceDifference > 0 ? '+' : ''}{formatCurrency(coin.priceDifference, currency)}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-end gap-1 text-[10px] sm:text-xs">
                                            <span
                                                className="inline-flex h-3 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700"
                                                aria-hidden="true"
                                            ></span>
                                            <span className="text-gray-500 dark:text-gray-400">{t('table.awaiting_live')}</span>
                                            <span className="sr-only">{t('table.loading')}</span>
                                        </div>
                                    )}
                                </td>
                                <td
                                    className={`px-1 sm:px-4 py-3 text-right font-bold border-l border-gray-200 dark:border-gray-700 ${
                                        coin.isChangeReady
                                            ? getTextColor(coin.change24h)
                                            : 'text-gray-400 dark:text-gray-500'
                                    }`}
                                >
                                    {coin.isChangeReady ? (
                                        <span className="text-xs sm:text-base">{formatPercentage(coin.change24h)}</span>
                                    ) : (
                                        <div className="flex flex-col items-end gap-1 text-[10px] sm:text-xs">
                                            <span
                                                className="inline-flex h-3 w-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700"
                                                aria-hidden="true"
                                            ></span>
                                            <span className="text-gray-500 dark:text-gray-400">{t('table.awaiting_live')}</span>
                                            <span className="sr-only">{t('table.loading')}</span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-1 sm:px-3 py-3 text-right text-gray-800 dark:text-gray-200 border-l border-gray-200 dark:border-gray-700">
                                    {coin.baseVolumeState === 'loading' ? (
                                        <div className="flex justify-end">
                                            <span
                                                className="inline-flex h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700"
                                                aria-hidden="true"
                                            ></span>
                                            <span className="sr-only">{t('table.loading')}</span>
                                        </div>
                                    ) : (
                                        <p
                                            className={`font-medium text-xs sm:text-sm ${
                                                coin.baseVolumeState === 'estimated' ? 'text-gray-500 dark:text-gray-400' : ''
                                            }`}
                                        >
                                            {coin.baseVolume}
                                        </p>
                                    )}
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center justify-end gap-1">
                                        {coin.baseVolumeState === 'loading' ? (
                                            <>
                                                <span className="inline-flex items-center gap-1 text-amber-500 dark:text-amber-300">
                                                    <i className="fas fa-circle-notch animate-spin"></i>
                                                    {t('table.loading')}
                                                </span>
                                                <span className="text-gray-300 dark:text-gray-600">•</span>
                                                <span className="text-gray-500 dark:text-gray-400">{t('table.awaiting_live')}</span>
                                                <span className="text-gray-300 dark:text-gray-600">•</span>
                                                <span className="text-gray-500 dark:text-gray-400">{CURRENCY_RATES[currency]?.name || 'KRW'}</span>
                                            </>
                                        ) : (
                                            <>
                                                <span
                                                    className={`inline-flex items-center gap-1 ${
                                                        coin.baseVolumeState === 'estimated'
                                                            ? 'text-amber-500 dark:text-amber-300'
                                                            : 'text-emerald-500 dark:text-emerald-300'
                                                    }`}
                                                    title={t(coin.baseVolumeState === 'estimated' ? 'table.estimated_tooltip' : 'table.live_tooltip')}
                                                >
                                                    <i className={`fas ${coin.baseVolumeState === 'estimated' ? 'fa-clock' : 'fa-bolt'}`}></i>
                                                    {t(coin.baseVolumeState === 'estimated' ? 'table.estimated' : 'table.live')}
                                                </span>
                                                <span className="text-gray-300 dark:text-gray-600">•</span>
                                                <span className="text-gray-500 dark:text-gray-400">{CURRENCY_RATES[currency]?.name || 'KRW'}</span>
                                                {coin.baseVolumeState === 'estimated' && (
                                                    <>
                                                        <span className="text-gray-300 dark:text-gray-600">•</span>
                                                        <span className="text-gray-500 dark:text-gray-400">{t('table.awaiting_live')}</span>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </p>
                                </td>
                                <td className="px-1 sm:px-3 py-3 text-right text-gray-800 dark:text-gray-200">
                                    {coin.comparisonVolumeState === 'loading' ? (
                                        <div className="flex justify-end">
                                            <span
                                                className="inline-flex h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700"
                                                aria-hidden="true"
                                            ></span>
                                            <span className="sr-only">{t('table.loading')}</span>
                                        </div>
                                    ) : (
                                        <p
                                            className={`font-medium text-xs sm:text-sm ${
                                                coin.comparisonVolumeState === 'estimated' ? 'text-gray-500 dark:text-gray-400' : ''
                                            }`}
                                        >
                                            {coin.comparisonVolume}
                                        </p>
                                    )}
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center justify-end gap-1">
                                        {coin.comparisonVolumeState === 'loading' ? (
                                            <>
                                                <span className="inline-flex items-center gap-1 text-amber-500 dark:text-amber-300">
                                                    <i className="fas fa-circle-notch animate-spin"></i>
                                                    {t('table.loading')}
                                                </span>
                                                <span className="text-gray-300 dark:text-gray-600">•</span>
                                                <span className="text-gray-500 dark:text-gray-400">{t('table.awaiting_live')}</span>
                                                <span className="text-gray-300 dark:text-gray-600">•</span>
                                                <span className="text-gray-500 dark:text-gray-400">{CURRENCY_RATES[currency]?.name || 'KRW'}</span>
                                            </>
                                        ) : (
                                            <>
                                                <span
                                                    className={`inline-flex items-center gap-1 ${
                                                        coin.comparisonVolumeState === 'estimated'
                                                            ? 'text-amber-500 dark:text-amber-300'
                                                            : 'text-emerald-500 dark:text-emerald-300'
                                                    }`}
                                                    title={t(coin.comparisonVolumeState === 'estimated' ? 'table.estimated_tooltip' : 'table.live_tooltip')}
                                                >
                                                    <i className={`fas ${coin.comparisonVolumeState === 'estimated' ? 'fa-clock' : 'fa-bolt'}`}></i>
                                                    {t(coin.comparisonVolumeState === 'estimated' ? 'table.estimated' : 'table.live')}
                                                </span>
                                                <span className="text-gray-300 dark:text-gray-600">•</span>
                                                <span className="text-gray-500 dark:text-gray-400">{CURRENCY_RATES[currency]?.name || 'KRW'}</span>
                                                {coin.comparisonVolumeState === 'estimated' && (
                                                    <>
                                                        <span className="text-gray-300 dark:text-gray-600">•</span>
                                                        <span className="text-gray-500 dark:text-gray-400">{t('table.awaiting_live')}</span>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </p>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    총 {data.length}개 코인 표시 중 • {CURRENCY_RATES[currency]?.name} 기준
                </p>
            </div>
        </div>
    );
};

const ReferralBanner: React.FC = () => {
    const { t } = useTranslation();
    const referralLink = "https://www.gate.com/share/DJBWKAIF";

    return (
        <a 
            href={referralLink} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="block w-full mb-8 no-underline"
        >
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-black via-slate-900 to-black p-3 md:p-6 lg:p-8 border border-cyan-500/30 shadow-2xl hover:shadow-cyan-500/20 transition-all duration-300 hover:-translate-y-1">
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div 
                        className="absolute inset-0 bg-[size:40px_40px] animate-slide"
                        style={{
                            backgroundImage: `linear-gradient(to right, rgba(8, 145, 178, 0.2) 1px, transparent 1px), 
                                            linear-gradient(to bottom, rgba(8, 145, 178, 0.2) 1px, transparent 1px)`
                        }}
                    />
                </div>
                
                <span className="absolute top-4 left-4 text-yellow-400 text-lg md:text-xl animate-pulse">✦</span>
                <span className="absolute top-8 right-8 text-yellow-400 text-lg md:text-xl animate-pulse" style={{animationDelay: '0.5s'}}>✦</span>
                <span className="absolute bottom-4 left-1/3 text-yellow-400 text-lg md:text-xl animate-pulse" style={{animationDelay: '1s'}}>✦</span>
                <span className="absolute bottom-8 right-4 text-yellow-400 text-lg md:text-xl animate-pulse" style={{animationDelay: '1.5s'}}>✦</span>
                
                <div className="relative z-10 flex flex-row items-center justify-between gap-2 md:gap-6 lg:gap-8">
                    <div className="flex-shrink-0">
                        <div className="w-14 h-14 md:w-24 md:h-24 lg:w-28 lg:h-28 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/50 transform hover:rotate-3 transition-transform duration-300">
                            <span className="text-white font-black text-sm md:text-lg lg:text-xl">GATE.IO</span>
                        </div>
                    </div>
                    
                    <div className="flex-1 text-center md:text-left min-w-0">
                        <h3 className="text-base md:text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-400 to-white animate-shimmer bg-[size:200%_auto] truncate">
                            <span className="md:hidden">{t('banner.mobile_main_title')}</span>
                            <span className="hidden md:block">{t('banner.pc_main_title')}</span>
                        </h3>
                        <p className="text-xs text-gray-400 mt-1 hidden md:block">
                            {t('banner.pc_sub_title')}
                        </p>
                    </div>
                    
                    <div className="flex-shrink-0 flex flex-col items-center">
                        <div className="relative">
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-[9px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 rounded-full whitespace-nowrap z-10">
                                {t('banner.up_to')}
                            </div>
                            <div className="bg-gradient-to-br from-red-500 to-orange-600 text-white font-black text-2xl md:text-4xl px-3 py-1 md:px-6 md:py-3 rounded-md md:rounded-lg shadow-lg shadow-red-500/50 transform hover:scale-105 transition-transform duration-300">
                                50%
                            </div>
                            <div className="text-[9px] md:text-xs text-green-400 font-bold text-center mt-1 uppercase tracking-wider">
                                {t('banner.discount_text')}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-shrink-0 flex flex-col items-center gap-1">
                        <button className="bg-gradient-to-r from-green-400 to-cyan-400 text-black font-black text-xs md:text-base px-4 py-2 md:px-8 md:py-3 rounded-md md:rounded-lg shadow-lg hover:shadow-green-400/50 transition-all duration-300 hover:scale-105 uppercase tracking-wider whitespace-nowrap">
                            <span className="md:hidden">{t('banner.cta_mobile')}</span>
                            <span className="hidden md:block">{t('banner.cta_pc')}</span>
                        </button>
                        <span className="text-[9px] md:text-xs text-yellow-400 font-bold animate-pulse">
                            <span className="md:hidden">{t('banner.bonus_mobile')}</span>
                            <span className="hidden md:block">{t('banner.bonus_pc')}</span>
                        </span>
                    </div>
                </div>
            </div>
            
            <style>{`
                @keyframes slide {
                    0% { transform: translate(0, 0); }
                    100% { transform: translate(40px, 40px); }
                }
                
                @keyframes shimmer {
                    0% { background-position: 0% center; }
                    100% { background-position: 200% center; }
                }
                
                .animate-slide {
                    animation: slide 20s linear infinite;
                }
                
                .animate-shimmer {
                    animation: shimmer 3s linear infinite;
                }
            `}</style>
        </a>
    );
};

// Main Page Component
const HomePage: React.FC = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'baseVolume', direction: 'desc' });
    const { user, logout } = useAuth();
    const { t, i18n } = useTranslation();
    const usdKrw = useMemo(() => 1 / (CURRENCY_RATES.USD?.rate ?? (1 / 1385)), []);

    const [currentTime, setCurrentTime] = useState(() => Date.now());
    const {
        prices: allPrices,
        extended: allExtendedData,
        priceTimestamps,
        extendedTimestamps,
        extendedSampleCounts,
    } = useLiveMarketData();

    const currentCurrency: CurrencyCode = (LANGUAGE_CURRENCY_MAP as any)[i18n.language] || 'USD';

    const translatedAllExchanges = useMemo(() => 
        ALL_EXCHANGES_FOR_COMPARISON.map(ex => ({ id: ex.id, name: t(ex.nameKey) })),
        [t]
    );

    const [selectedBase, setSelectedBase] = useState<ExchangeOption>(translatedAllExchanges[0]);
    const [selectedComparison, setSelectedComparison] = useState<ExchangeOption>(translatedAllExchanges[1]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const intervalId = window.setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, []);

    useEffect(() => {
        setSelectedBase(current => {
            const match = translatedAllExchanges.find(ex => ex.id === current.id);
            return match || translatedAllExchanges[0];
        });
        setSelectedComparison(current => {
            const match = translatedAllExchanges.find(ex => ex.id === current.id);
            return match || translatedAllExchanges[1];
        });
    }, [i18n.language, translatedAllExchanges]);

    const headerStats = useMemo<HeaderStats>(() => {
        const findFirstPrice = (keys: string[]): number | undefined => {
            for (const key of keys) {
                const timestamp = priceTimestamps[key];
                if (timestamp === undefined || currentTime - timestamp > STALE_PRICE_WINDOW_MS) {
                    continue;
                }

                const value = allPrices[key];
                if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
                    return value;
                }
            }
            return undefined;
        };

        const domesticBtc = findFirstPrice([
            'upbit_krw-BTC',
            'bithumb_krw-BTC',
            'coinone_krw-BTC',
        ]);
        const overseasBtc = findFirstPrice([
            'binance_usdt_spot-BTC',
            'binance_usdt_futures-BTC',
            'bitget_usdt_spot-BTC',
            'bitget_usdt_futures-BTC',
            'bybit_usdt_spot-BTC',
            'bybit_usdt_futures-BTC',
            'okx_usdt_spot-BTC',
            'okx_usdt_futures-BTC',
            'gateio_usdt_spot-BTC',
            'gateio_usdt_futures-BTC',
        ]);

        let tetherPremium: number | null = null;
        if (domesticBtc !== undefined && overseasBtc !== undefined) {
            const overseasInKrw = convertCurrency(overseasBtc, 'USD', 'KRW', usdKrw);
            if (overseasInKrw > 0) {
                tetherPremium = ((domesticBtc - overseasInKrw) / overseasInKrw) * 100;
            }
        }

        const domesticEth = findFirstPrice([
            'upbit_krw-ETH',
            'bithumb_krw-ETH',
            'coinone_krw-ETH',
        ]);
        const overseasEth = findFirstPrice([
            'binance_usdt_spot-ETH',
            'binance_usdt_futures-ETH',
            'bitget_usdt_spot-ETH',
            'bitget_usdt_futures-ETH',
            'bybit_usdt_spot-ETH',
            'bybit_usdt_futures-ETH',
            'okx_usdt_spot-ETH',
            'okx_usdt_futures-ETH',
            'gateio_usdt_spot-ETH',
            'gateio_usdt_futures-ETH',
        ]);

        let coinbasePremium: number | null = null;
        if (domesticEth !== undefined && overseasEth !== undefined) {
            const overseasEthInKrw = convertCurrency(overseasEth, 'USD', 'KRW', usdKrw);
            if (overseasEthInKrw > 0) {
                coinbasePremium = ((domesticEth - overseasEthInKrw) / overseasEthInKrw) * 100;
            }
        }

        return {
            tetherPremium,
            coinbasePremium,
        };
    }, [allPrices, usdKrw, currentTime, priceTimestamps]);

    const handleSort = (key: SortKey) => {
        let direction: SortDirection = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const processedCoinData = useMemo(() => {
        const noVolumeLabel = t('table.no_data');

        const now = currentTime;

        const liveData = COIN_METADATA
            .map(baseCoin => {
                const basePriceKey = `${selectedBase.id}-${baseCoin.symbol}`;
                const comparisonPriceKey = `${selectedComparison.id}-${baseCoin.symbol}`;

                const rawBasePrice = allPrices[basePriceKey];
                const rawComparisonPrice = allPrices[comparisonPriceKey];

                const baseExtData = allExtendedData[basePriceKey] || {};
                const comparisonExtData = allExtendedData[comparisonPriceKey] || {};

                const basePriceFresh =
                    typeof rawBasePrice === 'number' &&
                    rawBasePrice > 0 &&
                    priceTimestamps[basePriceKey] !== undefined &&
                    now - priceTimestamps[basePriceKey]! <= STALE_PRICE_WINDOW_MS;
                const comparisonPriceFresh =
                    typeof rawComparisonPrice === 'number' &&
                    rawComparisonPrice > 0 &&
                    priceTimestamps[comparisonPriceKey] !== undefined &&
                    now - priceTimestamps[comparisonPriceKey]! <= STALE_PRICE_WINDOW_MS;

                const getVolumeDisplay = (
                    liveValue: number | undefined,
                    liveCurrency: CurrencyCode,
                    isFresh: boolean,
                    sampleCount: number
                ): { formatted: string; numeric: number; state: VolumeState } => {
                    if (isFresh && typeof liveValue === 'number' && liveValue > 0) {
                        if (sampleCount < MIN_EXTENDED_SAMPLES_FOR_LIVE) {
                            return {
                                formatted: noVolumeLabel,
                                numeric: 0,
                                state: 'estimated'
                            };
                        }

                        const converted = convertCurrency(liveValue, liveCurrency, currentCurrency, usdKrw);
                        return {
                            formatted: formatVolume(converted, currentCurrency, t),
                            numeric: converted,
                            state: 'live'
                        };
                    }

                    return {
                        formatted: noVolumeLabel,
                        numeric: 0,
                        state: 'loading'
                    };
                };

                const baseCurrencyType = selectedBase.id.includes('krw') ? 'KRW' : 'USD';
                const comparisonCurrencyType = selectedComparison.id.includes('krw') ? 'KRW' : 'USD';

                const basePrice = basePriceFresh
                    ? convertCurrency(rawBasePrice, baseCurrencyType, currentCurrency, usdKrw)
                    : null;

                const comparisonPrice = comparisonPriceFresh
                    ? convertCurrency(rawComparisonPrice, comparisonCurrencyType, currentCurrency, usdKrw)
                    : null;

                const priceDifferenceReady = basePrice !== null && comparisonPrice !== null;
                const priceDifference = priceDifferenceReady && basePrice !== null && comparisonPrice !== null
                    ? basePrice - comparisonPrice
                    : null;
                const priceDifferencePercentage =
                    priceDifferenceReady && comparisonPrice !== null && comparisonPrice !== 0
                        ? (priceDifference! / comparisonPrice) * 100
                        : null;

                const baseExtendedSamples = extendedSampleCounts[basePriceKey] ?? 0;
                const comparisonExtendedSamples = extendedSampleCounts[comparisonPriceKey] ?? 0;

                const liveChange24h =
                    baseExtendedSamples >= MIN_EXTENDED_SAMPLES_FOR_LIVE &&
                    typeof baseExtData.change24h === 'number' &&
                    !Number.isNaN(baseExtData.change24h) &&
                    extendedTimestamps[basePriceKey] !== undefined &&
                    now - extendedTimestamps[basePriceKey]! <= STALE_VOLUME_WINDOW_MS
                        ? baseExtData.change24h
                        : null;

                const baseVolumeFresh =
                    extendedTimestamps[basePriceKey] !== undefined &&
                    now - extendedTimestamps[basePriceKey]! <= STALE_VOLUME_WINDOW_MS;
                const comparisonVolumeFresh =
                    extendedTimestamps[comparisonPriceKey] !== undefined &&
                    now - extendedTimestamps[comparisonPriceKey]! <= STALE_VOLUME_WINDOW_MS;

                const baseVolumeData = getVolumeDisplay(
                    baseExtData.volume24h,
                    baseCurrencyType,
                    baseVolumeFresh,
                    baseExtendedSamples
                );
                const comparisonVolumeData = getVolumeDisplay(
                    comparisonExtData.volume24h,
                    comparisonCurrencyType,
                    comparisonVolumeFresh,
                    comparisonExtendedSamples
                );

                return {
                    ...baseCoin,
                    basePrice: basePrice ?? 0,
                    comparisonPrice: comparisonPrice ?? 0,
                    priceDifference: priceDifference ?? 0,
                    priceDifferencePercentage: priceDifferencePercentage ?? 0,
                    change24h: liveChange24h ?? 0,
                    baseVolume: baseVolumeData.formatted,
                    comparisonVolume: comparisonVolumeData.formatted,
                    baseVolumeValue: baseVolumeData.numeric,
                    comparisonVolumeValue: comparisonVolumeData.numeric,
                    baseVolumeState: baseVolumeData.state,
                    comparisonVolumeState: comparisonVolumeData.state,
                    isBasePriceReady: basePrice !== null,
                    isComparisonPriceReady: comparisonPrice !== null,
                    isPriceDifferenceReady: priceDifferenceReady && priceDifferencePercentage !== null,
                    isChangeReady: liveChange24h !== null,
                } as ProcessedCoinData;
            });

        const isMetricReady = (coin: ProcessedCoinData, key: SortKey): boolean => {
            switch (key) {
                case 'basePrice':
                    return coin.isBasePriceReady;
                case 'comparisonPrice':
                    return coin.isComparisonPriceReady;
                case 'priceDifference':
                    return coin.isPriceDifferenceReady;
                case 'change24h':
                    return coin.isChangeReady;
                case 'baseVolume':
                    return coin.baseVolumeState !== 'loading';
                case 'comparisonVolume':
                    return coin.comparisonVolumeState !== 'loading';
                case 'name':
                default:
                    return true;
            }
        };

        liveData.sort((a, b) => {
            const { key, direction } = sortConfig;

            const aReady = isMetricReady(a, key);
            const bReady = isMetricReady(b, key);

            if (aReady && !bReady) {
                return -1;
            }
            if (!aReady && bReady) {
                return 1;
            }
            if (!aReady && !bReady) {
                return 0;
            }

            let aValue: string | number;
            let bValue: string | number;

            if (key === 'baseVolume') {
                aValue = a.baseVolumeValue;
                bValue = b.baseVolumeValue;
            } else if (key === 'comparisonVolume') {
                aValue = a.comparisonVolumeValue;
                bValue = b.comparisonVolumeValue;
            } else if (key === 'name') {
                aValue = a.names[i18n.language] || a.names['en'];
                bValue = b.names[i18n.language] || b.names['en'];
            } else {
                aValue = a[key as keyof ProcessedCoinData] as number;
                bValue = b[key as keyof ProcessedCoinData] as number;
            }

            const dir = direction === 'asc' ? 1 : -1;

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return aValue.localeCompare(bValue) * dir;
            }
            if (aValue < bValue) {
                return -1 * dir;
            }
            if (aValue > bValue) {
                return 1 * dir;
            }
            return 0;
        });

        return liveData;
    }, [
        allPrices,
        allExtendedData,
        selectedBase,
        selectedComparison,
        sortConfig,
        i18n.language,
        usdKrw,
        currentCurrency,
        currentTime,
        t,
        priceTimestamps,
        extendedTimestamps,
        extendedSampleCounts,
    ]);

    const visibleCoinData = useMemo(() => (
        user ? processedCoinData : processedCoinData.slice(0, COIN_DISPLAY_LIMIT)
    ), [processedCoinData, user]);
    
    return (
        <div className="bg-gray-50 dark:bg-black min-h-screen text-gray-600 dark:text-gray-300 font-sans">
            <div className="flex">
                <PremiumSidebar
                    isOpen={isSidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    user={user}
                    onLogout={logout}
                />
                {isSidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-30"></div>}
                <div className="flex-1 flex flex-col min-w-0">
                    <Header onMenuClick={() => setSidebarOpen(prev => !prev)} user={user} usdKrw={usdKrw} stats={headerStats} isMenuOpen={isSidebarOpen} />
                    <main className="p-2 sm:p-4 lg:p-6 pb-12">
                        <ReferralBanner />
                        <div className="mb-4">
                            <h1 className="text-2xl font-bold text-black dark:text-white">{t('home.title')}</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('home.subtitle')}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('home.base_exchange')}</label>
                                <CustomSelect options={translatedAllExchanges} value={selectedBase} onChange={setSelectedBase}/>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('home.comparison_exchange')}</label>
                                <CustomSelect options={translatedAllExchanges} value={selectedComparison} onChange={setSelectedComparison}/>
                            </div>
                        </div>
                        
                        <div className="relative">
                            <CryptoPriceComparisonTable
                                data={visibleCoinData}
                                onSort={handleSort}
                                sortConfig={sortConfig}
                                baseExchangeName={selectedBase.name}
                                comparisonExchangeName={selectedComparison.name}
                                currency={currentCurrency}
                            />

                            {!user && processedCoinData.length > COIN_DISPLAY_LIMIT && (
                                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-gray-50 dark:from-black via-gray-50/95 dark:via-black/95 to-transparent flex items-end justify-center pb-8">
                                    <div className="pointer-events-auto flex flex-col items-center gap-3 text-center">
                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                            {t('home.login_to_view_more')}
                                        </p>
                                        <Link
                                            to="/login"
                                            className="inline-flex items-center gap-2 rounded-lg bg-yellow-400 px-6 py-2 text-sm font-bold text-black shadow-lg shadow-yellow-400/20 transition-transform hover:scale-105 hover:bg-yellow-500"
                                        >
                                            <i className="fas fa-sign-in-alt"></i>
                                            {t('auth.login')}
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default HomePage;