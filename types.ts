import type React from 'react';

export type ExchangeId = 'upbit' | 'bithumb' | 'coinone' | 'binance' | 'bybit' | 'okx' | 'gateio';
export type CoinId = 'BTC' | 'ETH' | 'SOL';
export type AdminTab = 'dashboard' | 'announcements' | 'news' | 'settings';

export interface Announcement {
  id: string;
  title: string;
  url: string;
  date: string;
  category: string;
}

export interface Exchange {
  id: ExchangeId;
  name: string;
  color: string;
  icon: React.ReactNode;
}

export interface Stats {
  totalAnnouncements: number;
  totalNews: number | string;
  activeExchanges: number;
  lastUpdate: string;
}

export interface Activity {
  id: number;
  exchange: ExchangeId;
  title: string;
  timestamp: Date;
}

export interface CoinPrice {
  price: number;
  change: number;
}

export interface ArbitrageInfo {
  percentage: number;
}

export interface CoinMetadata {
  id: string;
  names: { [key: string]: string }; // e.g., { en: 'Bitcoin', ko: '비트코인' }
  symbol: string;
  logo: React.ReactNode;
}

// Types for Exchange Services
export interface PriceUpdate {
  priceKey: string; // e.g., 'upbit_krw-BTC'
  price: number;
}

// Extended price update with volume and change data
export interface ExtendedPriceUpdate extends PriceUpdate {
  change24h?: number;      // 24시간 변동률 (%)
  volume24h?: number;       // 24시간 거래대금 (KRW or USD)
  changePrice?: number;     // 변동 금액
}

export type PriceUpdateCallback = (update: PriceUpdate) => void;
export type ExtendedPriceUpdateCallback = (update: ExtendedPriceUpdate) => void;

export interface ExchangeService {
  id: string;
  connect: (callback: PriceUpdateCallback) => void;
  disconnect: () => void;
  connectExtended?: (callback: ExtendedPriceUpdateCallback) => void;
  getExtendedData?: (symbol: string) => ExtendedPriceUpdate | undefined;
}

// Type for authenticated user
export interface User {
  email: string;
  name?: string;
}

// Types for Announcement Services
export type AnnouncementCallback = (update: { exchangeId: ExchangeId; announcement: Announcement }) => void;

export interface AnnouncementService {
  id: ExchangeId;
  connect: (callback: AnnouncementCallback) => () => void; // Connect now returns a disconnect function
  disconnect: () => void;
}

// Types for Dashboard Service
export type StatsUpdateCallback = (stats: Stats) => void;
export type ActivityUpdateCallback = (activities: Activity[]) => void;

export interface DashboardService {
  connect: (statsCallback: StatsUpdateCallback, activityCallback: ActivityUpdateCallback) => void;
  disconnect: () => void;
}