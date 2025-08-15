import { useEffect, useRef, useState } from 'react'
import './App.css'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import '@tensorflow/tfjs'

function App() {

  const videoRef = useRef(null)
  const modelRef = useRef(null)
  const canvasRef = useRef(null)
  const isMounted = useRef(true)
  const animationFrameId = useRef(null)

  const [isLoading, setIsLoading] = useState(false)
  const [camera, setCamera] = useState('environment')

  useEffect(() => {

    isMounted.current = true

    const startWebcam = async () => {
      if (!isMounted.current || !videoRef.current) return

      if (videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: { 
          width: window.innerWidth < 768 ? 360 : 800,
          height: 600,
          facingMode: camera
        }
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        if (!isMounted.current) {
          stream.getTracks().forEach(track => track.stop())
          return
        }

        videoRef.current.srcObject = stream
        videoRef.current.muted = true

        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = resolve
        })

        await videoRef.current.play().catch(err => {
          console.warn("Video play error:", err)
        })

      } catch (err) {
        console.error("Camera error:", err);
        if (isMounted.current) setIsLoading(false)
      }

    }

    const loadModel = async () => {
      
      try{
        modelRef.current = await cocoSsd.load()
        if (!isMounted.current) return

        console.log('model loaded')
        setIsLoading(false)
        await startWebcam()
        runDetection()
      } catch (err) {
        console.error("Model loading error:", err)
        if (isMounted.current) setIsLoading(false)
      }
    }

    let frameCount = 0
    const runDetection = () => {
      if (!isMounted.current || !modelRef.current || !videoRef.current) return
      
      if (videoRef.current.readyState < 2) {
        animationFrameId.current = requestAnimationFrame(runDetection)
        return
      }

      frameCount++
      if (frameCount % 4 === 0) {
        modelRef.current.detect(videoRef.current)
          .then(drawPredictions)
          .catch(err => console.error("Detection error:", err))
      }
      
      animationFrameId.current = requestAnimationFrame(runDetection)
    }

     const drawPredictions = (predictions) => {
      if (!canvasRef.current || !videoRef.current) return
      
      const ctx = canvasRef.current.getContext("2d")
      const video = videoRef.current

      // Only resize if dimensions changed
      if (canvasRef.current.width !== video.videoWidth || 
          canvasRef.current.height !== video.videoHeight) {
        canvasRef.current.width = video.videoWidth
        canvasRef.current.height = video.videoHeight
      }

      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

      // Filter out low-confidence predictions
      predictions
        .filter(pred => pred.score > 0.5)
        .forEach(pred => {
          const [x, y, width, height] = pred.bbox
          ctx.strokeStyle = "#00FF00"
          ctx.lineWidth = 2
          ctx.strokeRect(x, y, width, height)

          ctx.fillStyle = "#00FF00"
          ctx.font = "16px Arial"
          ctx.fillText(
            `${pred.class} ${(pred.score * 100).toFixed(1)}%`, 
            x + 5, 
            y + 20
          )
        })
    }

    setIsLoading(true)
    loadModel()

    return () => {
      isMounted.current = false
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
      }
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop())
      }
    }
  }, [camera])


  function handleCameraButton() {
    setCamera(prev => prev === 'environment' ? 'user' : 'environment')
  }

  return (
    <div className='parent-div'>
      {isLoading 
        ? <p>Loading...</p> 
        : (
          <div className='inner-div'>
            <video ref={videoRef} playsInline />
            <canvas ref={canvasRef} />
            <button onClick={handleCameraButton}>Flip The Camera</button>
          </div>
        )}
    </div>
  )
}

export default App
