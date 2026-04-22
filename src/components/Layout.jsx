import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/', label: '홈', icon: '🏠' },
  { path: '/plan', label: '독서 계획', icon: '📋' },
  { path: '/board', label: '생각 보드', icon: '💭' },
  { path: '/meetings', label: '모임 기록', icon: '📸' },
  { path: '/archive', label: '아카이브', icon: '📦' },
]

export default function Layout({ children, nickname, onNicknameChange }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="app-layout">
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <h2>📚 독서동아리</h2>
          <span>함께 읽고, 함께 나누고</span>
        </div>

        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="nickname-bar">
            <span>내 이름:</span>
            <input
              type="text"
              value={nickname}
              onChange={(e) => onNicknameChange(e.target.value)}
              placeholder="닉네임 입력"
            />
          </div>
        </div>
      </aside>

      <div className="mobile-header">
        <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
        <h2>📚 독서동아리</h2>
        <div style={{ width: 36 }} />
      </div>

      <main className="main-content">
        {!nickname && (
          <div className="nickname-bar" style={{ marginBottom: 20 }}>
            <span>✏️</span>
            <span>먼저 닉네임을 설정해 주세요:</span>
            <input
              type="text"
              value={nickname}
              onChange={(e) => onNicknameChange(e.target.value)}
              placeholder="예: 철수"
              autoFocus
            />
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
