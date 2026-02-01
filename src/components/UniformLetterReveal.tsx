import React, { useRef, useEffect, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

interface UniformLetterRevealProps {
  text: string;
  className?: string;
  stagger?: number;
  duration?: number;
  blur?: number;
  triggerOffset?: number; // How much to scroll before triggering (in pixels)
  typewriterEffect?: boolean;
  cursorBlink?: boolean;
  priority?: number; // Higher priority = reveals first
}

const UniformLetterReveal: React.FC<UniformLetterRevealProps> = ({
  text,
  className = "text-4xl font-bold text-white",
  stagger = 0.05,
  duration = 1.2,
  blur = 15,
  triggerOffset = 100,
  typewriterEffect = true,
  cursorBlink = true,
  priority = 0
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const triggerRef = useRef<any>(null);
  const timelineRef = useRef<any>(null);
  const uniqueId = useRef(`letter-reveal-${Math.random().toString(36).substr(2, 9)}`);
  const hasInitialized = useRef(false);

  const setupAnimation = useCallback(() => {
    if (typeof gsap === 'undefined' || !gsap.registerPlugin || hasInitialized.current) {
      return;
    }

    try {
      gsap.registerPlugin(ScrollTrigger);

      // Kill any existing trigger for this element
      if (triggerRef.current) {
        triggerRef.current.kill();
        triggerRef.current = null;
      }

      if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }

      // Set initial state
      gsap.set(containerRef.current, {
        opacity: 0,
        y: 20
      });

      // Use unique selector for this component instance
      const letterSelector = `.${uniqueId.current} .uniform-letter-reveal`;
      
      gsap.set(letterSelector, {
        opacity: 0,
        scale: 0.3,
        y: -20,
        rotationX: 90,
        blur: blur,
        filter: `blur(${blur}px)`,
        transformOrigin: "center center"
      });

      // Create the reveal animation
      timelineRef.current = gsap.timeline({
        paused: true, // Start paused
        onStart: () => {
          setIsAnimating(true);
        },
        onComplete: () => {
          setIsRevealed(true);
          setIsAnimating(false);
        }
      });

      // First, fade in the container
      timelineRef.current.to(containerRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.3,
        ease: "power2.out"
      });

      // Then reveal the letters sequentially
      if (typewriterEffect) {
        timelineRef.current.to(letterSelector, {
          opacity: 1,
          scale: 1,
          y: 0,
          rotationX: 0,
          blur: 0,
          filter: "blur(0px)",
          duration,
          stagger,
          ease: "back.out(1.7)"
        }, "-=0.1");

        // Add subtle bounce effect
        timelineRef.current.to(letterSelector, {
          scale: 1.05,
          duration: 0.1,
          stagger: stagger * 0.5,
          ease: "power2.out"
        }, "-=0.2");

        timelineRef.current.to(letterSelector, {
          scale: 1,
          duration: 0.1,
          stagger: stagger * 0.5,
          ease: "bounce.out"
        }, "-=0.05");
      } else {
        // All letters appear simultaneously
        timelineRef.current.to(letterSelector, {
          opacity: 1,
          scale: 1,
          y: 0,
          rotationX: 0,
          blur: 0,
          filter: "blur(0px)",
          duration: duration * 0.8,
          ease: "power2.out"
        }, "-=0.1");

        timelineRef.current.to(letterSelector, {
          scale: 1.05,
          duration: 0.1,
          stagger: stagger * 0.3,
          ease: "power2.out"
        }, "-=0.2");

        timelineRef.current.to(letterSelector, {
          scale: 1,
          duration: 0.1,
          stagger: stagger * 0.3,
          ease: "bounce.out"
        }, "-=0.05");
      }

      // Create ScrollTrigger with proper configuration
      triggerRef.current = ScrollTrigger.create({
        animation: timelineRef.current,
        trigger: containerRef.current,
        start: `top ${window.innerHeight - triggerOffset}px`,
        end: "bottom 20%",
        toggleActions: "play none none none", // Only play once, don't reverse
        onEnter: () => {
          if (!isRevealed && !isAnimating && timelineRef.current) {
            timelineRef.current.restart();
          }
        },
        onEnterBack: () => {
          // Don't reverse on scroll back up
        },
        onLeave: () => {
          // Don't do anything when leaving
        },
        onLeaveBack: () => {
          // Don't reverse when scrolling back up
        }
      });

      hasInitialized.current = true;
    } catch (error) {
      console.error('Error setting up UniformLetterReveal animation:', error);
      // Fallback: just show the text
      if (containerRef.current) {
        containerRef.current.style.opacity = '1';
        containerRef.current.style.transform = 'translateY(0)';
      }
    }
  }, [text, stagger, duration, blur, triggerOffset, typewriterEffect]);

  useEffect(() => {
    setupAnimation();

    return () => {
      if (triggerRef.current) {
        triggerRef.current.kill();
        triggerRef.current = null;
      }
      if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }
      hasInitialized.current = false;
    };
  }, [setupAnimation]);

  // Split text into individual characters
  const renderLetters = (text: string) => {
    return text.split('').map((char, index) => (
      <span
        key={index}
        className="uniform-letter-reveal inline-block"
        style={{ 
          whiteSpace: char === ' ' ? 'pre' : 'normal',
          opacity: 0,
          transform: 'scale(0.3) translateY(-20px) rotateX(90deg)',
          filter: `blur(${blur}px)`
        }}
      >
        {char}
      </span>
    ));
  };

  return (
    <div ref={containerRef} className={`${uniqueId.current} ${className}`} style={{ opacity: 0, transform: 'translateY(20px)' }}>
      {renderLetters(text)}
      {typewriterEffect && cursorBlink && (
        <span className="uniform-letter-reveal inline-block ml-1 w-0.5 h-6 bg-current animate-pulse" />
      )}
    </div>
  );
};

export default UniformLetterReveal; 