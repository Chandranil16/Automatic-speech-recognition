const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  return new GoogleGenAI({ apiKey });
};

const getMimeType = (filePath) => {
  const mimeTypes = {
    ".wav": "audio/wav",
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
    ".oga": "audio/ogg",
    ".mp3": "audio/mpeg",
    ".mp4": "audio/mp4",
    ".m4a": "audio/mp4",
    ".mpeg": "audio/mpeg",
    ".mpga": "audio/mpeg",
  };

  const extension = path.extname(filePath).toLowerCase();
  const mimeType = mimeTypes[extension];

  if (!mimeType) {
    throw new Error(`Unsupported audio format: ${extension || "unknown"}`);
  }

  return mimeType;
};

const transcribeAudio = async (filePath) => {
  try {
    if (!filePath) {
      throw new Error("Audio file path is required");
    }

    if (!fs.existsSync(filePath)) {
      throw new Error("Audio file not found");
    }

    const fileStats = fs.statSync(filePath);

    if (!fileStats.isFile()) {
      throw new Error("Audio path is not a file");
    }

    if (fileStats.size === 0) {
      throw new Error("Audio file is empty");
    }

    if (fileStats.size < 100) {
      throw new Error("Audio file too small or corrupted");
    }

    const mimeType = getMimeType(filePath);
    const audioBase64 = fs.readFileSync(filePath).toString("base64");
    const client = getGeminiClient();

    console.log("Starting Gemini transcription:", {
      filePath,
      size: fileStats.size,
      sizeKB: Math.round(fileStats.size / 1024),
      mimeType,
    });

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [
        {
          inlineData: {
            mimeType,
            data: audioBase64,
          },
        },
        {
          text: [
            "Transcribe the attached audio.",
            "Return only the spoken words.",
            "Preserve natural punctuation.",
            "Do not add explanations, labels, or commentary.",
          ].join(" "),
        },
      ],
    });

    const text = response.text?.trim();

    if (!text) {
      throw new Error("No speech detected in audio");
    }

    return {
      text,
      confidence: null,
      original_confidence: null,
      language_code: "en",
      language_confidence: null,
      audio_duration: null,
      words_count: text.split(/\s+/).filter(Boolean).length,
      detected_languages: [],
      word_confidence_avg: null,
      word_confidence_min: null,
      word_confidence_max: null,
      high_confidence_words: 0,
      low_confidence_words: 0,
      word_accuracy_distribution: {
        excellent: 0,
        good: 0,
        fair: 0,
        poor: 0,
      },
      uncertain_words: [],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    const status = error?.status || error?.response?.status;

    console.error("Gemini transcription failed:", {
      message,
      status,
      filePath,
    });

    if (status === 400 || message.toLowerCase().includes("format")) {
      throw new Error("Invalid audio format");
    }

    if (status === 401 || status === 403) {
      throw new Error("Invalid Gemini API key");
    }

    if (status === 429 || message.includes("429")) {
      throw new Error("Too many requests - please wait and try again");
    }

    if (status >= 500 || message.toLowerCase().includes("network")) {
      throw new Error("Transcription service temporarily unavailable");
    }

    throw new Error(message);
  }
};

module.exports = transcribeAudio;