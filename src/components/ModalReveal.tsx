import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ModalRevealProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  className?: string;
  backdropClassName?: string;
  modalClassName?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  blurAmount?: number;
  revealType?: 'letter' | 'word' | 'line' | 'fade';
  typewriterEffect?: boolean;
  cursorBlink?: boolean;
  modalScale?: boolean;
  backdropBlur?: boolean;
  contentStagger?: number;
  contentDelay?: number;
  showCloseButton?: boolean;
  closeButtonText?: string;
}

const ModalReveal: React.FC<ModalRevealProps> = ({
  isOpen,
  onClose,
  title = "Modal Reveal",
  children,
  className = "",
  backdropClassName = "",
  modalClassName = "",
  delay = 0.3,
  stagger = 0.08,
  duration = 1.2,
  blurAmount = 15,
  revealType = 'letter',
  typewriterEffect = true,
  cursorBlink = true,
  modalScale = true,
  backdropBlur = true,
  contentStagger = 0.1,
  contentDelay = 0.5,
  showCloseButton = true,
  closeButtonText = "Close"
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const { isDarkMode } = useTheme();

  // Open animation
  useEffect(() => {
    if (!isOpen) return;

    setIsAnimating(true);

    gsap.set(backdropRef.current, {
      opacity: 0,
      backdropFilter: backdropBlur ? 'blur(0px)' : 'none'
    });
    gsap.set(modalRef.current, {
      opacity: 0,
      scale: modalScale ? 0.8 : 1,
      y: 50,
      filter: `blur(${blurAmount}px)`
    });
    gsap.set(titleRef.current, { opacity: 0, y: -30, filter: `blur(${blurAmount}px)` });
    gsap.set(contentRef.current, { opacity: 0, y: 30, filter: `blur(${blurAmount}px)` });
    gsap.set(closeButtonRef.current, { opacity: 0, scale: 0.8 });

    const tl = gsap.timeline({ delay });

    // Backdrop
    tl.to(backdropRef.current, { opacity: 1, backdropFilter: backdropBlur ? 'blur(8px)' : 'none', duration: duration * 0.3 });
    // Modal
    tl.to(modalRef.current, { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', duration: duration * 0.6, ease: "back.out(1.7)" }, duration * 0.1);
    // Title
    tl.to(titleRef.current, { opacity: 1, y: 0, filter: 'blur(0px)', duration: duration * 0.6 }, duration * 0.2);
    // Content
    tl.to(contentRef.current, { opacity: 1, y: 0, filter: 'blur(0px)', duration: duration * 0.6 }, duration * 0.3);
    // Close button
    if (showCloseButton) {
      tl.to(closeButtonRef.current, { opacity: 1, scale: 1, duration: duration * 0.4, ease: "back.out(1.7)" }, duration * 0.5);
    }

    tl.call(() => setIsAnimating(false));
    return () => {
      tl.kill();
    };
  }, [isOpen]);

  // Close animation
  const handleClose = () => {
    if (isAnimating) return;
    setIsAnimating(true);

    const tl = gsap.timeline();
    tl.to(closeButtonRef.current, { opacity: 0, scale: 0.8, duration: duration * 0.3 });
    tl.to([titleRef.current, contentRef.current], { opacity: 0, y: 20, filter: `blur(${blurAmount}px)`, duration: duration * 0.4 }, "-=0.2");
    tl.to(modalRef.current, { opacity: 0, scale: modalScale ? 0.8 : 1, y: 50, filter: `blur(${blurAmount}px)`, duration: duration * 0.5 }, "-=0.3");
    tl.to(backdropRef.current, { opacity: 0, backdropFilter: backdropBlur ? 'blur(0px)' : 'none', duration: duration * 0.3 }, "-=0.2");
    tl.call(() => { onClose(); setIsAnimating(false); });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const renderTitle = () => (
    <div ref={titleRef} className={`text-lg sm:text-xl md:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
      {title}
    </div>
  );

  return (
    <div
      ref={backdropRef}
      className={`fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 sm:p-4 md:p-6 isolate ${backdropClassName}`}
      onClick={handleBackdropClick}
      style={{ 
        backdropFilter: backdropBlur ? 'blur(8px)' : 'none',
        WebkitBackdropFilter: backdropBlur ? 'blur(8px)' : 'none',
        background: isDarkMode 
          ? 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)'
          : 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #f3e8ff 100%)'
      }}
    >
      <div
        ref={modalRef}
        className={`rounded-2xl sm:rounded-3xl shadow-2xl max-w-[95vw] sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden border isolate backdrop-blur-xl ${
          isDarkMode 
            ? 'border-white/20 shadow-[0_8px_16px_-12px_rgba(255,255,255,0.08)]' 
            : 'border-gray-200 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)]'
        } ${modalClassName} ${className}`}
        style={{ transform: 'translateZ(0)', willChange: 'transform, opacity' }}
      >
        {/* Header */}
        <div className={`flex justify-between items-center p-3 sm:p-4 md:p-6 border-b ${isDarkMode ? 'border-white/20' : 'border-gray-200'}`}>
          {renderTitle()}
          {showCloseButton && (
            <button
              ref={closeButtonRef}
              onClick={handleClose}
              className={`${isDarkMode ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'} text-xl sm:text-2xl font-bold transition-colors p-1.5 sm:p-2 rounded-full`}
              disabled={isAnimating}
            >
              ×
            </button>
          )}
        </div>

        {/* Content */}
        <div ref={contentRef} className="p-3 sm:p-4 md:p-6">
          {children}
        </div>

        {/* Footer */}
        {showCloseButton && (
          <div className={`flex justify-end p-3 sm:p-4 md:p-6 border-t ${isDarkMode ? 'border-white/20' : 'border-gray-200'}`}>
            <button
              onClick={handleClose}
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl transition-all duration-300 font-semibold border text-sm sm:text-base ${
                isDarkMode 
                  ? 'bg-white/10 hover:bg-white/20 text-white border-white/20' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
              }`}
              disabled={isAnimating}
            >
              {closeButtonText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalReveal;