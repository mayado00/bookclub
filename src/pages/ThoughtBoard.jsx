import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PageGuide from '../components/PageGuide'

const COLORS = [
  { name: 'lavender', value: '#EDE7F6', stroke: '#9575CD' },
  { name: 'sky', value: '#E3F2FD', stroke: '#64B5F6' },
  { name: 'mint', value: '#E0F7FA', stroke: '#4DB6AC' },
  { name: 'peach', value: '#FFF3E0', stroke: '#FFB74D' },
  { name: 'rose', value: '#FCE4EC', stroke: '#F06292' },
]

export default function ThoughtBoard({ nickname, emoji }) {
  const { bookId } = useParams()
  const [books, setBooks] = useState([])
  const [activeBookId, setActiveBookId] = useState(bookId || null)
  const [thoughts, setThoughts] = useState([])
  const [connections, setConnections] = useState([])
  const [comments, setComments] = useState([])
  const [memberEmojis, setMemberEmojis] = useState({})
  const [selectedCard, setSelectedCard] = useState(null)
  const [connecting, setConnecting] = useState(null)
  const [dragInfo, setDragInfo] = useState(null)
  const [newCardColor, setNewCardColor] = useState(COLORS[0].value)
  const [commentText, setCommentText] = useState('')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [panDrag, setPanDrag] = useState(null)
  const [hoveredConnection, setHoveredConnection] = useState(null)
  const boardRef = useRef(null)
  const svgRef = useRef(null)

  useEffect(() => { loadBooks(); loadMemberEmojis() }, [])
  useEffect(() => {
    if (activeBookId) {
      loadThoughts()
      loadConnections()
    }
  }, [activeBookId])

  useEffect(() => {
    if (selectedCard) loadComments(selectedCard.id)
  }, [selectedCard])

  async function loadMemberEmojis() {
    const { data } = await supabase.from('members').select('nickname, emoji')
    if (data) {
      const map = {}
      data.forEach(m => { if (m.nickname) map[m.nickname] = m.emoji || '😊' })
      setMemberEmojis(map)
    }
  }

  function getMemberEmoji(authorName) {
    return memberEmojis[authorName] || '😊'
  }

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

    const { data, error } = await supabase.from('thoughts').insert([{
      book_id: activeBookId,
      author_name: nickname,
      content: '',
      color: newCardColor,
      pos_x: x,
      pos_y: y,
    }]).select()

    if (error) {
      console.error('카드 생성 실패:', error)
      alert('카드를 만들 수 없어요. 권한을 확인해 주세요.')
      return
    }
    if (data) setThoughts([...thoughts, data[0]])
  }

  async function updateThoughtContent(id, content) {
    const { error } = await supabase.from('thoughts').update({ content }).eq('id', id)
    if (error) {
      console.error('카드 내용 수정 실패:', error)
      alert('카드 수정 권한이 없거나 오류가 발생했어요.')
      loadThoughts() // DB 상태로 복원
      return
    }
    setThoughts(thoughts.map(t => t.id === id ? { ...t, content } : t))
  }

  async function updateThoughtPosition(id, pos_x, pos_y) {
    const { error } = await supabase.from('thoughts').update({ pos_x, pos_y }).eq('id', id)
    if (error) {
      console.error('카드 이동 실패:', error)
      loadThoughts() // DB 상태로 복원
    }
  }

  async function deleteThought(id) {
    if (!confirm('이 카드를 삭제할까요?')) return
    const { error } = await supabase.from('thoughts').delete().eq('id', id)
    if (error) {
      console.error('카드 삭제 실패:', error)
      alert('카드 삭제 권한이 없거나 오류가 발생했어요.')
      return
    }
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

  async function deleteConnection(id) {
    await supabase.from('connections').delete().eq('id', id)
    setConnections(connections.filter(c => c.id !== id))
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

  const handleMouseDown = useCallback((e, thought) => {
    if (e.button !== 0) return // left click only
    
    if (connecting) {
      addConnection(connecting, thought.id)
      setConnecting(null)
      return
    }

    const rect = boardRef.current.getBoundingClientRect()
    setDragInfo({
      id: thought.id,
      offsetX: e.clientX - thought.pos_x - rect.left - pan.x,
      offsetY: e.clientY - thought.pos_y - rect.top - pan.y,
    })
  }, [connecting, pan])

  const handleTouchStart = useCallback((e, thought) => {
    if (connecting) {
      addConnection(connecting, thought.id)
      setConnecting(null)
      return
    }

    const touch = e.touches[0]
    const rect = boardRef.current.getBoundingClientRect()
    setDragInfo({
      id: thought.id,
      offsetX: touch.clientX - thought.pos_x - rect.left - pan.x,
      offsetY: touch.clientY - thought.pos_y - rect.top - pan.y,
    })
  }, [connecting, pan])

  const handleMouseMove = useCallback((e) => {
    if (panDrag) {
      const dx = e.clientX - panDrag.startX
      const dy = e.clientY - panDrag.startY
      setPan({ x: panDrag.startPan.x + dx, y: panDrag.startPan.y + dy })
      return
    }

    if (!dragInfo) return
    const rect = boardRef.current.getBoundingClientRect()
    const x = Math.max(0, e.clientX - rect.left - dragInfo.offsetX - pan.x)
    const y = Math.max(0, e.clientY - rect.top - dragInfo.offsetY - pan.y)
    setThoughts(prev =>
      prev.map(t => t.id === dragInfo.id ? { ...t, pos_x: x, pos_y: y } : t)
    )
  }, [dragInfo, panDrag, pan])

  const handleTouchMove = useCallback((e) => {
    if (!dragInfo) return
    const touch = e.touches[0]
    const rect = boardRef.current.getBoundingClientRect()
    const x = Math.max(0, touch.clientX - rect.left - dragInfo.offsetX - pan.x)
    const y = Math.max(0, touch.clientY - rect.top - dragInfo.offsetY - pan.y)
    setThoughts(prev =>
      prev.map(t => t.id === dragInfo.id ? { ...t, pos_x: x, pos_y: y } : t)
    )
  }, [dragInfo, pan])

  const handleMouseUp = useCallback(() => {
    if (dragInfo) {
      const t = thoughts.find(th => th.id === dragInfo.id)
      if (t) updateThoughtPosition(t.id, t.pos_x, t.pos_y)
      setDragInfo(null)
    }
    setPanDrag(null)
  }, [dragInfo, thoughts])

  const handleTouchEnd = useCallback(() => {
    if (dragInfo) {
      const t = thoughts.find(th => th.id === dragInfo.id)
      if (t) updateThoughtPosition(t.id, t.pos_x, t.pos_y)
      setDragInfo(null)
    }
  }, [dragInfo, thoughts])

  const handleWheel = useCallback((e) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    const rect = boardRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    const newZoom = Math.max(0.5, Math.min(3, zoom - e.deltaY * 0.001))
    const zoomDiff = newZoom - zoom
    
    setPan({
      x: pan.x - mouseX * zoomDiff / zoom,
      y: pan.y - mouseY * zoomDiff / zoom,
    })
    setZoom(newZoom)
  }, [zoom, pan])

  const handleBoardMouseDown = useCallback((e) => {
    if (e.button !== 1 && e.button !== 2 && !(e.button === 0 && e.shiftKey)) return // middle/right click or shift+left
    if (e.target !== boardRef.current) return
    e.preventDefault()
    
    setPanDrag({
      startX: e.clientX,
      startY: e.clientY,
      startPan: { ...pan },
    })
  }, [pan])

  function getCardCenter(thought) {
    return { x: thought.pos_x + 100, y: thought.pos_y + 50 }
  }

  function generateBezierPath(x1, y1, x2, y2) {
    const dx = x2 - x1
    const dy = y2 - y1
    const distance = Math.sqrt(dx * dx + dy * dy)
    const controlOffset = distance * 0.2
    
    const midX = (x1 + x2) / 2
    const midY = (y1 + y2) / 2
    const perpX = -dy / distance * controlOffset
    const perpY = dx / distance * controlOffset
    
    return `M ${x1} ${y1} Q ${midX + perpX} ${midY + perpY}, ${x2} ${y2}`
  }

  const resetZoom = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const activeBook = books.find(b => b.id === activeBookId)

  return (
    <div>
      <div className="flex-between page-header">
        <div>
          <h1>생각 보드</h1>
          <p>카드를 만들고 선으로 연결해서 생각의 흐름을 그려보세요</p>
        </div>
        <PageGuide
          pageKey="board"
          title="생각 보드 가이드"
          steps={[
            { icon: '🃏', label: '카드 만들기', desc: '+ 새 카드 버튼으로 생각 카드를 만들고 바로 내용을 적어요' },
            { icon: '🎨', label: '색상 선택', desc: '카드 색상을 골라서 주제별로 구분해 보세요' },
            { icon: '🔗', label: '연결하기', desc: '카드의 🔗 버튼을 누른 뒤 다른 카드를 클릭하면 선으로 이어져요' },
            { icon: '💬', label: '댓글 달기', desc: '카드를 클릭하면 오른쪽에 댓글 패널이 열려요' },
            { icon: '🔍', label: '줌/팬', desc: '마우스 휠(Cmd/Ctrl)로 확대하고, Shift나 중간 마우스로 보드를 이동해요' },
          ]}
        />
      </div>

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
          onMouseDown={handleBoardMouseDown}
          onWheel={handleWheel}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() => { if (!dragInfo) setSelectedCard(null) }}
        >
          <div className="board-toolbar">
            <button className="btn btn-primary btn-sm" data-tip="새 생각 카드 만들기" onClick={addThought}>
              + 새 카드
            </button>
            <div className="color-picker">
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
              <span className="board-connecting-hint">
                연결할 카드를 클릭하세요
                <button className="btn btn-sm btn-ghost" onClick={() => setConnecting(null)}>취소</button>
              </span>
            )}
            <div className="zoom-controls">
              <span className="zoom-level">{Math.round(zoom * 100)}%</span>
              <button className="btn btn-sm btn-ghost" onClick={resetZoom} title="줌 초기화">
                🔄
              </button>
            </div>
          </div>

          <svg 
            ref={svgRef}
            className="connections-svg"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              transition: panDrag ? 'none' : 'transform 0.1s',
            }}
          >
            {connections.map((conn) => {
              const from = thoughts.find(t => t.id === conn.from_thought_id)
              const to = thoughts.find(t => t.id === conn.to_thought_id)
              if (!from || !to) return null
              const a = getCardCenter(from)
              const b = getCardCenter(to)
              const pathData = generateBezierPath(a.x, a.y, b.x, b.y)
              
              return (
                <g key={conn.id}>
                  <path
                    d={pathData}
                    className="connection-path"
                    style={{
                      stroke: (COLORS.find(c => c.value === from.color)?.stroke) || COLORS[0].stroke,
                      opacity: hoveredConnection === conn.id ? 1 : 0.7,
                    }}
                    onMouseEnter={() => setHoveredConnection(conn.id)}
                    onMouseLeave={() => setHoveredConnection(null)}
                  />
                  {hoveredConnection === conn.id && (
                    <g className="connection-delete-btn">
                      <circle cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2} r="14" fill="white" stroke="#ddd" strokeWidth="1" />
                      <text 
                        x={(a.x + b.x) / 2} 
                        y={(a.y + b.y) / 2} 
                        textAnchor="middle" 
                        dy="0.35em" 
                        fontSize="12"
                        style={{ cursor: 'pointer' }}
                        onClick={() => deleteConnection(conn.id)}
                      >
                        ✕
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </svg>

          <div
            className="board-content"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              transition: panDrag ? 'none' : 'transform 0.1s',
            }}
          >
            {thoughts.map((thought) => (
              <div
                key={thought.id}
                className="thought-card"
                style={{
                  left: thought.pos_x,
                  top: thought.pos_y,
                  background: thought.color || COLORS[0].value,
                  zIndex: dragInfo?.id === thought.id ? 20 : 2,
                  border: selectedCard?.id === thought.id ? '2px solid var(--accent)' : '1px solid rgba(0,0,0,0.04)',
                }}
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, thought) }}
                onTouchStart={(e) => { e.stopPropagation(); handleTouchStart(e, thought) }}
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
                <div className="card-header">
                  <span className="card-emoji">{getMemberEmoji(thought.author_name)}</span>
                  <div className="card-author">{thought.author_name}</div>
                </div>
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
          </div>

          {selectedCard && (
            <div className="comment-panel" onClick={(e) => e.stopPropagation()}>
              <div className="comment-panel-header">
                <h3>💬 댓글</h3>
                <button className="card-action-btn" onClick={() => setSelectedCard(null)}>✕</button>
              </div>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-light)', fontSize: 13, background: selectedCard.color || '#fff' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 18 }}>{getMemberEmoji(selectedCard.author_name)}</span>
                  <strong>{selectedCard.author_name}</strong>
                </div>
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
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 14 }}>{getMemberEmoji(c.author_name)}</span>
                      <div className="comment-author">{c.author_name}</div>
                    </div>
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
