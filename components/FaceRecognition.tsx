// components/FaceRecognition.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

interface FaceRecognitionProps {
  onCapture: (photoBase64: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
  type: "CLOCK_IN" | "CLOCK_OUT";
  isOpen: boolean;
}

export default function FaceRecognition({ 
  onCapture, 
  onError, 
  onClose,
  type, 
  isOpen 
}: FaceRecognitionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const streamRef = useRef<MediaStream | null>(null);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
        setIsModelLoaded(true);
      } catch (error) {
        console.error("Failed to load face models:", error);
        onError?.("Gagal load model face detection");
      }
    };
    
    if (isOpen) {
      loadModels();
    }
  }, [isOpen, onError]);

  // Start camera
  useEffect(() => {
    if (!isOpen || !isModelLoaded) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user"
          } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
          };
        }
      } catch (error) {
        onError?.("Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.");
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, isModelLoaded, onError]);

  // Countdown and capture
  useEffect(() => {
    if (!isOpen || !isModelLoaded || !videoRef.current || isDetecting) return;

    let countdownInterval: NodeJS.Timeout;
    let captureTimeout: NodeJS.Timeout;

    const startCountdown = () => {
      setCountdown(3);
      countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            capturePhoto();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const capturePhoto = async () => {
      if (!videoRef.current) return;
      
      setIsDetecting(true);
      
      try {
        // Detect face
        const detection = await faceapi.detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        );

        if (!detection) {
          onError?.("Wajah tidak terdeteksi. Pastikan wajah Anda terlihat jelas.");
          setIsDetecting(false);
          setCountdown(3);
          captureTimeout = setTimeout(startCountdown, 2000);
          return;
        }

        // Draw detection box
        if (canvasRef.current && videoRef.current) {
          const displaySize = { 
            width: videoRef.current.videoWidth, 
            height: videoRef.current.videoHeight 
          };
          faceapi.matchDimensions(canvasRef.current, displaySize);
          const resizedDetection = faceapi.resizeResults(detection, displaySize);
          
          const context = canvasRef.current.getContext("2d");
          if (context) {
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            faceapi.draw.drawDetections(canvasRef.current, [resizedDetection]);
            
            // Draw countdown text
            context.font = "bold 48px Arial";
            context.fillStyle = "white";
            context.shadowColor = "black";
            context.shadowBlur = 10;
            context.fillText("📸", canvasRef.current.width / 2 - 30, 80);
          }
        }

        // Capture photo
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        // Compress and convert to base64
        const photoBase64 = canvas.toDataURL("image/jpeg", 0.8);
        onCapture(photoBase64);
        
      } catch (error) {
        console.error("Detection error:", error);
        onError?.("Error saat deteksi wajah");
      } finally {
        setIsDetecting(false);
      }
    };

    const timer = setTimeout(startCountdown, 1000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(countdownInterval);
      clearTimeout(captureTimeout);
    };
  }, [isOpen, isModelLoaded, onCapture, onError, isDetecting]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full overflow-hidden shadow-xl">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {type === "CLOCK_IN" ? "Absen Masuk" : "Absen Pulang"} dengan Face Recognition
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="p-4">
          <div className="relative bg-gray-900 rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full rounded-lg"
              style={{ transform: "scaleX(-1)" }}
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
              style={{ transform: "scaleX(-1)" }}
            />
            
            {!isModelLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p>Memuat model face detection...</p>
                </div>
              </div>
            )}
            
            {isModelLoaded && countdown > 0 && !isDetecting && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black bg-opacity-70 rounded-full w-24 h-24 flex items-center justify-center">
                  <span className="text-white text-5xl font-bold">{countdown}</span>
                </div>
              </div>
            )}
            
            {isDetecting && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black bg-opacity-70 rounded-lg p-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p className="text-white text-sm">Memproses...</p>
                </div>
              </div>
            )}
          </div>
          
          <p className="text-sm text-gray-500 mt-4 text-center">
            Pastikan wajah Anda terlihat jelas dan cahaya cukup
          </p>
        </div>
      </div>
    </div>
  );
}