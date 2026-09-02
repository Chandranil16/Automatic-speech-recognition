const fs = require("fs");
const transcribeAudio = require("../services/ai_whisper");
const validateFile = (file) => {
  if (!file) {
    throw new Error("No audio file provided");
  }

  if (!file.path || !fs.existsSync(file.path)) {
    throw new Error("Audio file not found on server");
  }

  const stats = fs.statSync(file.path);

  if (stats.size === 0) {
    throw new Error("Audio file is empty");
  }

  if (stats.size < 100) {
    throw new Error("Audio file too small or corrupted");
  }

  return stats;
};

const cleanupFile = (filePath) => {
  if (!filePath) return;

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error("Failed to clean up uploaded file:", error.message);
  }
};

const getErrorMessage = (error) => {
  return error instanceof Error ? error.message : String(error);
};

const getStatusCode = (message) => {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("no audio") ||
    normalizedMessage.includes("no speech") ||
    normalizedMessage.includes("no clear speech") ||
    normalizedMessage.includes("not found") ||
    normalizedMessage.includes("empty") ||
    normalizedMessage.includes("too small") ||
    normalizedMessage.includes("format")
  ) {
    return 400;
  }

  if (normalizedMessage.includes("too many requests")) {
    return 429;
  }

  if (
    normalizedMessage.includes("temporarily unavailable") ||
    normalizedMessage.includes("timeout")
  ) {
    return 503;
  }

  return 500;
};

const processTranscription = async (req, res, mode) => {
  let filePath = null;

  try {
    const fileStats = validateFile(req.file);
    filePath = req.file.path;

    const result = await transcribeAudio(filePath);
    const metadata = result && typeof result === "object" ? result : {};
    const text = typeof result === "string" ? result : metadata.text;

    if (!text || text.trim().length === 0) {
      throw new Error(
        mode === "stream"
          ? "No clear speech detected"
          : "No transcription text returned",
      );
    }

    const responseMetadata = {
      duration: metadata.audio_duration ?? null,
      language: metadata.language_code ?? "auto-detected",
      confidence: metadata.confidence ?? null,
    };

    res.status(200).json({
      text: text.trim(),
      metadata: responseMetadata,
    });
  } catch (error) {
  const message =
    error instanceof Error ? error.message : String(error);

  const statusCode = getStatusCode(message);
  const normalizedMessage = message.toLowerCase();

  const userMessage =
    mode === "stream" &&
    (normalizedMessage.includes("no speech") ||
      normalizedMessage.includes("no clear speech"))
      ? "No clear speech detected. Try recording without background noise."
      : message;

  console.error("Transcription error:", {
    mode,
    message,
    filePath,
  });

  res.status(statusCode).json({
    error: userMessage,
    details:
      process.env.NODE_ENV === "development"
        ? message
        : undefined,
  });
} finally {
    cleanupFile(filePath);
  }
};

const transcribeUploadFile = (req, res) => {
  return processTranscription(req, res, "upload");
};

const transcribeStream = (req, res) => {
  return processTranscription(req, res, "stream");
};

module.exports = {
  transcribe_upload_file: transcribeUploadFile,
  transcribe_stream: transcribeStream,
};
