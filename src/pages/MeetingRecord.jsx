import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function MeetingRecord({ nickname }) {
  const [books, setBooks] = useState([])
  const [meetings, setMeetings] = useState([])
  const [photos, setPhotos] = useState({})
  const [selectedBook, setSelectedBook] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [lightboxImg, setLightboxImg] = useState(null)
  const [form, setForm] = useState({ title: '', meeting_date: '', summary: '' })
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadBooks() }, [])
  useEffect(() => { if (selectedBook) loadMeetings(selectedBook.id) }, [selectedBook])

  async function loadBooks() {
    const { data } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false })
    setBooks(data || [])
    if (data?.length) setSelectedBook(data[0])
    setLoading(false)
  }

  async function loadMeetings(bookId) {
    const { data } = await supabase
      .from('meetings')
      .select('*')
      .eq('book_id', bookId)
      .order('meeting_date', { ascending: false })

    setMeetings(data || [])

    // 각 모임의 사진 로드
    if (data?.length) {
      const photoMap = {}
      for (const m of data) {
        const { data: p } = await supabase
          .from('meeting_photos')
          .select('*')
          .eq('meeting_id', m.id)
          .order('created_at')
        photoMap[m.id] = p || []
      }
      setPhotos(photoMap)
    }
  }

  async function handleAddMeeting(e) {
    e.preventDefault()
    if (!selectedBook) return
    const { data, error } = await supabase
      .from('meetings')
      .insert([{ ...form, book_id: selectedBook.id }])
      .select()
    if (!error && data) {
      setMeetings([data[0], ...meetings])
      setShowModal(false)
      setForm({ title: '', meeting_date: '', summary: '' })
    }
  }

  async function handlePhotoUpload(meetingId, files) {
    setUploading(true)
    const newPhotos = []

    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${meetingId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('meeting-photos')
        .upload(path, file)

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('meeting-photos')
          .getPublicUrl(path)

        const { data: photoData } = await supabase
          .from('meeting_photos')
          .insert([{ meeting_id: meetingId, photo_url: urlData.publicUrl }])
          .select()

        if (photoData) newPhotos.push(photoData[0])
      }
    }

    setPhotos(prev => ({
      ...prev,
      [meetingId]: [...(prev[meetingId] || []), ...newPhotos]
    }))
    setUploading(false)
  }

  async function handleUpdateSummary(meetingId, summary) {
    await supabase.from('meetings').update({ summary }).eq('id', meetingId)
    setMeetings(meetings.map(m => m.id === meetingId ? { ...m, summary } : m))
  }

  if (loading) return <div className="empty-state"><div className="empty-icon">⏳</div><p>불러오는 중...</p></div>

  return (
    <div>
      <div className="flex-between page-header">
        <div>
          <h1>모임 기록</h1>
          <p>함께한 시간을 기록하고 추억해요</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + 모임 기록 추가
        </button>
      </div>

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

      {meetings.length > 0 ? (
        meetings.map((meeting) => (
          <div key={meeting.id} className="card meeting-card">
            <div className="meeting-date">
              📅 {new Date(meeting.meeting_date).toLocaleDateString('ko-KR', {
                year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
              })}
            </div>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>{meeting.title}</h3>

            <div className="meeting-summary">
              <textarea
                style={{
                  width: '100%', minHeight: 80, resize: 'vertical',
                  border: '1px solid var(--border-light)', borderRadius: 8,
                  padding: 12, fontSize: 14, lineHeight: 1.7,
                  background: 'var(--bg)', fontFamily: 'var(--sans)',
                }}
                defaultValue={meeting.summary || ''}
                placeholder="모임에서 나눈 이야기를 자유롭게 기록해 보세요..."
                onBlur={(e) => handleUpdateSummary(meeting.id, e.target.value)}
              />
            </div>

            {/* 사진 */}
            <div style={{ marginTop: 12 }}>
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>📸 사진</span>
                <label className="btn btn-sm btn-ghost" style={{ cursor: 'pointer' }}>
                  {uploading ? '업로드 중...' : '+ 사진 추가'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(e) => handlePhotoUpload(meeting.id, Array.from(e.target.files))}
                  />
                </label>
              </div>
              {photos[meeting.id]?.length > 0 ? (
                <div className="photo-grid">
                  {photos[meeting.id].map((photo) => (
                    <img
                      key={photo.id}
                      src={photo.photo_url}
                      alt=""
                      onClick={() => setLightboxImg(photo.photo_url)}
                    />
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--text-light)' }}>아직 사진이 없어요</p>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="card empty-state">
          <div className="empty-icon">📸</div>
          <p>아직 모임 기록이 없어요</p>
        </div>
      )}

      {/* 사진 라이트박스 */}
      {lightboxImg && (
        <div className="lightbox" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="" />
        </div>
      )}

      {/* 모임 추가 모달 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>모임 기록 추가</h2>
            <form onSubmit={handleAddMeeting}>
              <div className="modal-field">
                <label>모임 제목 *</label>
                <input
                  value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  placeholder="예: 4월 정기 모임"
                  required
                />
              </div>
              <div className="modal-field">
                <label>모임 날짜 *</label>
                <input
                  type="date"
                  value={form.meeting_date}
                  onChange={e => setForm({...form, meeting_date: e.target.value})}
                  required
                />
              </div>
              <div className="modal-field">
                <label>간단 메모</label>
                <textarea
                  rows={3}
                  value={form.summary}
                  onChange={e => setForm({...form, summary: e.target.value})}
                  placeholder="모임에 대한 간단한 메모..."
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>취소</button>
                <button type="submit" className="btn btn-primary">추가</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
