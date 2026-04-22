import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function BookPlan({ nickname }) {
  const [books, setBooks] = useState([])
  const [plans, setPlans] = useState([])
  const [selectedBook, setSelectedBook] = useState(null)
  const [showBookModal, setShowBookModal] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [bookForm, setBookForm] = useState({
    title: '', author: '', description: '', cover_url: '',
    year_month: new Date().toISOString().slice(0, 7),
    start_date: '', end_date: '', status: 'reading'
  })
  const [planForm, setPlanForm] = useState({ title: '', description: '', due_date: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadBooks() }, [])
  useEffect(() => { if (selectedBook) loadPlans(selectedBook.id) }, [selectedBook])

  async function loadBooks() {
    const { data } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false })
    setBooks(data || [])
    if (data?.length && !selectedBook) setSelectedBook(data[0])
    setLoading(false)
  }

  async function loadPlans(bookId) {
    const { data } = await supabase
      .from('reading_plans')
      .select('*')
      .eq('book_id', bookId)
      .order('sort_order')
    setPlans(data || [])
  }

  async function handleAddBook(e) {
    e.preventDefault()
    const { data, error } = await supabase.from('books').insert([bookForm]).select()
    if (!error && data) {
      setBooks([data[0], ...books])
      setSelectedBook(data[0])
      setShowBookModal(false)
      setBookForm({
        title: '', author: '', description: '', cover_url: '',
        year_month: new Date().toISOString().slice(0, 7),
        start_date: '', end_date: '', status: 'reading'
      })
    }
  }

  async function handleAddPlan(e) {
    e.preventDefault()
    if (!selectedBook) return
    const { data, error } = await supabase
      .from('reading_plans')
      .insert([{ ...planForm, book_id: selectedBook.id, sort_order: plans.length }])
      .select()
    if (!error && data) {
      setPlans([...plans, data[0]])
      setShowPlanModal(false)
      setPlanForm({ title: '', description: '', due_date: '' })
    }
  }

  async function handleDeletePlan(id) {
    await supabase.from('reading_plans').delete().eq('id', id)
    setPlans(plans.filter(p => p.id !== id))
  }

  async function handleUpdateBookStatus(book, status) {
    await supabase.from('books').update({ status }).eq('id', book.id)
    setBooks(books.map(b => b.id === book.id ? { ...b, status } : b))
    if (selectedBook?.id === book.id) setSelectedBook({ ...book, status })
  }

  const statusLabel = { upcoming: '예정', reading: '읽는 중', completed: '완독' }
  const statusColor = { upcoming: '#888', reading: 'var(--accent)', completed: 'var(--success)' }

  if (loading) return <div className="empty-state"><div className="empty-icon">⏳</div><p>불러오는 중...</p></div>

  return (
    <div>
      <div className="flex-between page-header">
        <div>
          <h1>독서 계획</h1>
          <p>한 달에 한 권, 우리의 여정</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowBookModal(true)}>
          + 새 책 추가
        </button>
      </div>

      {/* 책 탭 */}
      {books.length > 0 && (
        <div className="book-tabs">
          {books.map((book) => (
            <button
              key={book.id}
              className={`book-tab ${selectedBook?.id === book.id ? 'active' : ''}`}
              onClick={() => setSelectedBook(book)}
            >
              {book.year_month} · {book.title}
            </button>
          ))}
        </div>
      )}

      {/* 선택된 책 정보 */}
      {selectedBook ? (
        <>
          <div className="card">
            <div className="current-book">
              <div className="book-cover">
                {selectedBook.cover_url
                  ? <img src={selectedBook.cover_url} alt="" />
                  : '📖'
                }
              </div>
              <div className="book-info">
                <div className="flex-between">
                  <h3>{selectedBook.title}</h3>
                  <select
                    value={selectedBook.status}
                    onChange={(e) => handleUpdateBookStatus(selectedBook, e.target.value)}
                    style={{
                      fontSize: 12, padding: '4px 8px', borderRadius: 6,
                      color: statusColor[selectedBook.status],
                      borderColor: statusColor[selectedBook.status],
                      background: 'transparent'
                    }}
                  >
                    <option value="upcoming">예정</option>
                    <option value="reading">읽는 중</option>
                    <option value="completed">완독</option>
                  </select>
                </div>
                <div className="author">{selectedBook.author}</div>
                {selectedBook.description && <div className="description">{selectedBook.description}</div>}
                <div className="book-meta">
                  <span>📅 {selectedBook.year_month}</span>
                  {selectedBook.start_date && <span>{selectedBook.start_date} ~ {selectedBook.end_date}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* 주차별 계획 */}
          <div className="flex-between mt-24">
            <h3 style={{ fontSize: 16 }}>진행 계획</h3>
            <button className="btn btn-sm btn-ghost" onClick={() => setShowPlanModal(true)}>
              + 추가
            </button>
          </div>
          {plans.length > 0 ? (
            <div className="plan-timeline">
              {plans.map((plan) => (
                <div key={plan.id} className="card plan-item">
                  <div className="plan-date">
                    {plan.due_date || '-'}
                  </div>
                  <div className="plan-dot active" />
                  <div className="plan-content" style={{ flex: 1 }}>
                    <h4>{plan.title}</h4>
                    {plan.description && <p>{plan.description}</p>}
                  </div>
                  <button
                    className="card-action-btn"
                    onClick={() => handleDeletePlan(plan.id)}
                    title="삭제"
                  >✕</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="card empty-state" style={{ padding: 30 }}>
              <p>아직 계획이 없어요. 주차별 읽기 분량을 추가해 보세요!</p>
            </div>
          )}
        </>
      ) : (
        <div className="card empty-state">
          <div className="empty-icon">📋</div>
          <p>아직 등록된 책이 없어요</p>
          <button className="btn btn-primary" onClick={() => setShowBookModal(true)}>
            첫 번째 책 추가하기
          </button>
        </div>
      )}

      {/* 책 추가 모달 */}
      {showBookModal && (
        <div className="modal-overlay" onClick={() => setShowBookModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>새 책 추가</h2>
            <form onSubmit={handleAddBook}>
              <div className="modal-field">
                <label>제목 *</label>
                <input value={bookForm.title} onChange={e => setBookForm({...bookForm, title: e.target.value})} required />
              </div>
              <div className="modal-field">
                <label>저자 *</label>
                <input value={bookForm.author} onChange={e => setBookForm({...bookForm, author: e.target.value})} required />
              </div>
              <div className="modal-field">
                <label>월 (YYYY-MM)</label>
                <input type="month" value={bookForm.year_month} onChange={e => setBookForm({...bookForm, year_month: e.target.value})} />
              </div>
              <div className="modal-field">
                <label>표지 이미지 URL</label>
                <input value={bookForm.cover_url} onChange={e => setBookForm({...bookForm, cover_url: e.target.value})} placeholder="https://..." />
              </div>
              <div className="modal-field">
                <label>설명</label>
                <textarea rows={3} value={bookForm.description} onChange={e => setBookForm({...bookForm, description: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div className="modal-field" style={{ flex: 1 }}>
                  <label>시작일</label>
                  <input type="date" value={bookForm.start_date} onChange={e => setBookForm({...bookForm, start_date: e.target.value})} />
                </div>
                <div className="modal-field" style={{ flex: 1 }}>
                  <label>종료일</label>
                  <input type="date" value={bookForm.end_date} onChange={e => setBookForm({...bookForm, end_date: e.target.value})} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowBookModal(false)}>취소</button>
                <button type="submit" className="btn btn-primary">추가</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 계획 추가 모달 */}
      {showPlanModal && (
        <div className="modal-overlay" onClick={() => setShowPlanModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>진행 계획 추가</h2>
            <form onSubmit={handleAddPlan}>
              <div className="modal-field">
                <label>제목 * (예: 1주차 - 1~3장)</label>
                <input value={planForm.title} onChange={e => setPlanForm({...planForm, title: e.target.value})} required />
              </div>
              <div className="modal-field">
                <label>설명</label>
                <textarea rows={2} value={planForm.description} onChange={e => setPlanForm({...planForm, description: e.target.value})} />
              </div>
              <div className="modal-field">
                <label>기한</label>
                <input type="date" value={planForm.due_date} onChange={e => setPlanForm({...planForm, due_date: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowPlanModal(false)}>취소</button>
                <button type="submit" className="btn btn-primary">추가</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
