import React, { useEffect, useRef } from 'react';

// Declare GSAP types
declare const gsap: any;
declare const ScrollTrigger: any;

interface LetterRevealProps {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  blur?: number;
  triggerOnScroll?: boolean;
  triggerElement?: string;
  typewriterEffect?: boolean;
  cursorBlink?: boolean;
}

const LetterReveal: React.FC<LetterRevealProps> = ({
  text,
  className = "text-4xl font-bold text-white",
  delay = 0,
  stagger = 0.05,
  duration = 1.2,
  blur = 15,
  triggerOnScroll = false,
  triggerElement,
  typewriterEffect = true,
  cursorBlink = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lettersRef = useRef<HTMLSpanElement[]>([]);

  useEffect(() => {
    if (typeof gsap === 'undefined' || !gsap.registerPlugin) return;

    gsap.registerPlugin(ScrollTrigger);

    // Clear previous refs
    lettersRef.current = [];

    // Set initial state for all letters with blur effect
    gsap.set(".letter-reveal", {
      opacity: 0,
      scale: 0.3,
      y: -20,
      rotationX: 90,
      blur: blur,
      filter: `blur(${blur}px)`,
      transformOrigin: "center center"
    });

    // Create the reveal animation
    const tl = gsap.timeline({ delay });

    // Typewriter effect: letters appear one by one from left to right
    if (typewriterEffect) {
      tl.to(".letter-reveal", {
        opacity: 1,
        scale: 1,
        y: 0,
        rotationX: 0,
        blur: 0,
        filter: "blur(0px)",
        duration,
        stagger,
        ease: "back.out(1.7)"
      });

      // Add a subtle bounce effect for each letter
      tl.to(".letter-reveal", {
        scale: 1.1,
        duration: 0.1,
        stagger: stagger * 0.5,
        ease: "power2.out"
      }, "-=0.1");

      tl.to(".letter-reveal", {
        scale: 1,
        duration: 0.1,
        stagger: stagger * 0.5,
        ease: "bounce.out"
      }, "-=0.05");
    } else {
      // Alternative: all letters appear simultaneously but with staggered bounce
      tl.to(".letter-reveal", {
        opacity: 1,
        scale: 1,
        y: 0,
        rotationX: 0,
        blur: 0,
        filter: "blur(0px)",
        duration: duration * 0.8,
        ease: "power2.out"
      });

      tl.to(".letter-reveal", {
        scale: 1.05,
        duration: 0.1,
        stagger: stagger * 0.3,
        ease: "power2.out"
      }, "-=0.2");

      tl.to(".letter-reveal", {
        scale: 1,
        duration: 0.1,
        stagger: stagger * 0.3,
        ease: "bounce.out"
      }, "-=0.05");
    }

    // If triggerOnScroll is enabled, wrap in ScrollTrigger
    if (triggerOnScroll) {
      const trigger = ScrollTrigger.create({
        animation: tl,
        trigger: triggerElement || containerRef.current,
        start: "top 80%",
        end: "bottom 20%",
        toggleActions: "play none none reverse"
      });

      return () => {
        if (trigger) trigger.kill();
      };
    }
  }, [text, delay, stagger, duration, blur, triggerOnScroll, triggerElement, typewriterEffect]);

  // Split text into individual characters
  const renderLetters = (text: string) => {
    return text.split('').map((char, index) => (
      <span
        key={index}
        className="letter-reveal inline-block"
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
    <div ref={containerRef} className={`${className} letter-reveal-container`}>
      {renderLetters(text)}
      {cursorBlink && typewriterEffect && (
        <span className="inline-block w-0.5 h-6 bg-current ml-1 animate-pulse"></span>
      )}
    </div>
  );
};

export default LetterReveal; 