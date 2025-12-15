const transcribe_audio = require('../services/ai_whisper');
const fs = require('fs');
const path = require('path');
const speechAnalytics = require('../services/speech_analytics');

const validateFile = (file) => {
  if (!file) {
    throw new Error('No audio file provided');
  }

  if (!fs.existsSync(file.path)) {
    throw new Error('Audio file not found on server');
  }

  const stats = fs.statSync(file.path);
  if (stats.size === 0) {
    throw new Error('Audio file is empty');
  }

  if (stats.size < 100) { // Less than 100 bytes is probably not valid audio
    throw new Error('Audio file too small - may be corrupted');
  }

  console.log('File validation passed:', {
    path: file.path,
    size: stats.size,
    mimetype: file.mimetype,
    originalname: file.originalname
  });

  return true;
};

const cleanupFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('Cleaned up file:', filePath);
    }
  } catch (cleanupError) {
    console.error('Error cleaning up file:', cleanupError);
  }
};

const transcribe_upload_file = async (req, res, next) => {
  let filePath = null;
  
  try {
    validateFile(req.file);
    filePath = req.file.path;

    console.log('Starting file transcription:', {
      path: filePath,
      size: req.file.size,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname
    });

    // Get transcription with metadata
    const result = await transcribe_audio(filePath);
    const text = typeof result === 'string' ? result : result.text;
    const metadata = typeof result === 'object' ? result : {};
    
    if (!text || text.trim().length === 0) {
      throw new Error('No transcription text returned - audio may be silent or unclear');
    }

    // Calculate analytics
    const analytics = speechAnalytics.analyzeTranscription(text, metadata);


    cleanupFile(filePath);
    
    res.json({ 
      text,
      analytics,
      metadata: {
        fileSize: req.file.size,
        fileName: req.file.originalname,
        duration: null,
        language: metadata.language_code || 'auto-detected'
      }
    });
    
  } catch (error) {
    console.error('Error during transcription:', error);
    cleanupFile(filePath);
    
    // Send more specific error messages
    const errorMessage = error.message.includes('AssemblyAI') 
      ? 'Transcription service error - please try again'
      : error.message.includes('file') 
        ? 'File processing error - please check your audio file'
        : 'Transcription failed - please try again with clearer audio';
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const transcribe_stream = async (req, res, next) => {
  let filePath = null;
  
  try {
    validateFile(req.file);
    filePath = req.file.path;

    console.log('Processing stream transcription:', filePath);

    const result = await transcribe_audio(filePath);
    const text = typeof result === 'string' ? result : result.text;
    const metadata = typeof result === 'object' ? result : {};
    
    if (!text || text.trim().length === 0) {
      throw new Error('No transcription text returned');
    }

    // Calculate analytics
    const analytics = speechAnalytics.analyzeTranscription(text, metadata);

    cleanupFile(filePath);
    
    res.json({ 
      text,
      analytics,
      metadata: {
        language: metadata.language_code || 'auto-detected'
      }
    });
    
  } catch (error) {
    console.error('Stream transcription error:', error);
    cleanupFile(filePath);
    res.status(500).json({ 
      error: 'Stream transcription failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  transcribe_upload_file,
  transcribe_stream,
};
