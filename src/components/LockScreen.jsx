import { useState } from 'react'

export default function LockScreen({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!onLogin(password)) {
      setError(true)
      setShake(true)
      setTimeout(() => setShake(false), 500)
      setPassword('')
    }
  }

  return (
    <div className="lock-screen">
      <div className="lock-icon">📚</div>
      <h1>냠냠</h1>
      <p>비밀번호를 입력해 주세요</p>
      <form className="lock-form" onSubmit={handleSubmit}>
        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(false) }}
          placeholder="••••"
          autoFocus
          style={shake ? { animation: 'shake 0.5s ease' } : {}}
        />
        <button type="submit">입장</button>
      </form>
      {error && <span className="lock-error">비밀번호가 틀렸어요</span>}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  )
}
