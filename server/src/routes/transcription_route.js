const express = require('express');
const uploadFile = require('../middleware/upload');
const {transcribe_upload_file, transcribe_stream} = require('../controllers/transcription_controller');
const router=express.Router();

router.post('/upload', uploadFile.single('audio'), transcribe_upload_file);
router.post('/stream', uploadFile.single('audio'), transcribe_stream);

module.exports=router;