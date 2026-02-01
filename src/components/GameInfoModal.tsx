import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Info, Star, Brain, BarChart3, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../contexts/UserContext';
import './GameInfoModal.css';

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

interface GameInfoModalProps {
  game: GameInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onPlay: () => void;
}

type ModalView = 'default' | 'about' | 'statistics';

export default function GameInfoModal({ game, isOpen, onClose, onPlay }: GameInfoModalProps) {
  const { user } = useUser();
  const [modalView, setModalView] = useState<ModalView>('default');
  const [rippleEffect, setRippleEffect] = useState<{ x: number; y: number } | null>(null);
  const [isImageScaling, setIsImageScaling] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setModalView('default');
      setIsImageScaling(false);
    }
  }, [isOpen, game]);

  if (!game || !isOpen) return null;

  // Fallback stats
  const stats = {
    level: 0,
    stars: 0,
    bestScore: 0,
    timesPlayed: 0,
    playTime: 0,
    ...(user?.profile?.gameProgress?.[game.id] || {})
  };

  const handleRipple = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setRippleEffect({ x, y });
    setTimeout(() => setRippleEffect(null), 600);
  };

  const handlePlayClick = () => {
    setIsImageScaling(true);
    setTimeout(() => {
      onPlay();
      handleCloseModal();
    }, 800); // Match the scale animation duration
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

  const handleCloseModal = () => {
    setModalView('default');
    setIsImageScaling(false);
    onClose();
  };

  // Animation variants
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        type: "spring" as const, 
        stiffness: 300, 
        damping: 30,
        duration: 0.4
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8,
      transition: { duration: 0.2 }
    }
  };

  const imageVariants = {
    initial: { scale: 1, borderRadius: "20px" },
    scaling: { 
      scale: 1.2, 
      borderRadius: "0px",
      transition: { 
        duration: 0.8, 
        ease: "easeInOut" as const
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: "spring" as const, 
        stiffness: 400, 
        damping: 25,
        duration: 0.5
      }
    },
    exit: { 
      opacity: 0, 
      y: -20, 
      scale: 0.95,
      transition: { duration: 0.3 }
    }
  };

  const textRevealVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.95 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: i * 0.1,
        duration: 0.4,
        ease: "easeOut" as const
      }
    })
  };

  const contentRevealVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: i * 0.15 + 0.3, // Delay after container animation
        duration: 0.5,
        ease: "easeOut" as const
      }
    })
  };

  const rippleVariants = {
    initial: { scale: 0, opacity: 1 },
    animate: { 
      scale: 4, 
      opacity: 0,
      transition: { duration: 0.6, ease: "easeOut" as const }
    }
  };

  const waveRevealVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      filter: "blur(10px)"
    },
    visible: (i: number) => ({
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.15,
        duration: 0.6,
        ease: "easeOut" as const
      }
    })
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="game-modal-overlay"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={modalVariants}
        >
          <div className="game-modal-container">
            <motion.div 
              className={`game-modal-content ${modalView !== 'default' ? 'expanded' : ''}`}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Close Button */}
              <motion.button 
                onClick={handleCloseModal}
                className="modal-close-btn"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onMouseDown={handleRipple}
              >
                <X size={24} />
                {rippleEffect && (
                  <motion.div
                    className="ripple-effect"
                    initial="initial"
                    animate="animate"
                    variants={rippleVariants}
                    style={{
                      left: rippleEffect.x,
                      top: rippleEffect.y,
                    }}
                  />
                )}
              </motion.button>

              {/* Main Content */}
              <div className="modal-main-content">
                {/* Image Section */}
                <motion.div 
                  className="modal-image-section"
                  variants={imageVariants}
                  initial="initial"
                  animate={isImageScaling ? "scaling" : "initial"}
                >
                  <motion.img 
                    src={game.image} 
                    alt={game.title}
                    className="modal-game-image"
                    initial={{ scale: 1.1, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                  <div className="image-overlay">
                    <motion.div 
                      className="game-title"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                    >
                      <h1>{game.title}</h1>
                      <div className="game-meta">
                        <span>{game.category}</span>
                        <span>•</span>
                        <span>{game.difficulty}</span>
                        <span>•</span>
                        <span>{game.duration}</span>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>

                {/* Action Cards */}
                <div className="modal-actions">
                  {/* Play Game Card */}
                  <motion.div 
                    className="action-card play-card"
                    onClick={handlePlayClick}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onMouseDown={handleRipple}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                  >
                    <div className="card-icon">
                      <Play size={32} />
                    </div>
                    <div className="card-content">
                      <h3>Play Game</h3>
                      <p>Start playing now</p>
                    </div>
                    <ChevronRight size={24} />
                    {rippleEffect && (
                      <motion.div
                        className="ripple-effect"
                        initial="initial"
                        animate="animate"
                        variants={rippleVariants}
                        style={{
                          left: rippleEffect.x,
                          top: rippleEffect.y,
                        }}
                      />
                    )}
                  </motion.div>

                  {/* About Card */}
                  <motion.div 
                    className="action-card about-card"
                    onClick={handleAboutClick}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onMouseDown={handleRipple}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                  >
                    <div className="card-icon">
                      <Info size={32} />
                    </div>
                    <div className="card-content">
                      <h3>About</h3>
                      <p>Game information</p>
                    </div>
                    <ChevronRight size={24} />
                  </motion.div>

                  {/* Statistics Card */}
                  <motion.div 
                    className="action-card stats-card"
                    onClick={handleStatisticsClick}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onMouseDown={handleRipple}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                  >
                    <div className="card-icon">
                      <BarChart3 size={32} />
                    </div>
                    <div className="card-content">
                      <h3>Statistics</h3>
                      <p>Your progress</p>
                    </div>
                    <ChevronRight size={24} />
                  </motion.div>

                  {/* Quick Stats */}
                  <motion.div 
                    className="quick-stats"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                  >
                    <div className="stat-item">
                      <span className="stat-value">{stats.level}</span>
                      <span className="stat-label">Level</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">{stats.stars}</span>
                      <span className="stat-label">Stars</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">{stats.bestScore}</span>
                      <span className="stat-label">Best Score</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">{stats.timesPlayed}</span>
                      <span className="stat-label">Played</span>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Expanding Overlays */}
              <AnimatePresence>
                {modalView !== 'default' && (
                  <motion.div 
                    className="modal-overlay"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 300, 
                      damping: 30,
                      duration: 0.4
                    }}
                  >
                    {modalView === 'about' && (
                      <motion.div 
                        className="overlay-content about-overlay"
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                      >
                        <div className="overlay-header">
                          <div className="header-content">
                            <Info size={24} />
                            <h2>About {game.title}</h2>
                          </div>
                          <motion.button
                            onClick={handleCloseExpanded}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className="close-overlay-btn"
                          >
                            <X size={24} />
                          </motion.button>
                        </div>

                        <div className="overlay-body">
                          <motion.div 
                            className="content-section"
                            custom={0}
                            variants={waveRevealVariants}
                            initial="hidden"
                            animate="visible"
                          >
                            <motion.h3 
                              custom={0}
                              variants={contentRevealVariants}
                              initial="hidden"
                              animate="visible"
                            >
                              Description
                            </motion.h3>
                            <motion.p 
                              custom={1}
                              variants={contentRevealVariants}
                              initial="hidden"
                              animate="visible"
                            >
                              {game.description}
                            </motion.p>
                          </motion.div>

                          <motion.div 
                            className="content-section"
                            custom={1}
                            variants={waveRevealVariants}
                            initial="hidden"
                            animate="visible"
                          >
                            <motion.h3 
                              custom={0}
                              variants={contentRevealVariants}
                              initial="hidden"
                              animate="visible"
                            >
                              Skills Developed
                            </motion.h3>
                            <motion.p 
                              custom={1}
                              variants={contentRevealVariants}
                              initial="hidden"
                              animate="visible"
                            >
                              {game.skills.join(', ')}
                            </motion.p>
                          </motion.div>

                          <motion.div 
                            className="content-section"
                            custom={2}
                            variants={waveRevealVariants}
                            initial="hidden"
                            animate="visible"
                          >
                            <motion.h3 
                              custom={0}
                              variants={contentRevealVariants}
                              initial="hidden"
                              animate="visible"
                            >
                              Features
                            </motion.h3>
                            <motion.p 
                              custom={1}
                              variants={contentRevealVariants}
                              initial="hidden"
                              animate="visible"
                            >
                              {game.features.join(', ')}
                            </motion.p>
                          </motion.div>

                          <motion.div 
                            className="content-section"
                            custom={3}
                            variants={waveRevealVariants}
                            initial="hidden"
                            animate="visible"
                          >
                            <motion.h3 
                              custom={0}
                              variants={contentRevealVariants}
                              initial="hidden"
                              animate="visible"
                            >
                              How to Play
                            </motion.h3>
                            <motion.p 
                              custom={1}
                              variants={contentRevealVariants}
                              initial="hidden"
                              animate="visible"
                            >
                              {game.instructions}
                            </motion.p>
                          </motion.div>

                          <motion.div 
                            className="content-section"
                            custom={4}
                            variants={waveRevealVariants}
                            initial="hidden"
                            animate="visible"
                          >
                            <motion.h3 
                              custom={0}
                              variants={contentRevealVariants}
                              initial="hidden"
                              animate="visible"
                            >
                              Game Details
                            </motion.h3>
                            <motion.div 
                              className="details-grid"
                              custom={1}
                              variants={contentRevealVariants}
                              initial="hidden"
                              animate="visible"
                            >
                              <div className="detail-item">
                                <span className="detail-label">Category</span>
                                <span className="detail-value">{game.category}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Difficulty</span>
                                <span className="detail-value">{game.difficulty}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Duration</span>
                                <span className="detail-value">{game.duration}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Age Range</span>
                                <span className="detail-value">{game.ageRange}</span>
                              </div>
                            </motion.div>
                          </motion.div>
                        </div>
                      </motion.div>
                    )}

                    {modalView === 'statistics' && (
                      <motion.div 
                        className="overlay-content stats-overlay"
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                      >
                        <div className="overlay-header">
                          <div className="header-content">
                            <BarChart3 size={24} />
                            <h2>Statistics</h2>
                          </div>
                          <motion.button
                            onClick={handleCloseExpanded}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className="close-overlay-btn"
                          >
                            <X size={24} />
                          </motion.button>
                        </div>

                        <div className="overlay-body">
                                                      <motion.div 
                              className="content-section"
                              custom={0}
                              variants={waveRevealVariants}
                              initial="hidden"
                              animate="visible"
                            >
                              <motion.h3 
                                custom={0}
                                variants={contentRevealVariants}
                                initial="hidden"
                                animate="visible"
                              >
                                Your Progress
                              </motion.h3>
                              <motion.div 
                                className="stats-grid"
                                custom={1}
                                variants={contentRevealVariants}
                                initial="hidden"
                                animate="visible"
                              >
                                <motion.div 
                                  className="stat-card-large"
                                  whileHover={{ scale: 1.05, y: -5 }}
                                  transition={{ type: "spring", stiffness: 400 }}
                                >
                                  <div className="stat-value-large">{stats.level}</div>
                                  <div className="stat-label-large">Current Level</div>
                                </motion.div>
                                <motion.div 
                                  className="stat-card-large"
                                  whileHover={{ scale: 1.05, y: -5 }}
                                  transition={{ type: "spring", stiffness: 400 }}
                                >
                                  <div className="stat-value-large">{stats.stars}</div>
                                  <div className="stat-label-large">Stars Earned</div>
                                </motion.div>
                                <motion.div 
                                  className="stat-card-large"
                                  whileHover={{ scale: 1.05, y: -5 }}
                                  transition={{ type: "spring", stiffness: 400 }}
                                >
                                  <div className="stat-value-large">{stats.bestScore}</div>
                                  <div className="stat-label-large">Best Score</div>
                                </motion.div>
                                <motion.div 
                                  className="stat-card-large"
                                  whileHover={{ scale: 1.05, y: -5 }}
                                  transition={{ type: "spring", stiffness: 400 }}
                                >
                                  <div className="stat-value-large">{stats.timesPlayed}</div>
                                  <div className="stat-label-large">Times Played</div>
                                </motion.div>
                                <motion.div 
                                  className="stat-card-large"
                                  whileHover={{ scale: 1.05, y: -5 }}
                                  transition={{ type: "spring", stiffness: 400 }}
                                >
                                  <div className="stat-value-large">{Math.round(stats.playTime / 60)}m</div>
                                  <div className="stat-label-large">Total Play Time</div>
                                </motion.div>
                              </motion.div>
                            </motion.div>

                            <motion.div 
                              className="content-section"
                              custom={1}
                              variants={waveRevealVariants}
                              initial="hidden"
                              animate="visible"
                            >
                              <motion.h3 
                                custom={0}
                                variants={contentRevealVariants}
                                initial="hidden"
                                animate="visible"
                              >
                                Game Information
                              </motion.h3>
                              <motion.div 
                                className="info-grid"
                                custom={1}
                                variants={contentRevealVariants}
                                initial="hidden"
                                animate="visible"
                              >
                                <div className="info-item">
                                  <span className="info-label">Category</span>
                                  <span className="info-value">{game.category}</span>
                                </div>
                                <div className="info-item">
                                  <span className="info-label">Difficulty</span>
                                  <span className="info-value">{game.difficulty}</span>
                                </div>
                                <div className="info-item">
                                  <span className="info-label">Skills</span>
                                  <span className="info-value">{game.skills.join(', ')}</span>
                                </div>
                              </motion.div>
                            </motion.div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 