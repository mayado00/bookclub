import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import LockScreen from './components/LockScreen'
import Layout from './components/Layout'
import Home from './pages/Home'
import BookPlan from './pages/BookPlan'
import ThoughtBoard from './pages/ThoughtBoard'
import MeetingRecord from './pages/MeetingRecord'
import Archive from './pages/Archive'

const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD || 'bookclub'

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [nickname, setNickname] = useState('')
  const [emoji, setEmoji] = useState('')

  useEffect(() => {
    const saved = sessionStorage.getItem('bc_auth')
    const savedNick = localStorage.getItem('bc_nickname')
    const savedEmoji = localStorage.getItem('bc_emoji')
    if (saved === 'true') setAuthenticated(true)
    if (savedNick) setNickname(savedNick)
    if (savedEmoji) setEmoji(savedEmoji)
  }, [])

  const handleLogin = (password) => {
    if (password === APP_PASSWORD) {
      setAuthenticated(true)
      sessionStorage.setItem('bc_auth', 'true')
      return true
    }
    return false
  }

  const handleNicknameChange = (name) => {
    setNickname(name)
    if (name) localStorage.setItem('bc_nickname', name)
  }

  const handleEmojiChange = (e) => {
    setEmoji(e)
    localStorage.setItem('bc_emoji', e)
  }

  if (!authenticated) {
    return <LockScreen onLogin={handleLogin} />
  }

  return (
    <Layout nickname={nickname} onNicknameChange={handleNicknameChange} emoji={emoji} onEmojiChange={handleEmojiChange}>
      <Routes>
        <Route path="/" element={<Home nickname={nickname} emoji={emoji} />} />
        <Route path="/plan" element={<BookPlan nickname={nickname} emoji={emoji} />} />
        <Route path="/board" element={<ThoughtBoard nickname={nickname} emoji={emoji} />} />
        <Route path="/board/:bookId" element={<ThoughtBoard nickname={nickname} emoji={emoji} />} />
        <Route path="/meetings" element={<MeetingRecord nickname={nickname} emoji={emoji} />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
