import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function BookPlan({ nickname, emoji }) {
  const [books, setBooks] = useState([])
  const [notes, setNotes] = useState([])
  const [selectedBook, setSelectedBook] = useState(null)
  const [showBookModal, setShowBookModal] = useState(false)
  const [editingBook, setEditingBook] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [bookForm, setBookForm] = useState({
    title: '', author: '', description: '', cover_url: '',
    year_month: new Date().toISOString().slice(0, 7),
    start_date: '', end_date: '', status: 'reading'
  })
  const [noteForm, setNoteForm] = useState({ page: '', excerpt: '', thought: '' })
  const [loading, setLoading] = useState(true)
  const composingRef = useRef(false)

  useEffect(() => { loadBooks() }, [])
  useEffect(() => { if (selectedBook) loadNotes(selectedBook.id) }, [selectedBook])

  async function loadBooks() {
    const { data } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false })
    setBooks(data || [])
    if (data?.length && !selectedBook) setSelectedBook(data[0])
    setLoading(false)
  }

  async function loadNotes(bookId) {
    const { data } = await supabase
      .from('reading_plans')
      .select('*')
      .eq('book_id', bookId)
      .order('created_at', { ascending: false })
    setNotes(data || [])
  }

  async function handleAddBook(e) {
    e.preventDefault()
    if (editingBook) {
      const { data, error } = await supabase
        .from('books')
        .update(bookForm)
        .eq('id', editingBook.id)
        .select()
      if (!error && data) {
        setBooks(books.map(b => b.id === editingBook.id ? data[0] : b))
        if (selectedBook?.id === editingBook.id) setSelectedBook(data[0])
      }
    } else {
      const { data, error } = await supabase.from('books').insert([bookForm]).select()
      if (!error && data) {
        setBooks([data[0], ...books])
        setSelectedBook(data[0])
      }
    }
    closeBookModal()
  }

  function openEditBook(book) {
    setEditingBook(book)
    setBookForm({
      title: book.title, author: book.author,
      description: book.description || '', cover_url: book.cover_url || '',
      year_month: book.year_month || '', start_date: book.start_date || '',
      end_date: book.end_date || '', status: book.status || 'reading'
    })
    setShowBookModal(true)
  }

  function closeBookModal() {
    setShowBookModal(false)
    setEditingBook(null)
    setBookForm({
      title: '', author: '', description: '', cover_url: '',
      year_month: new Date().toISOString().slice(0, 7),
      start_date: '', end_date: '', status: 'reading'
    })
  }

  async function handleDeleteBook(book) {
    await supabase.from('reading_plans').delete().eq('book_id', book.id)
    await supabase.from('books').delete().eq('id', book.id)
    const remaining = books.filter(b => b.id !== book.id)
    setBooks(remaining)
    if (selectedBook?.id === book.id) setSelectedBook(remaining[0] || null)
    setShowDeleteConfirm(null)
  }

  async function handleAddNote(e) {
    e.preventDefault()
    if (!selectedBook || !nickname) return
    const { data, error } = await supabase
      .from('reading_plans')
      .insert([{
        book_id: selectedBook.id,
        title: noteForm.page ? `p.${noteForm.page}` : '',
        description: JSON.stringify({
          excerpt: noteForm.excerpt,
          thought: noteForm.thought,
          author: nickname,
          emoji: emoji || '😊',
        }),
        sort_order: notes.length,
      }])
      .select()
    if (!error && data) {
      setNotes([data[0], ...notes])
      setNoteForm({ page: '', excerpt: '', thought: '' })
    }
  }

  async function handleDeleteNote(id) {
    await supabase.from('reading_plans').delete().eq('id', id)
    setNotes(notes.filter(n => n.id !== id))
  }

  async function handleUpdateBookStatus(book, status) {
    await supabase.from('books').update({ status }).eq('id', book.id)
    setBooks(books.map(b => b.id === book.id ? { ...b, status } : b))
    if (selectedBook?.id === book.id) setSelectedBook({ ...book, status })
  }

  function parseNote(note) {
    try {
      const d = JSON.parse(note.description)
      return { page: note.title, excerpt: d.excerpt, thought: d.thought, author: d.author, emoji: d.emoji || '😊' }
    } catch {
      return { page: note.title, excerpt: '', thought: note.description || '', author: '', emoji: '😊' }
    }
  }

  const statusLabel = { upcoming: '예정', reading: '읽는 중', completed: '완독' }

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
                  <span className={`status-badge ${selectedBook.status}`}>
                    {statusLabel[selectedBook.status]}
                  </span>
                </div>
                <div className="author">{selectedBook.author}</div>
                {selectedBook.description && <div className="description">{selectedBook.description}</div>}
                <div className="book-meta">
                  <span>📅 {selectedBook.year_month}</span>
                  {selectedBook.start_date && <span>{selectedBook.start_date} ~ {selectedBook.end_date}</span>}
                </div>
                <div className="book-actions">
                  <button className="btn-icon" onClick={() => openEditBook(selectedBook)} title="편집">✏️</button>
                  <button className="btn-icon" onClick={() => setShowDeleteConfirm(selectedBook)} title="삭제" style={{ color: 'var(--danger)' }}>🗑️</button>
                  <select
                    value={selectedBook.status}
                    onChange={(e) => handleUpdateBookStatus(selectedBook, e.target.value)}
                    style={{
                      fontSize: 12, padding: '4px 10px', borderRadius: 8, marginLeft: 'auto',
                      border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-light)'
                    }}
                  >
                    <option value="upcoming">예정</option>
                    <option value="reading">읽는 중</option>
                    <option value="completed">완독</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 읽기 기록 작성 */}
          <div className="card mt-24" style={{ padding: 16 }}>
            <form onSubmit={handleAddNote} className="note-form">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <span className="note-form-avatar">{emoji || '😊'}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{nickname || '이름 없음'}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 80, flexShrink: 0 }}>
                  <div className="note-field-guide">페이지</div>
                  <input
                    style={{ width: '100%' }}
                    value={noteForm.page}
                    onChange={e => setNoteForm({...noteForm, page: e.target.value})}
                    placeholder="p.42"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="note-field-guide">기억하고 싶은 문장이나 내용</div>
                  <input
                    style={{ width: '100%' }}
                    value={noteForm.excerpt}
                    onChange={e => setNoteForm({...noteForm, excerpt: e.target.value})}
                    onCompositionStart={() => composingRef.current = true}
                    onCompositionEnd={() => composingRef.current = false}
                    placeholder="내용 한 줄 발췌..."
                  />
                </div>
              </div>
              <div>
                <div className="note-field-guide">이 부분을 읽고 든 생각</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <textarea
                    rows={2}
                    style={{ flex: 1, resize: 'none' }}
                    value={noteForm.thought}
                    onChange={e => setNoteForm({...noteForm, thought: e.target.value})}
                    onCompositionStart={() => composingRef.current = true}
                    onCompositionEnd={() => composingRef.current = false}
                    placeholder="자유롭게 적어보세요..."
                  />
                  <button type="submit" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-end' }}>
                    기록
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* 읽기 노트 목록 */}
          <div className="mt-24">
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>읽기 기록</h3>
            {notes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {notes.map((note) => {
                  const parsed = parseNote(note)
                  return (
                    <div key={note.id} className="card reading-note">
                      <div className="reading-note-header">
                        <span className="note-avatar">{parsed.emoji}</span>
                        <span className="note-author">{parsed.author}</span>
                        {parsed.page && <span className="note-page">{parsed.page}</span>}
                        <button
                          className="card-action-btn"
                          onClick={() => handleDeleteNote(note.id)}
                          style={{ marginLeft: 'auto' }}
                          title="삭제"
                        >✕</button>
                      </div>
                      {parsed.excerpt && (
                        <div className="note-excerpt">"{parsed.excerpt}"</div>
                      )}
                      {parsed.thought && (
                        <div className="note-thought">{parsed.thought}</div>
                      )}
                      <div className="note-time">
                        {new Date(note.created_at).toLocaleDateString('ko-KR', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="card empty-state" style={{ padding: 30 }}>
                <p>아직 기록이 없어요. 읽으면서 생각을 적어보세요!</p>
              </div>
            )}
          </div>
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

      {/* 삭제 확인 */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <h2>책 삭제</h2>
            <p style={{ fontSize: 14, color: 'var(--text-light)', margin: '8px 0 20px' }}>
              <strong>{showDeleteConfirm.title}</strong>을(를) 삭제하면 관련 기록도 함께 삭제됩니다. 계속할까요?
            </p>
            <div className="confirm-actions">
              <button className="btn btn-ghost" onClick={() => setShowDeleteConfirm(null)}>취소</button>
              <button className="btn btn-danger" onClick={() => handleDeleteBook(showDeleteConfirm)}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* 책 추가/편집 모달 */}
      {showBookModal && (
        <div className="modal-overlay" onClick={closeBookModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingBook ? '책 편집' : '새 책 추가'}</h2>
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
                <button type="button" className="btn btn-ghost" onClick={closeBookModal}>취소</button>
                <button type="submit" className="btn btn-primary">{editingBook ? '저장' : '추가'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
