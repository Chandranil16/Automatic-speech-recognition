const natural = require("natural"); // For NLP analysis
const Sentiment = require("sentiment");

class SpeechAnalytics {
  constructor() {
    this.sentiment = new Sentiment();
    this.fillerWords = [
      "um",
      "uh",
      "like",
      "you know",
      "actually",
      "basically",
      "literally",
      "sort of",
      "kind of",
      "i mean",
      "right",
      "okay",
      "so",
      "well",
      "hmm",
      "ah",
      "er",
    ];
  }

  /**
   * Calculate comprehensive speech analytics
   */
  analyzeTranscription(transcriptionText, audioMetadata = {}) {
    const words = this.tokenizeWords(transcriptionText);
    const sentences = this.tokenizeSentences(transcriptionText);

    return {
      accuracy: this.calculateAccuracy(transcriptionText, audioMetadata),
      speechStrength: this.calculateSpeechStrength(words, sentences),
      clarity: this.calculateClarity(words, sentences, transcriptionText),
      fluency: this.calculateFluency(words, sentences, transcriptionText),
      fillerWords: this.detectFillerWords(transcriptionText),
      sentiment: this.analyzeSentiment(transcriptionText),
      tone: this.analyzeTone(transcriptionText),
      statistics: this.getStatistics(words, sentences, transcriptionText),
    };
  }

  tokenizeWords(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s'-]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 0);
  }

  tokenizeSentences(text) {
    const tokenizer = new natural.SentenceTokenizer();
    return tokenizer.tokenize(text);
  }

  /**
   * Calculate speech accuracy based on confidence and text quality
   */
  calculateAccuracy(text, metadata) {
    let score = 85; // Base score

    // Confidence from transcription API
    if (metadata.confidence) {
      score = metadata.confidence * 100;
    } else {
      // Estimate based on text quality
      const hasProperCapitalization = /[A-Z]/.test(text);
      const hasPunctuation = /[.,!?;:]/.test(text);
      const wordCount = text.split(/\s+/).length;

      if (hasProperCapitalization) score += 2;
      if (hasPunctuation) score += 3;
      if (wordCount > 50) score += 5;

      score = Math.min(score, 98);
    }

    return {
      score: Math.round(score * 10) / 10,
      grade: this.getGrade(score),
      description: this.getAccuracyDescription(score),
    };
  }

  /**
   * Calculate speech strength based on vocabulary and assertiveness
   */
  calculateSpeechStrength(words, sentences) {
    const uniqueWords = new Set(words);
    const vocabularyRichness = (uniqueWords.size / words.length) * 100;

    // Check for strong verbs and assertive language
    const strongVerbs = words.filter((word) =>
      [
        "achieve",
        "create",
        "develop",
        "improve",
        "enhance",
        "establish",
        "implement",
        "innovate",
        "lead",
        "manage",
        "organize",
        "perform",
      ].includes(word)
    ).length;

    const assertivenessScore = (strongVerbs / words.length) * 1000;

    const avgWordsPerSentence = words.length / sentences.length;
    const sentenceComplexity = Math.min((avgWordsPerSentence / 20) * 100, 100);

    const score =
      vocabularyRichness * 0.4 +
      assertivenessScore * 0.3 +
      sentenceComplexity * 0.3;

    return {
      score: Math.round(Math.min(score, 100) * 10) / 10,
      vocabularyRichness: Math.round(vocabularyRichness * 10) / 10,
      grade: this.getGrade(score),
      description: this.getStrengthDescription(score),
    };
  }

  /**
   * Calculate clarity based on sentence structure and readability
   */
  calculateClarity(words, sentences, text) {
    // Flesch Reading Ease Score
    const syllables = this.countSyllables(words);
    const avgSyllablesPerWord = syllables / words.length;
    const avgWordsPerSentence = words.length / sentences.length;

    const fleschScore =
      206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
    const clarityScore = Math.max(0, Math.min(fleschScore, 100));

    // Check for run-on sentences
    const runOnSentences = sentences.filter(
      (s) => s.split(/\s+/).length > 30
    ).length;
    const runOnPenalty = (runOnSentences / sentences.length) * 20;

    const finalScore = Math.max(0, clarityScore - runOnPenalty);

    return {
      score: Math.round(finalScore * 10) / 10,
      readabilityLevel: this.getReadabilityLevel(fleschScore),
      avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
      grade: this.getGrade(finalScore),
      description: this.getClarityDescription(finalScore),
    };
  }

  /**
   * Calculate fluency based on filler words and speech patterns
   */
  calculateFluency(words, sentences, text) {
    const fillerCount = this.detectFillerWords(text).totalCount;
    const fillerRatio = (fillerCount / words.length) * 100;

    // Lower filler ratio = higher fluency
    let fluencyScore = 100 - fillerRatio * 5;

    // Check for repetitive patterns
    const repetitions = this.findRepetitions(words);
    const repetitionPenalty = (repetitions / words.length) * 100;

    fluencyScore = Math.max(0, fluencyScore - repetitionPenalty);

    // Check for natural flow (varied sentence length)
    const sentenceLengths = sentences.map((s) => s.split(/\s+/).length);
    const lengthVariance = this.calculateVariance(sentenceLengths);
    const varianceBonus = Math.min(lengthVariance / 2, 10);

    fluencyScore = Math.min(100, fluencyScore + varianceBonus);

    return {
      score: Math.round(fluencyScore * 10) / 10,
      fillerWordRatio: Math.round(fillerRatio * 10) / 10,
      grade: this.getGrade(fluencyScore),
      description: this.getFluencyDescription(fluencyScore),
    };
  }

  /**
   * Detect and count filler words
   */
  detectFillerWords(text) {
    const lowerText = text.toLowerCase();
    const detectedFillers = {};
    let totalCount = 0;

    this.fillerWords.forEach((filler) => {
      const regex = new RegExp(`\\b${filler}\\b`, "gi");
      const matches = lowerText.match(regex);
      if (matches) {
        detectedFillers[filler] = matches.length;
        totalCount += matches.length;
      }
    });

    const words = this.tokenizeWords(text);
    const percentage = words.length > 0 ? (totalCount / words.length) * 100 : 0;

    return {
      totalCount,
      percentage: Math.round(percentage * 10) / 10,
      breakdown: Object.entries(detectedFillers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10), // Top 10 filler words
      recommendation: this.getFillerRecommendation(percentage),
    };
  }

  /**
   * Analyze sentiment using sentiment analysis
   */
  analyzeSentiment(text) {
    const result = this.sentiment.analyze(text);

    let sentimentLabel = "Neutral";
    if (result.score > 2) sentimentLabel = "Very Positive";
    else if (result.score > 0) sentimentLabel = "Positive";
    else if (result.score < -2) sentimentLabel = "Very Negative";
    else if (result.score < 0) sentimentLabel = "Negative";

    return {
      score: result.score,
      comparative: Math.round(result.comparative * 100) / 100,
      label: sentimentLabel,
      positive: result.positive,
      negative: result.negative,
      emoji: this.getSentimentEmoji(sentimentLabel),
    };
  }

  /**
 * Analyze tone of the speech
 */
analyzeTone(text) {
  const lowerText = text.toLowerCase();
  const words = this.tokenizeWords(text);
  
  const toneIndicators = {
    professional: [
      'furthermore', 'therefore', 'however', 'consequently', 'regarding', 'respective',
      'accordingly', 'thus', 'hence', 'moreover', 'additionally', 'specifically',
      'particularly', 'essentially', 'primarily', 'ultimately', 'significantly'
    ],
    casual: [
      'yeah', 'cool', 'awesome', 'stuff', 'things', 'pretty much', 'kind of',
      'sort of', 'like', 'you know', 'i mean', 'basically', 'actually',
      'totally', 'really', 'super', 'gonna', 'wanna', 'gotta'
    ],
    formal: [
      'hereby', 'pursuant', 'aforementioned', 'nevertheless', 'notwithstanding',
      'whereas', 'thereof', 'hereafter', 'heretofore', 'whereby', 'therein',
      'shall', 'ought', 'must', 'require', 'mandate'
    ],
    enthusiastic: [
      'amazing', 'excellent', 'fantastic', 'wonderful', 'excited', 'love',
      'great', 'awesome', 'brilliant', 'incredible', 'terrific', 'fabulous',
      'outstanding', 'superb', 'marvelous', 'thrilled', 'delighted'
    ],
    analytical: [
      'analyze', 'consider', 'evaluate', 'examine', 'investigate', 'determine',
      'assess', 'measure', 'calculate', 'estimate', 'compare', 'contrast',
      'conclude', 'infer', 'deduce', 'reason', 'evidence', 'data', 'result'
    ]
  };

  const toneScores = {};
  let totalMatches = 0;
  
  Object.keys(toneIndicators).forEach(tone => {
    let count = 0;
    toneIndicators[tone].forEach(indicator => {
      // Use word boundary matching for better accuracy
      const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        count += matches.length;
      }
    });
    toneScores[tone] = count;
    totalMatches += count;
  });

  // If no matches found, analyze based on other factors
  if (totalMatches === 0) {
    // Analyze based on sentence structure and punctuation
    const hasQuestionMarks = (text.match(/\?/g) || []).length;
    const hasExclamation = (text.match(/!/g) || []).length;
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    const hasContractions = /\b(can't|won't|don't|isn't|aren't|wasn't|weren't|haven't|hasn't|hadn't|couldn't|wouldn't|shouldn't)\b/gi.test(text);
    
    // Score based on characteristics
    if (hasExclamation > words.length * 0.05) {
      toneScores.enthusiastic = 3;
    }
    
    if (hasContractions) {
      toneScores.casual = 2;
    }
    
    if (avgWordLength > 5.5) {
      toneScores.formal = 2;
    } else if (avgWordLength > 4.5) {
      toneScores.professional = 2;
    }
    
    if (hasQuestionMarks > 0) {
      toneScores.analytical = 1;
    }
    
    // Default to neutral/professional if still no matches
    if (Object.values(toneScores).every(score => score === 0)) {
      toneScores.professional = 1;
    }
  }

  // Normalize scores to percentage (out of 10 for better visualization)
  const maxScore = Math.max(...Object.values(toneScores), 1);
  const normalizedScores = {};
  Object.keys(toneScores).forEach(tone => {
    normalizedScores[tone] = Math.round((toneScores[tone] / maxScore) * 10);
  });

  const dominantTone = Object.entries(normalizedScores)
    .sort((a, b) => b[1] - a[1])[0];

  return {
    primary: dominantTone[0],
    scores: normalizedScores,
    rawScores: toneScores,
    description: this.getToneDescription(dominantTone[0])
  };
}

  /**
   * Get general statistics
   */
  getStatistics(words, sentences, text) {
    return {
      totalWords: words.length,
      totalSentences: sentences.length,
      totalCharacters: text.length,
      uniqueWords: new Set(words).size,
      avgWordLength:
        Math.round(
          (words.reduce((sum, w) => sum + w.length, 0) / words.length) * 10
        ) / 10,
      avgSentenceLength:
        Math.round((words.length / sentences.length) * 10) / 10,
    };
  }

  // Helper methods
  countSyllables(words) {
    return words.reduce((count, word) => {
      // Simple syllable counting algorithm
      word = word.toLowerCase();
      if (word.length <= 3) return count + 1;

      word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
      word = word.replace(/^y/, "");
      const syllables = word.match(/[aeiouy]{1,2}/g);
      return count + (syllables ? syllables.length : 1);
    }, 0);
  }

  findRepetitions(words) {
    let repetitionCount = 0;
    for (let i = 0; i < words.length - 1; i++) {
      if (words[i] === words[i + 1]) {
        repetitionCount++;
      }
    }
    return repetitionCount;
  }

  calculateVariance(numbers) {
    const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squareDiffs = numbers.map((value) => Math.pow(value - avg, 2));
    return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / numbers.length);
  }

  getGrade(score) {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  }

  getAccuracyDescription(score) {
    if (score >= 95) return "Excellent transcription quality";
    if (score >= 85) return "Very good transcription quality";
    if (score >= 75) return "Good transcription quality";
    if (score >= 65) return "Fair transcription quality";
    return "Poor transcription quality - consider better audio quality";
  }

  getStrengthDescription(score) {
    if (score >= 80) return "Strong, assertive communication";
    if (score >= 60) return "Moderate communication strength";
    if (score >= 40) return "Developing communication strength";
    return "Needs improvement in vocabulary and assertion";
  }

  getClarityDescription(score) {
    if (score >= 80) return "Very clear and easy to understand";
    if (score >= 60) return "Fairly clear communication";
    if (score >= 40) return "Somewhat difficult to follow";
    return "Complex and difficult to understand";
  }

  getFluencyDescription(score) {
    if (score >= 90) return "Highly fluent speech";
    if (score >= 75) return "Good fluency with minor hesitations";
    if (score >= 60) return "Moderate fluency";
    return "Needs improvement - reduce filler words";
  }

  getFillerRecommendation(percentage) {
    if (percentage < 2) return "Excellent - minimal filler words";
    if (percentage < 5) return "Good - acceptable filler word usage";
    if (percentage < 10) return "Fair - try to reduce filler words";
    return "High filler word usage - practice pausing instead";
  }

  getReadabilityLevel(score) {
    if (score >= 90) return "Very Easy";
    if (score >= 80) return "Easy";
    if (score >= 70) return "Fairly Easy";
    if (score >= 60) return "Standard";
    if (score >= 50) return "Fairly Difficult";
    if (score >= 30) return "Difficult";
    return "Very Difficult";
  }

  getSentimentEmoji(label) {
    const emojiMap = {
      "Very Positive": "😄",
      Positive: "🙂",
      Neutral: "😐",
      Negative: "😟",
      "Very Negative": "😞",
    };
    return emojiMap[label] || "😐";
  }

  getToneDescription(tone) {
    const descriptions = {
      professional: "Maintains a business-appropriate tone",
      casual: "Relaxed and conversational style",
      formal: "Highly formal and structured language",
      enthusiastic: "Energetic and positive expression",
      analytical: "Logical and evidence-based approach",
    };
    return descriptions[tone] || "Balanced communication style";
  }
}

module.exports = new SpeechAnalytics();
