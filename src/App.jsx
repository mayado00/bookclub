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

  useEffect(() => {
    const saved = sessionStorage.getItem('bc_auth')
    const savedNick = localStorage.getItem('bc_nickname')
    if (saved === 'true') setAuthenticated(true)
    if (savedNick) setNickname(savedNick)
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
    localStorage.setItem('bc_nickname', name)
  }

  if (!authenticated) {
    return <LockScreen onLogin={handleLogin} />
  }

  return (
    <Layout nickname={nickname} onNicknameChange={handleNicknameChange}>
      <Routes>
        <Route path="/" element={<Home nickname={nickname} />} />
        <Route path="/plan" element={<BookPlan nickname={nickname} />} />
        <Route path="/board" element={<ThoughtBoard nickname={nickname} />} />
        <Route path="/board/:bookId" element={<ThoughtBoard nickname={nickname} />} />
        <Route path="/meetings" element={<MeetingRecord nickname={nickname} />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
