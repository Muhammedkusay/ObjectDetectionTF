import { useEffect, useRef, useState } from 'react'
import './App.css'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import '@tensorflow/tfjs'
import Loading from './components/Loading'
import PredText from './components/PredText'

function App() {

  const videoRef = useRef(null)
  const modelRef = useRef(null)
  const canvasRef = useRef(null)

  const [isLoading, setIsLoading] = useState(false)
  const [predictions, setPredictions] = useState([])
  const [camera, setCamera] = useState('environment')

  useEffect(() => {

    const startWebcam = async () => {
      
      // if (videoRef.current.srcObject) {
      //   videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      // }

      const constraints = {
        video: { 
          facingMode: camera
        }
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        videoRef.current.srcObject = stream

        await videoRef.current.play().catch(err => {
          console.warn("Video play error:", err)
        })

      } catch (err) {
        console.error("Camera error:", err);
        setIsLoading(false)
      }

    }

    const loadModel = async () => {
      
      setIsLoading(true)

      try{
        modelRef.current = await cocoSsd.load()
        setIsLoading(false)
        await startWebcam()
        runDetection()
      } catch (err) {
        console.error("Model loading error:", err)
        setIsLoading(false)
      }
    }

    let frameCount = 0
    const runDetection = async() => {
      if (!modelRef.current || !videoRef.current) return
      
      if (videoRef.current.readyState < 2) {
        requestAnimationFrame(runDetection)
        return
      }

      frameCount++
      if (frameCount % 4 === 0) {
        await modelRef.current.detect(videoRef.current)
              .then(predictions => {
                drawPredictions(predictions)
                setPredictions(predictions)
              })
      }
      
      requestAnimationFrame(runDetection)
    }

     function drawPredictions(predictions) {
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

    loadModel()

  }, [camera])


  function handleCameraButton() {
    setCamera(prev => prev === 'environment' ? 'user' : 'environment')
  }

  return (
    <div className='h-4/5 md:h-screen flex justify-center items-center'>
      {isLoading 
        ?     
        <Loading />
        : (
          <>
          <div className='w-fit relative'>
            <video ref={videoRef} playsInline autoPlay muted className='w-full'/>
            <canvas ref={canvasRef} className='w-full absolute left-0 top-0'/>
            <button onClick={handleCameraButton} className='block w-48 absolute md:relative bottom-4 md:bottom-0 left-1/2 md:left-0 md:translate-x-0 -translate-x-1/2 bg-blue-100 text-blue-700 py-4 px-6 hover:bg-blue-200 border border-gray-200 cursor-pointer rounded-xl mt-6 mx-auto shadow-none'>
              Flip The Camera
            </button>
          </div>
          <PredText predictions={predictions} />
          </>
        )}
    </div>
  )
}

export default App
