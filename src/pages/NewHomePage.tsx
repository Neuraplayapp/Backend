import * as React from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, Target, Sparkles, Users, Gamepad2, UserPlus, Trophy, BookOpen, ChevronDown, Zap, ArrowRight, Star, Heart, Shield } from 'lucide-react';
import BouncyLetters from '../components/BouncyLetters';
import LetterReveal from '../components/LetterReveal';
import UniformLetterReveal from '../components/UniformLetterReveal';
import SignUpChoiceModal from '../components/SignUpChoiceModal';
import RegularSignUpModal from '../components/RegularSignUpModal';
import LoginModal from '../components/LoginModal';
import VideoDiagnostics from '../components/VideoDiagnostics';
import { useTheme } from '../contexts/ThemeContext';
import Footer from '../components/Footer';

// Modern business-playful styles
const modernStyles = `
  .modern-hero {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #312e81 100%);
    min-height: 100vh;
    position: relative;
    overflow: hidden;
  }
  
  .modern-hero::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
    opacity: 0.3;
  }
  
  .floating-card {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 24px;
    transition: all 0.3s ease;
  }
  
  .floating-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  }
  
  .gradient-border {
    background: linear-gradient(45deg, #667eea, #764ba2, #312e81);
    padding: 2px;
    border-radius: 20px;
  }
  
  .gradient-border > div {
    background: white;
    border-radius: 18px;
    padding: 24px;
  }
  
  .dark .gradient-border > div {
    background: transparent;
  }
  
  .pulse-glow {
    animation: pulseGlow 2s ease-in-out infinite alternate;
  }
  
  @keyframes pulseGlow {
    from { box-shadow: 0 0 20px rgba(102, 126, 234, 0.4); }
    to { box-shadow: 0 0 40px rgba(102, 126, 234, 0.8); }
  }
  
  .mascot-fly-in {
    animation: mascotFlyIn 2s ease-out forwards;
  }
  
  @keyframes mascotFlyIn {
    0% {
      opacity: 0;
      transform: translateX(-100px) translateY(-50px) rotate(-15deg) scale(0.8);
    }
    50% {
      opacity: 0.7;
      transform: translateX(-20px) translateY(-10px) rotate(-5deg) scale(0.9);
    }
    100% {
      opacity: 1;
      transform: translateX(0px) translateY(0px) rotate(0deg) scale(1);
    }
  }
  
  .mascot-sway {
    animation: mascotSway 3s ease-in-out infinite;
  }
  
  @keyframes mascotSway {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    25% { transform: translateY(-8px) rotate(2deg); }
    50% { transform: translateY(-15px) rotate(0deg); }
    75% { transform: translateY(-8px) rotate(-2deg); }
  }
  
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  
  .animate-card-to-front {
    animation: moveCardToFront 0.7s ease-in-out forwards;
  }
  
  @keyframes moveCardToFront {
    0% {
      transform: scale(0.9) translateX(20px) translateY(-4px) rotate(6deg);
      opacity: 0.8;
      z-index: 30;
    }
    50% {
      transform: scale(0.95) translateX(10px) translateY(-2px) rotate(3deg);
      opacity: 0.9;
      z-index: 35;
    }
    100% {
      transform: scale(1) translateX(0) translateY(0) rotate(0deg);
      opacity: 1;
      z-index: 40;
    }
  }
  
  .card-stack {
    transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .card-stack:hover {
    transform: scale(1.02);
  }
`;

const NewHomePage: React.FC = () => {
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showRegularSignUpModal, setShowRegularSignUpModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState('neuro');

  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  // Features with modern descriptions
  const features = [
    {
      id: 'neuro',
      title: 'Neuro-psychological teaching methods',
      description: 'Every game, story, and challenge is built upon proven neuropsychological principles that target specific cognitive skills. Our platform adapts to your child\'s unique learning style, ensuring optimal brain development.',
      icon: <Brain className="w-8 h-8 text-purple-600" />
    },
    {
      id: 'tailored',
      title: 'Tailor-made for the learner',
      description: 'Our adaptive AI creates personalized learning paths that evolve with your child\'s progress. Each experience is carefully crafted to match their cognitive profile and learning pace.',
      icon: <Target className="w-8 h-8 text-purple-600" />
    },
    {
      id: 'montessori',
      title: 'The Montessori approach',
      description: 'Inspired by Montessori principles, our platform encourages self-directed learning and discovery. Children explore concepts at their own pace, building confidence and independence.',
      icon: <Sparkles className="w-8 h-8 text-purple-600" />
    }
  ];

  return (
    <>
      <style>{modernStyles}</style>
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
        
        {/* Modern Hero Section */}
        <section className="modern-hero flex items-center justify-center relative">
          <div className="container mx-auto px-6 py-20 text-center relative z-10">
            <div className="max-w-6xl mx-auto">
              <BouncyLetters
                text="Your Child is a Genius"
                className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black leading-tight tracking-tighter mb-8 text-white"
                delay={0.5}
                stagger={0.08}
                duration={0.7}
                bounceHeight={-150}
                initialScale={0.6}
                initialRotation={-10}
              />
              
              <UniformLetterReveal
                text="unlock the potential of your child - through AI and psychology"
                className="text-lg sm:text-xl md:text-2xl lg:text-3xl max-w-4xl mx-auto text-white/90 leading-relaxed mb-12 px-4 whitespace-normal"
                triggerOffset={50}
                stagger={0.04}
                duration={0.8}
                typewriterEffect={true}
                cursorBlink={false}
                priority={1}
              />
              
              {/* Mascot with flying animation */}
              <div className="mb-12">
                <div className="flex justify-center">
                  <img 
                    src="/assets/images/Mascot.png" 
                    alt="NeuraPlay Mascot" 
                    className="w-32 h-32 md:w-40 md:h-40 object-contain mascot-fly-in mascot-sway"
                    style={{ 
                      animationDelay: '2.5s',
                      animationFillMode: 'both'
                    }}
                    loading="eager"
                  />
                </div>
              </div>
              
              {/* Modern floating cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-16 max-w-5xl mx-auto px-4">
                <div className="floating-card p-4 sm:p-6 md:p-8 text-center" style={{animationDelay: '0.2s'}}>
                  <Zap className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-yellow-400 mx-auto mb-2 sm:mb-4" />
                  <h3 className="font-bold text-lg sm:text-xl mb-2 sm:mb-3 text-white">Smart Learning</h3>
                  <p className="text-white/80 text-sm sm:text-base">
                    AI-powered adaptive education
                  </p>
                </div>
                <div className="floating-card p-4 sm:p-6 md:p-8 text-center" style={{animationDelay: '0.4s'}}>
                  <Users className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-purple-400 mx-auto mb-2 sm:mb-4" />
                  <h3 className="font-bold text-lg sm:text-xl mb-2 sm:mb-3 text-white">Family Focused</h3>
                  <p className="text-white/80 text-sm sm:text-base">
                    Progress tracking for parents
                  </p>
                </div>
                <div className="floating-card p-4 sm:p-6 md:p-8 text-center sm:col-span-2 md:col-span-1" style={{animationDelay: '0.6s'}}>
                  <Gamepad2 className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-blue-400 mx-auto mb-2 sm:mb-4" />
                  <h3 className="font-bold text-lg sm:text-xl mb-2 sm:mb-3 text-white">Fun Games</h3>
                  <p className="text-white/80 text-sm sm:text-base">
                    Engaging cognitive challenges
                  </p>
                </div>
              </div>
              
                             {/* Modern action buttons */}
               <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 justify-center items-center px-4">
                 <button 
                   onClick={() => {
                     const videosSection = document.getElementById('videos-section');
                     if (videosSection) {
                       videosSection.scrollIntoView({ behavior: 'smooth' });
                     }
                   }} 
                   className="floating-card px-4 sm:px-6 md:px-8 py-3 sm:py-4 font-bold text-white border-2 border-white/30 hover:bg-white/20 transition-all duration-300 text-sm sm:text-base"
                 >
                   What is neuraplay?
                 </button>
                 <button 
                   onClick={() => setShowSignUpModal(true)} 
                   className="floating-card px-4 sm:px-6 md:px-8 py-3 sm:py-4 font-bold text-white border-2 border-white/30 hover:bg-white/20 transition-all duration-300 text-sm sm:text-base"
                 >
                   Sign Up
                 </button>
                 <button 
                   onClick={() => navigate('/forum')} 
                   className="floating-card px-4 sm:px-6 md:px-8 py-3 sm:py-4 font-bold text-white border-2 border-white/30 hover:bg-white/20 transition-all duration-300 text-sm sm:text-base"
                 >
                   Forum
                 </button>
                 <button 
                   onClick={() => navigate('/about')} 
                   className="floating-card px-4 sm:px-6 md:px-8 py-3 sm:py-4 font-bold text-white border-2 border-white/30 hover:bg-white/20 transition-all duration-300 text-sm sm:text-base"
                 >
                   About Us
                 </button>
               </div>
            </div>
          </div>
          
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <ChevronDown className="w-8 h-8 text-white/70" />
          </div>
        </section>

        {/* Modern Features Section */}
        <section className={`py-20 px-6 ${isDarkMode ? 'bg-gray-800' : 'bg-[rgb(218,163,255)]'}`}>
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-16">
              <BouncyLetters
                text="An investment in their future is priceless"
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-8 gradient-text px-4"
                delay={0.1}
                stagger={0.05}
                duration={0.6}
                bounceHeight={-100}
                initialScale={0.8}
                initialRotation={-5}
                triggerOnScroll={true}
              />
              <UniformLetterReveal
                text="Give your child the tools they need to succeed in a rapidly evolving world"
                className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto px-4 whitespace-normal"
                triggerOffset={100}
                stagger={0.03}
                duration={1.0}
                typewriterEffect={true}
                cursorBlink={false}
                priority={5}
              />
            </div>
            
                        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-start px-4">
              {/* SVG with better implementation */}
              <div className="hidden lg:block relative">
                <img 
                  src="/assets/SVG/undraw_ideas-flow_8d3x.svg" 
                  alt="Learning Flow" 
                  className={`w-full max-w-xs mx-auto transition-all duration-500 hover:scale-105 ${
                    isDarkMode 
                      ? 'opacity-100 filter brightness-200 drop-shadow-2xl' 
                      : 'opacity-80 hover:opacity-100'
                  }`}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                {/* Optional floating elements for visual interest */}
                <div className="absolute -top-4 -right-4 w-8 h-8 bg-purple-200 rounded-full opacity-60 animate-pulse"></div>
                <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-blue-200 rounded-full opacity-40 animate-pulse" style={{animationDelay: '1s'}}></div>
              </div>
              
              {/* Feature Selection Cards - Now closer to details */}
              <div className="lg:col-span-1">
                <BouncyLetters
                  text="A whole new way to learn"
                  className="text-2xl sm:text-3xl font-bold mb-6"
                  delay={2.5}
                  stagger={0.05}
                  duration={0.6}
                  bounceHeight={-80}
                  initialScale={0.9}
                  initialRotation={-3}
                  triggerOnScroll={true}
                />
                
                {/* Feature Cards - Enhanced Interactive Display */}
                <div className="space-y-4">
                  {features.map((feature, index) => (
                    <div 
                      key={feature.id} 
                      onClick={() => setSelectedFeature(feature.id)}
                      className={`group relative overflow-hidden rounded-xl p-5 transition-all duration-500 transform cursor-pointer ${
                        selectedFeature === feature.id 
                          ? 'bg-gradient-to-r from-purple-50 to-blue-50 shadow-xl border-2 border-purple-300 scale-105' 
                          : 'bg-white/90 hover:bg-white shadow-lg hover:shadow-xl border border-gray-200/50 hover:scale-102'
                      } border backdrop-blur-sm`}
                      style={{
                        animationDelay: `${index * 0.1}s`,
                        animationFillMode: 'both'
                      }}
                    >
                      {/* Selection indicator */}
                      {selectedFeature === feature.id && (
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl animate-pulse"></div>
                      )}
                      
                      {/* Hover effect overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                      
                      <div className="relative z-10 flex items-center gap-4">
                        <div className={`p-3 rounded-xl transition-all duration-500 transform ${
                          selectedFeature === feature.id 
                            ? 'bg-gradient-to-br from-purple-500 to-blue-600 text-white shadow-lg scale-110' 
                            : 'bg-gradient-to-br from-purple-100 to-blue-100 text-purple-600 group-hover:bg-gradient-to-br group-hover:from-purple-200 group-hover:to-blue-200'
                        }`}>
                          {React.cloneElement(feature.icon, { 
                            className: `w-6 h-6 transition-all duration-300 ${
                              selectedFeature === feature.id ? 'animate-pulse' : ''
                            }`
                          })}
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-bold text-lg transition-all duration-300 ${
                            selectedFeature === feature.id ? 'text-purple-800' : 'text-gray-800'
                          }`}>
                            {feature.title}
                          </h3>
                          <div className={`h-1 rounded-full transition-all duration-700 ease-out ${
                            selectedFeature === feature.id ? 'w-full bg-gradient-to-r from-purple-400 to-blue-400' : 'w-0 bg-purple-200'
                          }`}></div>
                        </div>
                        <div className={`transition-all duration-500 transform ${
                          selectedFeature === feature.id 
                            ? 'text-purple-600 opacity-100 translate-x-0' 
                            : 'text-gray-400 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0'
                        }`}>
                          <ArrowRight className="w-5 h-5" />
                        </div>
                      </div>
                      
                      {/* Subtle glow effect for selected card */}
                      {selectedFeature === feature.id && (
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 to-blue-400 rounded-xl blur opacity-20 animate-pulse"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Feature Details Card - Enhanced Dynamic Content */}
              <div className="lg:col-span-1">
                <div className="gradient-border group hover:scale-105 transition-all duration-700 h-full">
                  <div className="p-8 relative overflow-hidden h-full">
                    {/* Animated background patterns */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full opacity-20 -translate-y-16 translate-x-16 animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full opacity-15 translate-y-12 -translate-x-12 animate-pulse" style={{animationDelay: '1s'}}></div>
                    
                    {/* Selection indicator */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 transition-opacity duration-500 rounded-2xl"></div>
                    
                    <div className="relative z-10 h-full flex flex-col">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="p-4 rounded-2xl transition-all duration-700 transform bg-gradient-to-br from-purple-500 to-blue-600 text-white shadow-lg hover:scale-110">
                          <div className="animate-pulse">
                            {features.find(f => f.id === selectedFeature)?.icon || <Sparkles className="w-8 h-8" />}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-2xl mb-2 transition-all duration-500">
                            {features.find(f => f.id === selectedFeature)?.title || 'Advanced Learning Methods'}
                          </h4>
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
                              {selectedFeature === 'neuro' ? 'Neuro-psychological' : 
                               selectedFeature === 'tailored' ? 'Personalized' : 
                               selectedFeature === 'montessori' ? 'Montessori-inspired' : 'Innovative Approach'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300 transition-all duration-500">
                          {features.find(f => f.id === selectedFeature)?.description || 
                           'Our platform combines neuropsychological principles with Montessori-inspired learning methods, creating a personalized educational experience that adapts to each child\'s unique cognitive profile and learning pace.'}
                        </p>
                      </div>
                      
                      {/* Enhanced feature highlights */}
                      <div className="mt-6 pt-6 border-t border-gray-200/50">
                        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl">
                          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 text-white">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {selectedFeature === 'neuro' ? 'Based on proven cognitive science' :
                             selectedFeature === 'tailored' ? 'AI-powered personalization' :
                             selectedFeature === 'montessori' ? 'Self-directed learning approach' :
                             'Enhanced with AI-powered insights'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Child-Safe AI Protection Section - Exciting & Dynamic */}
        <section className={`py-20 px-6 ${isDarkMode ? 'bg-gray-900' : 'bg-purple-300'}`}>
          <div className="container mx-auto max-w-8xl">
            {/* Animated Hero with Floating Elements */}
            <div className="text-center mb-20 relative overflow-hidden">
              {/* Floating Protection Icons */}
              <div className="absolute top-10 left-10 w-8 h-8 bg-blue-500 rounded-full animate-bounce opacity-60"></div>
              <div className="absolute top-20 right-20 w-6 h-6 bg-purple-500 rounded-full animate-pulse opacity-40"></div>
              <div className="absolute bottom-10 left-1/4 w-4 h-4 bg-green-500 rounded-full animate-ping opacity-30"></div>
              <div className="absolute bottom-20 right-1/3 w-5 h-5 bg-pink-500 rounded-full animate-bounce opacity-50" style={{animationDelay: '1s'}}></div>
              
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-full mb-6 animate-pulse">
                <Shield className="w-5 h-5" />
                <span className="font-semibold text-sm">🛡️ Child-Safe Technology</span>
              </div>
              
              <BouncyLetters
                text="Revolutionary AI Protection"
                className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black mb-6 leading-tight px-4"
                delay={0.5}
                stagger={0.05}
                duration={0.6}
                bounceHeight={-100}
                initialScale={0.8}
                initialRotation={-5}
                triggerOnScroll={true}
              />
              
              <div className="space-y-6">
                <div>
                  <UniformLetterReveal
                    text="Our double-AI protection system ensures your child's safety."
                    className={`text-lg sm:text-xl md:text-2xl max-w-5xl mx-auto leading-relaxed px-4 ${isDarkMode ? 'text-white/90' : 'text-gray-700'}`}
                    triggerOffset={50}
                    stagger={0.04}
                    duration={0.8}
                    typewriterEffect={true}
                    cursorBlink={false}
                    priority={6}
                  />
                </div>
                <div>
                  <UniformLetterReveal
                    text="And maximizes learning potential."
                    className={`text-lg sm:text-xl md:text-2xl max-w-5xl mx-auto leading-relaxed px-4 ${isDarkMode ? 'text-white/90' : 'text-gray-700'}`}
                    triggerOffset={300}
                    stagger={0.04}
                    duration={0.8}
                    typewriterEffect={true}
                    cursorBlink={false}
                    priority={7}
                  />
                </div>
              </div>
            </div>
            
            {/* Interactive Protection System with 3D Effects */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-20 px-4">
              {/* Primary AI Guardian - Animated */}
              <div className="group relative transform hover:rotate-y-12 transition-all duration-700">
                <div className="gradient-border hover:scale-105 transition-all duration-500 h-full relative overflow-hidden">
                  {/* Animated Background Pattern */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 animate-pulse"></div>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/20 rounded-full -translate-y-10 translate-x-10 animate-spin" style={{animationDuration: '20s'}}></div>
                  
                  <div className="p-8 h-full flex flex-col relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 animate-pulse">
                        <Shield className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-xs font-semibold animate-bounce">Layer 1</div>
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold mb-4">Primary AI Guardian</h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed flex-1">
                      Advanced content filtering and real-time monitoring ensures all interactions are age-appropriate and educational.
                    </p>
                    <div className="mt-6 pt-4 border-t border-gray-200/50">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                        <span>Active monitoring</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secondary AI Validator - Animated */}
              <div className="group relative transform hover:rotate-y-12 transition-all duration-700">
                <div className="gradient-border hover:scale-105 transition-all duration-500 h-full relative overflow-hidden">
                  {/* Animated Background Pattern */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 animate-pulse" style={{animationDelay: '0.5s'}}></div>
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-purple-500/20 rounded-full translate-y-8 -translate-x-8 animate-spin" style={{animationDuration: '15s', animationDirection: 'reverse'}}></div>
                  
                  <div className="p-8 h-full flex flex-col relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 animate-pulse" style={{animationDelay: '0.3s'}}>
                        <Brain className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <div className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full text-xs font-semibold animate-bounce" style={{animationDelay: '0.2s'}}>Layer 2</div>
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold mb-4">Secondary AI Validator</h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed flex-1">
                      Backup AI system cross-references and validates all responses, providing an additional layer of safety.
                    </p>
                    <div className="mt-6 pt-4 border-t border-gray-200/50">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
                        <span>Cross-validation</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Human Oversight - Animated */}
              <div className="group relative transform hover:rotate-y-12 transition-all duration-700">
                <div className="gradient-border hover:scale-105 transition-all duration-500 h-full relative overflow-hidden">
                  {/* Animated Background Pattern */}
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 animate-pulse" style={{animationDelay: '1s'}}></div>
                  <div className="absolute top-1/2 right-1/2 w-12 h-12 bg-green-500/20 rounded-full animate-spin" style={{animationDuration: '25s'}}></div>
                  
                  <div className="p-8 h-full flex flex-col relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 animate-pulse" style={{animationDelay: '0.6s'}}>
                        <Users className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-xs font-semibold animate-bounce" style={{animationDelay: '0.4s'}}>Layer 3</div>
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold mb-4">Human Oversight</h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed flex-1">
                      Expert child psychologists and educators regularly review and update safety protocols.
                    </p>
                    <div className="mt-6 pt-4 border-t border-gray-200/50">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
                        <span>Expert review</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Feature Cards with Particle Effects */}
            <div className="grid md:grid-cols-2 gap-8 mb-20">
              <div className="gradient-border hover:scale-105 transition-transform duration-300 group relative overflow-hidden">
                {/* Particle Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-pink-500/5 animate-pulse"></div>
                <div className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                <div className="absolute bottom-4 left-4 w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
                
                <div className="p-8 relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 animate-pulse">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold">Content Filtering</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Real-time protection</p>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Advanced filtering systems ensure all content is age-appropriate and educational, providing a safe learning environment for your child.
                  </p>
                </div>
              </div>
              
              <div className="gradient-border hover:scale-105 transition-transform duration-300 group relative overflow-hidden">
                {/* Particle Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 animate-pulse" style={{animationDelay: '0.3s'}}></div>
                <div className="absolute top-4 left-4 w-3 h-3 bg-blue-500 rounded-full animate-ping" style={{animationDelay: '0.2s'}}></div>
                <div className="absolute bottom-4 right-4 w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{animationDelay: '0.7s'}}></div>
                
                <div className="p-8 relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 animate-pulse" style={{animationDelay: '0.4s'}}>
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold">Learning Focus</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Cognitive optimization</p>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Every interaction is optimized for cognitive development, ensuring maximum learning potential while maintaining safety standards.
                  </p>
                </div>
              </div>
            </div>

            {/* Animated Trust Indicators */}
            <div className="text-center">
              <div className="gradient-border inline-block relative overflow-hidden">
                {/* Background Animation */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 animate-pulse"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500 animate-pulse"></div>
                
                <div className="p-12 relative z-10">
                  <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center animate-pulse">
                      <Shield className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="text-3xl font-bold">Certified Child-Safe Technology</h4>
                  </div>
                  <div className="grid md:grid-cols-3 gap-12">
                    <div className="group">
                      <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 animate-pulse">
                        <Shield className="w-10 h-10 text-white" />
                      </div>
                      <h5 className="font-bold text-xl mb-3">COPPA Compliant</h5>
                      <p className="text-gray-600 dark:text-gray-300">Meets all child privacy protection standards with rigorous compliance protocols</p>
                    </div>
                    <div className="group">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 animate-pulse" style={{animationDelay: '0.3s'}}>
                        <Brain className="w-10 h-10 text-white" />
                      </div>
                      <h5 className="font-bold text-xl mb-3">Expert Reviewed</h5>
                      <p className="text-gray-600 dark:text-gray-300">Validated by child development specialists and educational psychologists</p>
                    </div>
                    <div className="group">
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 animate-pulse" style={{animationDelay: '0.6s'}}>
                        <Users className="w-10 h-10 text-white" />
                      </div>
                      <h5 className="font-bold text-xl mb-3">Parent Approved</h5>
                      <p className="text-gray-600 dark:text-gray-300">Join a growing family with more than ever active users!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Modern Videos Section */}
        <section id="videos-section" className={`py-20 px-6 ${isDarkMode ? 'bg-gray-900' : 'bg-blue-200'}`}>
          <div className="container mx-auto max-w-8xl">
            <div className="text-center mb-16">
              <BouncyLetters
                text="Discover Neuraplay"
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-8 gradient-text px-4"
                delay={0.5}
                stagger={0.05}
                duration={0.6}
                bounceHeight={-100}
                initialScale={0.8}
                initialRotation={-5}
                triggerOnScroll={true}
              />
              <UniformLetterReveal
                text={`Embark on a journey where neuroscience meets play.\nEvery game is a step toward unlocking your child's limitless potential.`}
                className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto px-4 whitespace-pre-line"
                triggerOffset={80}
                stagger={0.03}
                duration={0.8}
                typewriterEffect={true}
                cursorBlink={false}
                priority={8}
              />
            </div>
            
            {/* 3D Card Stack Video Carousel */}
            <div className="relative h-96 lg:h-[600px] overflow-hidden mt-0 pt-32">
              {/* Card Stack Container */}
              <div className="relative w-full h-full flex items-center justify-center" style={{ marginTop: '200px' }}>
                {/* Card 1 - Active (Front) */}
                <div id="card-1" className="absolute inset-0 flex items-center justify-center z-40 card-stack">
                  <div className="rounded-2xl shadow-2xl overflow-hidden w-[48rem] h-[60rem] transform transition-all duration-700 hover:scale-105">
                    <div className="p-0">
                      <video 
                        src="/assets/Videos/neuraplayintrovid1.mp4" 
                        playsInline 
                        controls
                        preload="metadata"
                        className="w-full h-full object-cover rounded-2xl" 
                        style={{ objectPosition: 'center 20%' }}
                        onClick={(e) => {
                          const video = e.target as HTMLVideoElement;
                          video.play().catch(err => {
                            console.log('Video play failed:', err);
                            // Show fallback or retry
                          });
                        }}
                        onError={(e) => {
                          console.error('Video failed to load:', e);
                          const videoElement = e.target as HTMLVideoElement;
                          const container = videoElement.closest('.p-0');
                          if (container) {
                            container.innerHTML = `
                              <div class="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center">
                                <div class="text-center text-white">
                                  <div class="text-6xl mb-4">🎬</div>
                                  <h3 class="text-xl font-bold mb-2">Video Unavailable</h3>
                                  <p class="text-sm opacity-80">Click to try again</p>
                                </div>
                              </div>
                            `;
                            container.addEventListener('click', () => {
                              location.reload();
                            });
                          }
                        }}
                        onLoadStart={() => {
                          console.log('Video loading started');
                        }}
                        onCanPlay={() => {
                          console.log('Video can play');
                        }}
                        onEnded={(e) => {
                          // Move current card back
                          const currentCard = document.getElementById('card-1');
                          if (currentCard) {
                            currentCard.style.transform = 'scale(0.9) translateX(20px) translateY(-4px) rotate(6deg)';
                            currentCard.style.opacity = '0.8';
                            currentCard.style.zIndex = '30';
                          }
                          
                          // Move next card to front
                          const nextCard = document.getElementById('card-2');
                          if (nextCard) {
                            nextCard.style.transform = 'scale(1) translateX(0) translateY(0) rotate(0deg)';
                            nextCard.style.opacity = '1';
                            nextCard.style.zIndex = '40';
                          }
                        }}
                      />

                    </div>
                  </div>
                </div>

                {/* Card 2 - Behind */}
                <div 
                  id="card-2"
                  className="absolute inset-0 flex items-center justify-center z-30 transform scale-90 translate-x-20 -translate-y-4 rotate-6 opacity-80 transition-all duration-700 card-stack"
                >
                  <div className="rounded-2xl shadow-xl overflow-hidden w-[48rem] h-[60rem]">
                    <div className="p-0">
                      <video 
                        src="/assets/Videos/Neuraplayintroduction.mp4" 
                        playsInline 
                        controls
                        preload="metadata"
                        className="w-full h-full object-cover rounded-2xl" 
                        style={{ objectPosition: 'center 20%' }}
                        onClick={(e) => {
                          const video = e.target as HTMLVideoElement;
                          video.play().catch(err => {
                            console.log('Video play failed:', err);
                          });
                        }}
                        onError={(e) => {
                          console.error('Video failed to load:', e);
                          const videoElement = e.target as HTMLVideoElement;
                          const container = videoElement.closest('.p-0');
                          if (container) {
                            container.innerHTML = `
                              <div class="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center">
                                <div class="text-center text-white">
                                  <div class="text-6xl mb-4">🎬</div>
                                  <h3 class="text-xl font-bold mb-2">Video Unavailable</h3>
                                  <p class="text-sm opacity-80">Click to try again</p>
                                </div>
                              </div>
                            `;
                            container.addEventListener('click', () => {
                              location.reload();
                            });
                          }
                        }}
                        onLoadStart={() => {
                          console.log('Video loading started');
                        }}
                        onCanPlay={() => {
                          console.log('Video can play');
                        }}
                        onEnded={(e) => {
                          // Move current card back
                          const currentCard = document.getElementById('card-2');
                          if (currentCard) {
                            currentCard.style.transform = 'scale(0.8) translateX(36px) translateY(-8px) rotate(12deg)';
                            currentCard.style.opacity = '0.6';
                            currentCard.style.zIndex = '20';
                          }
                          
                          // Move next card to front
                          const nextCard = document.getElementById('card-3');
                          if (nextCard) {
                            nextCard.style.transform = 'scale(1) translateX(0) translateY(0) rotate(0deg)';
                            nextCard.style.opacity = '1';
                            nextCard.style.zIndex = '40';
                          }
                        }}
                      />

                    </div>
                  </div>
                </div>

                {/* Card 3 - Further Back */}
                <div 
                  id="card-3"
                  className="absolute inset-0 flex items-center justify-center z-20 transform scale-80 translate-x-36 -translate-y-8 rotate-12 opacity-60 transition-all duration-700 card-stack"
                >
                  <div className="rounded-2xl shadow-lg overflow-hidden w-[48rem] h-[60rem]">
                    <div className="p-0">
                      <video 
                        src="/assets/Videos/neuraplayintrovid4.mp4" 
                        playsInline 
                        controls
                        preload="metadata"
                        className="w-full h-full object-cover rounded-2xl" 
                        style={{ objectPosition: 'center 20%' }}
                        onClick={(e) => {
                          const video = e.target as HTMLVideoElement;
                          video.play().catch(err => {
                            console.log('Video play failed:', err);
                          });
                        }}
                        onError={(e) => {
                          console.error('Video failed to load:', e);
                          const videoElement = e.target as HTMLVideoElement;
                          const container = videoElement.closest('.p-0');
                          if (container) {
                            container.innerHTML = `
                              <div class="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center">
                                <div class="text-center text-white">
                                  <div class="text-6xl mb-4">🎬</div>
                                  <h3 class="text-xl font-bold mb-2">Video Unavailable</h3>
                                  <p class="text-sm opacity-80">Click to try again</p>
                                </div>
                              </div>
                            `;
                            container.addEventListener('click', () => {
                              location.reload();
                            });
                          }
                        }}
                        onLoadStart={() => {
                          console.log('Video loading started');
                        }}
                        onCanPlay={() => {
                          console.log('Video can play');
                        }}
                        onEnded={(e) => {
                          // Move current card back
                          const currentCard = document.getElementById('card-3');
                          if (currentCard) {
                            currentCard.style.transform = 'scale(0.7) translateX(48px) translateY(-12px) rotate(18deg)';
                            currentCard.style.opacity = '0.4';
                            currentCard.style.zIndex = '10';
                          }
                          
                          // Move next card to front
                          const nextCard = document.getElementById('card-4');
                          if (nextCard) {
                            nextCard.style.transform = 'scale(1) translateX(0) translateY(0) rotate(0deg)';
                            nextCard.style.opacity = '1';
                            nextCard.style.zIndex = '40';
                          }
                        }}
                      />

                    </div>
                  </div>
                </div>

                {/* Card 4 - Furthest Back */}
                <div 
                  id="card-4"
                  className="absolute inset-0 flex items-center justify-center z-10 transform scale-70 translate-x-48 -translate-y-12 rotate-18 opacity-40 transition-all duration-700 card-stack"
                >
                  <div className="rounded-2xl shadow-md overflow-hidden w-[48rem] h-[60rem]">
                    <div className="p-0">
                      <video 
                        src="/assets/Videos/Neuraplayintrovid3.mp4" 
                        playsInline 
                        controls
                        preload="metadata"
                        className="w-full h-full object-cover rounded-2xl" 
                        style={{ objectPosition: 'center 20%' }}
                        onClick={(e) => {
                          const video = e.target as HTMLVideoElement;
                          video.play().catch(err => {
                            console.log('Video play failed:', err);
                          });
                        }}
                        onError={(e) => {
                          console.error('Video failed to load:', e);
                          const videoElement = e.target as HTMLVideoElement;
                          const container = videoElement.closest('.p-0');
                          if (container) {
                            container.innerHTML = `
                              <div class="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center">
                                <div class="text-center text-white">
                                  <div class="text-6xl mb-4">🎬</div>
                                  <h3 class="text-xl font-bold mb-2">Video Unavailable</h3>
                                  <p class="text-sm opacity-80">Click to try again</p>
                                </div>
                              </div>
                            `;
                            container.addEventListener('click', () => {
                              location.reload();
                            });
                          }
                        }}
                        onLoadStart={() => {
                          console.log('Video loading started');
                        }}
                        onCanPlay={() => {
                          console.log('Video can play');
                        }}
                        onEnded={(e) => {
                          // Move current card back
                          const currentCard = document.getElementById('card-4');
                          if (currentCard) {
                            currentCard.style.transform = 'scale(0.8) translateX(36px) translateY(-8px) rotate(12deg)';
                            currentCard.style.opacity = '0.6';
                            currentCard.style.zIndex = '20';
                          }
                          
                          // Loop back to first card
                          const firstCard = document.getElementById('card-1');
                          if (firstCard) {
                            firstCard.style.transform = 'scale(1) translateX(0) translateY(0) rotate(0deg)';
                            firstCard.style.opacity = '1';
                            firstCard.style.zIndex = '40';
                          }
                          
                          // Reset all other cards to their original positions
                          const card2 = document.getElementById('card-2');
                          if (card2) {
                            card2.style.transform = 'scale(0.9) translateX(20px) translateY(-4px) rotate(6deg)';
                            card2.style.opacity = '0.8';
                            card2.style.zIndex = '30';
                          }
                          
                          const card3 = document.getElementById('card-3');
                          if (card3) {
                            card3.style.transform = 'scale(0.7) translateX(48px) translateY(-12px) rotate(18deg)';
                            card3.style.opacity = '0.4';
                            card3.style.zIndex = '10';
                          }
                        }}
                      />

                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Dots */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3 z-50">
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                <div className="w-3 h-3 bg-purple-300 rounded-full opacity-60"></div>
                <div className="w-3 h-3 bg-purple-300 rounded-full opacity-60"></div>
                <div className="w-3 h-3 bg-purple-300 rounded-full opacity-60"></div>
              </div>
            </div>
            
            {/* SVG for light theme */}
            {!isDarkMode && (
              <div className="text-center mt-12">
                <img 
                  src="/assets/SVG/undraw_online-video_ecqg.svg" 
                  alt="Online Learning" 
                  className="w-64 h-64 mx-auto opacity-70"
                />
              </div>
            )}
          </div>
        </section>

        {/* Modern Content/Releases Section */}
        <section className={`py-20 px-6 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-300'}`}>
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-16">
              <BouncyLetters
                text="New Releases"
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-8 gradient-text px-4"
                delay={0.5}
                stagger={0.05}
                duration={0.6}
                bounceHeight={-100}
                initialScale={0.8}
                initialRotation={-5}
                triggerOnScroll={true}
              />
              <UniformLetterReveal
                text="Discover our latest games and features designed to enhance cognitive development"
                className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto px-4 whitespace-normal"
                triggerOffset={90}
                stagger={0.03}
                duration={0.8}
                typewriterEffect={true}
                cursorBlink={false}
                priority={9}
              />
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 px-4">
              <div className="gradient-border hover:scale-105 transition-transform duration-300">
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold">🧩 The Cube</h3>
                    <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full text-sm font-semibold">NEW</span>
                  </div>
                  <p className="mb-6 leading-relaxed">
                    Advanced 3D Rubik's Cube with real-time cognitive tracking. Targets 22 neuropsychological concepts.
                  </p>
                  <Link to="/playground" className="inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-6 py-3 rounded-full hover:bg-purple-700 transition-colors">
                    Try The Cube
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="gradient-border hover:scale-105 transition-transform duration-300">
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold">🤖 Enhanced AI</h3>
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-semibold">UPDATED</span>
                  </div>
                  <p className="mb-6 leading-relaxed">
                    Upgraded AI assistant with voice capabilities, multi-language support, and personalized learning recommendations.
                  </p>
                  <Link to="/ai-assistant" className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-6 py-3 rounded-full hover:bg-blue-700 transition-colors">
                    Meet Synapse
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="gradient-border hover:scale-105 transition-transform duration-300">
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold">📊 Analytics</h3>
                    <span className="bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200 px-3 py-1 rounded-full text-sm font-semibold">ENHANCED</span>
                  </div>
                  <p className="mb-6 leading-relaxed">
                    Comprehensive cognitive development tracking with detailed progress reports and performance analytics.
                  </p>
                  <Link to="/ai-report" className="inline-flex items-center gap-2 bg-pink-600 text-white font-bold px-6 py-3 rounded-full hover:bg-pink-700 transition-colors">
                    View Reports
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Modern Call-to-Action Section */}
        <section className={`py-24 px-6 relative overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-300'}`}>
          
          <div className="container mx-auto max-w-8xl relative z-10">
            <div className="text-center mb-16">
              <BouncyLetters
                text="Transform Your Child's Future"
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black mb-8 leading-tight text-gray-900 drop-shadow-lg px-4"
                delay={0.5}
                stagger={0.03}
                duration={0.5}
                bounceHeight={-60}
                initialScale={0.8}
                initialRotation={-5}
                triggerOnScroll={true}
              />
              <div className="text-center space-y-6">
                <div>
                  <UniformLetterReveal
                    text="Join the revolution in cognitive development."
                    className="text-lg sm:text-xl md:text-2xl text-gray-700 max-w-6xl mx-auto leading-relaxed px-4"
                    triggerOffset={70}
                    stagger={0.03}
                    duration={0.5}
                    typewriterEffect={true}
                    cursorBlink={false}
                    priority={10}
                  />
                </div>
                <div>
                  <UniformLetterReveal
                    text="Where neuroscience meets play, and every moment becomes a step toward brilliance."
                    className="text-lg sm:text-xl md:text-2xl text-gray-700 max-w-6xl mx-auto leading-relaxed px-4"
                    triggerOffset={220}
                    stagger={0.03}
                    duration={0.5}
                    typewriterEffect={true}
                    cursorBlink={false}
                    priority={11}
                  />
                </div>
              </div>
              <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 text-gray-600 text-sm sm:text-lg px-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Join a growing family with more than ever active users!</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                  <span>Science-Based Approach</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
                  <span>Proven Results</span>
                </div>
              </div>
            </div>
            
            {/* Main CTA Cards */}
            <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 mb-16 px-4">
              {/* Premium Journey Card */}
              <div className="gradient-border hover:scale-105 transition-transform duration-300 group">
                <div className="p-8 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Star className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold mb-4">Premium Journey</h3>
                  <p className="text-lg mb-6 leading-relaxed whitespace-normal">
                    Unlock the full potential of Neuraplay with personalized learning paths, advanced analytics, and exclusive content designed for your child's unique cognitive profile.
                  </p>
                  <div className="space-y-3 mb-8 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Personalized AI Learning Paths</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Advanced Progress Analytics</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Exclusive Educational Content</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Priority Support & Guidance</span>
                    </div>
                  </div>
                  <Link
                    to="/registration"
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold px-6 py-3 rounded-full hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 flex items-center gap-3 mx-auto group-hover:scale-105 text-sm"
                  >
                    <ArrowRight className="w-5 h-5" />
                    Start Premium Journey
                  </Link>
                </div>
              </div>

              {/* Community Access Card */}
              <div className="gradient-border hover:scale-105 transition-transform duration-300 group">
                <div className="p-8 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Heart className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold mb-4">Join Our Community</h3>
                  <p className="text-lg mb-6 leading-relaxed whitespace-normal">
                    Connect with like-minded parents, share experiences, and discover new learning strategies in our vibrant community of families committed to cognitive excellence.
                  </p>
                  <div className="space-y-3 mb-8 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Parent Community Forum</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Expert-Led Discussions</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Resource Sharing Network</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Monthly Learning Events</span>
                    </div>
                  </div>
                  <Link
                    to="/forum-registration"
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold px-6 py-3 rounded-full hover:from-purple-600 hover:to-pink-600 transition-all duration-300 flex items-center gap-3 mx-auto group-hover:scale-105 text-sm"
                  >
                    <ArrowRight className="w-5 h-5" />
                    Join Community
                  </Link>
                </div>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="text-center">
              <div className="gradient-border inline-block">
                <div className="p-8">
                  <h4 className="text-2xl font-bold mb-6">Why Parents Choose Neuraplay</h4>
                  <div className="grid md:grid-cols-3 gap-8">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trophy className="w-8 h-8 text-white" />
                      </div>
                      <h5 className="font-bold text-lg mb-2">Proven Results</h5>
                      <p className="text-sm">85% improvement in cognitive skills</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-white" />
                      </div>
                      <h5 className="font-bold text-lg mb-2">Join a growing family</h5>
                      <p className="text-sm">With more than ever active users!</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8 text-white" />
                      </div>
                      <h5 className="font-bold text-lg mb-2">Science-Based</h5>
                      <p className="text-sm">Backed by neuropsychological research</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Modern Future Features Section */}
        <section className={`py-20 px-6 ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-purple-900/20 to-indigo-900/20' : 'bg-purple-300'}`}>
          <div className="container mx-auto max-w-8xl">
            <div className="text-center mb-16">
              <BouncyLetters
                text="The Future of Learning"
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-8 gradient-text px-4"
                delay={0.1}
                stagger={0.05}
                duration={0.48}
                bounceHeight={-50}
                initialScale={0.9}
                initialRotation={-3}
                triggerOnScroll={true}
              />
              <UniformLetterReveal
                text="We're building tomorrow's educational experiences today"
                className={`text-lg sm:text-xl md:text-2xl max-w-4xl mx-auto px-4 whitespace-normal ${isDarkMode ? 'text-white/80' : 'text-gray-600'}`}
                triggerOffset={100}
                stagger={0.04}
                duration={0.8}
                typewriterEffect={true}
                cursorBlink={false}
                priority={12}
              />
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12 px-4">
              {/* AI-Powered Learning Hub */}
              <div className="gradient-border hover:scale-105 transition-transform duration-300 group">
                <div className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Brain className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold mb-2">AI Learning Hub</h3>
                      <p className="text-sm text-purple-600 dark:text-purple-400 font-semibold">Q2 2025</p>
                    </div>
                  </div>
                  <p className="text-lg leading-relaxed mb-6 whitespace-normal">
                    Advanced AI tutors that adapt to each child's learning style, providing personalized guidance and real-time feedback on cognitive development.
                  </p>
                  <div className="flex items-center gap-4">
                    <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full text-sm font-semibold">AI-Powered</span>
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-semibold">Personalized</span>
                  </div>
                </div>
              </div>

              {/* Virtual Reality Classroom */}
              <div className="gradient-border hover:scale-105 transition-transform duration-300 group">
                <div className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <div className="w-8 h-8 border-2 border-white rounded-lg relative">
                        <div className="absolute inset-1 bg-white/20 rounded-sm"></div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold mb-2">Montessori Classroom</h3>
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold">Q3 2025</p>
                    </div>
                  </div>
                  <p className="text-lg leading-relaxed mb-6 whitespace-normal">
                    Digital learning environments that transport children to montessori-suitable environments, which makes abstract concepts tangible and engaging.
                  </p>
                  <div className="flex items-center gap-4">
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-semibold">Immersive</span>
                    <span className="bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 px-3 py-1 rounded-full text-sm font-semibold">Interactive</span>
                  </div>
                </div>
              </div>

              {/* Collaborative Learning Network */}
              <div className="gradient-border hover:scale-105 transition-transform duration-300 group">
                <div className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold mb-2">Learning Network</h3>
                      <p className="text-sm text-green-600 dark:text-green-400 font-semibold">Q4 2025</p>
                    </div>
                  </div>
                  <p className="text-lg leading-relaxed mb-6 whitespace-normal">
                    Global collaborative learning platform where children can work together on projects, share discoveries, and learn from peers worldwide.
                  </p>
                  <div className="flex items-center gap-4">
                    <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-semibold">Collaborative</span>
                    <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-3 py-1 rounded-full text-sm font-semibold">Global</span>
                  </div>
                </div>
              </div>

              {/* Advanced Analytics Dashboard */}
              <div className="gradient-border hover:scale-105 transition-transform duration-300 group">
                <div className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <div className="w-8 h-8 border-2 border-white rounded relative">
                        <div className="absolute top-0 left-0 w-2 h-2 bg-white rounded-full"></div>
                        <div className="absolute top-0 right-0 w-2 h-2 bg-white rounded-full"></div>
                        <div className="absolute bottom-0 left-0 w-2 h-2 bg-white rounded-full"></div>
                        <div className="absolute bottom-0 right-0 w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold mb-2">Smart Analytics</h3>
                      <p className="text-sm text-orange-600 dark:text-orange-400 font-semibold">Q1 2026</p>
                    </div>
                  </div>
                  <p className="text-lg leading-relaxed mb-6 whitespace-normal">
                    Comprehensive cognitive development tracking with predictive analytics, detailed progress reports, and personalized learning recommendations.
                  </p>
                  <div className="flex items-center gap-4">
                    <span className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-3 py-1 rounded-full text-sm font-semibold">Analytics</span>
                    <span className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-3 py-1 rounded-full text-sm font-semibold">Predictive</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="text-center mt-16">
              <div className="gradient-border inline-block">
                <div className="p-8">
                  <h3 className="text-2xl font-bold mb-4">Be Part of the Future</h3>
                  <p className="text-lg mb-6 max-w-2xl mx-auto whitespace-normal">
                    Join our early access program and help shape the future of educational technology. Get exclusive previews and influence feature development.
                  </p>
                  <button 
                    onClick={() => setShowSignUpModal(true)}
                    className="group relative bg-gradient-to-r from-slate-800 to-slate-900 text-white font-semibold px-12 py-4 rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl border border-slate-600/20 hover:border-slate-500/30"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative z-10 text-lg tracking-wide">Join Early Access</span>
                  </button>
                </div>
              </div>
              

            </div>
          </div>
        </section>
        
        <Footer />
        <VideoDiagnostics />
      </div>

      {/* Modals */}
      <SignUpChoiceModal
        isOpen={showSignUpModal}
        onClose={() => setShowSignUpModal(false)}
        onPremiumSignUp={() => {
          setShowSignUpModal(false);
          navigate('/registration');
        }}
        onRegularSignUp={() => {
          setShowSignUpModal(false);
          setShowRegularSignUpModal(true);
        }}
        onShowLogin={() => {
          setShowSignUpModal(false);
          setShowLoginModal(true);
        }}
      />
      <RegularSignUpModal
        isOpen={showRegularSignUpModal}
        onClose={() => setShowRegularSignUpModal(false)}
        onSuccess={() => {}}
        onShowLogin={() => {
          setShowRegularSignUpModal(false);
          setShowLoginModal(true);
        }}
      />
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => {}}
        redirectTo="/dashboard"
      />
    </>
  );
};

export default NewHomePage;
