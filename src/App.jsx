import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { supabase } from './lib/supabase'
import LockScreen from './components/LockScreen'
import Layout from './components/Layout'
import Home from './pages/Home'
import BookPlan from './pages/BookPlan'
import ThoughtBoard from './pages/ThoughtBoard'
import MeetingRecord from './pages/MeetingRecord'
import Archive from './pages/Archive'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [authError, setAuthError] = useState('')
  const [nickname, setNickname] = useState('')
  const [emoji, setEmoji] = useState('')

  useEffect(() => {
    // 현재 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        checkMember(session)
      } else {
        setLoading(false)
      }
    })

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          await checkMember(session)
        } else {
          setSession(null)
          setAuthorized(false)
          setLoading(false)
        }
      }
    )

    // 로컬 설정 로드
    const savedEmoji = localStorage.getItem('bc_emoji')
    if (savedEmoji) setEmoji(savedEmoji)

    return () => subscription.unsubscribe()
  }, [])

  async function checkMember(session) {
    const email = session.user.email
    const { data, error } = await supabase
      .from('members')
      .select('id, nickname, emoji')
      .eq('email', email)
      .single()

    if (data) {
      setSession(session)
      setAuthorized(true)
      setNickname(data.nickname || session.user.user_metadata?.full_name || '')
      if (data.emoji) setEmoji(data.emoji)
    } else {
      // 허용되지 않은 이메일
      setAuthError(`${email}은(는) 등록된 멤버가 아니에요.`)
      await supabase.auth.signOut()
    }
    setLoading(false)
  }

  const handleNicknameChange = async (name) => {
    setNickname(name)
    if (name && session) {
      await supabase
        .from('members')
        .update({ nickname: name })
        .eq('email', session.user.email)
    }
  }

  const handleEmojiChange = async (e) => {
    setEmoji(e)
    localStorage.setItem('bc_emoji', e)
    if (session) {
      await supabase
        .from('members')
        .update({ emoji: e })
        .eq('email', session.user.email)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setAuthorized(false)
    setNickname('')
  }

  if (loading) {
    return (
      <div className="lock-screen">
        <div className="lock-icon">📚</div>
        <p>로딩 중...</p>
      </div>
    )
  }

  if (!authorized) {
    return <LockScreen authError={authError} />
  }

  return (
    <Layout
      nickname={nickname}
      onNicknameChange={handleNicknameChange}
      emoji={emoji}
      onEmojiChange={handleEmojiChange}
      userEmail={session?.user?.email}
      userAvatar={session?.user?.user_metadata?.avatar_url}
      onLogout={handleLogout}
    >
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
