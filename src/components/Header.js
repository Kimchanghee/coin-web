import React from 'react';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <h1>💰 Coin Web</h1>
        </div>
        <div className="header-info">
          <span className="market-status">마켓 오픈</span>
          <span className="current-time">
            {new Date().toLocaleTimeString('ko-KR')}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
