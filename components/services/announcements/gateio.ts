import type { ExchangeId, Announcement, AnnouncementService, AnnouncementCallback } from '../../../types';

const createGateioAnnouncementService = (): AnnouncementService => {
  const id: ExchangeId = 'gateio';

  const connect = (callback: AnnouncementCallback) => {
    let isActive = true;

    const fetchData = async () => {
      try {
        const response = await fetch(`/api/announcements/${id}.json`);
        if (!response.ok) {
          throw new Error(`Network response was not ok for ${id}.json`);
        }
        const data: Announcement[] = await response.json();

        if (!isActive) return;

        const sortedData = data
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 10);

        for (const announcement of sortedData) {
          if (!isActive) break;
          await new Promise(resolve => setTimeout(resolve, 20));
          if (isActive) {
            callback({ exchangeId: id, announcement });
          }
        }
      } catch (error) {
        console.error(`Failed to fetch announcements for ${id}:`, error);
      }
    };

    fetchData();

    return () => {
      isActive = false;
    };
  };

  const disconnect = () => {};

  return { id, connect, disconnect };
};

export const gateioAnnouncementService = createGateioAnnouncementService();