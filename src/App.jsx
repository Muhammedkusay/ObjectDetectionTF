import { useEffect, useRef, useState } from 'react'
import './App.css'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import '@tensorflow/tfjs'

function App() {

  const videoRef = useRef(null)
  const modelRef = useRef(null)
  const canvasRef = useRef(null)

  const [isLoading, setIsLoading] = useState(false)
  const [camera, setCamera] = useState('environment')

  useEffect(() => {

    setIsLoading(true)

    async function startWebcam() {
      // stop previous stream if exists
      if (videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      
      const constraints = {
        video: { 
          width: window.innerWidth < 600 ? 360 : 800,
          height: window.innerWidth < 600 ? 900 : 600,
          facingMode: camera
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      videoRef.current.srcObject = stream
      await videoRef.current.play()
    }

    async function loadModel() {
      modelRef.current = await cocoSsd.load({
        modelUrl: `${window.location.origin}/models/ssd_mobilenet_v2/model.json`
      })
      console.log('model loaded')
      setIsLoading(false)
      runDetection()
    }

    let frameCount = 0

    async function runDetection() {
      if(!modelRef.current || !videoRef.current) return

      if(videoRef.current.readyState < 2) {
        requestAnimationFrame(runDetection)
        return
      }

      frameCount++
      
      if(frameCount % 4 == 0) {
        try {
          const predictions = await modelRef.current.detect(videoRef.current)
          drawPredictions(predictions)
        } catch (err) {
          console.error("Detection error:", err)
        }
      }
      requestAnimationFrame(runDetection)
    }

    function drawPredictions(predictions) {
      const ctx = canvasRef.current.getContext("2d")
      const video = videoRef.current

      canvasRef.current.width = video.videoWidth
      canvasRef.current.height = video.videoHeight

      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

      predictions.forEach(pred => {
        const [x, y, width, height] = pred.bbox
        ctx.strokeStyle = "#00FF00"
        ctx.lineWidth = 2
        ctx.strokeRect(x, y, width, height)

        ctx.fillStyle = "#00FF00"
        ctx.font = "16px Arial"
        ctx.fillText(`${pred.class} ${(pred.score * 100).toFixed(1)}%`, x + 5, y + 20)
      })

    }

    startWebcam()
    loadModel()

  }, [camera])

  function handleCameraButton() {
    setCamera(prev => prev === 'environment' ? 'user' : 'environment')
  }

  return (
    <div className='parent-div'>
      {isLoading 
        ? 
        <p>Loading...</p> 
        :       
        (<div className='inner-div'>
          <video ref={videoRef} />
          <canvas ref={canvasRef} />
          <button onClick={handleCameraButton}>Flip The Camera</button>
        </div>)}
    </div>
  )
}

export default App
