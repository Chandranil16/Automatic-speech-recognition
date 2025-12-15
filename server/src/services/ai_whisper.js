const fs = require("fs");
const path = require("path");
const { AssemblyAI } = require("assemblyai");
require("dotenv").config();

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY,
});

const transcribe_audio = async (filepath) => {
  try {
    console.log("Starting transcription for file:", filepath);

    if (!process.env.ASSEMBLYAI_API_KEY) {
      throw new Error("AssemblyAI API key not configured");
    }

    if (!fs.existsSync(filepath)) {
      throw new Error(`Audio file not found: ${filepath}`);
    }

    const stats = fs.statSync(filepath);
    console.log("File details:", {
      path: filepath,
      size: stats.size,
      extension: path.extname(filepath),
      lastModified: stats.mtime,
    });

    if (stats.size === 0) {
      throw new Error("Audio file is empty");
    }

    if (stats.size < 100) {
      throw new Error("Audio file too small - may be corrupted");
    }

    // Enhanced transcription configuration for better multi-language support
    const transcriptionConfig = {
      audio: fs.createReadStream(filepath),
      // Remove fixed language_code to enable auto-detection
      speech_model: "universal", // Best model for multiple languages
      // Enhanced settings for better accuracy
      punctuate: true,
      format_text: true,
      // Enable language detection
      language_detection: true,
      // Audio intelligence features
      auto_highlights: false, // Disable to speed up processing
      speaker_labels: false, // Disable unless needed
      // Quality settings
      audio_start_from: 0,
      audio_end_at: null,
    };

    console.log("Submitting transcription request with config:", {
      model: transcriptionConfig.speech_model,
      punctuate: transcriptionConfig.punctuate,
      format_text: transcriptionConfig.format_text,
      language_detection: transcriptionConfig.language_detection,
    });

    const transcript = await client.transcripts.transcribe(transcriptionConfig);

    console.log("Transcript response:", {
      id: transcript.id,
      status: transcript.status,
      language_code: transcript.language_code,
      confidence: transcript.confidence,
      text_length: transcript.text ? transcript.text.length : 0,
      text_preview: transcript.text
        ? transcript.text.substring(0, 100) + "..."
        : "No text",
      error: transcript.error,
      language_detection: transcript.language_detection,
    });

    if (transcript.status === "completed" && transcript.text) {
      // Additional validation
      if (transcript.text.trim().length === 0) {
        throw new Error(
          "Transcription completed but returned empty text - audio may be silent"
        );
      }

      // Log language detection results if available
      if (transcript.language_detection) {
        console.log("Detected languages:", transcript.language_detection);
      }

      return {
        text: transcript.text.trim(),
        confidence: transcript.confidence,
        language_code: transcript.language_code,
        language_detection: transcript.language_detection,
      };
    } else if (transcript.status === "error") {
      const errorMsg = transcript.error || "Unknown transcription error";
      console.error("AssemblyAI transcription error:", errorMsg);
      throw new Error(`AssemblyAI Error: ${errorMsg}`);
    } else {
      throw new Error(`Transcription failed with status: ${transcript.status}`);
    }
  } catch (error) {
    console.error("Detailed transcription error:", {
      message: error.message,
      stack: error.stack,
      filepath: filepath,
      fileExists: fs.existsSync(filepath),
      response: error.response?.data,
      status: error.response?.status,
    });

    // Provide more user-friendly error messages
    if (error.message.includes("API key")) {
      throw new Error("Transcription service configuration error");
    } else if (error.message.includes("file")) {
      throw new Error("Audio file processing error");
    } else if (
      error.message.includes("network") ||
      error.response?.status >= 500
    ) {
      throw new Error("Transcription service temporarily unavailable");
    } else if (error.response?.status === 400) {
      throw new Error("Invalid audio format or corrupted file");
    } else {
      throw new Error("Transcription failed: " + error.message);
    }
  }
};

module.exports = transcribe_audio;
