import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Archive() {
  const [books, setBooks] = useState([])
  const [bookStats, setBookStats] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadArchive() }, [])

  async function loadArchive() {
    const { data: booksData } = await supabase
      .from('books')
      .select('*')
      .order('year_month', { ascending: false })

    if (booksData) {
      setBooks(booksData)

      // 각 책의 통계 로드
      const stats = {}
      for (const book of booksData) {
        const [thoughtsRes, commentsRes, meetingsRes] = await Promise.all([
          supabase.from('thoughts').select('id', { count: 'exact', head: true }).eq('book_id', book.id),
          supabase.from('thoughts').select('id').eq('book_id', book.id).then(async (res) => {
            if (!res.data?.length) return { count: 0 }
            const ids = res.data.map(t => t.id)
            const { count } = await supabase.from('comments').select('id', { count: 'exact', head: true }).in('thought_id', ids)
            return { count }
          }),
          supabase.from('meetings').select('id', { count: 'exact', head: true }).eq('book_id', book.id),
        ])
        stats[book.id] = {
          thoughts: thoughtsRes.count || 0,
          comments: commentsRes.count || 0,
          meetings: meetingsRes.count || 0,
        }
      }
      setBookStats(stats)
    }
    setLoading(false)
  }

  const statusEmoji = { upcoming: '📌', reading: '📖', completed: '✅' }
  const statusLabel = { upcoming: '예정', reading: '읽는 중', completed: '완독' }

  if (loading) return <div className="empty-state"><div className="empty-icon">⏳</div><p>불러오는 중...</p></div>

  return (
    <div>
      <div className="page-header">
        <h1>아카이브</h1>
        <p>우리가 함께 읽어온 책들의 기록</p>
      </div>

      {books.length > 0 ? (
        <div className="archive-grid">
          {books.map((book) => (
            <Link key={book.id} to={`/board/${book.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card archive-card">
                <div className="flex-between">
                  <span className="month-badge">{book.year_month}</span>
                  <span style={{ fontSize: 12 }}>
                    {statusEmoji[book.status]} {statusLabel[book.status]}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
                  <div className="book-cover" style={{ width: 70, height: 100, fontSize: 28, flexShrink: 0 }}>
                    {book.cover_url
                      ? <img src={book.cover_url} alt="" />
                      : '📖'
                    }
                  </div>
                  <div>
                    <h3>{book.title}</h3>
                    <div className="author">{book.author}</div>
                    {book.description && (
                      <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 6, lineHeight: 1.5 }}>
                        {book.description.length > 80 ? book.description.slice(0, 80) + '...' : book.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="archive-stats">
                  <span>💭 {bookStats[book.id]?.thoughts || 0}개 생각</span>
                  <span>💬 {bookStats[book.id]?.comments || 0}개 댓글</span>
                  <span>📸 {bookStats[book.id]?.meetings || 0}회 모임</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card empty-state">
          <div className="empty-icon">📦</div>
          <p>아직 기록이 없어요. 독서 계획에서 첫 책을 추가해 보세요!</p>
          <Link to="/plan" className="btn btn-primary">독서 계획으로 이동</Link>
        </div>
      )}
    </div>
  )
}
