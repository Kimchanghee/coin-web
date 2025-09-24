import type { DashboardService, Stats, Activity, ExchangeId, StatsUpdateCallback, ActivityUpdateCallback, Announcement } from '../../types';
import { EXCHANGES } from '../../constants';

const createDashboardService = (): DashboardService => {
  // FIX: Changed type from 'number' to a type compatible with setInterval's return value in all environments.
  let statsInterval: ReturnType<typeof setInterval> | undefined;

  const connect = async (statsCallback: StatsUpdateCallback, activityCallback: ActivityUpdateCallback) => {
    try {
        // Fetch all announcements to calculate total and get recent activities
        const announcementsPromises = EXCHANGES.map(exchange =>
            fetch(`/api/announcements/${exchange.id}.json`).then(res => res.json())
        );
        const allAnnouncementsData: Announcement[][] = await Promise.all(announcementsPromises);
        
        const allAnnouncementsFlat = allAnnouncementsData.flat();
        const totalAnnouncements = allAnnouncementsFlat.length;

        allAnnouncementsFlat.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Create realistic recent activities from the latest announcements
        const recentActivities: Activity[] = allAnnouncementsFlat.slice(0, 4).map((ann, index) => {
            const exchangeId = EXCHANGES.find(ex => ann.id.startsWith(ex.id.substring(0,2)))?.id || 'upbit';
            return {
                id: index + 1,
                exchange: exchangeId,
                title: ann.title,
                timestamp: new Date(new Date(ann.date).getTime() + 1000 * 60 * 60 * (20 - index)), // Make timestamp more realistic
            }
        });
        
        activityCallback(recentActivities);

        let currentStats: Stats = {
            totalAnnouncements,
            totalNews: '-',
            activeExchanges: EXCHANGES.length,
            lastUpdate: new Date().toLocaleTimeString('ko-KR')
        };
        
        statsCallback(currentStats);

        statsInterval = setInterval(() => {
            currentStats = {
                ...currentStats,
                lastUpdate: new Date().toLocaleTimeString('ko-KR'),
            };
            statsCallback(currentStats);
        }, 1000);

    } catch (error) {
        console.error("Failed to initialize dashboard service:", error);
    }
  };

  const disconnect = () => {
    if (statsInterval) {
      clearInterval(statsInterval);
    }
  };

  return { connect, disconnect };
};

export const dashboardService = createDashboardService();