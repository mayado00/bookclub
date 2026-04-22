import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const COLORS = [
  { name: 'yellow', value: '#FFF8E7' },
  { name: 'pink', value: '#FFF0F0' },
  { name: 'blue', value: '#F0F4FF' },
  { name: 'green', value: '#F0FFF4' },
  { name: 'purple', value: '#F5F0FF' },
]

export default function ThoughtBoard({ nickname }) {
  const { bookId } = useParams()
  const [books, setBooks] = useState([])
  const [activeBookId, setActiveBookId] = useState(bookId || null)
  const [thoughts, setThoughts] = useState([])
  const [connections, setConnections] = useState([])
  const [comments, setComments] = useState([])
  const [selectedCard, setSelectedCard] = useState(null)
  const [connecting, setConnecting] = useState(null) // 연결 모드
  const [dragInfo, setDragInfo] = useState(null)
  const [newCardColor, setNewCardColor] = useState(COLORS[0].value)
  const [commentText, setCommentText] = useState('')
  const boardRef = useRef(null)

  useEffect(() => { loadBooks() }, [])
  useEffect(() => {
    if (activeBookId) {
      loadThoughts()
      loadConnections()
    }
  }, [activeBookId])

  useEffect(() => {
    if (selectedCard) loadComments(selectedCard.id)
  }, [selectedCard])

  async function loadBooks() {
    const { data } = await supabase
      .from('books')
      .select('*')
      .in('status', ['reading', 'completed'])
      .order('created_at', { ascending: false })
    setBooks(data || [])
    if (!activeBookId && data?.length) setActiveBookId(data[0].id)
  }

  async function loadThoughts() {
    const { data } = await supabase
      .from('thoughts')
      .select('*')
      .eq('book_id', activeBookId)
      .order('created_at')
    setThoughts(data || [])
  }

  async function loadConnections() {
    const { data } = await supabase
      .from('connections')
      .select('*')
      .eq('book_id', activeBookId)
    setConnections(data || [])
  }

  async function loadComments(thoughtId) {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('thought_id', thoughtId)
      .order('created_at')
    setComments(data || [])
  }

  async function addThought() {
    if (!activeBookId || !nickname) return
    const rect = boardRef.current?.getBoundingClientRect()
    const x = 80 + Math.random() * ((rect?.width || 600) - 280)
    const y = 60 + Math.random() * 300

    const { data } = await supabase.from('thoughts').insert([{
      book_id: activeBookId,
      author_name: nickname,
      content: '',
      color: newCardColor,
      pos_x: x,
      pos_y: y,
    }]).select()

    if (data) setThoughts([...thoughts, data[0]])
  }

  async function updateThoughtContent(id, content) {
    await supabase.from('thoughts').update({ content }).eq('id', id)
    setThoughts(thoughts.map(t => t.id === id ? { ...t, content } : t))
  }

  async function updateThoughtPosition(id, pos_x, pos_y) {
    await supabase.from('thoughts').update({ pos_x, pos_y }).eq('id', id)
    setThoughts(thoughts.map(t => t.id === id ? { ...t, pos_x, pos_y } : t))
  }

  async function deleteThought(id) {
    await supabase.from('thoughts').delete().eq('id', id)
    setThoughts(thoughts.filter(t => t.id !== id))
    setConnections(connections.filter(c => c.from_thought_id !== id && c.to_thought_id !== id))
    if (selectedCard?.id === id) setSelectedCard(null)
  }

  async function addConnection(fromId, toId) {
    if (fromId === toId) return
    const exists = connections.find(
      c => (c.from_thought_id === fromId && c.to_thought_id === toId) ||
           (c.from_thought_id === toId && c.to_thought_id === fromId)
    )
    if (exists) return

    const { data } = await supabase.from('connections').insert([{
      book_id: activeBookId,
      from_thought_id: fromId,
      to_thought_id: toId,
    }]).select()

    if (data) setConnections([...connections, data[0]])
  }

  async function addComment() {
    if (!selectedCard || !commentText.trim() || !nickname) return
    const { data } = await supabase.from('comments').insert([{
      thought_id: selectedCard.id,
      author_name: nickname,
      content: commentText.trim(),
    }]).select()

    if (data) {
      setComments([...comments, data[0]])
      setCommentText('')
    }
  }

  // 드래그 핸들러
  const handleMouseDown = useCallback((e, thought) => {
    if (connecting) {
      addConnection(connecting, thought.id)
      setConnecting(null)
      return
    }

    const rect = boardRef.current.getBoundingClientRect()
    setDragInfo({
      id: thought.id,
      offsetX: e.clientX - thought.pos_x - rect.left,
      offsetY: e.clientY - thought.pos_y - rect.top,
    })
  }, [connecting, thoughts])

  const handleMouseMove = useCallback((e) => {
    if (!dragInfo) return
    const rect = boardRef.current.getBoundingClientRect()
    const x = Math.max(0, e.clientX - rect.left - dragInfo.offsetX)
    const y = Math.max(0, e.clientY - rect.top - dragInfo.offsetY)
    setThoughts(prev =>
      prev.map(t => t.id === dragInfo.id ? { ...t, pos_x: x, pos_y: y } : t)
    )
  }, [dragInfo])

  const handleMouseUp = useCallback(() => {
    if (dragInfo) {
      const t = thoughts.find(th => th.id === dragInfo.id)
      if (t) updateThoughtPosition(t.id, t.pos_x, t.pos_y)
      setDragInfo(null)
    }
  }, [dragInfo, thoughts])

  function getCardCenter(thought) {
    return { x: thought.pos_x + 100, y: thought.pos_y + 50 }
  }

  const activeBook = books.find(b => b.id === activeBookId)

  return (
    <div>
      <div className="flex-between page-header">
        <div>
          <h1>생각 보드</h1>
          <p>카드를 만들고 선으로 연결해서 생각의 흐름을 그려보세요</p>
        </div>
      </div>

      {/* 책 선택 탭 */}
      {books.length > 0 && (
        <div className="book-tabs">
          {books.map((book) => (
            <button
              key={book.id}
              className={`book-tab ${activeBookId === book.id ? 'active' : ''}`}
              onClick={() => { setActiveBookId(book.id); setSelectedCard(null) }}
            >
              {book.title}
            </button>
          ))}
        </div>
      )}

      {!activeBookId ? (
        <div className="card empty-state">
          <div className="empty-icon">💭</div>
          <p>먼저 독서 계획에서 책을 추가해 주세요</p>
        </div>
      ) : (
        <div
          className="board-container"
          ref={boardRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={() => { if (!dragInfo) setSelectedCard(null) }}
        >
          {/* 툴바 */}
          <div className="board-toolbar">
            <button className="btn btn-primary btn-sm" onClick={addThought}>
              + 새 카드
            </button>
            <div className="color-picker" style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
              {COLORS.map(c => (
                <button
                  key={c.name}
                  className={`color-dot ${newCardColor === c.value ? 'selected' : ''}`}
                  style={{ background: c.value }}
                  onClick={() => setNewCardColor(c.value)}
                />
              ))}
            </div>
            {connecting && (
              <span style={{ fontSize: 12, color: 'var(--accent)', alignSelf: 'center', marginLeft: 8 }}>
                연결할 카드를 클릭하세요
                <button className="btn btn-sm btn-ghost" style={{ marginLeft: 6 }} onClick={() => setConnecting(null)}>취소</button>
              </span>
            )}
          </div>

          {/* SVG 연결선 */}
          <svg className="connections-svg">
            {connections.map((conn) => {
              const from = thoughts.find(t => t.id === conn.from_thought_id)
              const to = thoughts.find(t => t.id === conn.to_thought_id)
              if (!from || !to) return null
              const a = getCardCenter(from)
              const b = getCardCenter(to)
              return (
                <line key={conn.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
              )
            })}
          </svg>

          {/* 카드들 */}
          {thoughts.map((thought) => (
            <div
              key={thought.id}
              className="thought-card"
              style={{
                left: thought.pos_x,
                top: thought.pos_y,
                background: thought.color || COLORS[0].value,
                zIndex: dragInfo?.id === thought.id ? 20 : 2,
                border: selectedCard?.id === thought.id ? '2px solid var(--accent)' : '1px solid transparent',
              }}
              onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, thought) }}
              onClick={(e) => { e.stopPropagation(); setSelectedCard(thought) }}
            >
              <div className="card-actions">
                <button
                  className="card-action-btn"
                  title="연결"
                  onClick={(e) => { e.stopPropagation(); setConnecting(thought.id) }}
                >🔗</button>
                <button
                  className="card-action-btn"
                  title="삭제"
                  onClick={(e) => { e.stopPropagation(); deleteThought(thought.id) }}
                >✕</button>
              </div>
              <div className="card-author">{thought.author_name}</div>
              <div
                className="card-content"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateThoughtContent(thought.id, e.target.innerText)}
                style={{ minHeight: 40, outline: 'none' }}
              >
                {thought.content || '여기에 생각을 적어보세요...'}
              </div>
              <div className="card-time">
                {new Date(thought.created_at).toLocaleDateString('ko-KR', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </div>
            </div>
          ))}

          {/* 댓글 패널 */}
          {selectedCard && (
            <div className="comment-panel" onClick={(e) => e.stopPropagation()}>
              <div className="comment-panel-header">
                <h3>💬 댓글</h3>
                <button className="card-action-btn" onClick={() => setSelectedCard(null)}>✕</button>
              </div>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-light)', fontSize: 13, background: selectedCard.color || '#fff' }}>
                <strong>{selectedCard.author_name}</strong>
                <p style={{ marginTop: 4 }}>{selectedCard.content}</p>
              </div>
              <div className="comment-list">
                {comments.length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--text-light)', textAlign: 'center', padding: 20 }}>
                    아직 댓글이 없어요
                  </p>
                )}
                {comments.map((c) => (
                  <div key={c.id} className="comment-item">
                    <div className="comment-author">{c.author_name}</div>
                    <div>{c.content}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-light)', marginTop: 4 }}>
                      {new Date(c.created_at).toLocaleDateString('ko-KR', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="comment-input-area">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="댓글을 입력하세요..."
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment() } }}
                />
                <button className="btn btn-primary btn-sm" onClick={addComment} style={{ alignSelf: 'flex-end' }}>
                  전송
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
