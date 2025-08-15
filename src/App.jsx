import { useEffect, useRef, useState } from 'react'
import './App.css'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import '@tensorflow/tfjs'

function App() {

  const videoRef = useRef(null)
  const modelRef = useRef(null)
  const canvasRef = useRef(null)

  const [predictionsArr, setPredictionsArr] = useState([])
  const [camera, setCamera] = useState('environment')

  useEffect(() => {

    async function startWebcam() {
      // stop previous stream if exists
      if (videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 800, height: 600, facingMode: camera }  // use 'user' for front camera
      })
      videoRef.current.srcObject = stream
      await videoRef.current.play()
    }

    async function loadModel() {
      modelRef.current = await cocoSsd.load()
      console.log('model loaded')
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
        const predictions = await modelRef.current.detect(videoRef.current)
        console.log(predictions)
        drawPredictions(predictions)
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
        ctx.strokeRect(x+70, y, width, height)

        ctx.fillStyle = "#00FF00"
        ctx.font = "16px Arial"
        ctx.fillText(`${pred.class} ${(pred.score * 100).toFixed(1)}%`, x + 80, y + 20)
      })

    }

    startWebcam()
    loadModel()

  }, [camera])

  function handleCameraButton() {
    if(camera === 'environment') setCamera('user')
    else setCamera('environment')
  }

  return (
    <div className='parent-div'>
      <div className='inner-div'>
        <video ref={videoRef} />
        <canvas ref={canvasRef} />
        <button onClick={handleCameraButton}>Flip The Camera</button>
      </div>
    </div>
  )
}

export default App
