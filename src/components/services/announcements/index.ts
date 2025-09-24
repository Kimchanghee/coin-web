// components/services/announcements/index.ts
import { upbitAnnouncementService } from './upbit';
import { bithumbAnnouncementService } from './bithumb';
import { coinoneAnnouncementService } from './coinone';
import { binanceAnnouncementService } from './binance';
import { bybitAnnouncementService } from './bybit';
import { okxAnnouncementService } from './okx';
import { gateioAnnouncementService } from './gateio';
import type { AnnouncementService } from '../../../types';

// All announcement services
export const allAnnouncementServices: AnnouncementService[] = [
    upbitAnnouncementService,
    bithumbAnnouncementService,
    coinoneAnnouncementService,
    binanceAnnouncementService,
    bybitAnnouncementService,
    okxAnnouncementService,
    gateioAnnouncementService
];

// Export individual services for direct access
export { upbitAnnouncementService } from './upbit';
export { bithumbAnnouncementService } from './bithumb';
export { coinoneAnnouncementService } from './coinone';
export { binanceAnnouncementService } from './binance';
export { bybitAnnouncementService } from './bybit';
export { okxAnnouncementService } from './okx';
export { gateioAnnouncementService } from './gateio';