const express = require('express');
const {transcribe_upload_file, transcribe_stream} = require('../controllers/transcription_controller');
const router=express.Router();


module.exports=router;