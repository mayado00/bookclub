import { useState, useRef, useCallback } from 'react'
import ReactCrop from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

export default function ImageCropper({ aspect, onCropped, onCancel, title = '이미지 자르기' }) {
  const [src, setSrc] = useState(null)
  const [crop, setCrop] = useState(null)
  const [completedCrop, setCompletedCrop] = useState(null)
  const imgRef = useRef(null)
  const fileInputRef = useRef(null)

  const onSelectFile = (e) => {
    if (e.target.files?.length) {
      const reader = new FileReader()
      reader.onload = () => setSrc(reader.result)
      reader.readAsDataURL(e.target.files[0])
    }
  }

  const onImageLoad = useCallback((e) => {
    imgRef.current = e.currentTarget
    const { width, height } = e.currentTarget
    const size = Math.min(width, height)
    const x = (width - size) / 2
    const y = (height - size) / 2
    const cropPercent = {
      unit: '%',
      x: (x / width) * 100,
      y: (y / height) * 100,
      width: (size / width) * 100,
      height: (size / height) * 100,
    }
    if (aspect) {
      cropPercent.aspect = aspect
    }
    setCrop(cropPercent)
  }, [aspect])

  const getCroppedBlob = useCallback(() => {
    if (!imgRef.current || !completedCrop) return null

    const canvas = document.createElement('canvas')
    const image = imgRef.current
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    const pixelCrop = {
      x: completedCrop.x * scaleX,
      y: completedCrop.y * scaleY,
      width: completedCrop.width * scaleX,
      height: completedCrop.height * scaleY,
    }

    // 최대 출력 크기 제한 (프로필: 200px, 표지: 400px)
    const maxSize = aspect === 1 ? 200 : 400
    const outputW = Math.min(pixelCrop.width, maxSize)
    const outputH = aspect ? outputW / aspect : Math.min(pixelCrop.height, maxSize * 1.5)

    canvas.width = outputW
    canvas.height = outputH

    const ctx = canvas.getContext('2d')
    ctx.drawImage(
      image,
      pixelCrop.x, pixelCrop.y,
      pixelCrop.width, pixelCrop.height,
      0, 0, outputW, outputH
    )

    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    })
  }, [completedCrop, aspect])

  const handleConfirm = async () => {
    const blob = await getCroppedBlob()
    if (blob) onCropped(blob)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <h2>{title}</h2>

        {!src ? (
          <div
            className="crop-dropzone"
            onClick={() => fileInputRef.current?.click()}
          >
            <span style={{ fontSize: 32 }}>📷</span>
            <p>클릭하여 이미지를 선택하세요</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onSelectFile}
              hidden
            />
          </div>
        ) : (
          <div className="crop-container">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
              style={{ maxHeight: 400 }}
            >
              <img
                src={src}
                onLoad={onImageLoad}
                style={{ maxWidth: '100%', maxHeight: 400 }}
                alt=""
              />
            </ReactCrop>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>취소</button>
          {src && (
            <>
              <button className="btn btn-ghost" onClick={() => { setSrc(null); setCrop(null) }}>
                다시 선택
              </button>
              <button className="btn btn-primary" onClick={handleConfirm} disabled={!completedCrop}>
                확인
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
