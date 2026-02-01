import React, { useEffect, useRef, useCallback } from 'react';

// Declare GSAP types
declare const gsap: any;
declare const ScrollTrigger: any;

interface BouncyLettersProps {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  bounceHeight?: number;
  initialScale?: number;
  initialRotation?: number;
  triggerOnScroll?: boolean;
  triggerElement?: string;
}

const BouncyLetters: React.FC<BouncyLettersProps> = ({
  text,
  className = "text-6xl md:text-8xl font-bold text-white",
  delay = 0,
  stagger = 0.15,
  duration = 0.8,
  bounceHeight = -300,
  initialScale = 0.3,
  initialRotation = -25,
  triggerOnScroll = false,
  triggerElement
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lettersRef = useRef<HTMLSpanElement[]>([]);

  // Optimized animation setup
  const setupAnimation = useCallback(() => {
    if (typeof gsap === 'undefined' || !gsap.registerPlugin) return;

    gsap.registerPlugin(ScrollTrigger);

    // Clear previous refs
    lettersRef.current = [];

    // Create animation timeline
    const tl = gsap.timeline({ delay });

    // Check if the text has gradient styling
    const hasGradient = className.includes('gradient-text');

    // Optimized initial state for all letters
    gsap.set(".bounce-letter", {
      y: bounceHeight,
      scale: initialScale,
      rotation: initialRotation,
      opacity: 0
    });

    // For gradient text, we need to handle visibility differently
    if (hasGradient) {
      gsap.set(".bounce-letter", {
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundImage: "linear-gradient(45deg, #8b5cf6, #3b82f6, #06b6d4)",
        backgroundSize: "200% 200%"
      });
    }

    // Optimized bounce animation
    if (hasGradient) {
      // For gradient text, animate the background position to create a reveal effect
      tl.to(".bounce-letter", {
        y: 0,
        opacity: 1,
        scale: 1,
        rotation: 0,
        duration,
        stagger,
        ease: "bounce.out"
      });
    } else {
      // For regular text, animate opacity
      tl.to(".bounce-letter", {
        y: 0,
        opacity: 1,
        scale: 1,
        rotation: 0,
        duration,
        stagger,
        ease: "bounce.out"
      });
    }

    // Add ScrollTrigger if needed
    if (triggerOnScroll) {
      const trigger = ScrollTrigger.create({
        animation: tl,
        trigger: triggerElement || containerRef.current,
        start: "top 90%",
        end: "bottom 10%",
        toggleActions: "play none none none"
      });

      // Cleanup function
      return () => {
        if (trigger) trigger.kill();
      };
    }
  }, [text, className, delay, stagger, duration, bounceHeight, initialScale, initialRotation, triggerOnScroll, triggerElement]);

  useEffect(() => {
    const cleanup = setupAnimation();
    return cleanup;
  }, [setupAnimation]);

  // Optimized letter rendering
  const renderLetters = useCallback((text: string) => {
    return text.split('').map((letter, index) => (
      <span
        key={index}
        ref={(el) => {
          if (el) lettersRef.current[index] = el;
        }}
        className="bounce-letter inline-block"
        style={{ 
          willChange: 'transform, opacity',
          transform: 'translateZ(0)' // Force hardware acceleration
        }}
      >
        {letter === ' ' ? '\u00A0' : letter}
      </span>
    ));
  }, []);

  return (
    <div ref={containerRef} className={className}>
      {renderLetters(text)}
    </div>
  );
};

export default BouncyLetters; 