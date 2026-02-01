import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { Brain, TrendingUp, Target, Lightbulb, Star, Award, BarChart3, Clock, Trophy, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface AIAssessmentReportProps {
  className?: string;
}

const AIAssessmentReport: React.FC<AIAssessmentReportProps> = ({ className = '' }) => {
  const { user, generateAIReport, getStrengthsAndGrowthAreas } = useUser();
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    overview: true,
    strengths: true,
    growth: true,
    recommendations: true,
    detailed: false
  });
  const [aiReport, setAiReport] = useState<string>('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const assessment = user?.profile.aiAssessment;
  const { strengths, growthAreas } = getStrengthsAndGrowthAreas();

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const generateDetailedReport = async () => {
    setIsGeneratingReport(true);
    try {
      const report = await generateAIReport();
      setAiReport(report);
      setExpandedSections(prev => ({ ...prev, detailed: true }));
    } catch (error) {
      console.error('Error generating detailed report:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Developing';
    return 'Emerging';
  };

  const getLevelColor = (level: number): string => {
    if (level >= 4.5) return 'text-purple-600 bg-purple-100';
    if (level >= 3.5) return 'text-green-600 bg-green-100';
    if (level >= 2.5) return 'text-blue-600 bg-blue-100';
    if (level >= 1.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getTrendIcon = (trend: 'improving' | 'stable' | 'declining') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining':
        return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />;
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
    }
  };

  if (!assessment) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-8 ${className}`}>
        <div className="text-center">
          <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">AI Cognitive Assessment</h3>
          <p className="text-gray-600 mb-6">
            Play games to generate your personalized cognitive assessment report!
          </p>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-blue-800 font-medium">
              🎮 Try the Magic Storyteller game to start building your cognitive profile
            </p>
          </div>
        </div>
      </div>
    );
  }

  const topConcepts = Object.entries(assessment.cognitiveProfile)
    .sort(([,a], [,b]) => b.level - a.level)
    .slice(0, 8);

  return (
    <div className={`bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">🧠 AI Cognitive Assessment</h2>
            <p className="text-purple-100">
              Comprehensive neuropsychological profile based on {assessment.totalSessions} learning sessions
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{assessment.overallScore}</div>
            <div className="text-sm text-purple-200">Overall Score</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Overview Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <button
            onClick={() => toggleSection('overview')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-800">Performance Overview</h3>
            </div>
            {expandedSections.overview ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          
          {expandedSections.overview && (
            <div className="px-4 pb-4">
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-purple-800">Overall Performance</span>
                  </div>
                  <div className={`text-2xl font-bold px-3 py-1 rounded-full inline-block ${getScoreColor(assessment.overallScore)}`}>
                    {assessment.overallScore}/100
                  </div>
                  <div className="text-sm text-purple-600 mt-1">{getScoreLabel(assessment.overallScore)}</div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-800">Learning Sessions</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{assessment.totalSessions}</div>
                  <div className="text-sm text-blue-600">Games Completed</div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">Concepts Assessed</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {Object.keys(assessment.cognitiveProfile).length}
                  </div>
                  <div className="text-sm text-green-600">Neuropsych Areas</div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Last Updated:</strong> {new Date(assessment.lastUpdated).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {assessment.detailedAnalysis || 'Your cognitive profile shows developing strength across multiple neuropsychological domains. Continue engaging with diverse learning activities to build comprehensive cognitive abilities.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Strengths Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <button
            onClick={() => toggleSection('strengths')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-800">Cognitive Strengths</h3>
            </div>
            {expandedSections.strengths ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          
          {expandedSections.strengths && (
            <div className="px-4 pb-4">
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                {strengths.map((strength, index) => {
                  const conceptData = assessment.cognitiveProfile[strength];
                  if (!conceptData) return null;
                  
                  return (
                    <div key={strength} className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-green-800">{strength}</h4>
                        {getTrendIcon(conceptData.trend)}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`px-2 py-1 rounded text-sm font-medium ${getLevelColor(conceptData.level)}`}>
                          Level {conceptData.level.toFixed(1)}/5.0
                        </div>
                        <div className="text-xs text-green-600">
                          {conceptData.frequency} sessions
                        </div>
                      </div>
                      <div className="text-xs text-green-700">
                        Developed through: {Object.keys(conceptData.gameContributions).join(', ') || 'Various games'}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {strengths.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  Play more games to identify your cognitive strengths!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Growth Areas Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <button
            onClick={() => toggleSection('growth')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-800">Growth Opportunities</h3>
            </div>
            {expandedSections.growth ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          
          {expandedSections.growth && (
            <div className="px-4 pb-4">
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                {growthAreas.map((area, index) => {
                  const conceptData = assessment.cognitiveProfile[area];
                  if (!conceptData) return null;
                  
                  return (
                    <div key={area} className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-orange-800">{area}</h4>
                        {getTrendIcon(conceptData.trend)}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`px-2 py-1 rounded text-sm font-medium ${getLevelColor(conceptData.level)}`}>
                          Level {conceptData.level.toFixed(1)}/5.0
                        </div>
                        <div className="text-xs text-orange-600">
                          {conceptData.frequency} sessions
                        </div>
                      </div>
                      <div className="text-xs text-orange-700">
                        Practice with: Games targeting {area.toLowerCase()}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {growthAreas.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  All areas showing strong development!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recommendations Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <button
            onClick={() => toggleSection('recommendations')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Lightbulb className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">AI Recommendations</h3>
            </div>
            {expandedSections.recommendations ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          
          {expandedSections.recommendations && (
            <div className="px-4 pb-4">
              <div className="space-y-3">
                {assessment.recommendations.map((rec, index) => (
                  <div key={index} className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <p className="text-blue-800 font-medium">{rec}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {assessment.recommendations.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  Personalized recommendations will appear as you play more games.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detailed Analysis Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <button
            onClick={() => toggleSection('detailed')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-800">Detailed AI Analysis</h3>
            </div>
            {expandedSections.detailed ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          
          {expandedSections.detailed && (
            <div className="px-4 pb-4">
              {!aiReport ? (
                <div className="text-center py-8">
                  <button
                    onClick={generateDetailedReport}
                    disabled={isGeneratingReport}
                    className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingReport ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Generating Report...
                      </div>
                    ) : (
                      'Generate Detailed Analysis'
                    )}
                  </button>
                  <p className="text-gray-600 mt-2 text-sm">
                    Get a comprehensive AI-generated report about your cognitive development
                  </p>
                </div>
              ) : (
                <div className="prose prose-gray max-w-none">
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="text-purple-800 leading-relaxed whitespace-pre-wrap">
                      {aiReport}
                    </div>
                  </div>
                  <div className="text-center mt-4">
                    <button
                      onClick={generateDetailedReport}
                      disabled={isGeneratingReport}
                      className="text-purple-600 hover:text-purple-700 text-sm font-medium underline"
                    >
                      Regenerate Analysis
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cognitive Profile Grid */}
        {topConcepts.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              Top Cognitive Areas
            </h3>
            <div className="grid md:grid-cols-4 gap-3">
              {topConcepts.map(([concept, data]) => (
                <div key={concept} className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xs font-medium text-gray-700 mb-1">{concept}</div>
                  <div className={`text-lg font-bold px-2 py-1 rounded ${getLevelColor(data.level)}`}>
                    {data.level.toFixed(1)}
                  </div>
                  <div className="flex items-center justify-center mt-1">
                    {getTrendIcon(data.trend)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAssessmentReport;