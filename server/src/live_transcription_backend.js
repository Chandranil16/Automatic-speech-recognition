const { GoogleGenAI } = require("@google/genai");
const { WebSocketServer } = require("ws");

const startLiveTranscription = (server) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({ apiKey });

  const webSocketServer = new WebSocketServer({
    server,
    path: "/live-transcription",
  });

  webSocketServer.on("connection", async (browserSocket) => {
    let geminiSession;

    try {
      geminiSession = await ai.live.connect({
        model: "gemini-3.5-transcribe-live",
        config: {
          responseModalities: ["TEXT"],
          inputAudioTranscription: {},
          systemInstruction:
            "Transcribe the incoming audio. Return only the spoken words.",
        },
        callbacks: {
          onmessage: (message) => {
           /* console.log("Gemini Live message:", JSON.stringify(message, null, 2),);*/
            const serverContent = message.serverContent;
            if (!serverContent) {
              return;
            }

            // Live / partial transcription
            const interimText = serverContent.interimInputTranscription?.text;

            if (interimText && browserSocket.readyState === WebSocket.OPEN) {
              browserSocket.send(
                JSON.stringify({
                  type: "interim_transcript",
                  text: interimText,
                }),
              );
            }

            // Final transcription
            const finalText = serverContent.inputTranscription?.text;

            if (finalText && browserSocket.readyState === WebSocket.OPEN) {
              browserSocket.send(
                JSON.stringify({
                  type: "transcript",
                  text: finalText,
                }),
              );
            }
          },

          onerror: (error) => {
            console.error("Gemini Live error:", error);

            if (browserSocket.readyState === browserSocket.OPEN) {
              browserSocket.send(
                JSON.stringify({
                  type: "error",
                  message: "Gemini Live transcription failed",
                }),
              );
            }
          },

          onclose: () => {
            console.log("Gemini Live session closed");

            if (browserSocket.readyState === browserSocket.OPEN) {
              browserSocket.close();
            }
          },
        },
      });

      if (browserSocket.readyState === browserSocket.OPEN) {
        browserSocket.send(JSON.stringify({ type: "ready" }));
      }

      browserSocket.on("message", async (rawMessage) => {
        try {
          const message = JSON.parse(rawMessage.toString());

          if (message.type === "audio" && message.data) {
            await geminiSession.sendRealtimeInput({
              audio: {
                data: message.data,
                mimeType: "audio/pcm;rate=16000",
              },
            });
          }

          if (message.type === "stop") {
            setTimeout(() => {
              geminiSession?.close();
              browserSocket.close();
            }, 1000);
          }
        } catch (error) {
          console.error("Invalid live transcription message:", error);

          if (browserSocket.readyState === browserSocket.OPEN) {
            browserSocket.send(
              JSON.stringify({
                type: "error",
                message: "Invalid live audio data",
              }),
            );
          }
        }
      });
    } catch (error) {
      console.error("Could not start Gemini Live session:", error);

      if (browserSocket.readyState === browserSocket.OPEN) {
        browserSocket.send(
          JSON.stringify({
            type: "error",
            message: "Could not connect to Gemini Live",
          }),
        );

        browserSocket.close();
      }
    }
  });

  console.log("WebSocket endpoint: /live-transcription");
};

module.exports = startLiveTranscription;
