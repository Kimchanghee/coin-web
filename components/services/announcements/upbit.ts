// components/services/announcements/upbit.ts
import type { ExchangeId, Announcement, AnnouncementService, AnnouncementCallback } from '../../../types';

const createUpbitAnnouncementService = (): AnnouncementService => {
  const id: ExchangeId = 'upbit';
  // FIX: Changed type from 'number' to a type compatible with setInterval's return value in all environments.
  let intervalId: ReturnType<typeof setInterval> | undefined;
  let lastAnnouncementIds = new Set<string>();
  let isActive = false;
  
  const fetchAnnouncements = async (): Promise<Announcement[]> => {
    try {
      // Upbit 공지사항 API
      // 실제로는 Upbit이 공식 공지사항 API를 제공하지 않으므로
      // 웹 스크래핑이나 RSS 피드를 사용해야 할 수 있습니다
      
      // 옵션 1: 백엔드 프록시를 통한 스크래핑
      const response = await fetch('/api/upbit-announcements');
      
      if (!response.ok) {
        // 프록시가 없는 경우 기본 데이터 사용
        console.warn(`[${id}] Using fallback announcement data`);
        
        // 대체: 로컬 JSON 파일 사용 (개발 중)
        const fallbackResponse = await fetch(`/api/announcements/${id}.json`);
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          return fallbackData.slice(0, 10);
        }
        
        throw new Error(`Failed to fetch announcements: ${response.status}`);
      }
      
      const data = await response.json();
      
      // API 응답 형식에 맞게 파싱
      if (data.success && Array.isArray(data.data)) {
        return data.data.map((item: any) => ({
          id: `${id}-${item.id || item.notice_id}`,
          title: item.title || item.notice_title,
          url: item.url || `https://upbit.com/service_center/notice?id=${item.id}`,
          date: item.created_at || item.notice_date || new Date().toISOString(),
          category: item.type || item.notice_type || '공지'
        }));
      }
      
      return [];
      
    } catch (error) {
      console.error(`[${id}] Failed to fetch announcements:`, error);
      
      // 에러 발생 시 로컬 JSON 파일 사용
      try {
        const fallbackResponse = await fetch(`/api/announcements/${id}.json`);
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          return fallbackData.slice(0, 10);
        }
      } catch (fallbackError) {
        console.error(`[${id}] Fallback also failed:`, fallbackError);
      }
      
      return [];
    }
  };

  const connect = (callback: AnnouncementCallback) => {
    isActive = true;
    
    const pollAnnouncements = async () => {
      if (!isActive) return;
      
      const announcements = await fetchAnnouncements();
      
      // 새로운 공지사항만 콜백으로 전달
      for (const announcement of announcements) {
        if (!lastAnnouncementIds.has(announcement.id)) {
          // 새 공지사항 발견
          console.log(`[${id}] New announcement:`, announcement.title);
          
          callback({ 
            exchangeId: id, 
            announcement 
          });
          
          lastAnnouncementIds.add(announcement.id);
          
          // 약간의 지연을 두고 순차적으로 전달 (스트리밍 효과)
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      // 메모리 관리: 오래된 ID 제거
      if (lastAnnouncementIds.size > 100) {
        const idsArray = Array.from(lastAnnouncementIds);
        lastAnnouncementIds = new Set(idsArray.slice(-50));
      }
    };
    
    // 초기 공지사항 로드
    pollAnnouncements();
    
    // 30초마다 새 공지사항 확인
    intervalId = setInterval(pollAnnouncements, 30000);
    
    console.log(`[${id}] Announcement service started`);
    
    // disconnect 함수 반환
    return () => {
      isActive = false;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    };
  };

  const disconnect = () => {
    console.log(`[${id}] Announcement service disconnecting...`);
    
    isActive = false;
    
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = undefined;
    }
    
    lastAnnouncementIds.clear();
  };

  return { id, connect, disconnect };
};

export const upbitAnnouncementService = createUpbitAnnouncementService();