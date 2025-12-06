const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    
    // Enhanced extension detection
    let extension = path.extname(file.originalname);
    
    // If no extension from filename, derive from MIME type
    if (!extension && file.mimetype) {
      const mimeToExt = {
        'audio/wav': '.wav',
        'audio/wave': '.wav',
        'audio/x-wav': '.wav',
        'audio/webm': '.webm',
        'audio/ogg': '.ogg',
        'audio/mpeg': '.mp3',
        'audio/mp3': '.mp3',
        'audio/mp4': '.mp4',
        'audio/m4a': '.m4a',
        'audio/x-m4a': '.m4a'
      };
      extension = mimeToExt[file.mimetype] || '.webm'; // default fallback
    }
    
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

const fileFilter = (req, file, cb) => {
  console.log('File upload attempt:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    fieldname: file.fieldname,
    size: file.size || 'unknown'
  });

  // Enhanced MIME type checking with more variations
  const allowedMimeTypes = [
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/webm',
    'audio/webm;codecs=opus',
    'audio/webm;codecs=vp8,opus',
    'audio/ogg',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mpeg',
    'audio/mp3',
    'audio/x-m4a',
    'audio/m4a',
    'application/octet-stream', // Sometimes browsers send this for audio files
    '' // Handle empty MIME types
  ];

  const allowedExtensions = ['.wav', '.webm', '.ogg', '.mp4', '.mp3', '.m4a'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  // More lenient checking - accept if either MIME type OR extension is valid
  const mimeTypeValid = allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('audio/');
  const extensionValid = allowedExtensions.includes(fileExtension);

  if (mimeTypeValid || extensionValid) {
    console.log('File accepted:', file.originalname);
    cb(null, true);
  } else {
    console.log('File rejected:', {
      filename: file.originalname,
      mimetype: file.mimetype,
      extension: fileExtension
    });
    cb(new Error(`Invalid file type. Supported formats: WAV, WebM, OGG, MP4, MP3, M4A. Received: ${file.mimetype} with extension ${fileExtension}`), false);
  }
};

const uploadFile = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // Increased to 50MB for longer recordings
    fieldSize: 50 * 1024 * 1024,
  }
});

module.exports = uploadFile;
