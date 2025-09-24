import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';

const Clock: React.FC = () => {
  const { i18n } = useTranslation();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  const getLocale = (lang: string) => {
    switch(lang) {
      case 'ko': return 'ko-KR';
      case 'ja': return 'ja-JP';
      case 'zh': return 'zh-CN';
      case 'th': return 'th-TH';
      case 'vi': return 'vi-VN';
      default: return 'en-US';
    }
  };

  const locale = getLocale(i18n.language);
  
  const formattedDate = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(currentTime);

  const formattedTime = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(currentTime);

  return (
    <div className="hidden lg:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
      <span>{formattedDate}</span>
      <span className="font-semibold text-gray-800 dark:text-gray-200">{formattedTime}</span>
    </div>
  );
};

export default Clock;