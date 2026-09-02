const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const {
  transcribe_upload_file,
  transcribe_stream,
} = require("../controllers/transcription_controller");

const router = express.Router();

const uploadDirectory = path.join(__dirname, "../../uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(
      null,
      `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`,
    );
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    const allowedTypes = [
      "audio/wav",
      "audio/x-wav",
      "audio/webm",
      "audio/ogg",
      "audio/mp4",
      "audio/mpeg",
      "audio/mp3",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(new Error("Unsupported audio format"));
    }

    callback(null, true);
  },
});

router.post("/upload", upload.single("audio"), transcribe_upload_file);
router.post("/stream", upload.single("audio"), transcribe_stream);

module.exports = router;
