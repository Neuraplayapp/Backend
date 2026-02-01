import React, { useState, useLayoutEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import { Link } from 'react-router-dom';
import { FileText, Loader2, ArrowLeft, Star, Trophy, Target, Brain, Zap, Crown, TrendingUp, Activity, Award, Sparkles } from 'lucide-react';
// Use the globally loaded GSAP from CDN
declare const gsap: any;
import { AnalyticsService, UserAnalytics } from '../utils/analyticsService';

const AIReportPage: React.FC = () => {
  const { user } = useUser();
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  const glassPanelStyle = "bg-black/20 border border-white/10 backdrop-blur-md";

  useLayoutEffect(() => {
    if (contentRef.current) {
      gsap.fromTo(contentRef.current, 
        { autoAlpha: 0, y: 20 }, 
        { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: 0.1 }
      );
    }
  }, []);

  const generateReport = async () => {
    if (!user) return;

    setLoading(true);
    setError('');
    setReport('');

    try {
      // Generate comprehensive analytics
      console.log('User data for analytics:', user);
      
      // Validate user data structure
      if (!user.profile || !user.profile.gameProgress) {
        console.error('Invalid user data structure:', user);
        throw new Error('User data is incomplete. Please refresh the page and try again.');
      }
      
      // Check if user has any game progress
      const hasGameProgress = Object.keys(user.profile.gameProgress).length > 0;
      console.log('User has game progress:', hasGameProgress);
      console.log('Game progress keys:', Object.keys(user.profile.gameProgress));
      
      if (!hasGameProgress) {
        console.log('No game progress found, using fallback data');
        // Add some basic game progress for testing
        user.profile.gameProgress = {
          'memory-sequence': { level: 1, stars: 5, bestScore: 80, timesPlayed: 3, playTime: 300 },
          'starbloom-adventure': { level: 1, stars: 3, bestScore: 70, timesPlayed: 2, playTime: 200 }
        };
      }
      
      let analytics: UserAnalytics;
      try {
        analytics = AnalyticsService.analyzeUserData(user);
        console.log('Analytics generated:', analytics);
      } catch (analyticsError) {
        console.error('Error generating analytics:', analyticsError);
        throw new Error('Failed to analyze user data. Please try again.');
      }

      const prompt = `Create a comprehensive learning report for ${analytics.user.username} (${analytics.user.age || 'Not specified'} years old).

KEY ACHIEVEMENTS:
- Rank: ${analytics.overallStats.currentRank}
- Total XP: ${analytics.overallStats.totalXP}
- Stars Earned: ${analytics.overallStats.totalStars}
- Games Played: ${analytics.overallStats.totalGamesPlayed}
- Completion Rate: ${analytics.overallStats.completionRate.toFixed(1)}%

COGNITIVE PROFILE:
- Learning Style: ${analytics.cognitiveProfile.learningStyle}
- Overall Progress: ${(analytics.cognitiveProfile.overallProgress * 100).toFixed(1)}%
- Consistency: ${analytics.cognitiveProfile.consistency.toFixed(1)}%

STRENGTHS (${analytics.cognitiveProfile.strengths.length}):
${analytics.cognitiveProfile.strengths.slice(0, 5).map(s => `- ${s.name}`).join('\n')}

AREAS TO IMPROVE (${analytics.cognitiveProfile.areasForImprovement.length}):
${analytics.cognitiveProfile.areasForImprovement.slice(0, 3).map(s => `- ${s.name}`).join('\n')}

TOP GAMES:
${analytics.gameAnalytics.slice(0, 5).map(game => `- ${game.gameName}: ${game.progress.toFixed(1)}% progress, ${game.successRate.toFixed(1)}% success rate`).join('\n')}

Create an encouraging, professional report that celebrates achievements, explains cognitive strengths in child-friendly terms, suggests specific areas for growth, and provides actionable recommendations for continued development. Use warm, encouraging language suitable for both parents and children.`;

      console.log('Generated prompt:', prompt);

      console.log('Making API call to /.netlify/functions/api...');
      const response = await fetch('/.netlify/functions/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_type: 'chat',
          input_data: {
            messages: [
              {
                role: 'system',
                content: 'You are an educational psychologist specializing in child cognitive development. Create comprehensive, positive reports highlighting cognitive development, strengths, and achievements. Focus on growth mindset and encouragement. Use professional yet warm language suitable for parents and children.'
              },
              {
                role: 'user',
                content: prompt
              }
            ]
          }
        })
      });

      console.log('API call completed');
      console.log('API Response status:', response.status);
      console.log('API Response headers:', response.headers);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to get response' }));
        console.error('API Error response:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Full API result:', result);
      console.log('Result type:', typeof result);
      console.log('Result is array:', Array.isArray(result));
      console.log('Result length:', Array.isArray(result) ? result.length : 'Not an array');
      if (Array.isArray(result) && result.length > 0) {
        console.log('First result item:', result[0]);
        console.log('First result keys:', Object.keys(result[0]));
      }
      
      if (result.error) {
        console.error('API returned error:', result.error);
        throw new Error(result.error);
      }

      // Extract the generated text from the response - using the same pattern as AIAssistant
      let generatedReport = '';
      console.log('Extracting generated text from response...');
      
      if (result[0] && result[0].generated_text) {
        console.log('Found generated_text in result[0]');
        generatedReport = result[0].generated_text;
      } else if (result[0] && result[0].summary_text) {
        console.log('Found summary_text in result[0]');
        generatedReport = result[0].summary_text;
      } else if (typeof result === 'string') {
        console.log('Result is a string');
        generatedReport = result;
      } else if (result && result.generated_text) {
        console.log('Found generated_text in result');
        generatedReport = result.generated_text;
      } else if (result && result.summary_text) {
        console.log('Found summary_text in result');
        generatedReport = result.summary_text;
      } else if (result && result.error) {
        console.error('Found error in result');
        throw new Error(result.error);
      } else {
        console.log('Fallback report - result:', result);
        generatedReport = 'Report generated successfully! Your child is making excellent progress in their learning journey.';
      }

      console.log('Final generated report length:', generatedReport.length);
      console.log('Generated report preview:', generatedReport.substring(0, 200) + '...');

      setReport(generatedReport);
    } catch (error) {
      console.error('Error generating report:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="flex items-center justify-center mb-8">
            <img 
              src="/assets/images/Mascot.png" 
              alt="NeuraPlay Mascot" 
              className="w-32 h-32 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold mb-4">Welcome to NeuraPlay!</h1>
          <p className="text-lg text-gray-300 mb-8">
            Please log in to access your personalized AI learning report and track your cognitive development.
          </p>
          <div className="space-y-4">
            <Link 
              to="/forum-registration" 
              className="inline-block w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold px-8 py-4 rounded-full hover:from-violet-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Create Account
            </Link>
            <Link 
              to="/login" 
              className="inline-block w-full bg-transparent border-2 border-white/20 text-white font-bold px-8 py-4 rounded-full hover:bg-white/10 transition-all duration-300"
            >
              Log In
            </Link>
          </div>
          <p className="text-sm text-gray-400 mt-6">
            Join thousands of learners discovering the joy of cognitive development!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-200 pt-24 pb-12">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            to="/playground" 
            className="p-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </Link>
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">AI Learning Report</h1>
            <p className="text-xl text-violet-300 mt-2">Personalized insights for {user.username}</p>
          </div>
        </div>

        <div ref={contentRef} className="space-y-8">
          {/* User Overview */}
          <div className={`${glassPanelStyle} p-8 rounded-2xl`}>
            <div className="flex items-center gap-6 mb-8">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                <img 
                  src={user.profile.avatar} 
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">{user.username}</h2>
                <p className="text-yellow-400 font-semibold text-lg">{user.profile.rank}</p>
                <p className="text-slate-400">Age: {user.age || 'Not specified'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-400/30 rounded-xl">
                <Star className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-400">{user.profile.stars}</div>
                <div className="text-sm text-slate-400">Stars Earned</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 rounded-xl">
                <Zap className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-400">{user.profile.xp}</div>
                <div className="text-sm text-slate-400">Experience Points</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-xl">
                <Trophy className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-400">{Object.keys(user.profile.gameProgress).length}</div>
                <div className="text-sm text-slate-400">Games Played</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-xl">
                <Crown className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-400">{user.profile.rank}</div>
                <div className="text-sm text-slate-400">Current Rank</div>
              </div>
            </div>
          </div>

          {/* Generate Report Section */}
          <div className={`${glassPanelStyle} p-8 rounded-2xl`}>
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">Generate AI Learning Report</h3>
              <p className="text-slate-300 text-lg">
                Get personalized insights about {user.username}'s learning progress, strengths, and development areas.
              </p>
            </div>

            {!report && !loading && (
              <div className="text-center">
                <button
                  onClick={generateReport}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-8 py-4 rounded-full hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-3 mx-auto mb-4"
                >
                  <Sparkles className="w-5 h-5" />
                  Generate AI Report
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      console.log('Testing API...');
                      const response = await fetch('/.netlify/functions/api', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          task_type: 'chat',
                          input_data: {
                            messages: [
                              { role: 'system', content: 'You are a helpful AI assistant.' },
                              { role: 'user', content: 'Hello, can you respond with a simple test message?' }
                            ]
                          }
                        })
                      });
                      const result = await response.json();
                      console.log('Test API result:', result);
                      alert('API test successful! Check console for details.');
                    } catch (error) {
                      console.error('API test failed:', error);
                      alert('API test failed: ' + error.message);
                    }
                  }}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold px-6 py-2 rounded-full hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-2 mx-auto"
                >
                  Test API Connection
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      console.log('Testing simple API call...');
                      const response = await fetch('/.netlify/functions/api', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          task_type: 'chat',
                          input_data: 'Hello, this is a simple test.'
                        })
                      });
                      const result = await response.json();
                      console.log('Simple test API result:', result);
                      alert('Simple API test successful! Check console for details.');
                    } catch (error) {
                      console.error('Simple API test failed:', error);
                      alert('Simple API test failed: ' + error.message);
                    }
                  }}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold px-6 py-2 rounded-full hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-2 mx-auto mt-2"
                >
                  Test Simple API Call
                </button>
                <button
                  onClick={async () => {
                    try {
                      console.log('Testing user data and analytics...');
                      console.log('Current user:', user);
                      
                      if (!user) {
                        alert('No user data available');
                        return;
                      }
                      
                      // Create a test user with minimal data if needed
                      let testUser = user;
                      if (!user.profile || !user.profile.gameProgress) {
                        console.log('Creating test user data...');
                        testUser = {
                          ...user,
                          profile: {
                            avatar: 'default',
                            rank: 'New Learner',
                            xp: 100,
                            xpToNextLevel: 200,
                            stars: 5,
                            about: 'Test user',
                            gameProgress: {
                              'memory-sequence': { level: 1, stars: 5, bestScore: 80, timesPlayed: 3, playTime: 300 },
                              'starbloom-adventure': { level: 1, stars: 3, bestScore: 70, timesPlayed: 2, playTime: 200 }
                            }
                          }
                        };
                      }
                      
                      // Test analytics generation
                      const analytics = AnalyticsService.analyzeUserData(testUser);
                      console.log('Analytics test result:', analytics);
                      alert('Analytics test successful! Check console for details.');
                    } catch (error) {
                      console.error('Analytics test failed:', error);
                      alert('Analytics test failed: ' + error.message);
                    }
                  }}
                  className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-bold px-6 py-2 rounded-full hover:from-yellow-700 hover:to-orange-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-2 mx-auto mt-2"
                >
                  Test Analytics Generation
                </button>
                <button
                  onClick={async () => {
                    try {
                      console.log('Testing API response format...');
                      const response = await fetch('/.netlify/functions/api', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          task_type: 'chat',
                          input_data: {
                            messages: [
                              { role: 'system', content: 'You are a helpful AI assistant.' },
                              { role: 'user', content: 'Generate a short test response.' }
                            ]
                          }
                        })
                      });
                      
                      console.log('Response status:', response.status);
                      console.log('Response headers:', response.headers);
                      
                      const result = await response.json();
                      console.log('Raw API response:', result);
                      console.log('Response type:', typeof result);
                      console.log('Is array:', Array.isArray(result));
                      console.log('Array length:', Array.isArray(result) ? result.length : 'N/A');
                      
                      if (Array.isArray(result) && result.length > 0) {
                        console.log('First item:', result[0]);
                        console.log('First item keys:', Object.keys(result[0]));
                        console.log('Generated text:', result[0].generated_text);
                      }
                      
                      alert('API response format test completed! Check console for details.');
                    } catch (error) {
                      console.error('API response format test failed:', error);
                      alert('API response format test failed: ' + error.message);
                    }
                  }}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-6 py-2 rounded-full hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-2 mx-auto mt-2"
                >
                  Test API Response Format
                </button>
              </div>
            )}

            {loading && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Analyzing learning data...</h3>
                <p className="text-slate-400">This may take a few moments</p>
              </div>
            )}

            {error && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-6 mb-6">
                <div className="text-red-300 font-semibold mb-2">Error Generating Report</div>
                <p className="text-red-200">{error}</p>
                <button
                  onClick={generateReport}
                  className="mt-4 bg-red-600 text-white font-bold px-6 py-2 rounded-full hover:bg-red-700 transition-all"
                >
                  Try Again
                </button>
              </div>
            )}

            {report && (
              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-400/30 rounded-xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-2xl font-bold text-white">Your Personalized Learning Report</h4>
                </div>
                <div className="prose prose-lg max-w-none">
                  <div className="text-slate-200 leading-relaxed whitespace-pre-wrap text-lg">
                    {report}
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-purple-400/30 flex flex-wrap gap-4">
                  <button
                    onClick={generateReport}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-6 py-3 rounded-full hover:from-purple-700 hover:to-pink-700 transition-all flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate New Report
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="bg-slate-600 text-white font-bold px-6 py-3 rounded-full hover:bg-slate-700 transition-all flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Print Report
                  </button>
                  <Link
                    to="/playground"
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold px-6 py-3 rounded-full hover:from-blue-700 hover:to-cyan-700 transition-all flex items-center gap-2"
                  >
                    <Activity className="w-4 h-4" />
                    Back to Playground
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Cognitive Skills Overview */}
          <div className={`${glassPanelStyle} p-8 rounded-2xl`}>
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-green-400" />
              Cognitive Skills Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="w-6 h-6 text-green-400" />
                  <h4 className="font-semibold text-white">Memory Skills</h4>
                </div>
                <p className="text-slate-300 mb-4">Based on Memory Galaxy & Starbloom Forest performance</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-white/10 rounded-full h-3">
                    <div className="bg-green-400 h-3 rounded-full" style={{ width: `${Math.min((user.profile.gameProgress['memory-sequence']?.level || 0) * 20, 100)}%` }}></div>
                  </div>
                  <span className="text-sm text-green-400 font-bold">
                    {Math.min((user.profile.gameProgress['memory-sequence']?.level || 0) * 20, 100)}%
                  </span>
                </div>
              </div>
              <div className="p-6 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <Target className="w-6 h-6 text-blue-400" />
                  <h4 className="font-semibold text-white">Focus & Control</h4>
                </div>
                <p className="text-slate-300 mb-4">Based on Stop & Go Adventure performance</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-white/10 rounded-full h-3">
                    <div className="bg-blue-400 h-3 rounded-full" style={{ width: `${Math.min((user.profile.gameProgress['inhibition']?.level || 0) * 20, 100)}%` }}></div>
                  </div>
                  <span className="text-sm text-blue-400 font-bold">
                    {Math.min((user.profile.gameProgress['inhibition']?.level || 0) * 20, 100)}%
                  </span>
                </div>
              </div>
              <div className="p-6 bg-gradient-to-r from-purple-500/20 to-violet-500/20 border border-purple-400/30 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <Award className="w-6 h-6 text-purple-400" />
                  <h4 className="font-semibold text-white">Logic & Patterns</h4>
                </div>
                <p className="text-slate-300 mb-4">Based on Pattern Detective performance</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-white/10 rounded-full h-3">
                    <div className="bg-purple-400 h-3 rounded-full" style={{ width: `${Math.min((user.profile.gameProgress['pattern-matching']?.level || 0) * 20, 100)}%` }}></div>
                  </div>
                  <span className="text-sm text-purple-400 font-bold">
                    {Math.min((user.profile.gameProgress['pattern-matching']?.level || 0) * 20, 100)}%
                  </span>
                </div>
              </div>
              <div className="p-6 bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-400/30 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <Trophy className="w-6 h-6 text-orange-400" />
                  <h4 className="font-semibold text-white">Numerical Skills</h4>
                </div>
                <p className="text-slate-300 mb-4">Based on Number Quest performance</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-white/10 rounded-full h-3">
                    <div className="bg-orange-400 h-3 rounded-full" style={{ width: `${Math.min((user.profile.gameProgress['counting-adventure']?.level || 0) * 20, 100)}%` }}></div>
                  </div>
                  <span className="text-sm text-orange-400 font-bold">
                    {Math.min((user.profile.gameProgress['counting-adventure']?.level || 0) * 20, 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIReportPage;