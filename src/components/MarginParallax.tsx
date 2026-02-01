import React, { useEffect } from 'react';
import './MarginParallax.css';

// Use the globally loaded GSAP from CDN
declare const gsap: any;
declare const ScrollTrigger: any;

const MarginParallax = () => {
  useEffect(() => {
    // Set initial states for ALL SVG elements - DIVIDED INTO SEPARATE PIECES
    gsap.set(".svg-element", { 
      opacity: 0, 
      y: "0vh",
      scale: 0.8 
    });
    
    // DAWN MOUNTAIN - DIVIDED INTO 6 PIECES
    gsap.set("#dawn-bg, #dawn-bg-right", { 
      opacity: 1, 
      y: "0vh", // Background starts directly under hero
      scale: 1 
    });
    
    gsap.set("#dawn-hill-1, #dawn-hill-1-right", { 
      opacity: 1, // MAKE VISIBLE
      y: "300vh", // MUCH MORE SPREAD - covers whole page
      scale: 0.6 
    });
    
    gsap.set("#dawn-hill-2, #dawn-hill-2-right", { 
      opacity: 1, // MAKE VISIBLE
      y: "-250vh", // MUCH MORE SPREAD - covers whole page
      scale: 0.7 
    });
    
    gsap.set("#dawn-hill-3, #dawn-hill-3-right", { 
      opacity: 1, // MAKE VISIBLE
      y: "400vh", // MUCH MORE SPREAD - covers whole page
      scale: 0.6 
    });
    
    gsap.set("#dawn-cloud-1, #dawn-cloud-1-right", { 
      opacity: 1, // MAKE VISIBLE
      y: "-200vh", // MUCH MORE SPREAD - covers whole page
      scale: 0.8 
    });
    
    gsap.set("#dawn-cloud-2, #dawn-cloud-2-right", { 
      opacity: 1, // MAKE VISIBLE
      y: "350vh", // MUCH MORE SPREAD - covers whole page
      scale: 0.8 
    });

    // STUDY/HOUSE - DIVIDED INTO 6 PIECES (like mountain)
    gsap.set("#study-bg, #house-bg", { 
      opacity: 1, // MAKE VISIBLE
      y: "0vh",
      scale: 1 
    });
    
    gsap.set("#boy-studying-1, #house-1", { 
      opacity: 1, // MAKE VISIBLE
      y: "300vh", // SPREAD ACROSS PAGE
      scale: 0.6 
    });
    
    gsap.set("#boy-studying-2, #house-2", { 
      opacity: 1, // MAKE VISIBLE
      y: "-250vh", // SPREAD ACROSS PAGE
      scale: 0.7 
    });
    
    gsap.set("#boy-studying-3, #house-3", { 
      opacity: 1, // MAKE VISIBLE
      y: "400vh", // SPREAD ACROSS PAGE
      scale: 0.6 
    });
    
    gsap.set("#boy-studying-4, #house-4", { 
      opacity: 1, // MAKE VISIBLE
      y: "-200vh", // SPREAD ACROSS PAGE
      scale: 0.8 
    });
    
    gsap.set("#boy-studying-5, #house-5", { 
      opacity: 1, // MAKE VISIBLE
      y: "350vh", // SPREAD ACROSS PAGE
      scale: 0.8 
    });

    // HILL/CHALKBOARD - DIVIDED INTO 6 PIECES
    gsap.set("#classroom-bg, #chalkboard-bg", { 
      opacity: 1, // MAKE VISIBLE
      y: "0vh",
      scale: 1 
    });
    
    gsap.set("#hill-1, #chalkboard-1", { 
      opacity: 1, // MAKE VISIBLE
      y: "300vh", // SPREAD ACROSS PAGE
      scale: 0.6 
    });
    
    gsap.set("#hill-2, #chalkboard-2", { 
      opacity: 1, // MAKE VISIBLE
      y: "-250vh", // SPREAD ACROSS PAGE
      scale: 0.7 
    });
    
    gsap.set("#hill-3, #chalkboard-3", { 
      opacity: 1, // MAKE VISIBLE
      y: "400vh", // SPREAD ACROSS PAGE
      scale: 0.6 
    });
    
    gsap.set("#hill-4, #chalkboard-4", { 
      opacity: 1, // MAKE VISIBLE
      y: "-200vh", // SPREAD ACROSS PAGE
      scale: 0.8 
    });
    
    gsap.set("#hill-5, #chalkboard-5", { 
      opacity: 1, // MAKE VISIBLE
      y: "350vh", // SPREAD ACROSS PAGE
      scale: 0.8 
    });

    // GARDEN/SPARROW - DIVIDED INTO 6 PIECES
    gsap.set("#garden-bg, #sparrow-bg", { 
      opacity: 1, // MAKE VISIBLE
      y: "0vh",
      scale: 1 
    });
    
    gsap.set("#garden-1, #sparrow-1", { 
      opacity: 1, // MAKE VISIBLE
      y: "300vh", // SPREAD ACROSS PAGE
      scale: 0.6 
    });
    
    gsap.set("#garden-2, #sparrow-2", { 
      opacity: 1, // MAKE VISIBLE
      y: "-250vh", // SPREAD ACROSS PAGE
      scale: 0.7 
    });
    
    gsap.set("#garden-3, #sparrow-3", { 
      opacity: 1, // MAKE VISIBLE
      y: "400vh", // SPREAD ACROSS PAGE
      scale: 0.6 
    });
    
    gsap.set("#garden-4, #sparrow-4", { 
      opacity: 1, // MAKE VISIBLE
      y: "-200vh", // SPREAD ACROSS PAGE
      scale: 0.8 
    });
    
    gsap.set("#garden-5, #sparrow-5", { 
      opacity: 1, // MAKE VISIBLE
      y: "350vh", // SPREAD ACROSS PAGE
      scale: 0.8 
    });

    // PARK - DIVIDED INTO 6 PIECES
    gsap.set("#park-bg, #park-bg-right", { 
      opacity: 1, // MAKE VISIBLE
      y: "0vh",
      scale: 1 
    });
    
    gsap.set("#park-tree-1, #park-tree-1-right", { 
      opacity: 1, // MAKE VISIBLE
      y: "300vh", // SPREAD ACROSS PAGE
      scale: 0.6 
    });
    
    gsap.set("#park-tree-2, #park-tree-2-right", { 
      opacity: 1, // MAKE VISIBLE
      y: "-250vh", // SPREAD ACROSS PAGE
      scale: 0.7 
    });
    
    gsap.set("#park-bench, #park-bench-right", { 
      opacity: 1, // MAKE VISIBLE
      y: "400vh", // SPREAD ACROSS PAGE
      scale: 0.6 
    });
    
    gsap.set("#park-people, #park-people-right", { 
      opacity: 1, // MAKE VISIBLE
      y: "-200vh", // SPREAD ACROSS PAGE
      scale: 0.8 
    });
    
    gsap.set("#park-extra-1, #park-extra-1-right", { 
      opacity: 1, // MAKE VISIBLE
      y: "350vh", // SPREAD ACROSS PAGE
      scale: 0.8 
    });
    
    gsap.set("#park-extra-2, #park-extra-2-right", { 
      opacity: 1, // MAKE VISIBLE
      y: "-180vh", // SPREAD ACROSS PAGE
      scale: 0.7 
    });

    // Create the main timeline with continuous scroll trigger
    const mainTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
        pin: false,
        markers: false
      }
    });

    // SECTION 1: DAWN MOUNTAIN - GATHERING EFFECT ONLY
    // All pieces gather to final positions
    mainTimeline.to(["#dawn-hill-1", "#dawn-hill-1-right"], { 
      y: "-15vh", 
      duration: 2.0,
      ease: "power2.inOut"
    }, 2.0);
    
    mainTimeline.to(["#dawn-hill-2", "#dawn-hill-2-right"], { 
      y: "-15vh", 
      duration: 2.0,
      ease: "power2.inOut"
    }, 2.0);
    
    mainTimeline.to(["#dawn-hill-3", "#dawn-hill-3-right"], { 
      y: "-10vh", 
      duration: 2.0,
      ease: "power2.inOut"
    }, 2.0);
    
    mainTimeline.to(["#dawn-cloud-1", "#dawn-cloud-1-right"], { 
      y: "-5vh", 
      duration: 2.0,
      ease: "power2.inOut"
    }, 2.0);
    
    mainTimeline.to(["#dawn-cloud-2", "#dawn-cloud-2-right"], { 
      y: "-5vh", 
      duration: 2.0,
      ease: "power2.inOut"
    }, 2.0);
    
    // Keep dawn scene visible longer
    mainTimeline.to(["#dawn-scene", "#dawn-scene-right"], { 
      opacity: 1, 
      duration: 0.1 
    }, 2.7);

    // SECTION 2: STUDY/HOUSE - GATHERING EFFECT ONLY (6 pieces like mountain)
    mainTimeline.to(["#boy-studying-1", "#house-1"], { 
      y: "-15vh", 
      duration: 2.0,
      ease: "power2.inOut"
    }, 2.7);
    
    mainTimeline.to(["#boy-studying-2", "#house-2"], { 
      y: "-15vh", 
      duration: 2.0,
      ease: "power2.inOut"
    }, 2.7);
    
    mainTimeline.to(["#boy-studying-3", "#house-3"], { 
      y: "-10vh", 
      duration: 2.0,
      ease: "power2.inOut"
    }, 2.7);
    
    mainTimeline.to(["#boy-studying-4", "#house-4"], { 
      y: "-5vh", 
      duration: 2.0,
      ease: "power2.inOut"
    }, 2.7);
    
    mainTimeline.to(["#boy-studying-5", "#house-5"], { 
      y: "-5vh", 
      duration: 2.0,
      ease: "power2.inOut"
    }, 2.7);
    
    // Keep study/house scene visible longer
    mainTimeline.to(["#study-scene", "#house-scene"], { 
      opacity: 1, 
      duration: 0.1 
    }, 3.9);

    // SECTION 3: HILL/CHALKBOARD - GATHERING EFFECT ONLY (6 pieces)
    mainTimeline.to(["#hill-1", "#chalkboard-1"], { 
      y: "-15vh", 
      duration: 2.0,
      ease: "power2.inOut"
    }, 3.9);
    
    mainTimeline.to(["#hill-2", "#chalkboard-2"], { 
      y: "-15vh", 
      duration: 2.0,
      ease: "power2.inOut"
    }, 3.9);
    
    mainTimeline.to(["#hill-3", "#chalkboard-3"], { 
      y: "-10vh", 
      duration: 2.0,
      ease: "power2.inOut"
    }, 3.9);
    
    mainTimeline.to(["#hill-4", "#chalkboard-4"], { 
      y: "-5vh", 
      duration: 2.0,
      ease: "power2.inOut"
    }, 3.9);
    
    mainTimeline.to(["#hill-5", "#chalkboard-5"], { 
      y: "-5vh", 
      duration: 2.0,
      ease: "power2.inOut"
    }, 3.9);
    
    // Fade out classroom/chalkboard scene
    mainTimeline.to(["#classroom-scene", "#chalkboard-scene"], { 
      opacity: 0, 
      duration: 0.3 
    }, 4.6);

    // SECTION 4: GARDEN/SPARROW - GATHERING EFFECT ONLY (6 pieces)
    mainTimeline.to(["#garden-1", "#sparrow-1"], { 
      y: "-15vh", 
      duration: 2.0,
      ease: "power2.inOut"
    }, 4.6);
    
    mainTimeline.to(["#garden-2", "#sparrow-2"], { 
      y: "-15vh", 
      duration: 2.0,
      ease: "power2.inOut"
    }, 4.6);
    
    mainTimeline.to(["#garden-3", "#sparrow-3"], { 
      y: "-10vh", 
      duration: 2.0,
      ease: "power2.inOut"
    }, 4.6);
    
    mainTimeline.to(["#garden-4", "#sparrow-4"], { 
      y: "-5vh", 
      duration: 2.0,
      ease: "power2.inOut"
    }, 4.6);
    
    mainTimeline.to(["#garden-5", "#sparrow-5"], { 
      y: "-5vh", 
      duration: 2.0,
      ease: "power2.inOut"
    }, 4.6);
    
    // Fade out garden/sparrow scene
    mainTimeline.to(["#garden-scene", "#sparrow-scene"], { 
      opacity: 0, 
      duration: 0.3 
    }, 5.3);

    // SECTION 5: PARK - GATHERING EFFECT ONLY (6 pieces)
    mainTimeline.to(["#park-tree-1", "#park-tree-1-right"], { 
      y: "-15vh", 
      duration: 2.0,
      ease: "power2.inOut"
    }, 5.3);
    
    mainTimeline.to(["#park-tree-2", "#park-tree-2-right"], { 
      y: "-15vh", 
      duration: 2.0,
      ease: "power2.inOut"
    }, 5.3);
    
    mainTimeline.to(["#park-bench", "#park-bench-right"], { 
      y: "-10vh", 
      duration: 2.0,
      ease: "power2.inOut"
    }, 5.3);
    
    mainTimeline.to(["#park-people", "#park-people-right"], { 
      y: "-5vh", 
      duration: 2.0,
      ease: "power2.inOut"
    }, 5.3);
    
    mainTimeline.to(["#park-extra-1", "#park-extra-1-right"], { 
      y: "-5vh", 
      duration: 2.0,
      ease: "power2.inOut"
    }, 5.3);
    
    mainTimeline.to(["#park-extra-2", "#park-extra-2-right"], { 
      y: "-5vh", 
      duration: 2.0,
      ease: "power2.inOut"
    }, 5.3);
    
    // Keep park scene visible longer
    mainTimeline.to(["#park-scene", "#park-scene-right"], { 
      opacity: 1, 
      duration: 0.1 
    }, 6.0);

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <>
      <div className="left-margin-container">
        
        {/* Dawn Mountain Scene */}
        <div id="dawn-scene" className="svg-scene">
          <div id="dawn-bg" className="svg-element dawn-bg"></div>
          <div id="dawn-hill-1" className="svg-element dawn-hill">
            <svg viewBox="0 0 1604.1533 1109.8041" className="svg-content">
              <defs>
                <linearGradient id="dawn-gradient-1">
                  <stop stopColor="#618ce6" offset="0"/>
                  <stop stopColor="#4270cc" offset=".12308"/>
                  <stop stopColor="#335eb5" offset=".23778"/>
                  <stop stopColor="#153b88" offset=".58813"/>
                  <stop stopColor="#04215c" offset="1"/>
                </linearGradient>
              </defs>
              <g transform="translate(-3.8859 -244.09)" clipPath="url(#y)">
                <path d="m3.1778 242h1603.4a1.2778 1.278 0 0 1 1.2778 1.278v1095.4a1.2778 1.278 0 0 1 -1.2778 1.278h-1603.4a1.2778 1.278 0 0 1 -1.2778 -1.3v-1095.4a1.2778 1.278 0 0 1 1.2778 -1.278" fill="url(#dawn-gradient-1)"/>
              </g>
            </svg>
          </div>
          <div id="dawn-hill-2" className="svg-element dawn-hill">
            <svg viewBox="0 0 1604.1533 1109.8041" className="svg-content">
              <g transform="translate(-3.8859 -244.09)">
                <path d="m-2.1 859.25c16.75-9.75 56 38 67 40s52 7 58 9 34-13 40-13 18-4 22-6 7-10.5 17-11 12 8 23 9 27.09 2.45 40 7c8.15 2.88 6.96 5.78 11 8.41 6.43 4.18 4-11.41 13-7.41s2.75 8 16 3 28-22 37-23 30 11 38 12 40-14 49-14 25.75 4.75 46 4 25-10 35-7 15.25 6.5 25 9 18.5-2 19.5 4 14.25 8.75 26.5 10 10-10 17-8 37 20 46 19 5-9 14-7 11 9 20 10 24-5 35-5 27-8 32-12 46-15 54-16 45-5 60-10 74.79-18.24 87.52-15.41c12.41 2.76 38.48 40.41 58.48 41.41s69 4 77-2 69-21 77-14 52-8 57-9c1.89-0.37 37.34 1.93 42.16 14.05 6.28 15.81 46.73 28.81 78.22 31.45 25.44 2.13 57.9 19.39 117.6 1.36 8.87-2.67 51.7-17.7 80-12.6 17.15 3.09 65.29-1.51 78.02 5.02v301.72h-1614v-347z" fill="#335eb5"/>
              </g>
            </svg>
          </div>
          <div id="dawn-hill-3" className="svg-element dawn-hill">
            <svg viewBox="0 0 1604.1533 1109.8041" className="svg-content">
              <g transform="translate(-3.8859 -244.09)">
                <path d="m1611.9 934.72c-16.75-7.46-56 29.08-67 30.61s-52 5.35-58 6.88c-6 1.54-34-9.94-40-9.94s-18-3.06-22-4.59c-4-1.54-7-8.04-17-8.42-10-0.39-12 6.12-23 6.88-11 0.77-27.09 1.87-40 5.36-8.15 2.2-6.95 4.42-11 6.43-6.43 3.2-4-8.72-13-5.66s-2.75 6.12-16 2.29c-13.25-3.82-28-16.83-37-17.6-9-0.76-30 8.42-38 9.18-8 0.77-40-10.71-49-10.71s-25.75 3.64-46 3.06c-20.25-0.57-25-7.65-35-5.35-10 2.29-15.25 4.97-25 6.88-9.75 1.92-18.5-1.53-19.5 3.06-1 4.6-14.25 6.7-26.5 7.66-12.25 0.95-10-7.66-17-6.13s-37 15.31-46 14.54c-9-0.76-5-6.88-14-5.35s-11 6.88-20 7.65c-9 0.76-24-3.83-35-3.83s-27-6.12-32-9.18-46-11.48-54-12.24c-8-0.77-45-3.83-60-7.66-15-3.82-74.79-13.95-87.51-11.79-12.42 2.11-38.49 30.93-58.49 31.69-20 0.77-69 3.06-77-1.53s-69-16.07-77-10.71c-8 5.35-52-6.13-57-6.89-1.89-0.29-37.34 1.47-42.16 10.75-6.28 12.1-46.73 22.04-78.22 24.06-25.44 1.63-57.9 14.84-117.6 1.05-8.87-2.05-51.7-13.55-80-9.65-17.15 2.37-65.29-1.15-78.02 3.85v387.49h1614v-422.18z" fill="#153b88"/>
              </g>
            </svg>
          </div>
          <div id="dawn-cloud-1" className="svg-element dawn-cloud">
            <svg viewBox="0 0 1604.1533 1109.8041" className="svg-content">
              <g transform="translate(-3.8859 -244.09)">
                <path d="m2706 842c4-14 21.51-17.27 27.51-35.27 16.54-35.34 58.06-28.44 86.73-20.63 14 4 39.76 7.9 51.76-2.1s62 8 64-26 4-68 26-68 38-16 46-38 26-30 44-16 38 44 44 60-6 170-6 170l-436-2s32-18 52-22z" fill="#ffffff" opacity="0.6"/>
              </g>
            </svg>
          </div>
          <div id="dawn-cloud-2" className="svg-element dawn-cloud">
            <svg viewBox="0 0 1604.1533 1109.8041" className="svg-content">
              <g transform="translate(-3.8859 -244.09)">
                <path d="m60.63 938c0-114.68 124.2-14.83 151.06 55.99 28.61-57.33 98.96-69.76 126.51-19.19 42.25-0.56 52.78 86.04 82.38 18.47 45.46-63.91 89.69 33.18 99.58 70.09 29.36 2.66 53.09-30.69 72.38 7.74 32.67-32.78 57.78 20.24 94.8 0.97 29.64 37.88 89.69 14.58 92.45 63.58 44.83 8.11 95.25 1.03 95.25 47.72h-818.41c-138.46-43.5-139.89-152.6 4-245.4z" fill="#ffffff" opacity="0.5"/>
              </g>
            </svg>
          </div>
        </div>
        
        {/* Study Scene */}
        <div id="study-scene" className="svg-scene">
          <div id="study-bg" className="svg-element study-bg"></div>
          <div id="boy-studying-1" className="svg-element boy-studying">
            <img src="/assets/SVG/undraw_professor_xcrw.svg" alt="Boy studying piece 1" className="svg-content" />
          </div>
          <div id="boy-studying-2" className="svg-element boy-studying">
            <img src="/assets/SVG/undraw_book-writer_ri5u.svg" alt="Boy studying piece 2" className="svg-content" />
          </div>
          <div id="boy-studying-3" className="svg-element boy-studying">
            <img src="/assets/SVG/undraw_calendar_8r6s.svg" alt="Boy studying piece 3" className="svg-content" />
          </div>
          <div id="boy-studying-4" className="svg-element boy-studying">
            <img src="/assets/SVG/undraw_certificate_cqps.svg" alt="Boy studying piece 4" className="svg-content" />
          </div>
          <div id="boy-studying-5" className="svg-element boy-studying">
            <img src="/assets/SVG/undraw_creative-flow_t3kz.svg" alt="Boy studying piece 5" className="svg-content" />
          </div>
        </div>
        
        {/* Classroom Scene */}
        <div id="classroom-scene" className="svg-scene">
          <div id="classroom-bg" className="svg-element classroom-bg"></div>
          <div id="hill-1" className="svg-element hill">
            <img src="/assets/SVG/hill.svg" alt="Hill piece 1" className="svg-content" />
          </div>
          <div id="hill-2" className="svg-element hill">
            <img src="/assets/SVG/hill.svg" alt="Hill piece 2" className="svg-content" />
          </div>
          <div id="hill-3" className="svg-element hill">
            <img src="/assets/SVG/hill.svg" alt="Hill piece 3" className="svg-content" />
          </div>
          <div id="hill-4" className="svg-element hill">
            <img src="/assets/SVG/hill.svg" alt="Hill piece 4" className="svg-content" />
          </div>
          <div id="hill-5" className="svg-element hill">
            <img src="/assets/SVG/hill.svg" alt="Hill piece 5" className="svg-content" />
          </div>
        </div>
        
        {/* Garden Scene */}
        <div id="garden-scene" className="svg-scene">
          <div id="garden-bg" className="svg-element garden-bg"></div>
          <div id="garden-1" className="svg-element garden">
            <img src="/assets/SVG/garden.svg" alt="Garden piece 1" className="svg-content" />
          </div>
          <div id="garden-2" className="svg-element garden">
            <img src="/assets/SVG/garden.svg" alt="Garden piece 2" className="svg-content" />
          </div>
          <div id="garden-3" className="svg-element garden">
            <img src="/assets/SVG/garden.svg" alt="Garden piece 3" className="svg-content" />
          </div>
          <div id="garden-4" className="svg-element garden">
            <img src="/assets/SVG/garden.svg" alt="Garden piece 4" className="svg-content" />
          </div>
          <div id="garden-5" className="svg-element garden">
            <img src="/assets/SVG/garden.svg" alt="Garden piece 5" className="svg-content" />
          </div>
        </div>
        
        {/* Park Scene */}
        <div id="park-scene" className="svg-scene">
          <div id="park-bg" className="svg-element park-bg"></div>
          <div id="park-tree-1" className="svg-element park-tree">
            <img src="/assets/SVG/park.svg" alt="Park tree 1" className="svg-content" />
          </div>
          <div id="park-tree-2" className="svg-element park-tree">
            <img src="/assets/SVG/park.svg" alt="Park tree 2" className="svg-content" />
          </div>
          <div id="park-bench" className="svg-element park-bench">
            <img src="/assets/SVG/park.svg" alt="Park bench" className="svg-content" />
          </div>
          <div id="park-people" className="svg-element park-people">
            <img src="/assets/SVG/park.svg" alt="Park people" className="svg-content" />
          </div>
          <div id="park-extra-1" className="svg-element park-extra">
            <img src="/assets/SVG/park.svg" alt="Park extra 1" className="svg-content" />
          </div>
          <div id="park-extra-2" className="svg-element park-extra">
            <img src="/assets/SVG/park.svg" alt="Park extra 2" className="svg-content" />
          </div>
        </div>
      </div>
      
      <div className="right-margin-container">
        {/* Dawn Mountain Scene */}
        <div id="dawn-scene-right" className="svg-scene">
          <div id="dawn-bg-right" className="svg-element dawn-bg"></div>
          <div id="dawn-hill-1-right" className="svg-element dawn-hill">
            <svg viewBox="0 0 1604.1533 1109.8041" className="svg-content">
              <defs>
                <linearGradient id="dawn-gradient-1-right">
                  <stop stopColor="#618ce6" offset="0"/>
                  <stop stopColor="#4270cc" offset=".12308"/>
                  <stop stopColor="#335eb5" offset=".23778"/>
                  <stop stopColor="#153b88" offset=".58813"/>
                  <stop stopColor="#04215c" offset="1"/>
                </linearGradient>
              </defs>
              <g transform="translate(-3.8859 -244.09)" clipPath="url(#y)">
                <path d="m3.1778 242h1603.4a1.2778 1.278 0 0 1 1.2778 1.278v1095.4a1.2778 1.278 0 0 1 -1.2778 1.278h-1603.4a1.2778 1.278 0 0 1 -1.2778 -1.3v-1095.4a1.2778 1.278 0 0 1 1.2778 -1.278" fill="url(#dawn-gradient-1-right)"/>
              </g>
            </svg>
          </div>
          <div id="dawn-hill-2-right" className="svg-element dawn-hill">
            <svg viewBox="0 0 1604.1533 1109.8041" className="svg-content">
              <g transform="translate(-3.8859 -244.09)">
                <path d="m-2.1 859.25c16.75-9.75 56 38 67 40s52 7 58 9 34-13 40-13 18-4 22-6 7-10.5 17-11 12 8 23 9 27.09 2.45 40 7c8.15 2.88 6.96 5.78 11 8.41 6.43 4.18 4-11.41 13-7.41s2.75 8 16 3 28-22 37-23 30 11 38 12 40-14 49-14 25.75 4.75 46 4 25-10 35-7 15.25 6.5 25 9 18.5-2 19.5 4 14.25 8.75 26.5 10 10-10 17-8 37 20 46 19 5-9 14-7 11 9 20 10 24-5 35-5 27-8 32-12 46-15 54-16 45-5 60-10 74.79-18.24 87.52-15.41c12.41 2.76 38.48 40.41 58.48 41.41s69 4 77-2 69-21 77-14 52-8 57-9c1.89-0.37 37.34 1.93 42.16 14.05 6.28 15.81 46.73 28.81 78.22 31.45 25.44 2.13 57.9 19.39 117.6 1.36 8.87-2.67 51.7-17.7 80-12.6 17.15 3.09 65.29-1.51 78.02 5.02v301.72h-1614v-347z" fill="#335eb5"/>
              </g>
            </svg>
          </div>
          <div id="dawn-hill-3-right" className="svg-element dawn-hill">
            <svg viewBox="0 0 1604.1533 1109.8041" className="svg-content">
              <g transform="translate(-3.8859 -244.09)">
                <path d="m1611.9 934.72c-16.75-7.46-56 29.08-67 30.61s-52 5.35-58 6.88c-6 1.54-34-9.94-40-9.94s-18-3.06-22-4.59c-4-1.54-7-8.04-17-8.42-10-0.39-12 6.12-23 6.88-11 0.77-27.09 1.87-40 5.36-8.15 2.2-6.95 4.42-11 6.43-6.43 3.2-4-8.72-13-5.66s-2.75 6.12-16 2.29c-13.25-3.82-28-16.83-37-17.6-9-0.76-30 8.42-38 9.18-8 0.77-40-10.71-49-10.71s-25.75 3.64-46 3.06c-20.25-0.57-25-7.65-35-5.35-10 2.29-15.25 4.97-25 6.88-9.75 1.92-18.5-1.53-19.5 3.06-1 4.6-14.25 6.7-26.5 7.66-12.25 0.95-10-7.66-17-6.13s-37 15.31-46 14.54c-9-0.76-5-6.88-14-5.35s-11 6.88-20 7.65c-9 0.76-24-3.83-35-3.83s-27-6.12-32-9.18-46-11.48-54-12.24c-8-0.77-45-3.83-60-7.66-15-3.82-74.79-13.95-87.51-11.79-12.42 2.11-38.49 30.93-58.49 31.69-20 0.77-69 3.06-77-1.53s-69-16.07-77-10.71c-8 5.35-52-6.13-57-6.89-1.89-0.29-37.34 1.47-42.16 10.75-6.28 12.1-46.73 22.04-78.22 24.06-25.44 1.63-57.9 14.84-117.6 1.05-8.87-2.05-51.7-13.55-80-9.65-17.15 2.37-65.29-1.15-78.02 3.85v387.49h1614v-422.18z" fill="#153b88"/>
              </g>
            </svg>
          </div>
          <div id="dawn-cloud-1-right" className="svg-element dawn-cloud">
            <svg viewBox="0 0 1604.1533 1109.8041" className="svg-content">
              <g transform="translate(-3.8859 -244.09)">
                <path d="m2706 842c4-14 21.51-17.27 27.51-35.27 16.54-35.34 58.06-28.44 86.73-20.63 14 4 39.76 7.9 51.76-2.1s62 8 64-26 4-68 26-68 38-16 46-38 26-30 44-16 38 44 44 60-6 170-6 170l-436-2s32-18 52-22z" fill="#ffffff" opacity="0.6"/>
              </g>
            </svg>
          </div>
          <div id="dawn-cloud-2-right" className="svg-element dawn-cloud">
            <svg viewBox="0 0 1604.1533 1109.8041" className="svg-content">
              <g transform="translate(-3.8859 -244.09)">
                <path d="m60.63 938c0-114.68 124.2-14.83 151.06 55.99 28.61-57.33 98.96-69.76 126.51-19.19 42.25-0.56 52.78 86.04 82.38 18.47 45.46-63.91 89.69 33.18 99.58 70.09 29.36 2.66 53.09-30.69 72.38 7.74 32.67-32.78 57.78 20.24 94.8 0.97 29.64 37.88 89.69 14.58 92.45 63.58 44.83 8.11 95.25 1.03 95.25 47.72h-818.41c-138.46-43.5-139.89-152.6 4-245.4z" fill="#ffffff" opacity="0.5"/>
              </g>
            </svg>
          </div>
        </div>
        
        {/* House Scene */}
        <div id="house-scene" className="svg-scene">
          <div id="house-bg" className="svg-element house-bg"></div>
          <div id="house-1" className="svg-element house">
            <img src="/assets/SVG/house-2023960.svg" alt="House piece 1" className="svg-content" />
          </div>
          <div id="house-2" className="svg-element house">
            <img src="/assets/SVG/house-2023960.svg" alt="House piece 2" className="svg-content" />
          </div>
          <div id="house-3" className="svg-element house">
            <img src="/assets/SVG/house-2023960.svg" alt="House piece 3" className="svg-content" />
          </div>
          <div id="house-4" className="svg-element house">
            <img src="/assets/SVG/house-2023960.svg" alt="House piece 4" className="svg-content" />
          </div>
          <div id="house-5" className="svg-element house">
            <img src="/assets/SVG/house-2023960.svg" alt="House piece 5" className="svg-content" />
          </div>
        </div>
        
        {/* Chalkboard Scene */}
        <div id="chalkboard-scene" className="svg-scene">
          <div id="chalkboard-bg" className="svg-element chalkboard-bg"></div>
          <div id="chalkboard-1" className="svg-element chalkboard">
            <img src="/assets/SVG/chalkboardclassroom.svg" alt="Chalkboard piece 1" className="svg-content" />
          </div>
          <div id="chalkboard-2" className="svg-element chalkboard">
            <img src="/assets/SVG/chalkboardclassroom.svg" alt="Chalkboard piece 2" className="svg-content" />
          </div>
          <div id="chalkboard-3" className="svg-element chalkboard">
            <img src="/assets/SVG/chalkboardclassroom.svg" alt="Chalkboard piece 3" className="svg-content" />
          </div>
          <div id="chalkboard-4" className="svg-element chalkboard">
            <img src="/assets/SVG/chalkboardclassroom.svg" alt="Chalkboard piece 4" className="svg-content" />
          </div>
          <div id="chalkboard-5" className="svg-element chalkboard">
            <img src="/assets/SVG/chalkboardclassroom.svg" alt="Chalkboard piece 5" className="svg-content" />
          </div>
        </div>
        
        {/* Sparrow Scene */}
        <div id="sparrow-scene" className="svg-scene">
          <div id="sparrow-bg" className="svg-element sparrow-bg"></div>
          <div id="sparrow-1" className="svg-element sparrow">
            <img src="/assets/SVG/Sparrow.svg" alt="Sparrow piece 1" className="svg-content" />
          </div>
          <div id="sparrow-2" className="svg-element sparrow">
            <img src="/assets/SVG/Sparrow.svg" alt="Sparrow piece 2" className="svg-content" />
          </div>
          <div id="sparrow-3" className="svg-element sparrow">
            <img src="/assets/SVG/Sparrow.svg" alt="Sparrow piece 3" className="svg-content" />
          </div>
          <div id="sparrow-4" className="svg-element sparrow">
            <img src="/assets/SVG/Sparrow.svg" alt="Sparrow piece 4" className="svg-content" />
          </div>
          <div id="sparrow-5" className="svg-element sparrow">
            <img src="/assets/SVG/Sparrow.svg" alt="Sparrow piece 5" className="svg-content" />
          </div>
        </div>
        
        {/* Park Scene */}
        <div id="park-scene-right" className="svg-scene">
          <div id="park-bg-right" className="svg-element park-bg"></div>
          <div id="park-tree-1-right" className="svg-element park-tree">
            <img src="/assets/SVG/park.svg" alt="Park tree 1" className="svg-content" />
          </div>
          <div id="park-tree-2-right" className="svg-element park-tree">
            <img src="/assets/SVG/park.svg" alt="Park tree 2" className="svg-content" />
          </div>
          <div id="park-bench-right" className="svg-element park-bench">
            <img src="/assets/SVG/park.svg" alt="Park bench" className="svg-content" />
          </div>
          <div id="park-people-right" className="svg-element park-people">
            <img src="/assets/SVG/park.svg" alt="Park people" className="svg-content" />
          </div>
          <div id="park-extra-1-right" className="svg-element park-extra">
            <img src="/assets/SVG/park.svg" alt="Park extra 1" className="svg-content" />
          </div>
          <div id="park-extra-2-right" className="svg-element park-extra">
            <img src="/assets/SVG/park.svg" alt="Park extra 2" className="svg-content" />
          </div>
        </div>
      </div>
    </>
  );
};

export default MarginParallax; 