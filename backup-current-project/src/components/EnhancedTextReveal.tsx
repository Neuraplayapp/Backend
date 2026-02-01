import React, { useEffect, useRef, useState } from 'react';

// Declare GSAP types
declare const gsap: any;
declare const ScrollTrigger: any;

interface EnhancedTextRevealProps {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  blurAmount?: number;
  triggerOnScroll?: boolean;
  triggerElement?: string;
  revealDirection?: 'left' | 'right' | 'center' | 'random';
  autoStart?: boolean;
}

const EnhancedTextReveal: React.FC<EnhancedTextRevealProps> = ({
  text,
  className = "text-4xl font-bold text-white",
  delay = 0,
  stagger = 0.05,
  duration = 1.2,
  blurAmount = 15,
  triggerOnScroll = false,
  triggerElement,
  revealDirection = 'center',
  autoStart = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lettersRef = useRef<HTMLSpanElement[]>([]);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    if (typeof gsap === 'undefined' || !gsap.registerPlugin) return;

    gsap.registerPlugin(ScrollTrigger);

    // Clear previous refs
    lettersRef.current = [];

    // Set initial state for all letters
    gsap.set(".enhanced-reveal-letter", {
      filter: `blur(${blurAmount}px)`,
      opacity: 0,
      scale: 0.8,
      y: 20,
      rotationX: 90,
      transformOrigin: "center center"
    });

    // Create the reveal animation timeline
    const tl = gsap.timeline({ 
      delay,
      onComplete: () => setIsRevealed(true)
    });

    // Phase 1: Unblur and fade in
    tl.to(".enhanced-reveal-letter", {
      filter: 'blur(0px)',
      opacity: 1,
      scale: 1,
      y: 0,
      rotationX: 0,
      duration: duration * 0.6,
      stagger,
      ease: "power2.out"
    });

    // Phase 2: Add subtle glow effect
    tl.to(".enhanced-reveal-letter", {
      textShadow: '0 0 10px rgba(255, 255, 255, 0.4)',
      duration: duration * 0.2,
      stagger: stagger * 0.5,
      ease: "power2.out"
    }, "-=0.4");

    // Phase 3: Fade out glow
    tl.to(".enhanced-reveal-letter", {
      textShadow: '0 0 0px rgba(255, 255, 255, 0)',
      duration: duration * 0.2,
      stagger: stagger * 0.5,
      ease: "power2.out"
    }, "+=0.2");

    // Phase 4: Final emphasis
    tl.to(".enhanced-reveal-letter", {
      scale: 1.05,
      duration: 0.1,
      stagger: stagger * 0.3,
      ease: "power2.out"
    }, "+=0.1");

    tl.to(".enhanced-reveal-letter", {
      scale: 1,
      duration: 0.1,
      stagger: stagger * 0.3,
      ease: "bounce.out"
    }, "-=0.05");

    // If triggerOnScroll is enabled, wrap in ScrollTrigger
    if (triggerOnScroll) {
      ScrollTrigger.create({
        animation: tl,
        trigger: triggerElement || containerRef.current,
        start: "top 80%",
        toggleActions: "play none none reverse"
      });
    }

    // Auto-start if enabled
    if (!autoStart && !triggerOnScroll) {
      tl.pause();
    }

    return () => {
      // Cleanup
      if (triggerOnScroll) {
        ScrollTrigger.getAll().forEach((trigger: any) => {
          if (trigger.animation === tl) trigger.kill();
        });
      }
    };
  }, [text, delay, stagger, duration, blurAmount, triggerOnScroll, triggerElement, revealDirection, autoStart]);

  // Function to restart animation
  const restartAnimation = () => {
    if (typeof gsap === 'undefined') return;
    
    // Reset state
    setIsRevealed(false);
    
    // Reset letters to initial state
    gsap.set(".enhanced-reveal-letter", {
      filter: `blur(${blurAmount}px)`,
      opacity: 0,
      scale: 0.8,
      y: 20,
      rotationX: 90
    });

    // Restart timeline
    const tl = gsap.timeline({ delay: 0.5 });
    
    tl.to(".enhanced-reveal-letter", {
      filter: 'blur(0px)',
      opacity: 1,
      scale: 1,
      y: 0,
      rotationX: 0,
      duration: duration * 0.6,
      stagger,
      ease: "power2.out"
    });

    tl.to(".enhanced-reveal-letter", {
      textShadow: '0 0 10px rgba(255, 255, 255, 0.4)',
      duration: duration * 0.2,
      stagger: stagger * 0.5,
      ease: "power2.out"
    }, "-=0.4");

    tl.to(".enhanced-reveal-letter", {
      textShadow: '0 0 0px rgba(255, 255, 255, 0)',
      duration: duration * 0.2,
      stagger: stagger * 0.5,
      ease: "power2.out"
    }, "+=0.2");

    tl.to(".enhanced-reveal-letter", {
      scale: 1.05,
      duration: 0.1,
      stagger: stagger * 0.3,
      ease: "power2.out"
    }, "+=0.1");

    tl.to(".enhanced-reveal-letter", {
      scale: 1,
      duration: 0.1,
      stagger: stagger * 0.3,
      ease: "bounce.out"
    }, "-=0.05");
  };

  // Split text into individual characters
  const renderLetters = (text: string) => {
    return text.split('').map((char, index) => (
      <span
        key={index}
        className="enhanced-reveal-letter inline-block"
        data-letter={char}
        ref={(el) => {
          if (el) lettersRef.current[index] = el;
        }}
        style={{
          willChange: 'filter, opacity, transform',
          display: char === ' ' ? 'inline' : 'inline-block'
        }}
      >
        {char === ' ' ? '\u00A0' : char}
      </span>
    ));
  };

  return (
    <div ref={containerRef} className={className}>
      <div className="relative">
        {renderLetters(text)}
        {!autoStart && (
          <button
            onClick={restartAnimation}
            className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 
                     bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded
                     text-sm font-medium transition-colors duration-200"
          >
            {isRevealed ? 'Replay' : 'Start'}
          </button>
        )}
      </div>
    </div>
  );
};

export default EnhancedTextReveal; 