import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MOCK_COIN_DATA, ALL_EXCHANGES_FOR_COMPARISON, COIN_DISPLAY_LIMIT, CURRENCY_RATES, LANGUAGE_CURRENCY_MAP } from '../constants';
import type { CoinData, User, ExtendedPriceUpdate } from '../types';
import { allServices } from '../components/services/exchanges';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Clock from '../components/Clock';
import ThemeToggle from '../components/ThemeToggle';

type ExchangeOption = { id: string; name: string };
type CurrencyCode = 'KRW' | 'USD' | 'JPY' | 'CNY' | 'THB' | 'VND';

type SortKey = 'name' | 'basePrice' | 'comparisonPrice' | 'priceDifference' | 'change24h' | 'baseVolume' | 'comparisonVolume';
type SortDirection = 'asc' | 'desc';

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

// Custom Select Component (Fixed with outside click)
const CustomSelect: React.FC<{
    options: ExchangeOption[];
    value: ExchangeOption;
    onChange: (value: ExchangeOption) => void;
}> = ({ options, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // 드롭다운 바깥 클릭 시 닫기
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
const Header: React.FC<{ onMenuClick: () => void; user: User | null, usdKrw: number }> = ({ onMenuClick, user, usdKrw }) => {
    const { t } = useTranslation();
    const [liveHeaderStats, setLiveHeaderStats] = useState({
        tetherPremium: 0.90,
        coinbasePremium: 0.01,
    });

    useEffect(() => {
        const interval = setInterval(() => {
            setLiveHeaderStats(prev => ({
                tetherPremium: prev.tetherPremium + (Math.random() - 0.5) * 0.02,
                coinbasePremium: prev.coinbasePremium + (Math.random() - 0.5) * 0.005,
            }));
        }, 2500);
        return () => clearInterval(interval);
    }, []);

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
                        <p className="font-bold text-green-500">{liveHeaderStats.tetherPremium.toFixed(2)}%</p>
                    </div>
                    <div className="text-center">
                        <p className="text-gray-500 dark:text-gray-400">{t('header.coinbase_premium')}</p>
                        <p className="font-bold text-green-500">{liveHeaderStats.coinbasePremium.toFixed(2)}%</p>
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

// Sidebar Component
const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const handleLogout = () => {
        logout();
        navigate('/');
    }

    const menuItems = [
        { key: 'premium', icon: 'fa-star' },
        { key: 'arbitrage', icon: 'fa-chart-pie' },
        { key: 'live_status', icon: 'fa-fire' },
        { key: 'exchange_rate', icon: 'fa-exchange-alt' },
        { key: 'payback', icon: 'fa-gift' },
        { key: 'guide', icon: 'fa-book' },
    ];
    return (
        <>
            <aside className={`fixed z-40 inset-y-0 left-0 bg-gray-50 dark:bg-[#111111] w-64 p-4 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:w-56 border-r border-gray-200 dark:border-gray-800 flex-shrink-0 flex flex-col`}>
                <nav className="flex flex-col flex-grow">
                    <div className="mb-8">
                         <h2 className="text-lg font-semibold text-black dark:text-white">{t('sidebar.premium_header')}</h2>
                    </div>
                    <ul className="space-y-4">
                        {menuItems.map(item => (
                             <li key={item.key}>
                                <a href="#" className={`flex items-center gap-3 p-2 rounded-md transition-colors ${item.key === 'premium' ? 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                                    <i className={`fas ${item.icon} w-5`}></i>
                                    <span>{t(`sidebar.${item.key}`)}</span>
                                </a>
                            </li>
                        ))}
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

// Bottom Navigation Component
const BottomNav: React.FC = () => {
    const { t } = useTranslation();
    const location = useLocation();
     const navItems = [
        { key: 'gimp', icon: 'fa-star', path: '/' },
        { key: 'exchange_announcements', icon: 'fa-bullhorn', path: '/announcements' },
        { key: 'trends', icon: 'fa-fire', path: '#' },
        { key: 'payback', icon: 'fa-gift', path: '#' },
        { key: 'search', icon: 'fa-search', path: '#' },
    ];
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#161616] border-t border-gray-200 dark:border-gray-800 flex justify-around p-2 lg:hidden z-20">
            {navItems.map(item => (
                 <Link
                    to={item.path}
                    key={item.key}
                    className={`flex flex-col items-center gap-1 w-16 text-xs transition-colors ${
                        location.pathname === item.path
                        ? 'text-yellow-400'
                        : 'text-gray-500 hover:text-black dark:hover:text-white'
                    }`}
                >
                    <i className={`fas ${item.icon} text-lg`}></i>
                    <span>{t(`bottom_nav.${item.key}`)}</span>
                </Link>
            ))}
        </nav>
    );
};

// Enhanced CoinData type for processed data
interface ProcessedCoinData extends CoinData {
    basePrice: number;
    comparisonPrice: number;
    priceDifference: number;
    priceDifferencePercentage: number;
    baseVolume: string;
    comparisonVolume: string;
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
                            {/* 코인 정보 */}
                            <th scope="col" className="px-1 sm:px-4 py-3 text-left sticky left-0 bg-gray-50 dark:bg-gray-900/50 z-10" onClick={() => onSort('name')}>
                                <div className="flex items-center cursor-pointer whitespace-nowrap">
                                    {t('table.name')}
                                    {getSortIcon('name')}
                                </div>
                            </th>
                            
                            {/* 가격 섹션 */}
                            <th scope="col" className="px-1 sm:px-3 py-3 text-center border-l border-gray-200 dark:border-gray-700" colSpan={2}>
                                <div className="text-gray-600 dark:text-gray-300 font-semibold">{t('table.current_price')}</div>
                            </th>
                            
                            {/* 가격 차이 */}
                            <th scope="col" className="px-1 sm:px-4 py-3 text-right border-l border-gray-200 dark:border-gray-700" onClick={() => onSort('priceDifference')}>
                                <div className="flex items-center justify-end cursor-pointer whitespace-nowrap">
                                    {t('table.price_difference')}
                                    {getSortIcon('priceDifference')}
                                </div>
                            </th>
                            
                            {/* 전일대비 */}
                            <th scope="col" className="px-1 sm:px-4 py-3 text-right border-l border-gray-200 dark:border-gray-700" onClick={() => onSort('change24h')}>
                                <div className="flex items-center justify-end cursor-pointer whitespace-nowrap">
                                    {t('table.daily_change')}
                                    {getSortIcon('change24h')}
                                </div>
                            </th>
                            
                            {/* 거래대금 섹션 */}
                            <th scope="col" className="px-1 sm:px-3 py-3 text-center border-l border-gray-200 dark:border-gray-700" colSpan={2}>
                                <div className="text-gray-600 dark:text-gray-300 font-semibold">{t('table.trading_volume_24h')}</div>
                            </th>
                        </tr>
                        <tr className="border-t border-gray-200 dark:border-gray-700">
                            <th className="sticky left-0 bg-gray-50 dark:bg-gray-900/50"></th>
                            {/* 가격 서브헤더 */}
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
                            {/* 거래대금 서브헤더 */}
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
                                {/* 코인 정보 */}
                                <td className="px-1 sm:px-4 py-3 font-medium text-black dark:text-white sticky left-0 bg-white dark:bg-[#1a1a1a]">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <span className="text-lg">{coin.logo}</span>
                                        <div>
                                            <p className="font-semibold text-sm sm:text-base">{coin.names[i18n.language] || coin.names['en']}</p>
                                            <p className="text-xs text-gray-500">{coin.symbol}</p>
                                        </div>
                                    </div>
                                </td>
                                
                                {/* 기준 가격 */}
                                <td className="px-1 sm:px-3 py-3 text-right text-gray-800 dark:text-gray-200 border-l border-gray-200 dark:border-gray-700">
                                    <p className="font-semibold text-xs sm:text-base">{formatCurrency(coin.basePrice, currency)}</p>
                                </td>
                                
                                {/* 비교 가격 */}
                                <td className="px-1 sm:px-3 py-3 text-right text-gray-800 dark:text-gray-200">
                                    <p className="font-semibold text-xs sm:text-base">{formatCurrency(coin.comparisonPrice, currency)}</p>
                                </td>
                                
                                {/* 가격 차이 */}
                                <td className={`px-1 sm:px-4 py-3 text-right font-bold border-l border-gray-200 dark:border-gray-700 ${getTextColor(coin.priceDifferencePercentage)}`}>
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs sm:text-base">{formatPercentage(coin.priceDifferencePercentage)}</span>
                                        <span className="text-[10px] sm:text-xs mt-0.5 text-gray-500">
                                            {coin.priceDifference > 0 ? '+' : ''}{formatCurrency(coin.priceDifference, currency)}
                                        </span>
                                    </div>
                                </td>
                                
                                {/* 전일대비 */}
                                <td className={`px-1 sm:px-4 py-3 text-right font-bold border-l border-gray-200 dark:border-gray-700 ${getTextColor(coin.change24h)}`}>
                                    <span className="text-xs sm:text-base">{formatPercentage(coin.change24h)}</span>
                                </td>
                                
                                {/* 기준 거래대금 */}
                                <td className="px-1 sm:px-3 py-3 text-right text-gray-800 dark:text-gray-200 border-l border-gray-200 dark:border-gray-700">
                                    <p className="font-medium text-xs sm:text-sm">{coin.baseVolume}</p>
                                    <p className="text-[10px] text-gray-500">{CURRENCY_RATES[currency]?.name || 'KRW'}</p>
                                </td>
                                
                                {/* 비교 거래대금 */}
                                <td className="px-1 sm:px-3 py-3 text-right text-gray-800 dark:text-gray-200">
                                    <p className="font-medium text-xs sm:text-sm">{coin.comparisonVolume}</p>
                                    <p className="text-[10px] text-gray-500">{CURRENCY_RATES[currency]?.name || 'KRW'}</p>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* 리스트된 코인 수 표시 */}
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
                {/* Animated background grid */}
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div 
                        className="absolute inset-0 bg-[size:40px_40px] animate-slide"
                        style={{
                            backgroundImage: `linear-gradient(to right, rgba(8, 145, 178, 0.2) 1px, transparent 1px), 
                                            linear-gradient(to bottom, rgba(8, 145, 178, 0.2) 1px, transparent 1px)`
                        }}
                    />
                </div>
                
                {/* Sparkles */}
                <span className="absolute top-4 left-4 text-yellow-400 text-lg md:text-xl animate-pulse">✦</span>
                <span className="absolute top-8 right-8 text-yellow-400 text-lg md:text-xl animate-pulse" style={{animationDelay: '0.5s'}}>✦</span>
                <span className="absolute bottom-4 left-1/3 text-yellow-400 text-lg md:text-xl animate-pulse" style={{animationDelay: '1s'}}>✦</span>
                <span className="absolute bottom-8 right-4 text-yellow-400 text-lg md:text-xl animate-pulse" style={{animationDelay: '1.5s'}}>✦</span>
                
                {/* Content */}
                <div className="relative z-10 flex flex-row items-center justify-between gap-2 md:gap-6 lg:gap-8">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                        <div className="w-14 h-14 md:w-24 md:h-24 lg:w-28 lg:h-28 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/50 transform hover:rotate-3 transition-transform duration-300">
                            <span className="text-white font-black text-sm md:text-lg lg:text-xl">GATE.IO</span>
                        </div>
                    </div>
                    
                    {/* Text Section */}
                    <div className="flex-1 text-center md:text-left min-w-0">
                        <h3 className="text-base md:text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-400 to-white animate-shimmer bg-[size:200%_auto] truncate">
                            <span className="md:hidden">{t('banner.mobile_main_title')}</span>
                            <span className="hidden md:block">{t('banner.pc_main_title')}</span>
                        </h3>
                        <p className="text-xs text-gray-400 mt-1 hidden md:block">
                            {t('banner.pc_sub_title')}
                        </p>
                    </div>
                    
                    {/* Discount Badge */}
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
                    
                    {/* CTA Button */}
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
    const [allPrices, setAllPrices] = useState<Record<string, number>>({});
    const [allExtendedData, setAllExtendedData] = useState<Record<string, { change24h?: number; volume24h?: number; changePrice?: number }>>({});
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'baseVolume', direction: 'desc' });
    const { user } = useAuth();
    const { t, i18n } = useTranslation();
    const [usdKrw, setUsdKrw] = useState(1385);

    // Buffer for incoming data to throttle UI updates
    const updatesBuffer = useRef<{
        prices: Record<string, number>;
        extended: Record<string, { change24h?: number; volume24h?: number; changePrice?: number }>;
    }>({ prices: {}, extended: {} });

    // Get current currency based on language
    const currentCurrency: CurrencyCode = (LANGUAGE_CURRENCY_MAP as any)[i18n.language] || 'USD';

    useEffect(() => {
        const interval = setInterval(() => {
            setUsdKrw(prev => prev + (Math.random() - 0.5) * 0.5);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    const translatedAllExchanges = useMemo(() => 
        ALL_EXCHANGES_FOR_COMPARISON.map(ex => ({ id: ex.id, name: t(ex.nameKey) })),
        [t]
    );

    const [selectedBase, setSelectedBase] = useState<ExchangeOption>(translatedAllExchanges[0]);
    const [selectedComparison, setSelectedComparison] = useState<ExchangeOption>(translatedAllExchanges[1]);

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

useEffect(() => {
    console.log('🔧 Starting exchange services...');

    // Collects all incoming updates into a buffer.
    const handleUpdate = (update: ExtendedPriceUpdate) => {
        console.log('📊 Price update received:', update);

        if (typeof update.price === 'number' && !Number.isNaN(update.price)) {
            updatesBuffer.current.prices[update.priceKey] = update.price;
        }

        const hasExtendedFields =
            update.change24h !== undefined ||
            update.volume24h !== undefined ||
            update.changePrice !== undefined;

        if (hasExtendedFields) {
            console.log('📈 Extended data received:', {
                priceKey: update.priceKey,
                change24h: update.change24h,
                volume24h: update.volume24h,
                changePrice: update.changePrice
            });

            const nextExtended: { change24h?: number; volume24h?: number; changePrice?: number } = {};

            if (update.change24h !== undefined && !Number.isNaN(update.change24h)) {
                nextExtended.change24h = update.change24h;
            }
            if (update.volume24h !== undefined && !Number.isNaN(update.volume24h)) {
                nextExtended.volume24h = update.volume24h;
            }
            if (update.changePrice !== undefined && !Number.isNaN(update.changePrice)) {
                nextExtended.changePrice = update.changePrice;
            }

            if (Object.keys(nextExtended).length > 0) {
                updatesBuffer.current.extended[update.priceKey] = nextExtended;
            }
        }
    };

    // 각 서비스별로 확장 데이터 지원 여부 확인하고 연결
    allServices.forEach(service => {
        console.log(`🏢 Connecting service: ${service.id}`);
        
        const extService = service as any;
        if (extService.connectExtended && typeof extService.connectExtended === 'function') {
            console.log(`✅ Using extended connection for: ${service.id}`);
            extService.connectExtended(handleUpdate);
        } else {
            console.log(`⚠️ Using basic connection for: ${service.id} (no extended data)`);
            service.connect(handleUpdate);
        }
    });

    // Applies the buffered updates to the state every 1 second.
    const intervalId = setInterval(() => {
        const priceUpdates = Object.keys(updatesBuffer.current.prices).length;
        const extendedUpdates = Object.keys(updatesBuffer.current.extended).length;
        
        if (priceUpdates > 0 || extendedUpdates > 0) {
            console.log(`🔄 Applying ${priceUpdates} price updates, ${extendedUpdates} extended updates`);
            const bufferedPrices = updatesBuffer.current.prices;
            const bufferedExtended = updatesBuffer.current.extended;

            setAllPrices(prev => ({ ...prev, ...bufferedPrices }));
            setAllExtendedData(prev => {
                const next = { ...prev };
                Object.entries(bufferedExtended).forEach(([key, data]) => {
                    next[key] = { ...next[key], ...data };
                });
                return next;
            });

            updatesBuffer.current = { prices: {}, extended: {} };
        }
    }, 1000);

    return () => {
        console.log('🛑 Disconnecting all services');
        allServices.forEach(service => service.disconnect());
        clearInterval(intervalId);
    };
}, []);

    const handleSort = (key: SortKey) => {
        let direction: SortDirection = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const processedCoinData = useMemo(() => {
        const noVolumeLabel = t('table.no_data');

        const parseVolume = (volumeStr: string): number => {
            const valueStr = String(volumeStr).replace(/,/g, '');
            let multiplier = 1;
            if (valueStr.includes('조') || valueStr.includes('T')) {
                multiplier = 1000000000000;
            } else if (valueStr.includes('억') || valueStr.includes('B')) {
                multiplier = 100000000;
            }
            const num = parseFloat(valueStr);
            return isNaN(num) ? 0 : num * multiplier;
        };
        
        console.log('🔄 Processing coin data...');
        console.log('📊 Current prices:', Object.keys(allPrices).length);
        console.log('📈 Extended data:', Object.keys(allExtendedData).length);
        
        const liveData = MOCK_COIN_DATA
            .map(baseCoin => {
                const basePriceKey = `${selectedBase.id}-${baseCoin.symbol}`;
                const comparisonPriceKey = `${selectedComparison.id}-${baseCoin.symbol}`;

                // 실제 가격 데이터 확인
                const rawBasePrice = allPrices[basePriceKey];
                const rawComparisonPrice = allPrices[comparisonPriceKey];
                
                // 확장 데이터 가져오기 (디버깅 정보 포함)
                const baseExtData = allExtendedData[basePriceKey] || {};
                const comparisonExtData = allExtendedData[comparisonPriceKey] || {};
                
                console.log(`💰 ${baseCoin.symbol}:`, {
                    basePrice: rawBasePrice,
                    comparisonPrice: rawComparisonPrice,
                    baseExtData,
                    comparisonExtData
                });
                
                // 두 거래소 모두에서 실제 가격 데이터가 없는 경우 null 반환 (필터링됨)
                if (rawBasePrice === undefined && rawComparisonPrice === undefined) {
                    return null;
                }
                
                // 한쪽 거래소에만 데이터가 있는 경우도 null 반환 (필터링됨)
                if (rawBasePrice === undefined || rawComparisonPrice === undefined) {
                    return null;
                }

                // 가격이 0이거나 음수인 경우도 제외
                if (rawBasePrice <= 0 || rawComparisonPrice <= 0) {
                    return null;
                }
                
                // 두 거래소 모두에 유효한 데이터가 있는 경우만 처리
                const baseCurrencyType = selectedBase.id.includes('krw') ? 'KRW' : 'USD';
                const comparisonCurrencyType = selectedComparison.id.includes('krw') ? 'KRW' : 'USD';
                
                const basePrice = convertCurrency(rawBasePrice, baseCurrencyType, currentCurrency, usdKrw);
                const comparisonPrice = convertCurrency(rawComparisonPrice, comparisonCurrencyType, currentCurrency, usdKrw);
                
                // Calculate price difference
                const priceDifference = basePrice - comparisonPrice;
                const priceDifferencePercentage = comparisonPrice > 0 
                    ? (priceDifference / comparisonPrice) * 100
                    : 0;
                
                // ✅ 전일대비는 항상 기준 거래소 기준으로 사용
                let change24h = 0;
                if (baseExtData.change24h !== undefined) {
                    change24h = baseExtData.change24h;
                    console.log(`📈 Using real change24h for ${baseCoin.symbol}: ${change24h}%`);
                } else {
                    // 실시간 데이터가 없으면 Mock 데이터 + 약간의 변동
                    change24h = baseCoin.change24h + (Math.random() - 0.5) * 0.2;
                    console.log(`🎲 Using simulated change24h for ${baseCoin.symbol}: ${change24h}%`);
                }
                
                // 거래대금 계산 - 실시간 데이터만 사용
                const baseVolumeValue = baseExtData.volume24h;
                const comparisonVolumeValue = comparisonExtData.volume24h;

                const baseVolume = (typeof baseVolumeValue === 'number' && baseVolumeValue > 0)
                    ? formatVolume(convertCurrency(baseVolumeValue, baseCurrencyType, currentCurrency, usdKrw), currentCurrency, t)
                    : noVolumeLabel;

                const comparisonVolume = (typeof comparisonVolumeValue === 'number' && comparisonVolumeValue > 0)
                    ? formatVolume(convertCurrency(comparisonVolumeValue, comparisonCurrencyType, currentCurrency, usdKrw), currentCurrency, t)
                    : noVolumeLabel;

                return {
                    ...baseCoin,
                    basePrice,
                    comparisonPrice,
                    priceDifference,
                    priceDifferencePercentage,
                    change24h, // 기준 거래소 기준 전일대비
                    baseVolume,
                    comparisonVolume,
                    // Legacy compatibility
                    domesticPrice: basePrice,
                    overseasPrice: comparisonPrice,
                    kimchiPremium: priceDifferencePercentage,
                    volume: baseVolume,
                    domesticVolume: baseVolume,
                    overseasVolume: comparisonVolume,
                } as ProcessedCoinData;
            })
            .filter((coin): coin is ProcessedCoinData => coin !== null); // null 값들을 필터링

        console.log(`✅ Processed ${liveData.length} coins`);

        // 정렬 로직
        liveData.sort((a, b) => {
            const { key, direction } = sortConfig;
            let aValue: string | number;
            let bValue: string | number;

            if (key === 'baseVolume') {
                aValue = parseVolume(a.baseVolume);
                bValue = parseVolume(b.baseVolume);
            } else if (key === 'comparisonVolume') {
                aValue = parseVolume(a.comparisonVolume);
                bValue = parseVolume(b.comparisonVolume);
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
    }, [allPrices, allExtendedData, selectedBase, selectedComparison, sortConfig, i18n.language, usdKrw, currentCurrency, t]);

    const visibleCoinData = useMemo(() => (
        user ? processedCoinData : processedCoinData.slice(0, COIN_DISPLAY_LIMIT)
    ), [processedCoinData, user]);
    return (
        <div className="bg-gray-50 dark:bg-black min-h-screen text-gray-600 dark:text-gray-300 font-sans">
            <div className="flex">
                <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
                <div className="flex-1 flex flex-col min-w-0">
                    <Header onMenuClick={() => setSidebarOpen(true)} user={user} usdKrw={usdKrw} />
                    <main className="p-2 sm:p-4 lg:p-6 pb-20 lg:pb-6">
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
            <BottomNav />
        </div>
    );
};

export default HomePage;