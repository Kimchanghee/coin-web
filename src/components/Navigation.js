import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './Navigation.css';

const Navigation = () => {
  const location = useLocation();
  const [menuItems, setMenuItems] = useState([]);

  // 메뉴 아이템 정의
  const allMenuItems = [
    { 
      id: 'dashboard',
      name: '대시보드', 
      path: '/', 
      icon: '📊',
      active: true,
      order: 1
    },
    { 
      id: 'chart',
      name: '실시간 차트', 
      path: '/chart', 
      icon: '📈',
      active: true,
      order: 2
    },
    { 
      id: 'exchange',
      name: '거래소', 
      path: '/exchange', 
      icon: '💱',
      active: true,
      order: 3
    },
    { 
      id: 'portfolio',
      name: '포트폴리오', 
      path: '/portfolio', 
      icon: '💼',
      active: true,
      order: 4
    },
    { 
      id: 'settings',
      name: '설정', 
      path: '/settings', 
      icon: '⚙️',
      active: true,
      order: 5
    }
  ];

  useEffect(() => {
    // active 상태이고 순서대로 정렬된 메뉴만 표시
    const activeItems = allMenuItems
      .filter(item => item.active)
      .sort((a, b) => a.order - b.order);
    
    setMenuItems(activeItems);
  }, []);

  return (
    <nav className="navigation">
      <ul className="nav-list">
        {menuItems.map(item => (
          <li key={item.id} className="nav-item">
            <NavLink
              to={item.path}
              className={({ isActive }) => 
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">{item.name}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navigation;
