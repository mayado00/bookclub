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
    let mounted = true
    let initialDone = false

    // 1) getSession()으로 즉시 로컬 세션 확인 (빠름)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted || initialDone) return
      initialDone = true
      if (session) {
        try {
          await checkMember(session)
        } catch (err) {
          console.error('getSession checkMember error:', err)
          if (mounted) setLoading(false)
        }
      } else {
        setLoading(false)
      }
    })

    // 2) onAuthStateChange: 이후 로그인/로그아웃 변경만 처리
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        // INITIAL_SESSION은 getSession에서 이미 처리됨
        if (event === 'INITIAL_SESSION') {
          // getSession이 아직 안 끝났으면 여기서 처리
          if (!initialDone) {
            initialDone = true
            if (session) {
              try { await checkMember(session) }
              catch { if (mounted) setLoading(false) }
            } else {
              setLoading(false)
            }
          }
          return
        }
        // SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED 등
        if (session) {
          try { await checkMember(session) }
          catch { if (mounted) setLoading(false) }
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

    // 안전장치: 5초 후에도 로딩이면 강제 해제
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 5000)

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  async function checkMember(session) {
    try {
      const email = session?.user?.email
      if (!email) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('members')
        .select('id, nickname, emoji')
        .eq('email', email)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = "not found" (멤버가 아닌 경우)
        // 그 외 에러는 네트워크/서버 문제 → 로그아웃하지 않고 세션 유지
        console.error('Members query error:', error)
        // 세션은 유지하되 authorized는 false → 로그인 화면 표시
        // 하지만 signOut은 하지 않음 (세션 보존)
        setLoading(false)
        return
      }

      if (data) {
        setSession(session)
        setAuthorized(true)
        setNickname(data.nickname || session.user.user_metadata?.full_name || '')
        if (data.emoji) setEmoji(data.emoji)
      } else {
        // 실제로 멤버가 아닌 경우에만 signOut
        setAuthError(`${email}은(는) 등록된 멤버가 아니에요.`)
        await supabase.auth.signOut()
      }
    } catch (err) {
      console.error('checkMember exception:', err)
      // 네트워크 에러 등 → 세션 유지, signOut 하지 않음
    } finally {
      setLoading(false)
    }
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
