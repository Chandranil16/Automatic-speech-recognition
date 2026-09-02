import React, { useEffect, useRef, useState } from "react";
import API_BASE_URL from "../config/api";

const getWebSocketUrl = () => {
  const url = new URL(API_BASE_URL);

  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/live-transcription";

  return url.toString();
};

const downsampleAudio = (buffer, inputSampleRate, outputSampleRate) => {
  if (inputSampleRate === outputSampleRate) {
    return buffer;
  }

  if (inputSampleRate < outputSampleRate) {
    throw new Error("Input audio sample rate is lower than output sample rate");
  }

  const sampleRateRatio = inputSampleRate / outputSampleRate;

  const outputLength = Math.round(buffer.length / sampleRateRatio);

  const output = new Float32Array(outputLength);

  let outputIndex = 0;
  let inputIndex = 0;

  while (outputIndex < output.length) {
    const nextInputIndex = Math.round((outputIndex + 1) * sampleRateRatio);

    let total = 0;
    let count = 0;

    for (
      let index = inputIndex;
      index < nextInputIndex && index < buffer.length;
      index += 1
    ) {
      total += buffer[index];
      count += 1;
    }

    output[outputIndex] = count > 0 ? total / count : 0;

    outputIndex += 1;
    inputIndex = nextInputIndex;
  }

  return output;
};

const convertToPcm16 = (audioData) => {
  const pcmData = new Int16Array(audioData.length);

  for (let index = 0; index < audioData.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, audioData[index]));

    pcmData[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return pcmData;
};

const arrayBufferToBase64 = (arrayBuffer) => {
  const bytes = new Uint8Array(arrayBuffer);

  const chunkSize = 0x8000;

  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);

    binary += String.fromCharCode(...chunk);
  }

  return window.btoa(binary);
};

const LiveTranscription = ({ transcription, setTranscription, setLoading }) => {
  const [isRecording, setIsRecording] = useState(false);

  const [recordingTime, setRecordingTime] = useState(0);

  const [audioLevel, setAudioLevel] = useState(0);

  const [error, setError] = useState("");

  const [interimTranscript, setInterimTranscript] = useState("");

  const socketRef = useRef(null);

  const streamRef = useRef(null);

  const audioContextRef = useRef(null);

  const processorRef = useRef(null);

  const sourceRef = useRef(null);

  const timerRef = useRef(null);

  const recordingRef = useRef(false);

  const liveReadyRef = useRef(false);

  const cleanup = () => {
    recordingRef.current = false;

    liveReadyRef.current = false;

    if (timerRef.current) {
      clearInterval(timerRef.current);

      timerRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;

      processorRef.current.disconnect();

      processorRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();

      sourceRef.current = null;
    }

    if (audioContextRef.current) {
      if (audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }

      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }

    const socket = socketRef.current;

    if (socket) {
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close();
      }

      socketRef.current = null;
    }

    setAudioLevel(0);

    setIsRecording(false);

    setInterimTranscript("");
  };

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const startRecording = async () => {
    try {
      setError("");

      setLoading(true);

      setTranscription("");

      setInterimTranscript("");

      setRecordingTime(0);

      liveReadyRef.current = false;

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access is not supported by this browser");
      }

      if (!window.WebSocket) {
        throw new Error("WebSocket is not supported by this browser");
      }

      const webSocketUrl = getWebSocketUrl();

      console.log("Connecting to WebSocket:", webSocketUrl);

      const socket = new WebSocket(webSocketUrl);

      socketRef.current = socket;

      await new Promise((resolve, reject) => {
        const socketTimeout = setTimeout(() => {
          reject(new Error("Live transcription connection timed out"));
        }, 15000);

        socket.onopen = () => {
          console.log("Browser WebSocket connected");
        };

        socket.onerror = (socketError) => {
          console.error("WebSocket error:", socketError);

          clearTimeout(socketTimeout);

          reject(new Error("Could not connect to live transcription"));
        };

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            console.log("Message from backend:", message);

            if (message.type === "ready") {
              clearTimeout(socketTimeout);

              liveReadyRef.current = true;

              console.log("Gemini Live is ready");

              resolve();

              return;
            }

            /* Interim / partial transcription.*/

            if (message.type === "interim_transcript" && message.text) {
              console.log("Interim transcript:", message.text);

              setInterimTranscript(message.text);

              return;
            }

            /* Final transcription.*/

            if (message.type === "transcript" && message.text) {
              console.log("Final transcript:", message.text);

              setTranscription((previousText) =>
                `${previousText} ${message.text}`.trim(),
              );

              setInterimTranscript("");

              return;
            }

            if (message.type === "error") {
              clearTimeout(socketTimeout);

              reject(new Error(message.message || "Live transcription error"));
            }
          } catch (socketError) {
            console.error("Invalid WebSocket response:", socketError);
          }
        };
      });

      socket.onclose = () => {
        console.log("Browser WebSocket closed");

        if (recordingRef.current) {
          setError("Live transcription connection closed.");

          cleanup();
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioContext = window.AudioContext || window.webkitAudioContext;

      if (!AudioContext) {
        throw new Error("Audio processing is not supported by this browser");
      }

      const audioContext = new AudioContext();

      await audioContext.resume();

      console.log("Microphone sample rate:", audioContext.sampleRate);

      const source = audioContext.createMediaStreamSource(stream);

      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 1024;

      analyser.smoothingTimeConstant = 0.7;

      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      source.connect(analyser);

      source.connect(processor);

      const muteGain = audioContext.createGain();

      muteGain.gain.value = 0;

      processor.connect(muteGain);

      muteGain.connect(audioContext.destination);

      streamRef.current = stream;

      audioContextRef.current = audioContext;

      sourceRef.current = source;

      processorRef.current = processor;

      recordingRef.current = true;

      processor.onaudioprocess = (event) => {
        if (
          !recordingRef.current ||
          !liveReadyRef.current ||
          socket.readyState !== WebSocket.OPEN
        ) {
          return;
        }

        const inputData = event.inputBuffer.getChannelData(0);

        const inputSampleRate = audioContext.sampleRate;

        const pcmData = downsampleAudio(inputData, inputSampleRate, 16000);

        const pcm16 = convertToPcm16(pcmData);

        socket.send(
          JSON.stringify({
            type: "audio",

            data: arrayBufferToBase64(pcm16.buffer),
          }),
        );

        let total = 0;

        for (const sample of inputData) {
          total += sample * sample;
        }

        const rms = Math.sqrt(total / inputData.length);

        setAudioLevel(Math.min(100, Math.round(rms * 300)));
      };

      setIsRecording(true);

      setLoading(false);

      timerRef.current = setInterval(() => {
        setRecordingTime((previousTime) => previousTime + 1);
      }, 1000);
    } catch (startError) {
      console.error("Unable to start live transcription:", startError);

      cleanup();

      setLoading(false);

      if (startError.name === "NotAllowedError") {
        setError(
          "Microphone permission was denied. Please allow microphone access and try again.",
        );
      } else if (startError.name === "NotFoundError") {
        setError("No microphone was found.");
      } else {
        setError(startError.message || "Unable to start live transcription.");
      }
    }
  };

  const stopRecording = () => {
    recordingRef.current = false;

    setIsRecording(false);

    setLoading(true);

    const socket = socketRef.current;

    if (socket?.readyState === WebSocket.OPEN) {
      console.log("Sending stop signal");

      socket.send(
        JSON.stringify({
          type: "stop",
        }),
      );

      setTimeout(() => {
        cleanup();

        setLoading(false);
      }, 2000);
    } else {
      cleanup();

      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);

    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds,
    ).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="glass neomorph-inset rounded-3xl p-12 text-center">
        {/* RECORD / STOP BUTTON */}

        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-32 h-32 rounded-full text-white text-lg font-semibold transition ${
            isRecording
              ? "bg-red-600 hover:bg-red-700"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {isRecording ? "Stop" : "Record"}
        </button>

        {/* STATUS */}

        <h3 className="mt-8 text-2xl font-semibold text-gray-800">
          {isRecording ? "Listening..." : "Ready to record"}
        </h3>

        {/* RECORDING DETAILS */}

        {isRecording && (
          <>
            {/* TIMER */}

            <p className="mt-4 font-mono text-lg text-red-700">
              {formatTime(recordingTime)}
            </p>

            {/* AUDIO LEVEL */}

            <div className="mx-auto mt-6 h-3 max-w-xs overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-indigo-600 transition-all duration-100"
                style={{
                  width: `${audioLevel}%`,
                }}
              />
            </div>

            <p className="mt-4 text-gray-600">
              Speak now. Your transcript will appear live.
            </p>
          </>
        )}

        {/* ERROR */}

        {error && (
          <p className="mt-6 rounded-lg bg-red-100 p-4 text-red-700">{error}</p>
        )}

        {/* LIVE TRANSCRIPTION DISPLAY */}

        {(transcription || interimTranscript) && (
          <div className="mx-auto mt-10 max-w-3xl rounded-2xl bg-white p-6 text-left shadow-lg">
            <h4 className="mb-4 text-lg font-semibold text-gray-800">
              Live Transcription
            </h4>

            <p className="whitespace-pre-wrap leading-7 text-gray-700">
              {/* FINAL TRANSCRIPT */}

              {transcription}

              {/* INTERIM TRANSCRIPT */}

              {interimTranscript && (
                <span className="ml-2 text-gray-400">{interimTranscript}</span>
              )}
            </p>

            {isRecording && (
              <p className="mt-4 text-sm text-indigo-500">
                ● Live transcription active
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveTranscription;
