import React, { useEffect, useRef, useState } from 'react';
import TextReveal from '../components/TextReveal';
import MagicLine from '../components/MagicLine';
import LetterReveal from '../components/LetterReveal';

// Declare GSAP types
declare const gsap: any;
declare const ScrollTrigger: any;

const TestPage: React.FC = () => {
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Initialize GSAP ScrollTrigger animations
    if (typeof gsap !== 'undefined' && gsap.registerPlugin) {
      gsap.registerPlugin(ScrollTrigger);

      // Scene 1: Continuous parallax layers
      const scene1 = gsap.timeline();
      ScrollTrigger.create({
        animation: scene1,
        trigger: scrollElementRef.current,
        start: "top top",
        end: "bottom top",
        scrub: 1
      });

      // Parallax layers moving continuously at different speeds
      scene1.to(".parallax-layer-1", { y: -200, ease: "none" }, 0);
      scene1.to(".parallax-layer-2", { y: -300, rotation: 10, ease: "none" }, 0);
      scene1.to(".parallax-layer-3", { y: -150, ease: "none" }, 0);
      scene1.to(".test-content", { y: -100, opacity: 0.6 }, 0);



      // Scene 2: Cards animation - bidirectional trigger
      const cardsAnimation = gsap.fromTo(".test-card", 
        { y: 100, opacity: 0, scale: 0.8 }, 
        { 
          y: 0, 
          opacity: 1, 
          scale: 1, 
          duration: 1.2, 
          stagger: 0.2,
          ease: "power2.out"
        }
      );
      
      ScrollTrigger.create({
        animation: cardsAnimation,
        trigger: ".cards-section",
        start: "top 85%",
        end: "bottom 15%",
        toggleActions: "play reverse reverse reverse"
      });

      // Ocean section - bidirectional trigger
      const oceanAnimation = gsap.fromTo(".ocean-card", 
        { y: 60, opacity: 0, scale: 0.9 }, 
        { 
          y: 0, 
          opacity: 1, 
          scale: 1,
          duration: 1.0, 
          stagger: 0.15,
          ease: "power2.out"
        }
      );
      
      ScrollTrigger.create({
        animation: oceanAnimation,
        trigger: ".parallax-ocean",
        start: "top 80%",
        end: "bottom 20%",
        toggleActions: "play reverse reverse reverse"
      });

      // Ocean section - continuous parallax background
      ScrollTrigger.create({
        trigger: ".parallax-ocean",
        start: "top bottom",
        end: "bottom top",
        scrub: 1,
        animation: gsap.to(".parallax-ocean", {
          y: -50,
          ease: "none"
        })
      });

      // Forest section - continuous parallax background  
      ScrollTrigger.create({
        trigger: ".parallax-forest",
        start: "top bottom", 
        end: "bottom top",
        scrub: 2,
        animation: gsap.to(".parallax-forest", {
          y: -80,
          ease: "none"
        })
      });

      // Space section - continuous parallax background
      ScrollTrigger.create({
        trigger: ".parallax-space",
        start: "top bottom",
        end: "bottom top", 
        scrub: 1.5,
        animation: gsap.to(".parallax-space", {
          y: -60,
          ease: "none"
        })
      });

      // Space section - card reveal animation (bidirectional trigger)
      const spaceAnimation = gsap.fromTo(".space-card", 
        { y: 80, opacity: 0, scale: 0.8, rotationY: 15 }, 
        { 
          y: 0, 
          opacity: 1, 
          scale: 1, 
          rotationY: 0,
          duration: 1.3, 
          stagger: 0.18,
          ease: "power2.out"
        }
      );
      
      ScrollTrigger.create({
        animation: spaceAnimation,
        trigger: ".parallax-space",
        start: "top 80%",
        end: "bottom 20%",
        toggleActions: "play reverse reverse reverse"
      });

      return () => {
        ScrollTrigger.getAll().forEach((trigger: any) => trigger.kill());
      };
    }
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      
      {/* Parallax Background Layers */}
      <div className="fixed inset-0 overflow-hidden">
        {/* Layer 1 - Floating geometric shapes */}
        <div className="parallax-layer-1 absolute inset-0">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-48 h-48 bg-gradient-to-br from-pink-400/15 to-orange-500/15 rounded-full blur-2xl"></div>
          <div className="absolute bottom-32 left-1/3 w-24 h-24 bg-gradient-to-br from-green-400/25 to-blue-500/25 rounded-full blur-lg"></div>
        </div>
        
        {/* Layer 2 - Geometric patterns */}
        <div className="parallax-layer-2 absolute inset-0">
          <div className="absolute top-1/4 right-10 w-16 h-16 bg-gradient-to-r from-purple-500/30 to-pink-500/30 transform rotate-45"></div>
          <div className="absolute top-1/2 left-20 w-20 h-20 bg-gradient-to-r from-blue-500/20 to-teal-500/20 transform rotate-12 rounded-lg"></div>
          <div className="absolute bottom-1/4 right-1/4 w-12 h-12 bg-gradient-to-r from-yellow-500/25 to-orange-500/25 transform -rotate-45"></div>
        </div>
        
        {/* Layer 3 - Abstract lines */}
        <div className="parallax-layer-3 absolute inset-0">
          <svg className="absolute top-0 left-0 w-full h-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="50%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
            </defs>
            <path d="M0,20 Q25,10 50,25 T100,15" stroke="url(#line-gradient)" strokeWidth="0.5" fill="none" />
            <path d="M0,60 Q30,45 60,65 T100,55" stroke="url(#line-gradient)" strokeWidth="0.3" fill="none" />
            <path d="M0,80 Q40,70 80,85 T100,75" stroke="url(#line-gradient)" strokeWidth="0.4" fill="none" />
          </svg>
        </div>
      </div>

      {/* Scroll content */}
      <div ref={scrollElementRef} className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-screen flex items-center justify-center px-6">
          <div className="test-content text-center max-w-4xl mx-auto">
            <div className="mb-8">
              <TextReveal 
                text="Test Section"
                className="text-6xl md:text-8xl font-bold text-white bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent"
                delay={0.5}
                stagger={0.12}
              />
            </div>
            <p className="text-xl md:text-2xl text-white/80 mb-12 leading-relaxed">
              Welcome to the test section demonstrating parallax scrolling effects and modern web animations.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <div className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white font-semibold hover:bg-white/20 transition-all duration-300 cursor-pointer">
                Parallax Demo
              </div>
              <div className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300 cursor-pointer">
                Interactive Elements
              </div>
            </div>
          </div>
        </section>

        {/* Cards Section */}
        <section className="cards-section min-h-screen py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-bold text-center text-white mb-16">
              Test Features
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  title: "Scroll Animations",
                  description: "GSAP-powered scroll-triggered animations with smooth parallax effects",
                  icon: "🎬"
                },
                {
                  title: "Interactive Design",
                  description: "Modern glassmorphism design with interactive hover states",
                  icon: "✨"
                },
                {
                  title: "Performance Optimized",
                  description: "Hardware-accelerated animations for smooth 60fps performance",
                  icon: "⚡"
                },
                {
                  title: "Responsive Layout",
                  description: "Fully responsive design that works on all device sizes",
                  icon: "📱"
                },
                {
                  title: "Visual Hierarchy",
                  description: "Clear typography and spacing following design principles",
                  icon: "🎨"
                },
                {
                  title: "Modern Stack",
                  description: "Built with React, TypeScript, and Tailwind CSS",
                  icon: "🚀"
                }
              ].map((feature, index) => (
                <div 
                  key={index}
                  className="test-card bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 hover:bg-white/20 hover:border-white/30 transition-all duration-300 transform hover:scale-105"
                >
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-4">{feature.title}</h3>
                  <p className="text-white/70 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
              Parallax Implementation
            </h2>
            <div className="bg-black/30 backdrop-blur-md border border-white/20 rounded-2xl p-8 mb-12">
              <p className="text-white/80 text-lg leading-relaxed mb-6">
                This test section demonstrates advanced web animation techniques using GSAP ScrollTrigger. 
                The parallax effects create depth and visual interest while maintaining smooth performance.
              </p>
              <p className="text-white/60 leading-relaxed">
                Key features include hardware-accelerated transforms, scroll-synced animations, 
                and responsive design patterns that work across all devices.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-md border border-white/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Technical Stack</h3>
                <ul className="text-white/70 space-y-2 text-left">
                  <li>• React 18 with TypeScript</li>
                  <li>• GSAP with ScrollTrigger</li>
                  <li>• Tailwind CSS for styling</li>
                  <li>• Hardware-accelerated animations</li>
                </ul>
              </div>
              
              <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-md border border-white/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Animation Features</h3>
                <ul className="text-white/70 space-y-2 text-left">
                  <li>• Scroll-triggered parallax</li>
                  <li>• Staggered card animations</li>
                  <li>• Depth-based layering</li>
                  <li>• Smooth easing functions</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Ocean Section */}
        <section className="py-20 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/50 to-teal-900/50 parallax-ocean"></div>
          <div className="absolute inset-0">
            {/* Wave-like elements */}
            <div className="absolute bottom-0 left-0 w-full h-32 opacity-30">
              <svg viewBox="0 0 1200 120" className="w-full h-full">
                <path d="M0,60 C300,120 600,0 900,60 C1050,90 1150,30 1200,60 L1200,120 L0,120 Z" fill="url(#wave-gradient)" />
                <defs>
                  <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06B6D4" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-8">Ocean Depths</h2>
            <p className="text-xl text-white/80 mb-12">Dive into the depths of creativity</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {['Deep Learning', 'Flow State', 'Creative Waves'].map((title, i) => (
                <div key={i} className="ocean-card bg-gradient-to-br from-cyan-500/20 to-blue-600/20 backdrop-blur-sm border border-cyan-400/30 rounded-2xl p-6 hover:scale-105 transition-transform duration-300">
                  <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
                  <p className="text-white/70">Explore the endless possibilities of aquatic inspiration</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Forest Section */}
        <section className="py-20 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-green-900/50 to-emerald-900/50 parallax-forest"></div>
          <div className="absolute inset-0">
            {/* Tree-like silhouettes */}
            <div className="absolute bottom-0 left-10 w-4 h-40 bg-gradient-to-t from-green-800/60 to-green-600/40 rounded-t-full"></div>
            <div className="absolute bottom-0 left-32 w-6 h-32 bg-gradient-to-t from-green-800/50 to-green-600/30 rounded-t-full"></div>
            <div className="absolute bottom-0 right-20 w-5 h-36 bg-gradient-to-t from-green-800/40 to-green-600/20 rounded-t-full"></div>
            <div className="absolute bottom-0 right-40 w-3 h-28 bg-gradient-to-t from-green-800/60 to-green-600/40 rounded-t-full"></div>
          </div>
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-8">Forest Wisdom</h2>
            <p className="text-xl text-white/80 mb-12">Growing knowledge like ancient trees</p>
            <div className="bg-black/20 backdrop-blur-md border border-green-400/30 rounded-2xl p-8">
              <p className="text-white/80 text-lg leading-relaxed">
                In the quiet of the digital forest, innovation takes root. Each line of code 
                branches out like leaves reaching for the light of understanding.
              </p>
            </div>
          </div>
        </section>

        {/* Space Section */}
        <section className="py-20 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/50 to-indigo-900/50 parallax-space"></div>
          <div className="absolute inset-0">
            {/* Star field */}
            <div className="absolute top-10 left-10 w-1 h-1 bg-white rounded-full animate-pulse"></div>
            <div className="absolute top-20 right-20 w-1 h-1 bg-blue-300 rounded-full animate-pulse"></div>
            <div className="absolute top-40 left-1/3 w-1 h-1 bg-purple-300 rounded-full animate-pulse"></div>
            <div className="absolute bottom-40 right-1/4 w-1 h-1 bg-pink-300 rounded-full animate-pulse"></div>
            <div className="absolute bottom-60 left-1/4 w-1 h-1 bg-yellow-300 rounded-full animate-pulse"></div>
            {/* Larger glowing orbs */}
            <div className="absolute top-1/4 right-1/3 w-8 h-8 bg-gradient-to-r from-purple-500/40 to-pink-500/40 rounded-full blur-sm animate-pulse"></div>
            <div className="absolute bottom-1/3 left-1/4 w-6 h-6 bg-gradient-to-r from-blue-500/40 to-cyan-500/40 rounded-full blur-sm animate-pulse"></div>
          </div>
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-8">Cosmic Infinity</h2>
            <p className="text-xl text-white/80 mb-12">Reaching for the stars of possibility</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-card bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-sm border border-purple-400/30 rounded-2xl p-8 hover:scale-105 transition-transform duration-300">
                <h3 className="text-2xl font-bold text-white mb-4">🚀 Innovation</h3>
                <p className="text-white/70">Launching ideas into the digital cosmos</p>
              </div>
              <div className="space-card bg-gradient-to-br from-blue-600/20 to-indigo-600/20 backdrop-blur-sm border border-blue-400/30 rounded-2xl p-8 hover:scale-105 transition-transform duration-300">
                <h3 className="text-2xl font-bold text-white mb-4">⭐ Excellence</h3>
                <p className="text-white/70">Stellar performance across all dimensions</p>
              </div>
            </div>
          </div>
        </section>

                                   {/* Letter Reveal Demo Section */}
          <section className="py-20 px-6 text-center relative">
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-6">Letter Reveal</h2>
              <p className="text-white/60 mb-8">
                Experience the sequential left-to-right letter reveal effect
              </p>
                             <div className="space-y-4 mb-8">
                 <LetterReveal 
                   text="Typewriter Letter Animation"
                   className="text-2xl font-bold text-green-400"
                   delay={0.5}
                   stagger={0.08}
                   typewriterEffect={true}
                   cursorBlink={true}
                 />
                 <LetterReveal 
                   text="Non-typewriter Effect"
                   className="text-xl font-bold text-blue-400"
                   delay={1.5}
                   stagger={0.06}
                   typewriterEffect={false}
                   cursorBlink={false}
                 />
               </div>
              <button 
                onClick={() => setShowModal(true)}
                className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300 cursor-pointer"
              >
                Open Magic Modal
              </button>
            </div>
          </section>

         {/* Final Section */}
         <section className="py-20 px-6 text-center relative">
           <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
           <div className="relative z-10 max-w-2xl mx-auto">
             <h2 className="text-3xl font-bold text-white mb-6">Journey Complete</h2>
             <p className="text-white/60 mb-8">
               Experience the beauty of sequential parallax without heavy rendering
             </p>
             <div className="px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl text-white font-semibold inline-block">
               ✅ Optimized & Beautiful
             </div>
           </div>
         </section>
      </div>

             {/* Scroll indicator */}
       <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 text-white/60 animate-bounce pointer-events-none">
         <div className="flex flex-col items-center">
           <span className="text-sm mb-2">Scroll to explore</span>
           <div className="w-6 h-10 border-2 border-white/60 rounded-full flex justify-center">
             <div className="w-1 h-3 bg-white/60 rounded-full mt-2 animate-pulse"></div>
           </div>
         </div>
       </div>

       {/* Magic Modal */}
       {showModal && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
           <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl p-8 max-w-2xl w-full border border-white/20 shadow-2xl">
             <div className="text-center space-y-6">
                               <MagicLine 
                  text="✨ Magic Line ✨"
                  className="text-3xl font-bold text-white mb-4"
                  delay={0.3}
                  duration={1.5}
                  blurAmount={15}
                />
                
                <MagicLine 
                  text="Welcome to the enchanted realm"
                  className="text-xl text-white/80 mb-4"
                  delay={0.8}
                  duration={1.2}
                  blurAmount={12}
                />
                
                <MagicLine 
                  text="Where text appears like magic"
                  className="text-lg text-white/60 mb-6"
                  delay={1.3}
                  duration={1.0}
                  blurAmount={10}
                />
                
                <div className="space-y-4">
                  <MagicLine 
                    text="🌟 Soft blur transitions"
                    className="text-lg text-purple-300"
                    delay={1.8}
                    duration={0.8}
                    blurAmount={8}
                  />
                  
                  <MagicLine 
                    text="🎨 Beautiful animations"
                    className="text-lg text-blue-300"
                    delay={2.1}
                    duration={0.8}
                    blurAmount={8}
                  />
                  
                  <MagicLine 
                    text="✨ Magical effects"
                    className="text-lg text-pink-300"
                    delay={2.4}
                    duration={0.8}
                    blurAmount={8}
                  />
                </div>
               
               <button 
                 onClick={() => setShowModal(false)}
                 className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300"
               >
                 Close Magic
               </button>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 };

export default TestPage;