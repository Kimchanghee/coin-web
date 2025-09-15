import type { ExchangeId, Announcement, AnnouncementService, AnnouncementCallback } from '../../../types';

function isToday(dateString: string): boolean {
  const today = new Date();
  const d = new Date(dateString);
  return d.toDateString() === today.toDateString();
}

export const createWebSocketAnnouncementService = (
  id: ExchangeId,
  url: string,
  parse: (data: any) => Announcement | null
): AnnouncementService => {
  const connect = (callback: AnnouncementCallback) => {
    const ws = new WebSocket(url);
    const onMessage = (event: MessageEvent) => {
      try {
        const raw = JSON.parse(event.data);
        const announcement = parse(raw);
        if (announcement && isToday(announcement.date)) {
          callback({ exchangeId: id, announcement });
        }
      } catch (err) {
        console.error(`Failed to parse announcement for ${id}:`, err);
      }
    };
    ws.addEventListener('message', onMessage);
    return () => ws.close();
  };

  const disconnect = () => {};

  return { id, connect, disconnect };
};
