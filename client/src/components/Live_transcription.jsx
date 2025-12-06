import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import API_BASE_URL from '../config/api'

const LiveTranscription = ({ setTranscription, setLoading }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState('')
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [audioQuality, setAudioQuality] = useState('checking')
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)
  const streamRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animationFrameRef = useRef(null)
  const gainNodeRef = useRef(null)

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } else {
      clearInterval(timerRef.current)
      setRecordingTime(0)
    }

    return () => clearInterval(timerRef.current)
  }, [isRecording])

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  const cleanup = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    clearInterval(timerRef.current)
    setAudioQuality('checking')
    setAudioLevel(0)
  }

  // Advanced audio processing and noise suppression
  const setupAdvancedAudioProcessing = (stream) => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      
      // Create audio processing chain
      const source = audioContextRef.current.createMediaStreamSource(stream)
      
      // Gain control for volume normalization
      gainNodeRef.current = audioContextRef.current.createGain()
      gainNodeRef.current.gain.value = 2.0 // Boost quiet audio
      
      // Advanced analyzer for real-time monitoring
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 4096 // Higher resolution
      analyserRef.current.smoothingTimeConstant = 0.2 // Responsive
      analyserRef.current.minDecibels = -90
      analyserRef.current.maxDecibels = -10
      
      // Connect processing chain
      source.connect(gainNodeRef.current)
      gainNodeRef.current.connect(analyserRef.current)
      
      const frequencyData = new Uint8Array(analyserRef.current.frequencyBinCount)
      const timeData = new Uint8Array(analyserRef.current.fftSize)
      
      const processAudio = () => {
        if (!isRecording) return
        
        analyserRef.current.getByteFrequencyData(frequencyData)
        analyserRef.current.getByteTimeDomainData(timeData)
        
        // Calculate speech frequency range (300Hz - 3400Hz - human voice)
        const sampleRate = audioContextRef.current.sampleRate
        const nyquist = sampleRate / 2
        const binSize = nyquist / frequencyData.length
        
        const speechStart = Math.floor(300 / binSize)   // 300Hz
        const speechEnd = Math.floor(3400 / binSize)    // 3400Hz
        
        // Calculate speech energy vs noise
        let speechEnergy = 0
        let totalEnergy = 0
        let noiseEnergy = 0
        
        for (let i = 0; i < frequencyData.length; i++) {
          const energy = frequencyData[i]
          totalEnergy += energy
          
          if (i >= speechStart && i <= speechEnd) {
            speechEnergy += energy
          } else if (i < speechStart || i > speechEnd) {
            noiseEnergy += energy / 2 // Weight noise less
          }
        }
        
        // Calculate signal-to-noise ratio
        const speechRatio = speechEnergy / (totalEnergy || 1)
        const snr = speechEnergy / (noiseEnergy || 1)
        
        // Dynamic gain adjustment based on signal strength
        if (speechEnergy > 0) {
          const targetGain = Math.max(1.0, Math.min(3.0, 100 / speechEnergy))
          gainNodeRef.current.gain.value = gainNodeRef.current.gain.value * 0.9 + targetGain * 0.1
        }
        
        // Audio quality assessment
        let quality = 'poor'
        if (snr > 3 && speechRatio > 0.3) {
          quality = 'excellent'
        } else if (snr > 2 && speechRatio > 0.2) {
          quality = 'good'
        } else if (snr > 1.5 && speechRatio > 0.1) {
          quality = 'fair'
        }
        
        setAudioQuality(quality)
        
        // Audio level visualization (focus on speech frequencies)
        const speechLevel = Math.min(100, (speechEnergy / 50) * 100)
        setAudioLevel(speechLevel)
        
        animationFrameRef.current = requestAnimationFrame(processAudio)
      }
      
      processAudio()
    } catch (err) {
      console.warn('Advanced audio processing not available:', err)
      setAudioQuality('basic')
    }
  }

  // Optimized audio constraints for clear speech capture
  const getOptimalAudioConstraints = async () => {
    const constraintSets = [
      // Highest quality for speech recognition
      {
        audio: {
          sampleRate: { ideal: 48000, min: 16000 },
          sampleSize: { ideal: 16 },
          channelCount: { exact: 1 }, // Mono for speech
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          // Advanced Chrome constraints
          googEchoCancellation: { ideal: true },
          googAutoGainControl: { ideal: true },
          googNoiseSuppression: { ideal: true },
          googHighpassFilter: { ideal: true },
          googTypingNoiseDetection: { ideal: true },
          googAudioMirroring: { ideal: false },
          // Speech-specific constraints
          googAGC: { ideal: true },
          googNS: { ideal: true },
          googEchoCancellation2: { ideal: true },
          googDAEchoCancellation: { ideal: true }
        }
      },
      // High quality fallback
      {
        audio: {
          sampleRate: { ideal: 44100, min: 16000 },
          channelCount: { ideal: 1 },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          googNoiseSuppression: true,
          googEchoCancellation: true
        }
      },
      // Standard quality
      {
        audio: {
          sampleRate: 16000, // Standard for speech
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      },
      // Basic fallback
      {
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      },
      // Last resort
      { audio: true }
    ]

    for (let i = 0; i < constraintSets.length; i++) {
      try {
        const testStream = await navigator.mediaDevices.getUserMedia(constraintSets[i])
        const track = testStream.getAudioTracks()[0]
        
        if (track) {
          const settings = track.getSettings()
          console.log(`Audio setup successful (attempt ${i + 1}):`, {
            sampleRate: settings.sampleRate,
            channelCount: settings.channelCount,
            echoCancellation: settings.echoCancellation,
            noiseSuppression: settings.noiseSuppression,
            autoGainControl: settings.autoGainControl
          })
          
          testStream.getTracks().forEach(track => track.stop())
          return constraintSets[i]
        }
        
        testStream.getTracks().forEach(track => track.stop())
      } catch (err) {
        console.warn(`Audio constraint attempt ${i + 1} failed:`, err.message)
        continue
      }
    }

    throw new Error('Unable to access microphone with any configuration')
  }

  // Best MIME type for speech clarity
  const getBestMimeType = () => {
    const speechTypes = [
      'audio/wav', // Best for speech recognition
      'audio/webm;codecs=opus', // Good compression, good quality
      'audio/webm;codecs=pcm', // Uncompressed
      'audio/webm',
      'audio/mp4;codecs=mp4a.40.2', // AAC
      'audio/ogg;codecs=opus'
    ]

    for (const type of speechTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('Using MIME type for speech:', type)
        return type
      }
    }

    return 'audio/webm' // Fallback
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const startRecording = async () => {
    try {
      setError('')
      setLoading(true)
      setAudioQuality('initializing')
      
      const constraints = await getOptimalAudioConstraints()
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      streamRef.current = stream
      
      // Setup advanced audio processing
      setupAdvancedAudioProcessing(stream)
      
      const mimeType = getBestMimeType()
      
      // Optimized MediaRecorder settings for speech
      const options = {
        mimeType,
        audioBitsPerSecond: 128000, // High quality for clarity
        bitsPerSecond: 128000
      }

      mediaRecorderRef.current = new MediaRecorder(stream, options)
      audioChunksRef.current = []

      let totalChunks = 0
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
          totalChunks++
          console.log(`Clear audio chunk ${totalChunks}: ${event.data.size} bytes`)
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        console.log('Processing clear audio recording...')
        
        if (audioChunksRef.current.length === 0) {
          setError('No audio captured. Please check microphone and speak louder.')
          setLoading(false)
          return
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        
        console.log('Clear audio blob created:', {
          size: audioBlob.size,
          type: audioBlob.type,
          chunks: audioChunksRef.current.length,
          quality: audioQuality
        })
        
        cleanup()
        setIsRecording(false)
        
        if (audioBlob.size > 3000) { // Minimum 3KB for clear audio
          await sendAudioToServer(audioBlob)
        } else {
          setError('Recording too short. Please record at least 2-3 seconds of clear speech.')
          setLoading(false)
        }
      }

      mediaRecorderRef.current.onerror = (event) => {
        console.error('Recording error:', event.error)
        setError('Recording failed. Please try again.')
        setIsRecording(false)
        setLoading(false)
        cleanup()
      }

      mediaRecorderRef.current.onstart = () => {
        console.log('Clear audio recording started')
        setIsRecording(true)
        setLoading(false)
      }

      // Start with frequent chunks for better quality monitoring
      mediaRecorderRef.current.start(200) // 200ms chunks
      
    } catch (err) {
      console.error('Error starting recording:', err)
      let errorMessage = 'Failed to start recording. '
      
      if (err.name === 'NotAllowedError') {
        errorMessage += 'Please allow microphone access.'
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No microphone detected.'
      } else if (err.name === 'NotReadableError') {
        errorMessage += 'Microphone is busy or unavailable.'
      } else {
        errorMessage += 'Please check your microphone and try again.'
      }
      
      setError(errorMessage)
      setLoading(false)
      cleanup()
    }
  }

  const stopRecording = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    } else {
      cleanup()
      setIsRecording(false)
    }
  }

  const sendAudioToServer = async (audioBlob) => {
    const formData = new FormData()
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `clear-audio-${timestamp}.wav`
    
    formData.append('audio', audioBlob, filename)
    formData.append('mimeType', audioBlob.type)
    formData.append('size', audioBlob.size.toString())
    formData.append('quality', audioQuality)

    try {
      console.log('Sending clear audio for transcription:', {
        filename,
        size: audioBlob.size,
        type: audioBlob.type,
        quality: audioQuality
      })
      
      const response = await axios.post(`${API_BASE_URL}/api/transcribe/stream`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          if (percentCompleted % 20 === 0) {
            console.log(`Upload progress: ${percentCompleted}%`)
          }
        }
      })
      
      if (response.data && response.data.text) {
        setTranscription(response.data.text)
      } else {
        setError('No text detected in audio. Please speak more clearly.')
      }
    } catch (err) {
      console.error('Transcription error:', err)
      let errorMessage = 'Transcription failed. '
      
      if (err.code === 'ECONNABORTED') {
        errorMessage += 'Request timed out - please try shorter recordings.'
      } else if (err.response?.status >= 500) {
        errorMessage += 'Server error - please try again.'
      } else {
        errorMessage += 'Please try recording again with clearer audio.'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Recording Interface */}
      <div className="glass neomorph-inset rounded-3xl p-12 text-center">
        <div className="flex justify-center mb-8">
          <div className="relative z-10">
            <button
              className={`
                w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 transform relative z-20
                ${isRecording
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 shadow-2xl shadow-red-500/50'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:scale-110 shadow-2xl'
                }
                focus:outline-none focus:ring-4 focus:ring-blue-300 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={false}
              type="button"
            >
              {isRecording ? (
                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            
            {isRecording && (
              <div className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping opacity-75"></div>
            )}
          </div>
        </div>

        {/* Status Display */}
        <div className="space-y-4">
          <h3 className="text-2xl font-semibold text-gray-800">
            {isRecording ? 'Recording Clear Audio' : 'Ready to Record'}
          </h3>
          
          {isRecording && (
            <div className="bg-red-50/80 backdrop-blur border border-red-200 text-red-700 px-6 py-3 rounded-2xl inline-block">
              <div className="flex items-center space-x-4">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="font-mono text-lg font-semibold">{formatTime(recordingTime)}</span>
                
                {/* Audio Quality Indicator */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium">Quality:</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    audioQuality === 'excellent' ? 'bg-green-200 text-green-800' :
                    audioQuality === 'good' ? 'bg-blue-200 text-blue-800' :
                    audioQuality === 'fair' ? 'bg-yellow-200 text-yellow-800' :
                    audioQuality === 'poor' ? 'bg-red-200 text-red-800' :
                    'bg-gray-200 text-gray-800'
                  }`}>
                    {audioQuality.toUpperCase()}
                  </span>
                </div>
                
                {/* Audio Level */}
                {audioLevel > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs">Level:</span>
                    <div className="w-20 h-2 bg-gray-300 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-150 ${
                          audioLevel > 60 ? 'bg-green-500' :
                          audioLevel > 30 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, audioLevel)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <p className="text-gray-600 max-w-md mx-auto">
            {isRecording 
              ? 'Speak clearly and naturally. Advanced noise suppression is active.'
              : 'Click to start recording with advanced noise suppression'
            }
          </p>
        </div>

        {error && (
          <div className="mt-6 bg-red-50/80 backdrop-blur border border-red-200 text-red-700 px-6 py-4 rounded-2xl">
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Enhanced Audio Visualization */}
        {isRecording && (
          <div className="mt-8">
            <div className="flex justify-center items-end space-x-1 h-24 mb-4">
              {[...Array(16)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 rounded-full transition-all duration-200 ${
                    audioLevel > 20 ? 'bg-gradient-to-t from-indigo-500 to-purple-500' : 'bg-gray-300'
                  }`}
                  style={{
                    height: `${Math.max(8, (audioLevel / 100) * 96 + Math.sin(Date.now() / 200 + i) * 10)}px`,
                    opacity: audioLevel > 10 ? 1 : 0.3
                  }}
                ></div>
              ))}
            </div>
            
            {/* Real-time feedback */}
            <div className="text-sm text-gray-600">
              {audioQuality === 'excellent' && '🎯 Crystal clear audio detected'}
              {audioQuality === 'good' && '✅ Good audio quality'}
              {audioQuality === 'fair' && '⚠️ Speak a bit louder or closer'}
              {audioQuality === 'poor' && '📢 Please speak louder and clearer'}
              {audioQuality === 'checking' && '🔍 Analyzing audio quality...'}
              {audioQuality === 'initializing' && '⚡ Starting advanced processing...'}
            </div>
          </div>
        )}
      </div>

      {/* Audio Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {[
          { icon: '🎤', text: 'Speak directly into your microphone' },
          { icon: '🔇', text: 'Minimize background noise for best results' },
          { icon: '📏', text: 'Keep 6-8 inches from microphone' },
          { icon: '🗣️', text: 'Speak at normal conversational volume' },
          { icon: '⚡', text: 'Advanced noise suppression is active' },
          { icon: '🎯', text: 'Watch the quality indicator for feedback' }
        ].map((tip, index) => (
          <div key={index} className="flex items-center space-x-3 bg-white/30 backdrop-blur-sm p-4 rounded-xl border border-white/20">
            <span className="text-xl">{tip.icon}</span>
            <span className="text-gray-700">{tip.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default LiveTranscription