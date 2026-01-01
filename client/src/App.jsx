import React, { useState, useEffect } from 'react'
import FileUpload from './components/FileUpload_transcription'
import LiveTranscription from './components/Live_transcription'
import TranscriptionDisplay from './components/Display_transcription'
import AnalyticsDashboard from './components/Analytics_dashboard'
import Header from './components/Header'
function App() {
  const [transcription, setTranscription] = useState('')
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('upload')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 font-inter">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl floating-animation"></div>
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl floating-animation" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative z-10">
        <Header 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setTranscription={setTranscription}
        />
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <main className={`transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="glass neomorph rounded-3xl p-8 md:p-12 shadow-2xl border border-white/30">
              {/* Content Area */}
              <div className="mt-8">
                {activeTab === 'upload' ? (
                  <FileUpload
                    setTranscription={setTranscription}
                    setAnalytics={setAnalytics}
                    loading={loading}
                    setLoading={setLoading}
                  />
                ) : (
                  <LiveTranscription
                    setTranscription={setTranscription}
                    setAnalytics={setAnalytics}
                    loading={loading}
                    setLoading={setLoading}
                  />
                )}
              </div>
              <TranscriptionDisplay transcription={transcription} loading={loading} />
            </div>
            {/* Analytics Dashboard */}
            {analytics && <AnalyticsDashboard analytics={analytics} />}
            {/* Features Section */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: '🎯', title: 'High Accuracy', desc: 'State-of-the-art AI transcription' },
                { icon: '🌍', title: 'Protection', desc: 'Protects privacy and data' },
                { icon: '⚡', title: 'Real-time', desc: 'Instant transcription results' }
              ].map((feature, index) => (
                <div 
                  key={index}
                  className="glass neomorph rounded-2xl p-6 text-center hover:scale-105 transition-all duration-300 border border-white/20"
                >
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.desc}</p>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default App