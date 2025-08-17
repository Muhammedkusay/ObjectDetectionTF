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

    const startWebcam = async () => {
      
      // if (videoRef.current.srcObject) {
      //   videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      // }

      const constraints = {
        video: { 
          width: window.innerWidth < 768 ? {ideal: window.innerWidth} : 800,
          height: window.innerWidth < 768 ? {ideal: window.innerHeight} : 600,
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
        console.log('model loaded')
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
              .then(predictions => drawPredictions(predictions))
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
        <div role="status" className='mt-12'>
          <svg aria-hidden="true" className="w-8 h-8 text-gray-200 animate-spin fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/><path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/></svg>
          <span className="sr-only">Loading...</span>
        </div>
        : (
          <div className='w-fit relative'>
            <video ref={videoRef} playsInline autoPlay muted className='w-full'/>
            <canvas ref={canvasRef} className='absolute left-0 top-0'/>
            <button onClick={handleCameraButton} className='block w-48 absolute md:relative bottom-4 md:bottom-0 left-1/2 md:left-0 md:translate-x-0 -translate-x-1/2 bg-blue-100 text-blue-700 py-4 px-6 hover:bg-blue-200 border border-gray-200 cursor-pointer rounded-xl mt-6 mx-auto shadow-sm'>
              Flip The Camera
            </button>
          </div>
        )}
    </div>
  )
}

export default App
