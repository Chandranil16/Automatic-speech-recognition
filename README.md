🎙️ **Automatic Speech Recognition (ASR) with Speech Analytics Dashboard**

A Automatic Speech Recognition (ASR) web application built using React, Tailwind CSS Node.js, Express js, powered by AssemblyAI API for transcription.
The system supports audio file transcription (WAV only) and live speech recording transcription, and generates a detailed Speech Analytics Dashboard based on the transcription results.

⚠️**This project is currently under development and will continue to receive improvements for fine-tuning, noise suppresion, speed, accuracy, UI/UX, and overall performance.**

🚀 **Features**
1. Transcription Modes
   i) Upload & Transcribe (WAV only)
    - Upload .wav audio files
    - Get transcription output instantly on the UI
      
   ii) Live Recording & Transcribe
    - Record live voice from the browser
    - Convert speech to text in real-time / near real-time

2. Transcription Output
    - Displays the full transcript
    - Shows: Character count, Word count
    - Actions: Copy transcription, Download transcription

3. Speech Analytics Dashboard
    - After transcription, the system generates a dashboard containing performance insights such as:
     
   a) 🎯 Speech Performance Metrics
       - Accuracy (%)
       - Speech Strength (%)
       - Clarity (%)
       - Fluency (%)
    b) 🧾 Filler Word Detection
       - Total filler words detected
       - Helps evaluate hesitation patterns and confidence level

    c) 😊 Sentiment Analysis
       - Number of positive words
       - Number of negative words

    d) 🎭 Tone Analysis
       - Identifies tone style from the transcription content
   
    e) 📌 Transcript Statistics
       - Total words, Total sentences, Average word length
   
🛠️ **Tech Stack**
    - Frontend: React.js, Tailwind CSS, Browser-based audio recording support, Responsive UI components for transcript + dashboard
    - Backend:  Node.js, Express.js, REST APIs for transcription and analytics generation, Multer for file upload
    - AI / Speech-to-Text: AssemblyAI LLM (AI- powered, real-time, secure)

📌 **Current Limitations**
   - Only WAV file upload supported
   - Dashboard accuracy depends on current analytics logic (still improving)
   - Response time depends on: audio length, API latency, server processing speed

🔃 **Future Improvements**
    - Support for more audio formats (MP3, M4A, etc.)
    - Multi-lingual support for all languages
    - Better real-time transcription handling & faster response time
    - Improved speech analytics scoring model, and noise handling
    - Speaker diarization (multi-speaker detection)
    - Better UI/UX for dashboard and transcript editor
    - Improved error handling and progress indicators
    - Authentication + user transcription history
    
👤 Author
  - Developed with 💖 by myself (Chandranil Adhikary)
