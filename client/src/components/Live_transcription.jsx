import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../config/api";

const LiveTranscription = ({ setTranscription, setAnalytics, setLoading }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioQuality, setAudioQuality] = useState("checking");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const gainNodeRef = useRef(null);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setRecordingTime(0);
    }

    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    console.log("🧹 Cleaning up audio resources...");

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log("Stopped track:", track.kind);
      });
      streamRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      console.log("Closed audio context");
      audioContextRef.current = null;
    }

    clearInterval(timerRef.current);
    timerRef.current = null;

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }

    setAudioQuality("checking");
    setAudioLevel(0);
    setIsRecording(false);

    console.log("✅ Cleanup complete");
  };

  // Phone-optimized audio processing (less aggressive)
  const setupAdvancedAudioProcessing = (stream) => {
    try {
      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();

      const source = audioContextRef.current.createMediaStreamSource(stream);

      // REDUCED PROCESSING for phone audio

      // 1. MODERATE HIGH-PASS FILTER (allow more low frequencies)
      const highPassFilter = audioContextRef.current.createBiquadFilter();
      highPassFilter.type = "highpass";
      highPassFilter.frequency.value = 80; // LOWERED from 200Hz
      highPassFilter.Q.value = 0.5; // Gentler filtering

      // 2. MODERATE LOW-PASS FILTER (keep more range)
      const lowPassFilter = audioContextRef.current.createBiquadFilter();
      lowPassFilter.type = "lowpass";
      lowPassFilter.frequency.value = 8000; // RAISED from 3400Hz
      lowPassFilter.Q.value = 0.5;

      // 3. LIGHTER COMPRESSION (preserve dynamics)
      const compressor = audioContextRef.current.createDynamicsCompressor();
      compressor.threshold.value = -40; // HIGHER threshold
      compressor.knee.value = 20; // Softer knee
      compressor.ratio.value = 4; // LOWER ratio
      compressor.attack.value = 0.01; // Slower attack
      compressor.release.value = 0.25; // Longer release

      // 4. MODERATE GAIN (don't over-amplify noise)
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = 2.0; // REDUCED from 3.0

      // 5. ANALYZER
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048; // REDUCED for less CPU
      analyserRef.current.smoothingTimeConstant = 0.5; // More smoothing
      analyserRef.current.minDecibels = -80;
      analyserRef.current.maxDecibels = -20;

      // Connect chain
      source.connect(highPassFilter);
      highPassFilter.connect(lowPassFilter);
      lowPassFilter.connect(compressor);
      compressor.connect(gainNodeRef.current);
      gainNodeRef.current.connect(analyserRef.current);

      console.log("✅ Phone-optimized audio processing initialized:", {
        highPass: "80Hz",
        lowPass: "8000Hz",
        compression: "4:1 ratio",
        gain: "2.0x initial",
      });

      const frequencyData = new Uint8Array(
        analyserRef.current.frequencyBinCount
      );

      const processAudio = () => {
        if (!isRecording) return;

        analyserRef.current.getByteFrequencyData(frequencyData);

        // RELAXED quality assessment for phone audio
        const sampleRate = audioContextRef.current.sampleRate;
        const nyquist = sampleRate / 2;
        const binSize = nyquist / frequencyData.length;

        const speechStart = Math.floor(150 / binSize); // Wider range
        const speechEnd = Math.floor(4000 / binSize);

        let speechEnergy = 0;
        let totalEnergy = 0;

        for (let i = 0; i < frequencyData.length; i++) {
          const energy = frequencyData[i];
          totalEnergy += energy;

          if (i >= speechStart && i <= speechEnd) {
            speechEnergy += energy;
          }
        }

        const speechRatio = speechEnergy / (totalEnergy || 1);

        // ADAPTIVE GAIN (more moderate for phone)
        if (speechEnergy > 0 && speechEnergy < 80) {
          const targetGain = 2.5;
          gainNodeRef.current.gain.value =
            gainNodeRef.current.gain.value * 0.95 + targetGain * 0.05;
        } else if (speechEnergy < 150) {
          const targetGain = 2.0;
          gainNodeRef.current.gain.value =
            gainNodeRef.current.gain.value * 0.95 + targetGain * 0.05;
        } else {
          const targetGain = 1.5;
          gainNodeRef.current.gain.value =
            gainNodeRef.current.gain.value * 0.95 + targetGain * 0.05;
        }

        // RELAXED quality assessment
        let quality = "fair";
        if (speechRatio > 0.25 && speechEnergy > 60) {
          quality = "excellent";
        } else if (speechRatio > 0.15 && speechEnergy > 40) {
          quality = "good";
        } else if (speechEnergy > 20) {
          quality = "fair";
        } else {
          quality = "poor";
        }

        setAudioQuality(quality);

        const speechLevel = Math.min(100, (speechEnergy / 80) * 100);
        setAudioLevel(speechLevel);

        animationFrameRef.current = requestAnimationFrame(processAudio);
      };

      processAudio();
    } catch (err) {
      console.error("❌ Audio processing failed:", err);
      setAudioQuality("basic");
    }
  };

  // Optimized audio constraints for phone compatibility
  const getOptimalAudioConstraints = async () => {
    const constraintSets = [
      // OPTIMIZED FOR PHONE AUDIO
      {
        audio: {
          sampleRate: { ideal: 48000, min: 16000 },
          channelCount: { ideal: 1 },

          // CRITICAL: Less aggressive processing for phone
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },

          // Chrome-specific (gentler)
          googEchoCancellation: { ideal: true },
          googAutoGainControl: { ideal: true },
          googNoiseSuppression: { ideal: true },
          googHighpassFilter: { ideal: false }, // DISABLE hardware HPF

          latency: { ideal: 0.02 },
        },
      },

      // SIMPLE FALLBACK (most compatible)
      {
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      },

      // BASIC
      {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      },

      // LAST RESORT
      { audio: true },
    ];

    for (let i = 0; i < constraintSets.length; i++) {
      try {
        const testStream = await navigator.mediaDevices.getUserMedia(
          constraintSets[i]
        );
        const track = testStream.getAudioTracks()[0];

        if (track) {
          const settings = track.getSettings();
          console.log(`✅ Audio setup (attempt ${i + 1}):`, {
            sampleRate: settings.sampleRate,
            channelCount: settings.channelCount,
            echoCancellation: settings.echoCancellation,
            noiseSuppression: settings.noiseSuppression,
            autoGainControl: settings.autoGainControl,
            latency: settings.latency,
          });

          testStream.getTracks().forEach((track) => track.stop());
          return constraintSets[i];
        }

        testStream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.warn(`⚠️ Attempt ${i + 1} failed:`, err.message);
        continue;
      }
    }

    throw new Error("Unable to access microphone");
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const startRecording = async () => {
    try {
      setError("");
      setLoading(true);
      setAudioQuality("initializing");

      const constraints = await getOptimalAudioConstraints();
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      streamRef.current = stream;
      setupAdvancedAudioProcessing(stream);

      // IMPORTANT: Use compatible MIME type for phone recordings
      const mimeTypes = [
        "audio/webm;codecs=opus", // Best for phone
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
        "audio/wav",
      ];

      let selectedMimeType = "";
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          console.log("📱 Using MIME type:", type);
          break;
        }
      }

      if (!selectedMimeType) {
        selectedMimeType = "audio/webm";
      }

      const options = {
        mimeType: selectedMimeType,
        audioBitsPerSecond: 64000, // REDUCED for phone (was 128000)
      };

      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      let totalChunks = 0;
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          totalChunks++;
          if (totalChunks % 5 === 0) {
            console.log(`📦 Recorded ${totalChunks} chunks, total size: ${
              audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0)
            } bytes`);
          }
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log("🎬 Processing recording...");

        if (audioChunksRef.current.length === 0) {
          setError(
            "No audio captured. Please check microphone and speak louder."
          );
          setLoading(false);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: selectedMimeType,
        });

        console.log("📦 Audio blob created:", {
          size: audioBlob.size,
          sizeKB: Math.round(audioBlob.size / 1024),
          type: audioBlob.type,
          chunks: audioChunksRef.current.length,
          quality: audioQuality,
        });

        cleanup();
        setIsRecording(false);

        // LOWERED minimum size for phone recordings
        if (audioBlob.size > 2000) {
          // 2KB minimum
          await sendAudioToServer(audioBlob);
        } else {
          setError(
            "Recording too short or silent. Please speak clearly and try again."
          );
          setLoading(false);
        }
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error("❌ Recording error:", event.error);
        setError("Recording failed. Please try again.");
        setIsRecording(false);
        setLoading(false);
        cleanup();
      };

      mediaRecorderRef.current.onstart = () => {
        console.log("🎙️ Recording started");
        setIsRecording(true);
        setLoading(false);
      };

      // IMPORTANT: Larger chunks for phone (more reliable)
      mediaRecorderRef.current.start(500); // 500ms chunks
    } catch (err) {
      console.error("❌ Error starting recording:", err);
      let errorMessage = "Failed to start recording. ";

      if (err.name === "NotAllowedError") {
        errorMessage +=
          "Please allow microphone access in your browser settings.";
      } else if (err.name === "NotFoundError") {
        errorMessage += "No microphone detected. Please check your device.";
      } else if (err.name === "NotReadableError") {
        errorMessage +=
          "Microphone is busy. Close other apps using the microphone.";
      } else {
        errorMessage += err.message || "Please check your microphone and try again.";
      }

      setError(errorMessage);
      setLoading(false);
      cleanup();
    }
  };

  const stopRecording = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      console.log("⏹️ Stopping recording...");
      mediaRecorderRef.current.stop();
    } else {
      cleanup();
      setIsRecording(false);
    }
  };

  const sendAudioToServer = async (audioBlob) => {
    const formData = new FormData();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `recording-${timestamp}.webm`;

    formData.append("audio", audioBlob, filename);
    formData.append("mimeType", audioBlob.type);
    formData.append("size", audioBlob.size.toString());
    formData.append("quality", audioQuality);

    try {
      console.log("📤 Sending audio for transcription:", {
        filename,
        size: audioBlob.size,
        sizeKB: Math.round(audioBlob.size / 1024),
        type: audioBlob.type,
        quality: audioQuality,
      });

      const response = await axios.post(
        `${API_BASE_URL}/api/transcribe/stream`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 120000, // 2 minutes
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            if (percentCompleted % 20 === 0) {
              console.log(`📊 Upload progress: ${percentCompleted}%`);
            }
          },
        }
      );

      console.log("✅ Transcription response received:", {
        textLength: response.data.text?.length,
        hasAnalytics: !!response.data.analytics,
      });

      if (response.data && response.data.text) {
        setTranscription(response.data.text);

        // Handle analytics from response
        if (setAnalytics && response.data.analytics) {
          setAnalytics(response.data.analytics);
        }
      } else {
        setError(
          "No speech detected in audio. Please speak more clearly or check background noise."
        );
      }
    } catch (err) {
      console.error("❌ Transcription error:", err);
      let errorMessage = "Transcription failed. ";

      if (err.code === "ECONNABORTED") {
        errorMessage +=
          "Request timed out - audio may be too long. Try shorter recordings.";
      } else if (err.response?.status >= 500) {
        errorMessage += "Server error - please try again in a moment.";
      } else if (err.response?.status === 400) {
        errorMessage +=
          "Audio format not supported. Try using a different device or browser.";
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else {
        errorMessage +=
          "Please try recording again with less background noise.";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Recording Interface */}
      <div className="glass neomorph-inset rounded-3xl p-12 text-center">
        <div className="flex justify-center mb-8">
          <div className="relative z-10">
            <button
              className={`
                w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 transform relative z-20
                ${
                  isRecording
                    ? "bg-gradient-to-r from-red-500 to-pink-500 shadow-2xl shadow-red-500/50"
                    : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:scale-110 shadow-2xl"
                }
                focus:outline-none focus:ring-4 focus:ring-blue-300 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={false}
              type="button"
            >
              {isRecording ? (
                <svg
                  className="w-12 h-12 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-12 h-12 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                    clipRule="evenodd"
                  />
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
            {isRecording ? "Recording..." : "Ready to Record"}
          </h3>

          {isRecording && (
            <div className="bg-red-50/80 backdrop-blur border border-red-200 text-red-700 px-6 py-3 rounded-2xl inline-block">
              <div className="flex items-center space-x-4">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="font-mono text-lg font-semibold">
                  {formatTime(recordingTime)}
                </span>

                {/* Audio Quality Indicator */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium">Quality:</span>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded ${
                      audioQuality === "excellent"
                        ? "bg-green-200 text-green-800"
                        : audioQuality === "good"
                        ? "bg-blue-200 text-blue-800"
                        : audioQuality === "fair"
                        ? "bg-yellow-200 text-yellow-800"
                        : audioQuality === "poor"
                        ? "bg-red-200 text-red-800"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
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
                          audioLevel > 60
                            ? "bg-green-500"
                            : audioLevel > 30
                            ? "bg-yellow-500"
                            : "bg-red-500"
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
              ? "Speak clearly. Optimized for phone and noisy environments."
              : "Click to start recording with phone-optimized processing"}
          </p>
        </div>

        {error && (
          <div className="mt-6 bg-red-50/80 backdrop-blur border border-red-200 text-red-700 px-6 py-4 rounded-2xl">
            <div className="flex items-center justify-center space-x-2">
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
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
                    audioLevel > 20
                      ? "bg-gradient-to-t from-indigo-500 to-purple-500"
                      : "bg-gray-300"
                  }`}
                  style={{
                    height: `${Math.max(
                      8,
                      (audioLevel / 100) * 96 +
                        Math.sin(Date.now() / 200 + i) * 10
                    )}px`,
                    opacity: audioLevel > 10 ? 1 : 0.3,
                  }}
                ></div>
              ))}
            </div>

            {/* Real-time feedback */}
            <div className="text-sm text-gray-600">
              {audioQuality === "excellent" && "🎯 Crystal clear audio detected"}
              {audioQuality === "good" && "✅ Good audio quality"}
              {audioQuality === "fair" && "⚠️ Speak a bit louder or closer"}
              {audioQuality === "poor" && "📢 Please speak louder and clearer"}
              {audioQuality === "checking" && "🔍 Analyzing audio quality..."}
              {audioQuality === "initializing" && "⚡ Starting phone-optimized recording..."}
            </div>
          </div>
        )}
      </div>

      {/* Audio Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {[
          { icon: "🔇", text: "Optimized for background noise" },
          { icon: "🗣️", text: "Speak naturally and clearly" },
          { icon: "⚡", text: "Fast processing with nano model" },
          { icon: "🌍", text: "Automatic language detection" },
        ].map((tip, index) => (
          <div
            key={index}
            className="flex items-center space-x-3 bg-white/30 backdrop-blur-sm p-4 rounded-xl border border-white/20"
          >
            <span className="text-xl">{tip.icon}</span>
            <span className="text-gray-700">{tip.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveTranscription;
