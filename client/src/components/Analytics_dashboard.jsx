import React from 'react';

const MetricCard = ({ title, score, grade, description, icon, color }) => {
  const getProgressColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl p-6 border border-white/30 hover:shadow-lg transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`text-3xl ${color}`}>{icon}</div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <div className={`text-2xl font-bold px-3 py-1 rounded-lg ${
          grade === 'A' ? 'bg-green-100 text-green-700' :
          grade === 'B' ? 'bg-blue-100 text-blue-700' :
          grade === 'C' ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {grade}
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-3xl font-bold text-gray-800">{score}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full ${getProgressColor(score)} transition-all duration-500 rounded-full`}
            style={{ width: `${Math.min(score, 100)}%` }}
          ></div>
        </div>
        
        <p className="text-sm text-gray-600 mt-2">{description}</p>
      </div>
    </div>
  );
};

const FillerWordsCard = ({ fillerData }) => {
  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl p-6 border border-white/30">
      <div className="flex items-center space-x-3 mb-4">
        <span className="text-3xl">🎙️</span>
        <h3 className="text-lg font-semibold text-gray-800">Filler Words Detected</h3>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Total Count:</span>
          <span className="text-2xl font-bold text-gray-800">{fillerData.totalCount}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Percentage:</span>
          <span className="text-xl font-semibold text-orange-600">{fillerData.percentage}%</span>
        </div>
        
        {fillerData.breakdown && fillerData.breakdown.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Most Common:</p>
            <div className="space-y-2">
              {fillerData.breakdown.slice(0, 5).map(([word, count], index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 capitalize">"{word}"</span>
                  <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded">
                    {count}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">{fillerData.recommendation}</p>
        </div>
      </div>
    </div>
  );
};

const SentimentCard = ({ sentiment }) => {
  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl p-6 border border-white/30">
      <div className="flex items-center space-x-3 mb-4">
        <span className="text-3xl">{sentiment.emoji}</span>
        <h3 className="text-lg font-semibold text-gray-800">Sentiment Analysis</h3>
      </div>
      
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-4xl font-bold text-gray-800 mb-2">{sentiment.label}</div>
          <div className="text-sm text-gray-600">Score: {sentiment.score}</div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-700">
              {sentiment.positive.length}
            </div>
            <div className="text-xs text-green-600">Positive Words</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-700">
              {sentiment.negative.length}
            </div>
            <div className="text-xs text-red-600">Negative Words</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ToneCard = ({ tone }) => {
  const getToneColor = (toneName) => {
    const colors = {
      professional: 'bg-blue-100 text-blue-700',
      casual: 'bg-green-100 text-green-700',
      formal: 'bg-purple-100 text-purple-700',
      enthusiastic: 'bg-orange-100 text-orange-700',
      analytical: 'bg-indigo-100 text-indigo-700'
    };
    return colors[toneName] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl p-6 border border-white/30">
      <div className="flex items-center space-x-3 mb-4">
        <span className="text-3xl">🎭</span>
        <h3 className="text-lg font-semibold text-gray-800">Tone Analysis</h3>
      </div>
      
      <div className="space-y-4">
        <div className="text-center">
          <div className={`inline-block px-4 py-2 rounded-lg text-lg font-semibold ${getToneColor(tone.primary)}`}>
            {tone.primary.charAt(0).toUpperCase() + tone.primary.slice(1)}
          </div>
          <p className="text-sm text-gray-600 mt-3">{tone.description}</p>
        </div>
        
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-gray-700 mb-2">Tone Indicators:</p>
          {Object.entries(tone.scores).map(([toneName, score]) => (
            <div key={toneName} className="flex items-center justify-between text-sm">
              <span className="text-gray-600 capitalize">{toneName}</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-full rounded-full"
                    style={{ width: `${Math.min((score / 3) * 100, 100)}%` }}
                  ></div>
                </div>
                <span className="text-gray-700 font-medium w-6">{score}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatisticsCard = ({ stats }) => {
  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl p-6 border border-white/30">
      <div className="flex items-center space-x-3 mb-4">
        <span className="text-3xl">📊</span>
        <h3 className="text-lg font-semibold text-gray-800">Statistics</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-indigo-700">{stats.totalWords}</div>
          <div className="text-xs text-indigo-600">Total Words</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-700">{stats.totalSentences}</div>
          <div className="text-xs text-purple-600">Sentences</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-700">{stats.uniqueWords}</div>
          <div className="text-xs text-green-600">Unique Words</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-700">{stats.avgWordLength}</div>
          <div className="text-xs text-orange-600">Avg Word Length</div>
        </div>
      </div>
    </div>
  );
};

const AnalyticsDashboard = ({ analytics }) => {
  if (!analytics) return null;

  return (
    <div className="mt-8 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-3xl font-bold gradient-text mb-2">Speech Analytics Dashboard</h2>
        <p className="text-gray-600">Comprehensive analysis of your speech patterns and quality</p>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <MetricCard
          title="Accuracy"
          score={analytics.accuracy.score}
          grade={analytics.accuracy.grade}
          description={analytics.accuracy.description}
          icon="🎯"
          color="text-blue-600"
        />
        <MetricCard
          title="Speech Strength"
          score={analytics.speechStrength.score}
          grade={analytics.speechStrength.grade}
          description={analytics.speechStrength.description}
          icon="💪"
          color="text-purple-600"
        />
        <MetricCard
          title="Clarity"
          score={analytics.clarity.score}
          grade={analytics.clarity.grade}
          description={analytics.clarity.description}
          icon="💎"
          color="text-cyan-600"
        />
        <MetricCard
          title="Fluency"
          score={analytics.fluency.score}
          grade={analytics.fluency.grade}
          description={analytics.fluency.description}
          icon="🌊"
          color="text-green-600"
        />
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <FillerWordsCard fillerData={analytics.fillerWords} />
        <SentimentCard sentiment={analytics.sentiment} />
        <ToneCard tone={analytics.tone} />
        <StatisticsCard stats={analytics.statistics} />
      </div>
    </div>
  );
};

export default AnalyticsDashboard;