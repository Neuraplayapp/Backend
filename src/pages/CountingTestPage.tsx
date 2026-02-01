import React, { useState } from 'react';
import { ArrowLeft, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

const CountingTestPage: React.FC = () => {
  const [showModule, setShowModule] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {!showModule ? (
        <div className="max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link 
                to="/dashboard" 
                className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Dashboard
              </Link>
            </div>
            <Link 
              to="/" 
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              <Home className="w-5 h-5" />
              Home
            </Link>
          </div>

          {/* Introduction */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-slate-800 mb-4">
              Interactive Counting Module
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Experience an innovative way to learn counting with 3D animated numbers, 
              comprehensive tracking, and progressive learning stages. Perfect for young learners!
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-purple-200">
              <div className="text-3xl mb-4">🔢</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">3D Animated Numbers</h3>
              <p className="text-slate-600">
                Numbers come to life with smooth 3D animations, rotations, and particle effects.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-purple-200">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Comprehensive Tracking</h3>
              <p className="text-slate-600">
                Track progress, accuracy, streaks, and time spent with detailed analytics.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-purple-200">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Progressive Learning</h3>
              <p className="text-slate-600">
                Three stages: Numbers 1-10, Numbers 20-100, and Mixed Challenge.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-purple-200">
              <div className="text-3xl mb-4">🏆</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Rewards System</h3>
              <p className="text-slate-600">
                Earn XP, stars, and achievements based on performance and accuracy.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-purple-200">
              <div className="text-3xl mb-4">🎨</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Visual Feedback</h3>
              <p className="text-slate-600">
                Immediate visual feedback with colors, animations, and particle effects.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-purple-200">
              <div className="text-3xl mb-4">📱</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Responsive Design</h3>
              <p className="text-slate-600">
                Works perfectly on desktop, tablet, and mobile devices.
              </p>
            </div>
          </div>

          {/* Learning Stages */}
          <div className="bg-white rounded-xl p-8 shadow-lg mb-8 border-2 border-purple-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
              Learning Stages
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg">
                <div className="text-4xl mb-4">1️⃣</div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Stage 1: Numbers 1-10</h3>
                <p className="text-slate-600">
                  Master the basics with numbers 1 through 10 in an engaging 3D environment.
                </p>
              </div>

              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
                <div className="text-4xl mb-4">2️⃣</div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Stage 2: Numbers 20-100</h3>
                <p className="text-slate-600">
                  Progress to larger numbers: 20, 30, 40, 50, 60, 70, 80, 90, 100.
                </p>
              </div>

              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
                <div className="text-4xl mb-4">3️⃣</div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Stage 3: Mixed Challenge</h3>
                <p className="text-slate-600">
                  Test your skills with a mix of numbers from 1-10 and 20-50.
                </p>
              </div>
            </div>
          </div>

          {/* Start Button */}
          <div className="text-center">
            <button
              onClick={() => setShowModule(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold px-8 py-4 rounded-full hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-105 text-lg"
            >
              Start Interactive Counting Adventure
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Coming Soon!</h2>
            <p className="text-slate-600 mb-6">The Interactive Counting Module is being developed.</p>
            <button
              onClick={() => setShowModule(false)}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold px-6 py-3 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all"
            >
              Back to Overview
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountingTestPage; 