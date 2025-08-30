// components/services/announcements/index.ts
import { upbitAnnouncementService } from './upbit.js';
import { bithumbAnnouncementService } from './bithumb.js';
import { coinoneAnnouncementService } from './coinone.js';
import { binanceAnnouncementService } from './binance.js';
import { bybitAnnouncementService } from './bybit.js';
import { okxAnnouncementService } from './okx.js';
import { gateioAnnouncementService } from './gateio.js';
import type { AnnouncementService } from '../../../types.js';

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
export { upbitAnnouncementService } from './upbit.js';
export { bithumbAnnouncementService } from './bithumb.js';
export { coinoneAnnouncementService } from './coinone.js';
export { binanceAnnouncementService } from './binance.js';
export { bybitAnnouncementService } from './bybit.js';
export { okxAnnouncementService } from './okx.js';
export { gateioAnnouncementService } from './gateio.js';