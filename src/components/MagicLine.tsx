import React, { useEffect, useRef } from 'react';

// Declare GSAP types
declare const gsap: any;
declare const ScrollTrigger: any;

interface MagicLineProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  blurAmount?: number;
  triggerOnScroll?: boolean;
  triggerElement?: string;
  revealDirection?: 'left' | 'right' | 'center' | 'random';
}

const MagicLine: React.FC<MagicLineProps> = ({
  text,
  className = "text-4xl font-bold text-white",
  delay = 0,
  duration = 1.2,
  blurAmount = 20,
  triggerOnScroll = false,
  triggerElement,
  revealDirection = 'center'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof gsap === 'undefined' || !gsap.registerPlugin) return;

    gsap.registerPlugin(ScrollTrigger);

    // Set initial state
    gsap.set(textRef.current, {
      filter: `blur(${blurAmount}px)`,
      opacity: 0.3,
      scale: 0.95
    });

    // Create the reveal animation
    const tl = gsap.timeline({ delay });

    // Soft unblur reveal
    tl.to(textRef.current, {
      filter: 'blur(0px)',
      opacity: 1,
      scale: 1,
      duration: duration * 0.6,
      ease: "power2.out"
    });

    // Add a subtle glow effect
    tl.to(textRef.current, {
      textShadow: '0 0 20px rgba(255, 255, 255, 0.3)',
      duration: duration * 0.2,
      ease: "power2.out"
    }, "-=0.3");

    // Fade out the glow
    tl.to(textRef.current, {
      textShadow: '0 0 0px rgba(255, 255, 255, 0)',
      duration: duration * 0.2,
      ease: "power2.out"
    }, "+=0.1");

    // If triggerOnScroll is enabled, wrap in ScrollTrigger
    if (triggerOnScroll) {
      ScrollTrigger.create({
        animation: tl,
        trigger: triggerElement || containerRef.current,
        start: "top 80%",
        toggleActions: "play none none none"
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
  }, [text, delay, duration, blurAmount, triggerOnScroll, triggerElement, revealDirection]);

  return (
    <div ref={containerRef} className={className}>
      <div 
        ref={textRef}
        className="inline-block"
        style={{
          willChange: 'filter, opacity, transform'
        }}
      >
        {text}
      </div>
    </div>
  );
};

export default MagicLine; 