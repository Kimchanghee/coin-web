import React from 'react';
import type { Exchange, Announcement, CoinPrice, ArbitrageInfo, CoinId } from '../types';
import { TRACKED_COINS } from '../constants';

const RealTimePriceTicker: React.FC<{ coinId: CoinId; priceData: CoinPrice }> = ({ coinId, priceData }) => {
  const { price, change } = priceData;
  const color = change === 1 ? 'text-green-500' : 'text-red-500';
  const icon = change === 1 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';

  return (
    <div className="flex justify-between items-center text-sm">
        <span className="font-bold text-slate-700 dark:text-slate-300">{coinId}</span>
        <div className="flex items-center gap-2">
            <span className={`${color}`}>{price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
            <i className={`fas ${icon} ${color}`}></i>
        </div>
    </div>
  );
};

const ArbitrageDisplay: React.FC<{ arbitrage: ArbitrageInfo }> = ({ arbitrage }) => {
    const { percentage } = arbitrage;
    const color = percentage > 0 ? 'text-green-500' : percentage < 0 ? 'text-red-500' : 'text-slate-500 dark:text-slate-400';
    const sign = percentage > 0 ? '+' : '';
    return (
        <div className="text-center bg-slate-100 dark:bg-slate-900/50 p-2 rounded-md mt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">차익</p>
            <p className={`text-lg font-bold ${color}`}>{sign}{percentage.toFixed(2)}%</p>
        </div>
    )
};


interface AnnouncementCardProps {
  exchange: Exchange;
  announcements: Announcement[];
  prices: Record<CoinId, CoinPrice>;
  arbitrage: ArbitrageInfo;
}

const AnnouncementCard: React.FC<AnnouncementCardProps> = ({ exchange, announcements, prices, arbitrage }) => {
  return (
    <div className={`flex flex-col h-96 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg border-t-4 ${exchange.color} transform transition-transform duration-300 hover:scale-[1.02]`}>
      <div className="flex items-center p-4 border-b border-slate-200 dark:border-slate-700">
        <span className="text-2xl mr-3">{exchange.icon}</span>
        <h3 className="text-xl font-bold text-black dark:text-white">{exchange.name}</h3>
        <span className="ml-auto text-sm font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full px-3 py-1">
          {announcements.length}
        </span>
      </div>
      
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                {TRACKED_COINS.map(coinId => (
                    <RealTimePriceTicker key={coinId} coinId={coinId} priceData={prices[coinId]} />
                ))}
              </div>
              <div>
                <ArbitrageDisplay arbitrage={arbitrage} />
              </div>
          </div>
      </div>

      <div className="flex-grow p-4 overflow-y-auto space-y-3">
        {announcements.length > 0 ? (
          announcements.slice(0, 3).map((ann) => (
            <a key={ann.id} href={ann.url} target="_blank" rel="noopener noreferrer" className="block p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <p className="text-black dark:text-white truncate font-medium">{ann.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ann.date}</p>
            </a>
          ))
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 dark:text-gray-400">No recent announcements</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementCard;