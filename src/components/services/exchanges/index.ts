// components/services/exchanges/index.ts
import { upbitService } from './upbit';
import { bithumbService } from './bithumb';
import { coinoneService } from './coinone';
import { binanceSpotService } from './binance.spot';
import { binanceFuturesService } from './binance.futures';
import { bitgetSpotService } from './bitget.spot';
import { bitgetFuturesService } from './bitget.futures';
import { bybitSpotService } from './bybit.spot';
import { bybitFuturesService } from './bybit.futures';
import { okxSpotService } from './okx.spot';
import { okxFuturesService } from './okx.futures';
import { gateioSpotService } from './gateio.spot';
import { gateioFuturesService } from './gateio.futures';

export const domesticServices = [upbitService, bithumbService, coinoneService];

export const overseasServices = [
    binanceSpotService, 
    binanceFuturesService,
    bitgetSpotService,
    bitgetFuturesService,
    bybitSpotService,
    bybitFuturesService,
    okxSpotService,
    okxFuturesService,
    gateioSpotService,
    gateioFuturesService
];

export const allServices = [...domesticServices, ...overseasServices];

// Export individual services for direct access
export { upbitService } from './upbit';
export { bithumbService } from './bithumb';
export { coinoneService } from './coinone';
export { binanceSpotService } from './binance.spot';
export { binanceFuturesService } from './binance.futures';
export { bitgetSpotService } from './bitget.spot';
export { bitgetFuturesService } from './bitget.futures';
export { bybitSpotService } from './bybit.spot';
export { bybitFuturesService } from './bybit.futures';
export { okxSpotService } from './okx.spot';
export { okxFuturesService } from './okx.futures';
export { gateioSpotService } from './gateio.spot';
export { gateioFuturesService } from './gateio.futures';