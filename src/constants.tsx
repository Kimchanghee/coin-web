import React from 'react';
import type { TranslationFunction } from './i18n';
import type { Exchange, CoinMetadata, CoinId } from './types';

export const EXCHANGES: Exchange[] = [
  { id: 'upbit', name: 'Upbit', color: 'border-t-blue-500', icon: <i className="fa-solid fa-cloud text-blue-500"></i> },
  { id: 'bithumb', name: 'Bithumb', color: 'border-t-orange-500', icon: <i className="fa-solid fa-bold text-orange-500"></i> },
  { id: 'coinone', name: 'Coinone', color: 'border-t-green-500', icon: <i className="fa-solid fa-coins text-green-500"></i> },
  { id: 'binance', name: 'Binance', color: 'border-t-yellow-400', icon: <i className="fa-brands fa-bitcoin text-yellow-400"></i> },
  { id: 'bybit', name: 'Bybit', color: 'border-t-purple-500', icon: <i className="fa-solid fa-rocket text-purple-500"></i> },
  { id: 'okx', name: 'OKX', color: 'border-t-red-500', icon: <i className="fa-solid fa-key text-red-500"></i> },
  { id: 'gateio', name: 'Gate.io', color: 'border-t-cyan-500', icon: <i className="fa-solid fa-door-open text-cyan-500"></i> },
];

export const TRACKED_COINS: CoinId[] = ['BTC', 'ETH', 'SOL'];

export const COIN_DISPLAY_LIMIT = 30;

export type ExchangeNavKey =
  | 'price_comparison'
  | 'funding_info'
  | 'airdrop_info'
  | 'tradingview_auto'
  | 'listing_info'
  | 'announcements';

export type ExchangeNavItem = {
  key: ExchangeNavKey;
  icon: string;
  path?: string;
};

export const EXCHANGE_NAV_ITEMS: ExchangeNavItem[] = [
  { key: 'price_comparison', icon: 'fa-chart-line', path: '/' },
  { key: 'funding_info', icon: 'fa-percent', path: '/funding' },
  { key: 'airdrop_info', icon: 'fa-gift', path: '/airdrop' },
  { key: 'tradingview_auto', icon: 'fa-robot', path: '/tradingview-auto' },
  { key: 'listing_info', icon: 'fa-bullhorn', path: '/listing-info' },
  { key: 'announcements', icon: 'fa-bell', path: '/announcements' },
];

export const EXCHANGE_NAV_TRANSLATIONS: Record<ExchangeNavKey, { primary: string; fallback: string }> = {
  price_comparison: {
    primary: 'bottom_nav.price_comparison',
    fallback: 'sidebar.price_comparison'
  },
  funding_info: {
    primary: 'bottom_nav.funding_info',
    fallback: 'sidebar.funding_info'
  },
  airdrop_info: {
    primary: 'bottom_nav.airdrop_info',
    fallback: 'sidebar.airdrop_info'
  },
  tradingview_auto: {
    primary: 'bottom_nav.tradingview_auto',
    fallback: 'sidebar.tradingview_auto'
  },
  listing_info: {
    primary: 'bottom_nav.listing_info',
    fallback: 'sidebar.listing_info'
  },
  announcements: {
    primary: 'bottom_nav.announcements',
    fallback: 'sidebar.announcements'
  }
};

export const resolveExchangeNavLabel = (t: TranslationFunction, key: ExchangeNavKey) => {
  const translationKeys = EXCHANGE_NAV_TRANSLATIONS[key];
  return t(translationKeys.primary, {
    defaultValue: t(translationKeys.fallback)
  });
};

// 모든 거래소를 하나로 합친 리스트 (기준거래소용)
export const ALL_EXCHANGES_FOR_COMPARISON = [
    { id: 'upbit_krw', nameKey: 'exchanges.upbit_krw' },
    { id: 'bithumb_krw', nameKey: 'exchanges.bithumb_krw' },
    { id: 'coinone_krw', nameKey: 'exchanges.coinone_krw' },
    { id: 'binance_usdt_spot', nameKey: 'exchanges.binance_usdt_spot' },
    { id: 'binance_usdt_futures', nameKey: 'exchanges.binance_usdt_futures' },
    { id: 'bitget_usdt_spot', nameKey: 'exchanges.bitget_usdt_spot' },
    { id: 'bitget_usdt_futures', nameKey: 'exchanges.bitget_usdt_futures' },
    { id: 'bybit_usdt_spot', nameKey: 'exchanges.bybit_usdt_spot' },
    { id: 'bybit_usdt_futures', nameKey: 'exchanges.bybit_usdt_futures' },
    { id: 'okx_usdt_spot', nameKey: 'exchanges.okx_usdt_spot' },
    { id: 'okx_usdt_futures', nameKey: 'exchanges.okx_usdt_futures' },
    { id: 'gateio_usdt_spot', nameKey: 'exchanges.gateio_usdt_spot' },
    { id: 'gateio_usdt_futures', nameKey: 'exchanges.gateio_usdt_futures' },
];

// 화폐별 환율 정보
export const CURRENCY_RATES = {
    KRW: { symbol: '₩', rate: 1, name: 'Korean Won' },
    USD: { symbol: '$', rate: 1/1385, name: 'US Dollar' },
    JPY: { symbol: '¥', rate: 1/9.5, name: 'Japanese Yen' },
    CNY: { symbol: '¥', rate: 1/195, name: 'Chinese Yuan' },
    THB: { symbol: '฿', rate: 1/38, name: 'Thai Baht' },
    VND: { symbol: '₫', rate: 33.2, name: 'Vietnamese Dong' }
};

// 언어별 기본 화폐
export const LANGUAGE_CURRENCY_MAP = {
    ko: 'KRW',
    en: 'USD', 
    ja: 'JPY',
    zh: 'CNY',
    th: 'THB',
    vi: 'VND'
};

export const DOMESTIC_EXCHANGES = [
    { id: 'upbit_krw', nameKey: 'exchanges.upbit_krw' },
    { id: 'bithumb_krw', nameKey: 'exchanges.bithumb_krw' },
    { id: 'coinone_krw', nameKey: 'exchanges.coinone_krw' },
];

export const OVERSEAS_EXCHANGES = [
    { id: 'binance_usdt_spot', nameKey: 'exchanges.binance_usdt_spot' },
    { id: 'binance_usdt_futures', nameKey: 'exchanges.binance_usdt_futures' },
    { id: 'bitget_usdt_spot', nameKey: 'exchanges.bitget_usdt_spot' },
    { id: 'bitget_usdt_futures', nameKey: 'exchanges.bitget_usdt_futures' },
    { id: 'bybit_usdt_spot', nameKey: 'exchanges.bybit_usdt_spot' },
    { id: 'bybit_usdt_futures', nameKey: 'exchanges.bybit_usdt_futures' },
    { id: 'okx_usdt_spot', nameKey: 'exchanges.okx_usdt_spot' },
    { id: 'okx_usdt_futures', nameKey: 'exchanges.okx_usdt_futures' },
    { id: 'gateio_usdt_spot', nameKey: 'exchanges.gateio_usdt_spot' },
    { id: 'gateio_usdt_futures', nameKey: 'exchanges.gateio_usdt_futures' },
];

export const COIN_METADATA: CoinMetadata[] = [
  { id: 'btc', names: { en: 'Bitcoin', ko: '비트코인', ja: 'ビットコイン', zh: '比特币', th: 'บิตคอยน์', vi: 'Bitcoin' }, symbol: 'BTC', logo: <i className="fa-brands fa-bitcoin text-yellow-500"></i> },
  { id: 'eth', names: { en: 'Ethereum', ko: '이더리움', ja: 'イーサリアム', zh: '以太坊', th: 'อีเธอเรียม', vi: 'Ethereum' }, symbol: 'ETH', logo: <i className="fa-brands fa-ethereum text-indigo-400"></i> },
  { id: 'sol', names: { en: 'Solana', ko: '솔라나', ja: 'ソラナ', zh: '索拉纳', th: 'โซลานา', vi: 'Solana' }, symbol: 'SOL', logo: <i className="fa-solid fa-s text-purple-400"></i> },
  { id: 'xrp', names: { en: 'XRP', ko: '리플', ja: 'リップル', zh: '瑞波币', th: 'ริปเปิล', vi: 'XRP' }, symbol: 'XRP', logo: <i className="fa-solid fa-x text-gray-400"></i> },
  { id: 'usdt', names: { en: 'Tether', ko: '테더', ja: 'テザー', zh: '泰达币', th: 'เทเทอร์', vi: 'Tether' }, symbol: 'USDT', logo: <i className="fa-solid fa-t text-teal-400"></i> },
  { id: 'ada', names: { en: 'Cardano', ko: '에이다', ja: 'カルダノ', zh: '卡尔达诺', th: 'คาร์ดาโน', vi: 'Cardano' }, symbol: 'ADA', logo: <i className="fa-solid fa-a text-cyan-400"></i> },
  { id: 'doge', names: { en: 'Dogecoin', ko: '도지코인', ja: 'ドージコイン', zh: '狗狗币', th: 'โดชคอยน์', vi: 'Dogecoin' }, symbol: 'DOGE', logo: <i className="fa-solid fa-dog text-yellow-300"></i> },
  { id: 'link', names: { en: 'Chainlink', ko: '체인링크', ja: 'チェーンリンク', zh: 'Chainlink', th: 'เชนลิงก์', vi: 'Chainlink' }, symbol: 'LINK', logo: <i className="fa-solid fa-link text-blue-600"></i> },
  { id: 'matic', names: { en: 'Polygon', ko: '폴리곤', ja: 'ポリゴン', zh: '多边形', th: 'โพลีกอน', vi: 'Polygon' }, symbol: 'MATIC', logo: <i className="fa-solid fa-m text-purple-600"></i> },
  { id: 'dot', names: { en: 'Polkadot', ko: '폴카닷', ja: 'ポルカドット', zh: '波卡', th: 'พอลคาดอท', vi: 'Polkadot' }, symbol: 'DOT', logo: <i className="fa-solid fa-d text-pink-500"></i> },
  { id: 'avax', names: { en: 'Avalanche', ko: '아발란체', ja: 'アバランチ', zh: '雪崩', th: 'อวาแลนช์', vi: 'Avalanche' }, symbol: 'AVAX', logo: <i className="fa-solid fa-snowflake text-red-500"></i> },
  { id: 'shib', names: { en: 'Shiba Inu', ko: '시바이누', ja: '柴犬コイン', zh: '柴犬币', th: 'ชิบะ อินุ', vi: 'Shiba Inu' }, symbol: 'SHIB', logo: <i className="fa-solid fa-s text-orange-400"></i> },
  { id: 'trx', names: { en: 'TRON', ko: '트론', ja: 'トロン', zh: '波场', th: 'ตรอน', vi: 'TRON' }, symbol: 'TRX', logo: <i className="fa-solid fa-t text-red-600"></i> },
  { id: 'ltc', names: { en: 'Litecoin', ko: '라이트코인', ja: 'ライトコイン', zh: '莱特币', th: 'ไลท์คอยน์', vi: 'Litecoin' }, symbol: 'LTC', logo: <i className="fa-solid fa-l text-gray-300"></i> },
  { id: 'bch', names: { en: 'Bitcoin Cash', ko: '비트코인캐시', ja: 'ビットコインキャッシュ', zh: '比特币现金', th: 'บิตคอยน์แคช', vi: 'Bitcoin Cash' }, symbol: 'BCH', logo: <i className="fa-brands fa-btc text-green-500"></i> },
  { id: 'cro', names: { en: 'Cronos', ko: '크로노스', ja: 'クロノス', zh: 'Cronos', th: 'โครโนส', vi: 'Cronos' }, symbol: 'CRO', logo: <i className="fa-solid fa-c text-blue-500"></i> },
  { id: 'tree', names: { en: 'Tree', ko: '트리', ja: 'ツリー', zh: '树', th: 'ทรี', vi: 'Tree' }, symbol: 'TREE', logo: <i className="fa-solid fa-tree text-green-500"></i> },
  { id: 'lpt', names: { en: 'Livepeer', ko: '라이브피어', ja: 'ライブピア', zh: 'Livepeer', th: 'ไลฟ์เพียร์', vi: 'Livepeer' }, symbol: 'LPT', logo: <i className="fa-solid fa-l text-lime-500"></i> },
  { id: 'pyth', names: { en: 'Pyth Network', ko: '파이스네트워크', ja: 'Pyth Network', zh: 'Pyth Network', th: 'Pyth Network', vi: 'Pyth Network' }, symbol: 'PYTH', logo: <i className="fa-solid fa-p text-red-500"></i> },
  { id: 'uni', names: { en: 'Uniswap', ko: '유니스왑', ja: 'ユニスワップ', zh: 'Uniswap', th: 'ยูนิสวอป', vi: 'Uniswap' }, symbol: 'UNI', logo: <i className="fa-solid fa-u text-pink-400"></i> },
  { id: 'icp', names: { en: 'Internet Computer', ko: '인터넷컴퓨터', ja: 'インターネットコンピュータ', zh: '互联网计算机', th: 'อินเทอร์เน็ตคอมพิวเตอร์', vi: 'Internet Computer' }, symbol: 'ICP', logo: <i className="fa-solid fa-i text-blue-300"></i> },
  { id: 'vet', names: { en: 'VeChain', ko: '비체인', ja: 'ヴィチェーン', zh: '唯链', th: 'วีเชน', vi: 'VeChain' }, symbol: 'VET', logo: <i className="fa-solid fa-v text-cyan-500"></i> },
  { id: 'fil', names: { en: 'Filecoin', ko: '파일코인', ja: 'ファイルコイン', zh: '文件币', th: 'ไฟล์คอยน์', vi: 'Filecoin' }, symbol: 'FIL', logo: <i className="fa-solid fa-f text-teal-300"></i> },
  { id: 'hbar', names: { en: 'Hedera', ko: '헤데라', ja: 'ヘデラ', zh: 'Hedera', th: 'เฮเดรา', vi: 'Hedera' }, symbol: 'HBAR', logo: <i className="fa-solid fa-h text-gray-500"></i> },
  { id: 'atom', names: { en: 'Cosmos', ko: '코스모스', ja: 'コスモス', zh: 'Cosmos', th: 'คอสมอส', vi: 'Cosmos' }, symbol: 'ATOM', logo: <i className="fa-solid fa-atom text-purple-300"></i> },
  { id: 'xtz', names: { en: 'Tezos', ko: '테조스', ja: 'テゾス', zh: 'Tezos', th: 'เทโซส', vi: 'Tezos' }, symbol: 'XTZ', logo: <i className="fa-solid fa-t text-blue-400"></i> },
  { id: 'sand', names: { en: 'The Sandbox', ko: '더샌드박스', ja: 'ザ・サンドボックス', zh: '沙盒', th: 'เดอะแซนด์บ็อกซ์', vi: 'The Sandbox' }, symbol: 'SAND', logo: <i className="fa-solid fa-s text-blue-400"></i> },
  { id: 'mana', names: { en: 'Decentraland', ko: '디센트럴랜드', ja: 'ディセントラランド', zh: 'Decentraland', th: 'ดีเซนทราแลนด์', vi: 'Decentraland' }, symbol: 'MANA', logo: <i className="fa-solid fa-m text-red-400"></i> },
  { id: 'eos', names: { en: 'EOS', ko: '이오스', ja: 'イオス', zh: 'EOS', th: 'อีโอเอส', vi: 'EOS' }, symbol: 'EOS', logo: <i className="fa-solid fa-e text-gray-200"></i> },
  { id: 'aave', names: { en: 'Aave', ko: '에이브', ja: 'アーベ', zh: 'Aave', th: 'เอเว่', vi: 'Aave' }, symbol: 'AAVE', logo: <i className="fa-solid fa-a text-purple-400"></i> },
  { id: 'grt', names: { en: 'The Graph', ko: '더그래프', ja: 'ザ・グラフ', zh: 'The Graph', th: 'เดอะกราฟ', vi: 'The Graph' }, symbol: 'GRT', logo: <i className="fa-solid fa-g text-purple-500"></i> },
  { id: 'ftm', names: { en: 'Fantom', ko: '팬텀', ja: 'ファントム', zh: 'Fantom', th: 'แฟนทอม', vi: 'Fantom' }, symbol: 'FTM', logo: <i className="fa-solid fa-f text-blue-500"></i> },
  { id: 'zec', names: { en: 'Zcash', ko: '지캐시', ja: 'ジーキャッシュ', zh: 'Zcash', th: 'ซีแคช', vi: 'Zcash' }, symbol: 'ZEC', logo: <i className="fa-solid fa-z text-yellow-600"></i> },
  { id: 'xlm', names: { en: 'Stellar', ko: '스텔라루멘', ja: 'ステラ', zh: '恒星币', th: 'สเตลลาร์', vi: 'Stellar' }, symbol: 'XLM', logo: <i className="fa-solid fa-rocket text-gray-400"></i> },
  { id: 'algo', names: { en: 'Algorand', ko: '알고랜드', ja: 'アルゴランド', zh: 'Algorand', th: 'อัลโกแรนด์', vi: 'Algorand' }, symbol: 'ALGO', logo: <i className="fa-solid fa-a text-black"></i> },
  { id: 'mkr', names: { en: 'Maker', ko: '메이커', ja: 'メーカー', zh: 'Maker', th: 'เมคเกอร์', vi: 'Maker' }, symbol: 'MKR', logo: <i className="fa-solid fa-m text-teal-400"></i> },
  { id: 'near', names: { en: 'NEAR Protocol', ko: '니어프로토콜', ja: 'NEARプロトコル', zh: 'NEAR协议', th: 'เนียร์โปรโตคอล', vi: 'NEAR Protocol' }, symbol: 'NEAR', logo: <i className="fa-solid fa-n text-white"></i> },
  { id: 'kava', names: { en: 'Kava', ko: '카바', ja: 'カヴァ', zh: 'Kava', th: 'คาวา', vi: 'Kava' }, symbol: 'KAVA', logo: <i className="fa-solid fa-k text-red-500"></i> },
  { id: 'enj', names: { en: 'Enjin Coin', ko: '엔진코인', ja: 'エンジンコイン', zh: 'Enjin Coin', th: 'เอนจินคอยน์', vi: 'Enjin Coin' }, symbol: 'ENJ', logo: <i className="fa-solid fa-e text-blue-400"></i> },
  { id: 'bat', names: { en: 'Basic Attention Token', ko: '베이직어텐션토큰', ja: 'ベーシックアテンショントークン', zh: 'Basic Attention Token', th: 'เบสิกแอตเทนชันโทเคน', vi: 'Basic Attention Token' }, symbol: 'BAT', logo: <i className="fa-solid fa-b text-red-600"></i> },
];
