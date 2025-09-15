import { createWebSocketAnnouncementService } from './websocket.js';
import type { Announcement } from '../../../types';

const parseAnnouncement = (data: any): Announcement | null => {
  if (!data) return null;
  return {
    id: String(data.id ?? data.announcementId ?? Date.now()),
    title: data.title ?? '',
    url: data.url ?? '',
    date: data.date ?? new Date().toISOString(),
    category: data.category ?? 'general'
  };
};

export const upbitAnnouncementService = createWebSocketAnnouncementService(
  'upbit',
  'wss://example.com/upbit-announcements',
  parseAnnouncement
);
