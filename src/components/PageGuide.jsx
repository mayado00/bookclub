import { useState, useEffect, useRef } from 'react'

export default function PageGuide({ pageKey, title, steps }) {
  const storageKey = `bc_guide_${pageKey}`
  const [visible, setVisible] = useState(false)
  const [hasSeenBefore, setHasSeenBefore] = useState(true)
  const wrapperRef = useRef(null)

  useEffect(() => {
    const seen = localStorage.getItem(storageKey)
    if (!seen) {
      setVisible(true)
      setHasSeenBefore(false)
    }
  }, [])

  // 바깥 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        dismiss()
      }
    }
    if (visible) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [visible])

  const dismiss = () => {
    setVisible(false)
    if (!hasSeenBefore) {
      localStorage.setItem(storageKey, 'true')
      setHasSeenBefore(true)
    }
  }

  const toggle = () => setVisible(!visible)

  return (
    <div className="guide-wrapper" ref={wrapperRef}>
      <button className="guide-toggle" onClick={toggle} title="사용 가이드 보기">
        ?
      </button>
      {visible && (
        <div className="guide-popover">
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
          {!hasSeenBefore && (
            <button className="guide-dismiss" onClick={dismiss}>알겠어요!</button>
          )}
        </div>
      )}
    </div>
  )
}
