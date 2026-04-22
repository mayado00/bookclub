import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Home({ nickname }) {
  const [currentBook, setCurrentBook] = useState(null)
  const [stats, setStats] = useState({ books: 0, thoughts: 0, meetings: 0 })
  const [recentThoughts, setRecentThoughts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      // 현재 읽는 책
      const { data: books } = await supabase
        .from('books')
        .select('*')
        .eq('status', 'reading')
        .order('created_at', { ascending: false })
        .limit(1)

      if (books?.length) setCurrentBook(books[0])

      // 통계
      const [booksRes, thoughtsRes, meetingsRes] = await Promise.all([
        supabase.from('books').select('id', { count: 'exact', head: true }),
        supabase.from('thoughts').select('id', { count: 'exact', head: true }),
        supabase.from('meetings').select('id', { count: 'exact', head: true }),
      ])

      setStats({
        books: booksRes.count || 0,
        thoughts: thoughtsRes.count || 0,
        meetings: meetingsRes.count || 0,
      })

      // 최근 생각 카드
      const { data: thoughts } = await supabase
        .from('thoughts')
        .select('*, books(title)')
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentThoughts(thoughts || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now - d
    if (diff < 60000) return '방금 전'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⏳</div>
        <p>불러오는 중...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1>{nickname ? `${nickname}님, 반가워요` : '독서동아리'}</h1>
        <p>함께 읽고, 함께 나누는 우리의 공간</p>
      </div>

      {/* 현재 읽는 책 */}
      {currentBook ? (
        <div className="card">
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>
              지금 읽고 있는 책
            </span>
            <Link to={`/board/${currentBook.id}`} className="btn btn-sm btn-ghost">
              생각 보드 →
            </Link>
          </div>
          <div className="current-book">
            <div className="book-cover">
              {currentBook.cover_url
                ? <img src={currentBook.cover_url} alt={currentBook.title} />
                : '📖'
              }
            </div>
            <div className="book-info">
              <h3>{currentBook.title}</h3>
              <div className="author">{currentBook.author}</div>
              {currentBook.description && (
                <div className="description">{currentBook.description}</div>
              )}
              <div className="book-meta">
                <span>📅 {currentBook.year_month}</span>
                {currentBook.start_date && (
                  <span>{currentBook.start_date} ~ {currentBook.end_date}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card empty-state" style={{ padding: 40 }}>
          <div className="empty-icon">📚</div>
          <p>아직 읽고 있는 책이 없어요</p>
          <Link to="/plan" className="btn btn-primary">
            첫 번째 책 추가하기
          </Link>
        </div>
      )}

      {/* 통계 */}
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="number">{stats.books}</div>
          <div className="label">등록된 책</div>
        </div>
        <div className="card stat-card">
          <div className="number">{stats.thoughts}</div>
          <div className="label">생각 카드</div>
        </div>
        <div className="card stat-card">
          <div className="number">{stats.meetings}</div>
          <div className="label">모임 기록</div>
        </div>
      </div>

      {/* 최근 활동 */}
      <div className="card mt-24">
        <h3 style={{ fontSize: 16, marginBottom: 4 }}>최근 활동</h3>
        {recentThoughts.length > 0 ? (
          <div className="activity-list">
            {recentThoughts.map((t) => (
              <div key={t.id} className="activity-item">
                <div className="activity-avatar">
                  {t.author_name?.charAt(0) || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div>
                    <strong>{t.author_name}</strong>
                    {t.books?.title && (
                      <span style={{ color: 'var(--text-light)' }}> · {t.books.title}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 2 }}>
                    {t.content.length > 60 ? t.content.slice(0, 60) + '...' : t.content}
                  </div>
                  <div className="activity-time">{formatDate(t.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-light)', fontSize: 14, marginTop: 8 }}>
            아직 활동이 없어요. 생각 보드에서 첫 카드를 남겨보세요!
          </p>
        )}
      </div>
    </div>
  )
}
