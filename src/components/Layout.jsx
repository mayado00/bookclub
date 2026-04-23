import { useState, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/', label: '홈', icon: '🏠' },
  { path: '/plan', label: '독서 노트', icon: '📋' },
  { path: '/board', label: '생각 보드', icon: '💭' },
  { path: '/meetings', label: '모임 기록', icon: '📸' },
  { path: '/archive', label: '아카이브', icon: '📦' },
]

const EMOJI_OPTIONS = ['😊','😎','🤓','🐱','🐶','🦊','🐻','🐰','🐸','🌸','🌻','🍀','⭐','🔥','💜','🎵','🦋','🍩']

export default function Layout({ children, nickname, onNicknameChange, emoji, onEmojiChange, userEmail, userAvatar, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [localNick, setLocalNick] = useState(nickname)
  const composingRef = useRef(false)
  const location = useLocation()

  const handleNickInput = (e) => {
    setLocalNick(e.target.value)
    if (!composingRef.current) {
      onNicknameChange(e.target.value)
    }
  }

  const handleCompositionStart = () => {
    composingRef.current = true
  }

  const handleCompositionEnd = (e) => {
    composingRef.current = false
    setLocalNick(e.target.value)
    onNicknameChange(e.target.value)
  }

  if (!composingRef.current && localNick !== nickname) {
    setLocalNick(nickname)
  }

  return (
    <div className="app-layout">
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <h2>냠냠</h2>
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
          <div className="nickname-section">
            <button
              className="emoji-avatar"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="이모지 변경"
            >
              {emoji || '😊'}
            </button>
            <input
              className="nickname-input"
              type="text"
              value={localNick}
              onChange={handleNickInput}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              placeholder="닉네임 입력"
            />
          </div>
          {showEmojiPicker && (
            <div className="emoji-picker">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  className={`emoji-option ${emoji === e ? 'selected' : ''}`}
                  onClick={() => { onEmojiChange(e); setShowEmojiPicker(false) }}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
          {userEmail && (
            <div className="user-info">
              <span className="user-email">{userEmail}</span>
              <button className="btn-logout" onClick={onLogout}>로그아웃</button>
            </div>
          )}
        </div>
      </aside>

      <div className="mobile-header">
        <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
        <h2>냠냠</h2>
        <div style={{ width: 36 }} />
      </div>

      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
