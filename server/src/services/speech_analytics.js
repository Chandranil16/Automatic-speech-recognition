const natural = require("natural");
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

 
  safeDivide(numerator, denominator, defaultValue = 0) {
    if (!denominator || denominator === 0 || !isFinite(denominator)) {
      return defaultValue;
    }
    const result = numerator / denominator;
    return isFinite(result) ? result : defaultValue;
  }

  
  analyzeTranscription(transcriptionText, audioMetadata = {}) {
    if (!transcriptionText || typeof transcriptionText !== "string" || transcriptionText.trim().length === 0) {
      return this.getEmptyAnalytics("No transcription text provided");
    }

    const words = this.tokenizeWords(transcriptionText);
    const sentences = this.tokenizeSentences(transcriptionText);

    if (words.length === 0) {
      return this.getEmptyAnalytics("No words detected in transcription");
    }

    if (sentences.length === 0) {
      sentences.push(transcriptionText);
    }

    const qualityMetrics = this.assessTranscriptionQuality(
      transcriptionText,
      words,
      sentences,
      audioMetadata
    );

    const baseAccuracy = this.calculateAccuracy(transcriptionText, audioMetadata);
    const baseSpeechStrength = this.calculateSpeechStrength(words, sentences);
    const baseClarity = this.calculateClarity(words, sentences, transcriptionText);
    const baseFluency = this.calculateFluency(words, sentences, transcriptionText);
    const fillerWords = this.detectFillerWords(transcriptionText);
    const sentiment = this.analyzeSentiment(transcriptionText);
    const tone = this.analyzeTone(transcriptionText);
    const statistics = this.getStatistics(words, sentences, transcriptionText);

    const qualityFactor = qualityMetrics.overallQualityFactor;

    return {
      accuracy: {
        ...baseAccuracy,
        score: Math.round(baseAccuracy.score * qualityFactor * 10) / 10,
        originalScore: baseAccuracy.score,
        adjustedBy: qualityMetrics.adjustmentReason,
      },
      speechStrength: {
        ...baseSpeechStrength,
        score: Math.round(baseSpeechStrength.score * qualityFactor * 10) / 10,
        originalScore: baseSpeechStrength.score,
        adjustedBy: qualityMetrics.adjustmentReason,
      },
      clarity: {
        ...baseClarity,
        score: Math.round(baseClarity.score * qualityFactor * 10) / 10,
        originalScore: baseClarity.score,
        adjustedBy: qualityMetrics.adjustmentReason,
      },
      fluency: {
        ...baseFluency,
        score: Math.round(baseFluency.score * qualityFactor * 10) / 10,
        originalScore: baseFluency.score,
        adjustedBy: qualityMetrics.adjustmentReason,
      },
      fillerWords,
      sentiment,
      tone,
      statistics,
      qualityMetrics,
    };
  }

  
  getEmptyAnalytics(reason) {
    return {
      accuracy: { score: 0, grade: "F", description: reason },
      speechStrength: { score: 0, grade: "F", description: reason, vocabularyRichness: 0 },
      clarity: { score: 0, grade: "F", description: reason, readabilityLevel: "N/A", avgWordsPerSentence: 0 },
      fluency: { score: 0, grade: "F", description: reason, fillerWordRatio: 0 },
      fillerWords: { totalCount: 0, percentage: 0, breakdown: [], recommendation: reason },
      sentiment: { score: 0, comparative: 0, label: "Neutral", positive: [], negative: [], emoji: "😐" },
      tone: { primary: "neutral", scores: {}, rawScores: {}, description: reason },
      statistics: { totalWords: 0, totalSentences: 0, totalCharacters: 0, uniqueWords: 0, avgWordLength: 0, avgSentenceLength: 0 },
      qualityMetrics: {
        overallQualityFactor: 0,
        qualityLevel: "poor",
        qualityScore: 0,
        confidence: 0,
        issues: [reason],
        adjustmentReason: reason,
        metricsReliability: "poor",
      },
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
    try {
      const tokenizer = new natural.SentenceTokenizer();
      const sentences = tokenizer.tokenize(text);

      if (!sentences || sentences.length === 0) {
        const fallbackSentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
        return fallbackSentences.length > 0 ? fallbackSentences : [text];
      }

      return sentences;
    } catch (error) {
      console.error("Sentence tokenization error:", error);
      return [text]; 
    }
  }

  
  calculateAccuracy(text, metadata) {
    if (metadata && metadata.word_confidence_avg && metadata.word_accuracy_distribution) {
      const wordConfidence = metadata.word_confidence_avg * 100;
      const distribution = metadata.word_accuracy_distribution;
      
      // Calculate weighted score based on distribution
      const totalWords = distribution.excellent + distribution.good + distribution.fair + distribution.poor;
      
      if (totalWords > 0) {
        const weightedScore = (
          (distribution.excellent * 100) +
          (distribution.good * 80) +
          (distribution.fair * 60) +
          (distribution.poor * 30)
        ) / totalWords;
        
        const breakdown = {
          excellentWords: distribution.excellent,
          goodWords: distribution.good,
          fairWords: distribution.fair,
          poorWords: distribution.poor,
          uncertainWords: metadata.uncertain_words || [],
        };
        
        return {
          score: Math.round(weightedScore * 10) / 10,
          grade: this.getGrade(weightedScore),
          description: this.getAccuracyDescriptionDetailed(weightedScore, breakdown),
          source: "word-level",
          breakdown,
          avgWordConfidence: Math.round(wordConfidence * 10) / 10,
          lowConfidenceWords: metadata.low_confidence_words || 0,
        };
      }
    }

    if (metadata && metadata.confidence && typeof metadata.confidence === "number") {
      const apiScore = metadata.confidence * 100;
      return {
        score: Math.round(apiScore * 10) / 10,
        grade: this.getGrade(apiScore),
        description: this.getAccuracyDescription(apiScore),
        source: "api",
      };
    }

    let score = 30;
    let penalties = 0;

    const hasProperCapitalization = /[A-Z]/.test(text);
    const hasPunctuation = /[.,!?;:]/.test(text);
    const hasMultipleSentences = (text.match(/[.!?]/g) || []).length > 1;
    const wordCount = text.split(/\s+/).length;
    const hasConsecutiveCaps = /[A-Z]{3,}/.test(text);
    const hasProperSentenceStart = /^[A-Z]/.test(text.trim());

    if (hasProperCapitalization && hasProperSentenceStart) score += 8;
    if (hasPunctuation) score += 7;
    if (hasMultipleSentences) score += 5;
    if (wordCount > 30) score += 5;
    if (wordCount > 80) score += 5;

    if (hasConsecutiveCaps) penalties += 10;
    if (!hasPunctuation && wordCount > 10) penalties += 15;
    if (!hasProperCapitalization && wordCount > 5) penalties += 10;
    if (wordCount < 5) penalties += 20;

    score = Math.max(20, score - penalties);
    score = Math.min(score, 70);

    return {
      score: Math.round(score * 10) / 10,
      grade: this.getGrade(score),
      description: this.getAccuracyDescription(score) + " (estimated - limited data)",
      source: "heuristic",
    };
  }

  getAccuracyDescriptionDetailed(score, breakdown) {
    const total = breakdown.excellentWords + breakdown.goodWords + breakdown.fairWords + breakdown.poorWords;
    const excellentPct = Math.round((breakdown.excellentWords / total) * 100);
    const poorPct = Math.round((breakdown.poorWords / total) * 100);
    
    let description = this.getAccuracyDescription(score);
    
    if (excellentPct > 70) {
      description += ` - ${excellentPct}% of words transcribed with high confidence`;
    } else if (poorPct > 30) {
      description += ` - ${poorPct}% of words have low confidence (${breakdown.poorWords}/${total} words uncertain)`;
    } else {
      description += ` - Mixed confidence levels across transcription`;
    }
    
    if (breakdown.uncertainWords && breakdown.uncertainWords.length > 0) {
      const uncertainList = breakdown.uncertainWords.slice(0, 3).map(w => w.text).join(', ');
      description += `. Uncertain words: "${uncertainList}"`;
    }
    
    return description;
  }

  
  calculateSpeechStrength(words, sentences) {
    const uniqueWords = new Set(words);
    const vocabularyRichness = this.safeDivide(uniqueWords.size, words.length, 0) * 100;

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
        "build",
        "design",
        "execute",
        "deliver",
        "drive",
        "transform",
      ].includes(word)
    ).length;

    const assertivenessScore = this.safeDivide(strongVerbs, words.length, 0) * 1000;
    const avgWordsPerSentence = this.safeDivide(words.length, sentences.length, 10);
    const sentenceComplexity = Math.min(this.safeDivide(avgWordsPerSentence, 20, 0) * 100, 100);

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

  calculateClarity(words, sentences, text) {
    const syllables = this.countSyllables(words);
    const avgSyllablesPerWord = this.safeDivide(syllables, words.length, 1.5);
    const avgWordsPerSentence = this.safeDivide(words.length, sentences.length, 15);

    const fleschScore =
      206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
    const clarityScore = Math.max(0, Math.min(fleschScore, 100));

    const runOnSentences = sentences.filter(
      (s) => s.split(/\s+/).length > 30
    ).length;
    const runOnPenalty = this.safeDivide(runOnSentences, sentences.length, 0) * 20;

    const finalScore = Math.max(0, clarityScore - runOnPenalty);

    return {
      score: Math.round(finalScore * 10) / 10,
      readabilityLevel: this.getReadabilityLevel(fleschScore),
      avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
      grade: this.getGrade(finalScore),
      description: this.getClarityDescription(finalScore),
    };
  }

  
  calculateFluency(words, sentences, text) {
    const fillerCount = this.detectFillerWords(text).totalCount;
    const fillerRatio = this.safeDivide(fillerCount, words.length, 0) * 100;

    let fluencyScore = 100 - fillerRatio * 5;

    const repetitions = this.findRepetitions(words);
    const repetitionPenalty = this.safeDivide(repetitions, words.length, 0) * 100;

    fluencyScore = Math.max(0, fluencyScore - repetitionPenalty);

    const sentenceLengths = sentences.map((s) => s.split(/\s+/).length);
    const lengthVariance = this.calculateVariance(sentenceLengths);
    const varianceBonus = Math.min(this.safeDivide(lengthVariance, 2, 0), 10);

    fluencyScore = Math.min(100, fluencyScore + varianceBonus);

    return {
      score: Math.round(fluencyScore * 10) / 10,
      fillerWordRatio: Math.round(fillerRatio * 10) / 10,
      grade: this.getGrade(fluencyScore),
      description: this.getFluencyDescription(fluencyScore),
    };
  }

  
  detectFillerWords(text) {
    const lowerText = text.toLowerCase();
    const detectedFillers = {};
    let totalCount = 0;

    this.fillerWords.forEach((filler) => {
      let regex;

      if (filler.includes(" ")) {
        const escapedFiller = filler.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        regex = new RegExp(escapedFiller, "gi");
      } else {
        regex = new RegExp(`\\b${filler}\\b`, "gi");
      }

      const matches = lowerText.match(regex);
      if (matches) {
        detectedFillers[filler] = matches.length;
        totalCount += matches.length;
      }
    });

    const words = this.tokenizeWords(text);
    const percentage = this.safeDivide(totalCount, words.length, 0) * 100;

    return {
      totalCount,
      percentage: Math.round(percentage * 10) / 10,
      breakdown: Object.entries(detectedFillers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      recommendation: this.getFillerRecommendation(percentage),
    };
  }

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

  analyzeTone(text) {
    const lowerText = text.toLowerCase();
    const words = this.tokenizeWords(text);

    const toneIndicators = {
      professional: [
        "furthermore",
        "therefore",
        "however",
        "consequently",
        "regarding",
        "respective",
        "accordingly",
        "thus",
        "hence",
        "moreover",
        "additionally",
        "specifically",
        "particularly",
        "essentially",
        "primarily",
        "ultimately",
        "significantly",
      ],
      casual: [
        "yeah",
        "cool",
        "awesome",
        "stuff",
        "things",
        "pretty much",
        "kind of",
        "sort of",
        "like",
        "you know",
        "i mean",
        "basically",
        "actually",
        "totally",
        "really",
        "super",
        "gonna",
        "wanna",
        "gotta",
      ],
      formal: [
        "hereby",
        "pursuant",
        "aforementioned",
        "nevertheless",
        "notwithstanding",
        "whereas",
        "thereof",
        "hereafter",
        "heretofore",
        "whereby",
        "therein",
        "shall",
        "ought",
        "must",
        "require",
        "mandate",
      ],
      enthusiastic: [
        "amazing",
        "excellent",
        "fantastic",
        "wonderful",
        "excited",
        "love",
        "great",
        "awesome",
        "brilliant",
        "incredible",
        "terrific",
        "fabulous",
        "outstanding",
        "superb",
        "marvelous",
        "thrilled",
        "delighted",
      ],
      analytical: [
        "analyze",
        "consider",
        "evaluate",
        "examine",
        "investigate",
        "determine",
        "assess",
        "measure",
        "calculate",
        "estimate",
        "compare",
        "contrast",
        "conclude",
        "infer",
        "deduce",
        "reason",
        "evidence",
        "data",
        "result",
      ],
    };

    const toneScores = {};
    let totalMatches = 0;

    Object.keys(toneIndicators).forEach((tone) => {
      let count = 0;
      toneIndicators[tone].forEach((indicator) => {
        let regex;
        if (indicator.includes(" ")) {
          const escaped = indicator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          regex = new RegExp(escaped, "gi");
        } else {
          regex = new RegExp(`\\b${indicator}\\b`, "gi");
        }
        const matches = lowerText.match(regex);
        if (matches) count += matches.length;
      });
      toneScores[tone] = count;
      totalMatches += count;
    });

    // Fallback analysis
    if (totalMatches === 0) {
      const hasQuestionMarks = (text.match(/\?/g) || []).length;
      const hasExclamation = (text.match(/!/g) || []).length;
      const avgWordLength = this.safeDivide(
        words.reduce((sum, w) => sum + w.length, 0),
        words.length,
        4
      );
      const hasContractions = /\b(can't|won't|don't|isn't|aren't|wasn't|weren't|haven't|hasn't|hadn't|couldn't|wouldn't|shouldn't)\b/gi.test(text);

      if (hasExclamation > words.length * 0.05) toneScores.enthusiastic = 3;
      if (hasContractions) toneScores.casual = 2;
      if (avgWordLength > 5.5) toneScores.formal = 2;
      else if (avgWordLength > 4.5) toneScores.professional = 2;
      if (hasQuestionMarks > 0) toneScores.analytical = 1;

      if (Object.values(toneScores).every((score) => score === 0)) {
        toneScores.casual = 1; 
      }
    }

    const maxScore = Math.max(...Object.values(toneScores), 1);
    const normalizedScores = {};
    Object.keys(toneScores).forEach((tone) => {
      normalizedScores[tone] = Math.round(this.safeDivide(toneScores[tone], maxScore, 0) * 10);
    });

    const dominantTone = Object.entries(normalizedScores)
      .sort((a, b) => b[1] - a[1])[0];

    return {
      primary: dominantTone[0],
      scores: normalizedScores,
      rawScores: toneScores,
      description: this.getToneDescription(dominantTone[0]),
    };
  }

  
  assessTranscriptionQuality(text, words, sentences, metadata) {
    let qualityScore = 100;
    let penaltyPoints = 0; 
    const issues = [];

    const confidence = (metadata && (metadata.confidence || metadata.original_confidence)) || 0.5; 

    if (confidence < 0.5) {
      penaltyPoints += 50;
      issues.push("Very low transcription confidence");
    } else if (confidence < 0.7) {
      penaltyPoints += 25;
      issues.push("Low transcription confidence");
    } else if (confidence < 0.85) {
      penaltyPoints += 10;
      issues.push("Moderate transcription confidence");
    }

    const gibberishPatterns = [
      /^[^a-zA-Z0-9\s]{5,}$/,
      /(.)\1{5,}/,
      /^[aeiou]{10,}$/i,
      /\b\w{20,}\b/,
    ];

    if (gibberishPatterns.some((pattern) => pattern.test(text))) {
      penaltyPoints += 60;
      issues.push("Detected garbled or nonsense text");
    }

    const avgWordLength = this.safeDivide(text.length, words.length, 5);
    if (avgWordLength > 15) {
      penaltyPoints += 40;
      issues.push("Unusually long words detected (possible errors)");
    } else if (avgWordLength < 2) {
      penaltyPoints += 30;
      issues.push("Unusually short words (possible fragmentation)");
    }

    if (words.length < 5) {
      penaltyPoints += 50;
      issues.push("Very short transcription (insufficient data)");
    } else if (words.length < 15) {
      penaltyPoints += 20;
      issues.push("Short transcription (limited analysis)");
    }

    if (sentences.length === 0) {
      penaltyPoints += 40;
      issues.push("No sentence structure detected");
    } else if (this.safeDivide(words.length, sentences.length, 0) > 50) {
      penaltyPoints += 20;
      issues.push("Extremely long sentences (possible run-on errors)");
    }

    const uniqueWords = new Set(words);
    const repetitionRatio = this.safeDivide(uniqueWords.size, words.length, 1);
    if (repetitionRatio < 0.3) {
      penaltyPoints += 40;
      issues.push("High word repetition (possible transcription error)");
    } else if (repetitionRatio < 0.5) {
      penaltyPoints += 15;
      issues.push("Moderate word repetition");
    }

    const fillerCount = this.detectFillerWords(text).totalCount;
    const fillerRatio = this.safeDivide(fillerCount, words.length, 0);
    if (fillerRatio > 0.5) {
      penaltyPoints += 50;
      issues.push("Predominantly filler words (poor audio quality)");
    } else if (fillerRatio > 0.3) {
      penaltyPoints += 25;
      issues.push("High filler word ratio");
    }

    const capitalizedWords = text.match(/\b[A-Z][a-z]+/g) || [];
    if (capitalizedWords.length === 0 && words.length > 10) {
      penaltyPoints += 15;
      issues.push("No capitalization (possible quality issue)");
    }

    const punctuationCount = (text.match(/[.,!?;:]/g) || []).length;
    if (punctuationCount === 0 && sentences.length > 2) {
      penaltyPoints += 10;
      issues.push("No punctuation detected");
    }

    if (metadata && metadata.language_confidence && metadata.language_confidence < 0.5) {
      penaltyPoints += 30;
      issues.push("Uncertain language detection");
    }

    qualityScore = Math.max(0, qualityScore - penaltyPoints);
    const qualityFactor = Math.max(0.1, Math.min(1.0, qualityScore / 100));

    // Determine quality level
    let qualityLevel = "excellent";
    if (qualityFactor < 0.4) qualityLevel = "poor";
    else if (qualityFactor < 0.6) qualityLevel = "fair";
    else if (qualityFactor < 0.8) qualityLevel = "good";

    return {
      overallQualityFactor: qualityFactor,
      qualityLevel,
      qualityScore: Math.round(qualityFactor * 100),
      confidence: confidence,
      issues: issues,
      adjustmentReason:
        issues.length > 0 ? `Scores adjusted due to: ${issues.join(", ")}` : "High quality transcription, no adjustments needed",
      metricsReliability: qualityLevel,
    };
  }

  getStatistics(words, sentences, text) {
    const avgWordLength = this.safeDivide(
      words.reduce((sum, w) => sum + w.length, 0),
      words.length,
      0
    );
    const avgSentenceLength = this.safeDivide(words.length, sentences.length, 0);

    return {
      totalWords: words.length,
      totalSentences: sentences.length,
      totalCharacters: text.length,
      uniqueWords: new Set(words).size,
      avgWordLength: Math.round(avgWordLength * 10) / 10,
      avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    };
  }

  countSyllables(words) {
    return words.reduce((count, word) => {
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
    if (numbers.length === 0) return 0;
    if (numbers.length === 1) return 0;

    const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squareDiffs = numbers.map((value) => Math.pow(value - avg, 2));
    const variance = squareDiffs.reduce((a, b) => a + b, 0) / numbers.length;
    return Math.sqrt(variance);
  }

  getGrade(score) {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  }

  getAccuracyDescription(score) {
    if (score >= 90) return "Excellent transcription quality";
    if (score >= 70) return "Very good transcription quality";
    if (score >= 50) return "Good transcription quality";
    if (score >= 30) return "Fair transcription quality";
    if (score >= 10) return "Poor transcription quality";
    return "Very poor transcription quality - consider better audio";
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
    if (score >= 80) return "Highly fluent speech";
    if (score >= 60) return "Good fluency with minor hesitations";
    if (score >= 40) return "Moderate fluency";
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
