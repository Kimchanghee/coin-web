import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MOCK_COIN_DATA, DOMESTIC_EXCHANGES, OVERSEAS_EXCHANGES, COIN_DISPLAY_LIMIT } from '../constants';
import type { CoinData, User } from '../types';
import { allServices } from '../components/services/exchanges';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Clock from '../components/Clock';
import ThemeToggle from '../components/ThemeToggle';

type ExchangeOption = { id: string; name: string };

type SortKey = 'name' | keyof Pick<CoinData, 'domesticPrice' | 'kimchiPremium' | 'change24h' | 'volume'>;
type SortDirection = 'asc' | 'desc';


// Custom Select Component (Controlled)
const CustomSelect: React.FC<{
    options: ExchangeOption[];
    value: ExchangeOption;
    onChange: (value: ExchangeOption) => void;
}> = ({ options, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative w-full">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-black dark:text-white">
                <span>{value.name}</span>
                <i className={`fas fa-chevron-down transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {isOpen && (
                <div className="absolute z-10 top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg">
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
                        theda
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
        navigate('/'); // Navigate to home on logout
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

// Main Table Component
const KimchiPremiumTable: React.FC<{ 
    data: CoinData[];
    onSort: (key: SortKey) => void;
    sortConfig: { key: SortKey; direction: SortDirection };
    domesticExchangeName: string;
}> = ({ data, onSort, sortConfig, domesticExchangeName }) => {
    const { t, i18n } = useTranslation();
    const formatNumber = (num: number) => num.toLocaleString('ko-KR');
    const formatPercentage = (num: number) => `${num.toFixed(2)}%`;
    const getTextColor = (num: number) => num > 0 ? 'text-green-500' : num < 0 ? 'text-red-500' : 'text-gray-800 dark:text-gray-300';

    const getSortIcon = (key: SortKey) => {
        if (sortConfig.key !== key) {
            return <i className="fas fa-sort ml-2 text-gray-400 dark:text-gray-600"></i>;
        }
        if (sortConfig.direction === 'asc') {
            return <i className="fas fa-sort-up ml-2 text-black dark:text-white"></i>;
        }
        return <i className="fas fa-sort-down ml-2 text-black dark:text-white"></i>;
    };

    const headers: { key: SortKey; labelKey: string; align: 'left' | 'right' }[] = [
        { key: 'name', labelKey: 'table.name', align: 'left' },
        { key: 'domesticPrice', labelKey: 'table.price', align: 'right' },
        { key: 'kimchiPremium', labelKey: 'table.premium', align: 'right' },
        { key: 'change24h', labelKey: 'table.change', align: 'right' },
        { key: 'volume', labelKey: 'table.volume', align: 'right' },
    ];

    return (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs text-gray-500 dark:text-gray-400 uppercase">
                        <tr>
                            {headers.map(header => (
                                <th key={header.key} scope="col" className={`px-4 py-3 text-${header.align}`} onClick={() => onSort(header.key)}>
                                    <div className={`flex items-center ${header.align === 'right' ? 'justify-end' : ''} cursor-pointer whitespace-nowrap`}>
                                        {t(header.labelKey, { exchangeName: domesticExchangeName.split(' ')[0] })}
                                        {getSortIcon(header.key)}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(coin => (
                            <tr key={coin.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50">
                                <td className="px-4 py-3 font-medium text-black dark:text-white">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">{coin.logo}</span>
                                        <div>
                                            <p>{coin.names[i18n.language] || coin.names['en']}</p>
                                            <p className="text-xs text-gray-500">{coin.symbol}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right text-gray-800 dark:text-gray-200">
                                    <p className="font-semibold">{formatNumber(coin.domesticPrice)}</p>
                                    <p className="text-xs text-gray-500">${coin.overseasPrice.toFixed(2)}</p>
                                </td>
                                <td className={`px-4 py-3 text-right font-bold ${getTextColor(coin.kimchiPremium)}`}>
                                    {formatPercentage(coin.kimchiPremium)}
                                </td>
                                <td className={`px-4 py-3 text-right font-bold ${getTextColor(coin.change24h)}`}>
                                    {formatPercentage(coin.change24h)}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-800 dark:text-gray-200">{coin.volume}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// HomePage.tsx 내의 ReferralBanner 컴포넌트 부분만 교체
// (HomePage.tsx 파일의 다른 부분은 그대로 유지)

const ReferralBanner: React.FC = () => {
    const { t } = useTranslation();
    const referralLink = "https://www.gate.com/share/DJBWKAIF";
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <a 
            href={referralLink} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="block w-full mb-8 no-underline"
        >
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-black via-slate-900 to-black p-4 md:p-6 lg:p-8 border border-cyan-500/30 shadow-2xl hover:shadow-cyan-500/20 transition-all duration-300 hover:-translate-y-1">
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
                <span className="absolute top-4 left-4 text-yellow-400 text-xl animate-pulse">✦</span>
                <span className="absolute top-8 right-8 text-yellow-400 text-xl animate-pulse" style={{animationDelay: '0.5s'}}>✦</span>
                <span className="absolute bottom-4 left-1/3 text-yellow-400 text-xl animate-pulse" style={{animationDelay: '1s'}}>✦</span>
                <span className="absolute bottom-8 right-4 text-yellow-400 text-xl animate-pulse" style={{animationDelay: '1.5s'}}>✦</span>
                
                {/* Content */}
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-4 md:gap-6 lg:gap-8">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                        <div className="w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/50 transform hover:rotate-3 transition-transform duration-300">
                            <span className="text-white font-black text-base md:text-lg lg:text-xl">GATE.IO</span>
                        </div>
                    </div>
                    
                    {/* Text Section */}
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-xl md:text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-400 to-white animate-shimmer bg-[size:200%_auto]">
                            {isMobile ? t('banner.mobile_main_title') : t('banner.pc_main_title')}
                        </h3>
                        <p className="text-sm md:text-base text-gray-400 mt-1">
                            {isMobile ? t('banner.mobile_sub_title') : t('banner.pc_sub_title')}
                        </p>
                    </div>
                    
                    {/* Discount Badge */}
                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap z-10">
                                {t('banner.up_to')}
                            </div>
                            <div className="bg-gradient-to-br from-red-500 to-orange-600 text-white font-black text-3xl md:text-4xl px-6 py-3 rounded-lg shadow-lg shadow-red-500/50 transform hover:scale-105 transition-transform duration-300">
                                50%
                            </div>
                            <div className="text-xs text-green-400 font-bold text-center mt-1 uppercase tracking-wider">
                                {t('banner.discount_text')}
                            </div>
                        </div>
                    </div>
                    
                    {/* CTA Button */}
                    <div className="flex flex-col items-center gap-2">
                        <button className="bg-gradient-to-r from-green-400 to-cyan-400 text-black font-black text-sm md:text-base px-6 md:px-8 py-2.5 md:py-3 rounded-lg shadow-lg hover:shadow-green-400/50 transition-all duration-300 hover:scale-105 uppercase tracking-wider whitespace-nowrap">
                            {isMobile ? t('banner.cta_mobile') : t('banner.cta_pc')}
                        </button>
                        <span className="text-xs text-yellow-400 font-bold animate-pulse">
                            {isMobile ? t('banner.bonus_mobile') : t('banner.bonus_pc')}
                        </span>
                    </div>
                </div>
            </div>
            
            {/* FIX: The 'jsx' prop on the <style> tag is a Next.js feature. This is a regular React app, so it's not supported. Removed 'jsx' prop. */}
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
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'volume', direction: 'desc' });
    const { user } = useAuth();
    const { t, i18n } = useTranslation();
    const [usdKrw, setUsdKrw] = useState(1385);

    useEffect(() => {
        const interval = setInterval(() => {
            setUsdKrw(prev => prev + (Math.random() - 0.5) * 0.5);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    const translatedDomesticExchanges = useMemo(() => 
        DOMESTIC_EXCHANGES.map(ex => ({ id: ex.id, name: t(ex.nameKey) })),
        [t]
    );

    const translatedOverseasExchanges = useMemo(() => 
        OVERSEAS_EXCHANGES.map(ex => ({ id: ex.id, name: t(ex.nameKey) })),
        [t]
    );

    const [selectedDomestic, setSelectedDomestic] = useState<ExchangeOption>(translatedDomesticExchanges[0]);
    const [selectedOverseas, setSelectedOverseas] = useState<ExchangeOption>(translatedOverseasExchanges[0]);

    useEffect(() => {
        setSelectedDomestic(current => {
            const match = translatedDomesticExchanges.find(ex => ex.id === current.id);
            return match || translatedDomesticExchanges[0];
        });
        setSelectedOverseas(current => {
            const match = translatedOverseasExchanges.find(ex => ex.id === current.id);
            return match || translatedOverseasExchanges[0];
        });
    }, [i18n.language, translatedDomesticExchanges, translatedOverseasExchanges]);

    useEffect(() => {
        const handlePriceUpdate = (update: { priceKey: string; price: number }) => {
            setAllPrices(prev => ({ ...prev, [update.priceKey]: update.price }));
        };

        allServices.forEach(service => service.connect(handlePriceUpdate));

        return () => {
            allServices.forEach(service => service.disconnect());
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
        
        const formatVolume = (volumeNum: number): string => {
            if (volumeNum >= 1000000000000) {
                return `${(volumeNum / 1000000000000).toFixed(2)}조`;
            }
            if (volumeNum >= 100000000) {
                return `${(volumeNum / 100000000).toLocaleString('ko-KR', {maximumFractionDigits: 0})}억`;
            }
            return volumeNum.toLocaleString('ko-KR');
        };

        const liveData = MOCK_COIN_DATA.map(baseCoin => {
            const domesticPriceKey = `${selectedDomestic.id}-${baseCoin.symbol}`;
            const overseasPriceKey = `${selectedOverseas.id}-${baseCoin.symbol}`;

            const domesticPrice = allPrices[domesticPriceKey] || baseCoin.domesticPrice;
            const overseasPrice = allPrices[overseasPriceKey] || baseCoin.overseasPrice;
            
            const overseasPriceInKrw = overseasPrice * usdKrw;
            const kimchiPremium = overseasPriceInKrw > 0 
                ? ((domesticPrice - overseasPriceInKrw) / overseasPriceInKrw) * 100
                : 0;

            const change24h = baseCoin.change24h + (Math.random() - 0.5) * 0.2;
            const baseVolume = parseVolume(baseCoin.volume);
            const liveVolume = baseVolume * (1 + (Math.random() - 0.5) * 0.05);

            return {
                ...baseCoin,
                domesticPrice,
                overseasPrice,
                kimchiPremium,
                change24h,
                volume: formatVolume(liveVolume),
            };
        });

        liveData.sort((a, b) => {
            const { key, direction } = sortConfig;
            let aValue: string | number;
            let bValue: string | number;

            if (key === 'volume') {
                aValue = parseVolume(a.volume);
                bValue = parseVolume(b.volume);
            } else if (key === 'name') {
                aValue = a.names[i18n.language] || a.names['en'];
                bValue = b.names[i18n.language] || b.names['en'];
            } else {
                aValue = a[key] as number;
                bValue = b[key] as number;
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
    }, [allPrices, selectedDomestic, selectedOverseas, sortConfig, i18n.language, usdKrw]);


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
                                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('home.domestic_exchange')}</label>
                                <CustomSelect options={translatedDomesticExchanges} value={selectedDomestic} onChange={setSelectedDomestic}/>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('home.overseas_exchange')}</label>
                                <CustomSelect options={translatedOverseasExchanges} value={selectedOverseas} onChange={setSelectedOverseas}/>
                            </div>
                        </div>
                        
                        <div className="relative">
                            <KimchiPremiumTable 
                                data={processedCoinData.slice(0, COIN_DISPLAY_LIMIT)} 
                                onSort={handleSort}
                                sortConfig={sortConfig}
                                domesticExchangeName={selectedDomestic.name}
                            />
                            
                            {processedCoinData.length > COIN_DISPLAY_LIMIT && (
                                <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-gray-50 dark:from-black via-gray-50/90 dark:via-black/90 to-transparent flex justify-center items-end pb-8">
                                    <Link 
                                        to="/subscribe"
                                        className="bg-yellow-400 text-black font-bold px-8 py-3 rounded-lg hover:bg-yellow-500 transition-colors shadow-lg shadow-yellow-400/20 transform hover:scale-105"
                                    >
                                        <i className="fas fa-unlock-alt mr-2"></i>
                                        {t('home.unlock_button')}
                                    </Link>
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