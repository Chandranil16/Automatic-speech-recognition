import React from 'react'

const Header = ({ activeTab, setActiveTab, setTranscription }) => {
  const tabs = [
    { id: 'upload', label: 'Upload File', icon: '📁' },
    { id: 'live', label: 'Live Recording', icon: '🎙️' }
  ]

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    setTranscription('')
  }

  return (
    <header className="relative py-16 text-center">
      <div className="container mx-auto px-4">
        {/* Logo and Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl glass neomorph mb-6 floating-animation">
          <svg className="w-10 h-10 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
        </div>
        
        {/* Main Title */}
        <h1 className="text-5xl md:text-6xl font-bold gradient-text mb-4 tracking-tight">
          Automatic Speech Recognition
        </h1>
        
        {/* Description */}
        <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8">
          Transform speech into text with cutting-edge AI technology. 
          <span className="block mt-2 text-lg text-gray-500">
            Upload files or record live with perfect accuracy.
          </span>
        </p>
        
        {/* Status Indicators */}
        <div className="flex items-center justify-center mb-12 space-x-6">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>AI-Powered</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span>Real-time</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
            <span>Secure</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-md mx-auto">
          <div className="flex space-x-2 bg-white/5 p-2 rounded-2xl backdrop-blur-sm border border-white/10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  flex-1 flex items-center justify-center space-x-3 px-6 py-4 rounded-xl font-semibold transition-all duration-300
                  ${activeTab === tab.id
                    ? 'bg-white text-indigo-600 shadow-lg transform scale-105 neomorph'
                    : 'text-gray-600 hover:bg-white/10 hover:text-gray-800'
                  }
                `}
                aria-label={`Switch to ${tab.label}`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header