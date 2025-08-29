import type { ExchangeId, Announcement, AnnouncementService, AnnouncementCallback } from '../../../types';

const createUpbitAnnouncementService = (): AnnouncementService => {
  const id: ExchangeId = 'upbit';
  
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
          // Stagger the callbacks slightly to simulate a stream
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

    // Return a disconnect function to prevent updates on unmounted components
    return () => {
      isActive = false;
    };
  };

  const disconnect = () => {
    // The actual disconnect logic is handled by the returned function from connect
  };

  return { id, connect, disconnect };
};

export const upbitAnnouncementService = createUpbitAnnouncementService();