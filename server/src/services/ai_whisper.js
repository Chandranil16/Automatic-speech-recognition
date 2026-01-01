const fs = require("fs");
const path = require("path");
const { AssemblyAI } = require("assemblyai");
require("dotenv").config();

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY,
});

/**
 * Calculate realistic confidence based on audio quality
 */
const calculateQualityAdjustedConfidence = (transcript, audioStats) => {
  let baseConfidence = transcript.confidence || 0.75;

  // Adjust based on audio quality indicators
  const audioQualityFactors = {
    fileSizePerSecond: audioStats.size / (transcript.audio_duration || 1),
    wordCount: transcript.text ? transcript.text.split(/\s+/).length : 0,
    duration: transcript.audio_duration || 0,
  };

  let penaltyPoints = 0; // Use additive penalties

  // Penalties for quality issues
  if (audioQualityFactors.fileSizePerSecond < 6000) {
    penaltyPoints += 10; // Very low bitrate
    console.log("Low audio bitrate detected");
  }

  if (audioQualityFactors.wordCount < 3) {
    penaltyPoints += 20; // Almost no speech
    console.log("Very short transcription detected");
  }

  if (audioQualityFactors.duration < 1) {
    penaltyPoints += 15; // Too short
    console.log("Very short audio duration");
  }

  // Check for placeholder/filler text patterns
  const lowConfidencePatterns = [
    /^(um|uh|hmm)+$/i,
    /^\.+$/,
    /^[^a-zA-Z]+$/,
  ];

  if (lowConfidencePatterns.some((pattern) => pattern.test(transcript.text))) {
    penaltyPoints += 30;
    console.log("Low-quality transcription pattern detected");
  }

  // Apply additive penalty
  const adjustedConfidence = baseConfidence - penaltyPoints / 100;

  return Math.max(0.2, Math.min(0.98, adjustedConfidence)); // Cap between 20-98%
};

const transcribe_audio = async (filepath) => {
  try {
    console.log("🎙️ Starting transcription for file:", filepath);

    if (!process.env.ASSEMBLYAI_API_KEY) {
      throw new Error("AssemblyAI API key not configured");
    }

    if (!fs.existsSync(filepath)) {
      throw new Error(`Audio file not found: ${filepath}`);
    }

    const stats = fs.statSync(filepath);
    console.log("📊 File details:", {
      path: filepath,
      size: stats.size,
      sizeKB: Math.round(stats.size / 1024),
      extension: path.extname(filepath),
      lastModified: stats.mtime,
    });

    if (stats.size === 0) {
      throw new Error("Audio file is empty");
    }

    if (stats.size < 100) {
      throw new Error("Audio file too small - may be corrupted");
    }

    // CRITICAL: Enhanced configuration for phone/social media audio
    const transcriptionConfig = {
      audio: fs.createReadStream(filepath),

      // Use NANO model for SPEED (much faster than universal)
      speech_model: "nano",

      // Disable automatic language detection for speed (assume English)
      language_code: "en",

      // Keep essential settings only
      punctuate: true,
      format_text: true,

      // Disable features that slow down transcription
      filter_profanity: false,
      redact_pii: false,
      speaker_labels: false,
      auto_highlights: false,
      content_safety: false,
      iab_categories: false,
      
      // Keep boost settings
      word_boost: [],
      boost_param: "high",
    };

    console.log("📤 Submitting transcription request:", {
      model: transcriptionConfig.speech_model,
      language_detection: transcriptionConfig.language_detection,
      boost_param: transcriptionConfig.boost_param,
    });

    const transcript = await client.transcripts.transcribe(transcriptionConfig);

    console.log("📥 Transcript response:", {
      id: transcript.id,
      status: transcript.status,
      language_code: transcript.language_code,
      confidence: transcript.confidence,
      audio_duration: transcript.audio_duration,
      text_length: transcript.text ? transcript.text.length : 0,
      words_count: transcript.words ? transcript.words.length : 0,
      text_preview: transcript.text
        ? transcript.text.substring(0, 150) + "..."
        : "No text",
      error: transcript.error,
    });

    if (transcript.status === "completed" && transcript.text) {
      // Additional validation
      if (transcript.text.trim().length === 0) {
        throw new Error(
          "Transcription completed but returned empty text - audio may be silent or music only"
        );
      }

      // ENHANCED: Calculate word-level accuracy
      const wordLevelData = analyzeWordLevelConfidence(transcript.words || []);

      // Calculate quality-adjusted confidence
      const adjustedConfidence = calculateQualityAdjustedConfidence(
        transcript,
        stats
      );

      console.log(
        `✅ Confidence: Overall ${transcript.confidence?.toFixed(2) || 'N/A'} | Adjusted ${adjustedConfidence.toFixed(2)} | Word-level avg ${wordLevelData.averageConfidence.toFixed(2)}`
      );

      // Extract language confidence
      let languageConfidence = transcript.confidence || 0.75;
      if (
        transcript.language_detection &&
        transcript.language_detection.length > 0
      ) {
        const detectedLang = transcript.language_detection.find(
          (lang) => lang.language === transcript.language_code
        );
        if (detectedLang) {
          languageConfidence = detectedLang.confidence;
        }
      }

      return {
        text: transcript.text.trim(),
        confidence: adjustedConfidence,
        original_confidence: transcript.confidence,
        language_code: transcript.language_code,
        language_confidence: languageConfidence,
        audio_duration: transcript.audio_duration,
        words_count: transcript.text.split(/\s+/).length,
        detected_languages: transcript.language_detection || [],
        
        // NEW: Word-level accuracy metrics
        word_confidence_avg: wordLevelData.averageConfidence,
        word_confidence_min: wordLevelData.minConfidence,
        word_confidence_max: wordLevelData.maxConfidence,
        high_confidence_words: wordLevelData.highConfidenceCount,
        low_confidence_words: wordLevelData.lowConfidenceCount,
        word_accuracy_distribution: wordLevelData.distribution,
        uncertain_words: wordLevelData.uncertainWords,
      };
    } else if (transcript.status === "error") {
      const errorMsg = transcript.error || "Unknown transcription error";
      console.error("❌ AssemblyAI transcription error:", errorMsg);
      throw new Error(`AssemblyAI Error: ${errorMsg}`);
    } else {
      throw new Error(
        `Transcription failed with status: ${transcript.status}`
      );
    }
  } catch (error) {
    console.error("❌ Detailed transcription error:", {
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
      throw new Error("Invalid audio format - try different audio source");
    } else if (error.response?.status === 429) {
      throw new Error("Too many requests - please wait and try again");
    } else if (error.message.includes("timeout")) {
      throw new Error("Transcription timed out - try shorter audio clip");
    } else {
      throw new Error("Transcription failed: " + error.message);
    }
  }
};

/**
 * NEW FUNCTION: Analyze word-level confidence to determine transcription accuracy
 * This gives us per-word accuracy based on how confident the AI is about each word
 */
const analyzeWordLevelConfidence = (words) => {
  if (!words || words.length === 0) {
    return {
      averageConfidence: 0.5,
      minConfidence: 0,
      maxConfidence: 0,
      highConfidenceCount: 0,
      lowConfidenceCount: 0,
      distribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
      uncertainWords: [],
    };
  }

  let totalConfidence = 0;
  let minConfidence = 1.0;
  let maxConfidence = 0.0;
  let highConfidenceCount = 0; // >0.85
  let lowConfidenceCount = 0;  // <0.5
  const uncertainWords = [];
  
  const distribution = {
    excellent: 0, // >0.9
    good: 0,      // 0.75-0.9
    fair: 0,      // 0.5-0.75
    poor: 0,      // <0.5
  };

  words.forEach((wordObj) => {
    const confidence = wordObj.confidence || 0.5;
    totalConfidence += confidence;

    if (confidence > maxConfidence) maxConfidence = confidence;
    if (confidence < minConfidence) minConfidence = confidence;

    if (confidence > 0.85) {
      highConfidenceCount++;
    }
    if (confidence < 0.5) {
      lowConfidenceCount++;
      uncertainWords.push({
        text: wordObj.text,
        confidence: confidence,
        start: wordObj.start,
        end: wordObj.end,
      });
    }

    // Distribution
    if (confidence > 0.9) distribution.excellent++;
    else if (confidence > 0.75) distribution.good++;
    else if (confidence > 0.5) distribution.fair++;
    else distribution.poor++;
  });

  const averageConfidence = totalConfidence / words.length;

  console.log("📊 Word-level confidence analysis:", {
    totalWords: words.length,
    averageConfidence: averageConfidence.toFixed(2),
    highConfidenceWords: highConfidenceCount,
    lowConfidenceWords: lowConfidenceCount,
    distribution,
    uncertainWordsSample: uncertainWords.slice(0, 5).map(w => w.text),
  });

  return {
    averageConfidence,
    minConfidence,
    maxConfidence,
    highConfidenceCount,
    lowConfidenceCount,
    distribution,
    uncertainWords: uncertainWords.slice(0, 10), // Top 10 uncertain words
  };
};

module.exports = transcribe_audio;
