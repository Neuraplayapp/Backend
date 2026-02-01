import React, { useEffect, useRef, useState } from 'react';
import { X, Play, Info, Star, Brain, BarChart3, ChevronRight, Target, Clock, Users } from 'lucide-react';
import './PlaygroundModalReveal.css';

// Declare GSAP types
declare const gsap: any;

export interface GameInfo {
  id: string;
  title: string;
  category: string;
  description: string;
  skills: string[];
  difficulty: string;
  duration: string;
  ageRange: string;
  image: string;
  features: string[];
  instructions: string;
}

interface PlaygroundModalRevealProps {
  game: GameInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onPlay: () => void;
}

type ModalView = 'default' | 'about' | 'statistics';

const PlaygroundModalReveal: React.FC<PlaygroundModalRevealProps> = ({
  game,
  isOpen,
  onClose,
  onPlay
}) => {
  const [modalView, setModalView] = useState<ModalView>('default');
  const [isAnimating, setIsAnimating] = useState(false);
  
  const backdropRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !game) return;

    setIsAnimating(true);

    // If GSAP is not available, show content immediately
    if (typeof gsap === 'undefined') {
      setIsAnimating(false);
      return;
    }

    // Set initial states
    gsap.set(backdropRef.current, {
      opacity: 0,
      backdropFilter: 'blur(0px)'
    });

    gsap.set(modalRef.current, {
      opacity: 0,
      scale: 0.8,
      y: 50,
      filter: 'blur(10px)'
    });

    gsap.set(imageRef.current, {
      opacity: 0,
      scale: 1.2,
      y: -20
    });

    gsap.set(titleRef.current, {
      opacity: 0,
      y: -30,
      filter: 'blur(10px)'
    });

    // Don't set cards to opacity 0 initially - let them be visible
    gsap.set(cardsRef.current, {
      y: 30,
      filter: 'blur(10px)',
      opacity: 1  // Keep cards visible
    });

    gsap.set(closeButtonRef.current, {
      opacity: 0,
      scale: 0.8,
      rotation: -90
    });

    // Create main timeline
    const tl = gsap.timeline({ delay: 0.2 });

    // Backdrop animation
    tl.to(backdropRef.current, {
      opacity: 1,
      backdropFilter: 'blur(12px)',
      duration: 0.6,
      ease: "power2.out"
    }, 0);

    // Modal container animation
    tl.to(modalRef.current, {
      opacity: 1,
      scale: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 0.8,
      ease: "back.out(1.7)"
    }, 0.2);

    // Image animation
    tl.to(imageRef.current, {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: 0.8,
      ease: "power2.out"
    }, 0.4);

    // Title animation with letter reveal
    const titleLetters = titleRef.current?.querySelectorAll('.title-letter');
    if (titleLetters && titleLetters.length > 0) {
      gsap.set(titleLetters, {
        opacity: 0,
        scale: 0.3,
        y: -20,
        rotationX: 90
      });

      tl.to(titleLetters, {
        opacity: 1,
        scale: 1,
        y: 0,
        rotationX: 0,
        duration: 0.6,
        stagger: 0.05,
        ease: "back.out(1.7)"
      }, 0.6);
    }

    // Cards container animation
    tl.to(cardsRef.current, {
      y: 0,
      filter: 'blur(0px)',
      duration: 0.6,
      ease: "power2.out"
    }, 0.8);

    // Cards animation with stagger
    if (cardsRef.current) {
      const cards = cardsRef.current.querySelectorAll('[class*="action-card"]');
      console.log('Found cards:', cards.length, cards);
      
      // Only animate if we found cards
      if (cards.length > 0) {
        // Set initial state for cards - keep them visible
        gsap.set(cards, {
          opacity: 1,  // Keep visible
          x: -30,
          scale: 0.9
        });

        // Animate cards to final position
        tl.to(cards, {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: "power2.out"
        }, 0.8);
      }
    }

    // Close button animation
    tl.to(closeButtonRef.current, {
      opacity: 1,
      scale: 1,
      rotation: 0,
      duration: 0.4,
      ease: "back.out(1.7)"
    }, 1.0);

    // Complete animation
    tl.call(() => {
      setIsAnimating(false);
    });

    // Cards are now visible by default, no fallback needed

    return () => {
      tl.kill();
    };
  }, [isOpen, game]);

  // Handle close animation
  const handleClose = () => {
    if (isAnimating) return;

    setIsAnimating(true);
    const tl = gsap.timeline();

    // Reverse animations
    tl.to(closeButtonRef.current, {
      opacity: 0,
      scale: 0.8,
      rotation: -90,
      duration: 0.3,
      ease: "power2.in"
    });

    tl.to([titleRef.current, cardsRef.current], {
      opacity: 0,
      y: 20,
      filter: 'blur(10px)',
      duration: 0.4,
      ease: "power2.in"
    }, "-=0.2");

    tl.to(imageRef.current, {
      opacity: 0,
      scale: 1.2,
      y: -20,
      duration: 0.4,
      ease: "power2.in"
    }, "-=0.3");

    tl.to(modalRef.current, {
      opacity: 0,
      scale: 0.8,
      y: 50,
      filter: 'blur(10px)',
      duration: 0.5,
      ease: "power2.in"
    }, "-=0.3");

    tl.to(backdropRef.current, {
      opacity: 0,
      backdropFilter: 'blur(0px)',
      duration: 0.3,
      ease: "power2.in"
    }, "-=0.2");

    tl.call(() => {
      onClose();
      setIsAnimating(false);
    });
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isAnimating) {
      handleClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isAnimating) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isAnimating]);

  const handlePlayClick = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    const tl = gsap.timeline();

    // Scale up image
    tl.to(imageRef.current, {
      scale: 1.2,
      duration: 0.6,
      ease: "power2.out"
    });

    // Fade out modal
    tl.to(modalRef.current, {
      opacity: 0,
      scale: 0.9,
      duration: 0.4,
      ease: "power2.in"
    }, "-=0.3");

    tl.call(() => {
      onPlay();
      handleClose();
    });
  };

  const handleAboutClick = () => {
    setModalView('about');
  };

  const handleStatisticsClick = () => {
    setModalView('statistics');
  };

  const handleCloseExpanded = () => {
    setModalView('default');
  };

  // Fallback to ensure content is visible if GSAP is not available
  const isGSAPAvailable = typeof gsap !== 'undefined';

  if (!game || !isOpen) return null;

  // Render title with letter animation
  const renderTitle = () => {
    return (
      <div ref={titleRef} className="text-3xl font-bold text-white mb-2">
        {game.title.split('').map((char, index) => (
          <span
            key={index}
            className="title-letter inline-block"
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </div>
    );
  };

  return (
          <div
        ref={backdropRef}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 playground-modal-backdrop"
        onClick={handleBackdropClick}
      >
        <div
          ref={modalRef}
          className={`playground-modal-container rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden playground-modal-reveal ${!isGSAPAvailable ? 'fallback' : ''}`}
          style={{ zIndex: 10000 }}
        >
                  {/* Close Button */}
          <button
            ref={closeButtonRef}
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl font-bold transition-colors p-2 rounded-full hover:bg-white/10 playground-close-button"
            disabled={isAnimating}
            style={{ zIndex: 10003 }}
          >
            <X size={24} />
          </button>

        {/* Main Content */}
        <div className="relative" style={{ zIndex: 10001 }}>
          {/* Image Section */}
          <div 
            ref={imageRef}
            className={`relative h-64 overflow-hidden rounded-t-3xl playground-modal-image ${!isGSAPAvailable ? 'fallback' : ''}`}
          >
            <img 
              src={game.image} 
              alt={game.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            <div className="absolute bottom-4 left-4 right-4">
              {renderTitle()}
              <div className="flex items-center gap-4 text-white/80 text-sm">
                <span className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                  {game.category}
                </span>
                <span className="flex items-center gap-1">
                  <Target size={16} />
                  {game.difficulty}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={16} />
                  {game.duration}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={16} />
                  {game.ageRange}
                </span>
              </div>
            </div>
          </div>

          {/* Action Cards */}
          <div 
            ref={cardsRef}
            className="p-6 space-y-4 relative"
            style={{ zIndex: 10002 }}
          >
            {/* Play Game Card */}
            <div 
              className={`action-card play-card bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-400 rounded-2xl p-4 cursor-pointer group hover:from-green-500/30 hover:to-emerald-500/30 transition-all duration-300 playground-action-card ${!isGSAPAvailable ? 'fallback' : ''}`}
              onClick={handlePlayClick}
              style={{ 
                backgroundColor: 'rgba(34, 197, 94, 0.3)',
                zIndex: 10003
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                    <Play size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Play Game</h3>
                    <p className="text-white/70 text-sm">Start playing now</p>
                  </div>
                </div>
                <ChevronRight size={24} className="text-white/60 group-hover:text-white transition-colors" />
              </div>
            </div>

            {/* About Card */}
            <div 
              className={`action-card about-card bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-2 border-blue-400 rounded-2xl p-4 cursor-pointer group hover:from-blue-500/30 hover:to-cyan-500/30 transition-all duration-300 playground-action-card ${!isGSAPAvailable ? 'fallback' : ''}`}
              onClick={handleAboutClick}
              style={{ backgroundColor: 'rgba(59, 130, 246, 0.3)', zIndex: 10003 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                    <Info size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">About</h3>
                    <p className="text-white/70 text-sm">Game information</p>
                  </div>
                </div>
                <ChevronRight size={24} className="text-white/60 group-hover:text-white transition-colors" />
              </div>
            </div>

            {/* Statistics Card */}
            <div 
              className={`action-card stats-card bg-gradient-to-r from-purple-500/20 to-violet-500/20 border-2 border-purple-400 rounded-2xl p-4 cursor-pointer group hover:from-purple-500/30 hover:to-violet-500/30 transition-all duration-300 playground-action-card ${!isGSAPAvailable ? 'fallback' : ''}`}
              onClick={handleStatisticsClick}
              style={{ zIndex: 10003 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-violet-500 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
                    <BarChart3 size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Statistics</h3>
                    <p className="text-white/70 text-sm">Your progress</p>
                  </div>
                </div>
                <ChevronRight size={24} className="text-white/60 group-hover:text-white transition-colors" />
              </div>
            </div>

            {/* Skills Card */}
            <div 
              className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-400/30 rounded-2xl p-4"
              style={{ zIndex: 10003 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <Brain size={20} className="text-orange-400" />
                <h3 className="font-bold text-white">Skills Developed</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {game.skills.map((skill, index) => (
                  <span 
                    key={index}
                    className="bg-white/10 px-3 py-1 rounded-full text-white/80 text-sm backdrop-blur-sm playground-skill-tag"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Expanding Overlays */}
        {modalView !== 'default' && (
          <div 
            ref={overlayRef}
            className="absolute inset-0 playground-overlay-content rounded-3xl"
            style={{ zIndex: 10004 }}
          >
            <div className="p-6 h-full overflow-y-auto playground-overlay-content">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  {modalView === 'about' && <Info size={24} className="text-blue-400" />}
                  {modalView === 'statistics' && <BarChart3 size={24} className="text-purple-400" />}
                  <h2 className="text-2xl font-bold text-white">
                    {modalView === 'about' ? `About ${game.title}` : 'Statistics'}
                  </h2>
                </div>
                <button
                  onClick={handleCloseExpanded}
                  className="text-white/60 hover:text-white text-2xl font-bold transition-colors p-2 rounded-full hover:bg-white/10"
                >
                  <X size={24} />
                </button>
              </div>

              {modalView === 'about' && (
                <div className="space-y-6">
                  <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-3">Description</h3>
                    <p className="text-white/80 leading-relaxed">{game.description}</p>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-3">Features</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {game.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Star size={16} className="text-yellow-400" />
                          <span className="text-white/80">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-3">How to Play</h3>
                    <p className="text-white/80 leading-relaxed">{game.instructions}</p>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-3">Game Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-white/60 text-sm">Category</span>
                        <p className="text-white font-semibold">{game.category}</p>
                      </div>
                      <div>
                        <span className="text-white/60 text-sm">Difficulty</span>
                        <p className="text-white font-semibold">{game.difficulty}</p>
                      </div>
                      <div>
                        <span className="text-white/60 text-sm">Duration</span>
                        <p className="text-white font-semibold">{game.duration}</p>
                      </div>
                      <div>
                        <span className="text-white/60 text-sm">Age Range</span>
                        <p className="text-white font-semibold">{game.ageRange}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalView === 'statistics' && (
                <div className="space-y-6">
                  <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-4">Your Progress</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-400">0</div>
                        <div className="text-white/60 text-sm">Level</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-yellow-400">0</div>
                        <div className="text-white/60 text-sm">Stars</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-400">0</div>
                        <div className="text-white/60 text-sm">Best Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-400">0</div>
                        <div className="text-white/60 text-sm">Times Played</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-3">Skills Assessment</h3>
                    <div className="space-y-4">
                      {game.skills.map((skill, index) => (
                        <div key={index}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-white/80">{skill}</span>
                            <span className="text-white/60 text-sm">0%</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-2">
                            <div className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full" style={{ width: '0%' }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaygroundModalReveal; 