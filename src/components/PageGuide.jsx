import { useState, useEffect } from 'react'

export default function PageGuide({ pageKey, title, steps }) {
  const storageKey = `bc_guide_${pageKey}`
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem(storageKey)
    if (!seen) setVisible(true)
  }, [])

  const dismiss = () => {
    setVisible(false)
    localStorage.setItem(storageKey, 'true')
  }

  const reopen = () => setVisible(true)

  if (!visible) {
    return (
      <button className="guide-toggle" onClick={reopen} title="사용 가이드 보기">
        ?
      </button>
    )
  }

  return (
    <div className="guide-card">
      <div className="guide-header">
        <h4>{title}</h4>
        <button className="guide-close" onClick={dismiss}>✕</button>
      </div>
      <div className="guide-steps">
        {steps.map((step, i) => (
          <div key={i} className="guide-step">
            <span className="guide-step-icon">{step.icon}</span>
            <div>
              <strong>{step.label}</strong>
              <p>{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <button className="guide-dismiss" onClick={dismiss}>알겠어요!</button>
    </div>
  )
}
