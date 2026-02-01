import React, { useEffect, useRef } from 'react';

// Declare GSAP types
declare const gsap: any;
declare const ScrollTrigger: any;

interface TextRevealProps {
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

const TextReveal: React.FC<TextRevealProps> = ({
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

  useEffect(() => {
    if (typeof gsap === 'undefined' || !gsap.registerPlugin) return;

    gsap.registerPlugin(ScrollTrigger);

    // Clear previous refs
    lettersRef.current = [];

    // Create animation timeline
    const tl = gsap.timeline({ delay });

    // Set initial state for all letters
    gsap.set(".bounce-letter", {
      y: bounceHeight,
      opacity: 0,
      scale: initialScale,
      rotation: initialRotation,
      zIndex: 0
    });

    // Create the bounce animation
    tl.to(".bounce-letter", {
      y: 0,
      opacity: 1,
      scale: 1,
      rotation: 0,
      duration,
      stagger,
      ease: "bounce.out"
    });

    // Add jiggle effect after all letters are in place
    tl.to(".bounce-letter", {
      y: -8,
      duration: 0.1,
      stagger: 0.05,
      ease: "power2.out"
    }, "+=0.2");

    tl.to(".bounce-letter", {
      y: 0,
      duration: 0.15,
      stagger: 0.05,
      ease: "bounce.out"
    }, "-=0.05");

    // Add final bounce for emphasis
    tl.to(".bounce-letter", {
      scale: 1.1,
      duration: 0.1,
      stagger: 0.02,
      ease: "power2.out"
    }, "+=0.1");

    tl.to(".bounce-letter", {
      scale: 1,
      duration: 0.1,
      stagger: 0.02,
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

    return () => {
      // Cleanup
      if (triggerOnScroll) {
        ScrollTrigger.getAll().forEach((trigger: any) => {
          if (trigger.animation === tl) trigger.kill();
        });
      }
    };
  }, [text, delay, stagger, duration, bounceHeight, initialScale, initialRotation, triggerOnScroll, triggerElement]);

  // Split text into individual characters
  const renderLetters = (text: string) => {
    return text.split('').map((char, index) => (
      <span
        key={index}
        className="bounce-letter inline-block"
        data-letter={char}
        ref={(el) => {
          if (el) lettersRef.current[index] = el;
        }}
      >
        {char === ' ' ? '\u00A0' : char}
      </span>
    ));
  };

  return (
    <div ref={containerRef} className={className}>
      {renderLetters(text)}
    </div>
  );
};

export default TextReveal; 