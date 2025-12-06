import React, { useState } from 'react'

const TranscriptionDisplay = ({ transcription, loading }) => {
  const [copied, setCopied] = useState(false)

  if (!transcription && !loading) return null

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(transcription)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  const downloadTranscription = () => {
    const element = document.createElement('a')
    const file = new Blob([transcription], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = `transcription-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="mt-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-semibold gradient-text">Transcription Result</h3>
        
        {transcription && !loading && (
          <div className="flex space-x-3">
            <button
              onClick={copyToClipboard}
              className="flex items-center space-x-2 px-4 py-2 bg-white/80 backdrop-blur text-gray-700 rounded-xl hover:bg-white transition-all duration-300 border border-white/30 hover:scale-105"
              aria-label="Copy transcription to clipboard"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy</span>
                </>
              )}
            </button>
            
            <button
              onClick={downloadTranscription}
              className="flex items-center space-x-2 px-4 py-2 bg-white/80 backdrop-blur text-gray-700 rounded-xl hover:bg-white transition-all duration-300 border border-white/30 hover:scale-105"
              aria-label="Download transcription as text file"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download</span>
            </button>
          </div>
        )}
      </div>
      
      <div className="glass neomorph-inset rounded-3xl p-8 min-h-[200px] border border-white/20">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-200 rounded-full animate-spin border-t-indigo-600"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-indigo-400"></div>
            </div>
            <div className="text-center">
              <p className="text-gray-600 font-medium">Processing your audio...</p>
              <p className="text-sm text-gray-500 mt-1">This may take a few moments</p>
            </div>
          </div>
        ) : (
          <div className="prose prose-lg max-w-none">
            <div className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white/30">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-lg">
                {transcription}
              </p>
            </div>
            
            {transcription && (
              <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
                <span>Word count: {transcription.split(' ').length}</span>
                <span>Characters: {transcription.length}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default TranscriptionDisplay