import React, { useState, useRef } from 'react'
import axios from 'axios'
import API_BASE_URL from '../config/api'

const FileUpload = ({ setTranscription, loading, setLoading }) => {
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileChange = (selectedFile) => {
    if (selectedFile) {
      if (selectedFile.type === 'audio/wav' || selectedFile.name.endsWith('.wav')) {
        setFile(selectedFile)
        setError('')
      } else {
        setError('Please upload a WAV file only')
        setFile(null)
      }
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }

    const formData = new FormData()
    formData.append('audio', file)

    setLoading(true)
    setError('')
    setTranscription('')

    try {
      // Using full backend URL directly
      const response = await axios.post(`${API_BASE_URL}/api/transcribe/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setTranscription(response.data.text)
    } catch (err) {
      setError(err.response?.data?.error || 'Error uploading file')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Upload Area */}
      <div
        className={`
          relative group border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 cursor-pointer
          ${dragActive 
            ? 'border-indigo-400 bg-indigo-50/50 scale-105' 
            : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30'
          }
          ${file ? 'border-green-400 bg-green-50/30' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".wav,audio/wav"
          onChange={(e) => handleFileChange(e.target.files[0])}
          className="hidden"
          aria-label="Upload audio file"
        />
        
        <div className="flex flex-col items-center space-y-4">
          <div className={`
            w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300
            ${file ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'}
            group-hover:scale-110 neomorph
          `}>
            {file ? (
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
          </div>
          
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {file ? 'File Selected!' : 'Drop your WAV file here'}
            </h3>
            <p className="text-gray-600">
              {file ? file.name : 'or click to browse from your device'}
            </p>
            <p className="text-sm text-gray-500 mt-2">Maximum file size: 25MB</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50/80 backdrop-blur border border-red-200 text-red-700 px-6 py-4 rounded-2xl animate-slide-up">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className={`
          w-full py-4 px-8 rounded-2xl font-semibold text-lg transition-all duration-300 transform
          ${!file || loading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 hover:scale-105 shadow-lg hover:shadow-xl pulse-glow'
          }
        `}
        aria-label="Upload and transcribe file"
      >
        {loading ? (
          <div className="flex items-center justify-center space-x-3">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>Transcribing...</span>
          </div>
        ) : (
          'Upload and Transcribe'
        )}
      </button>
    </div>
  )
}

export default FileUpload