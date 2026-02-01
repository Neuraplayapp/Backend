import React from 'react';
import BouncyLetters from './BouncyLetters';
import LetterReveal from './LetterReveal';

// Data for the tabs
const heroTabs = [
    { title: "What is neuraplay?" },
    { title: "Forum" },
    { title: "About Us" }
];

interface InteractiveHeroProps {
    onTabSelect: (index: number) => void;
    activeTabIndex: number;
}

export const InteractiveHero = ({ onTabSelect, activeTabIndex }: InteractiveHeroProps) => {
    return (
        <div className="h-full w-full flex flex-col justify-between items-center text-center p-6 text-white relative">
            {/* Foreground Content Layer */}
            <div className="relative z-10 flex-grow flex flex-col justify-center items-center">
                <BouncyLetters 
                    text="Your Child is a Genius"
                    className="text-5xl md:text-8xl font-black leading-tight tracking-tighter mb-4 drop-shadow-lg"
                    delay={0.5}
                    stagger={0.1}
                    duration={0.8}
                    bounceHeight={-200}
                    initialScale={0.5}
                    initialRotation={-15}
                />
                <LetterReveal 
                    text="unlock the potential of your child - through AI and psychology"
                    className="text-xl md:text-2xl max-w-4xl mx-auto drop-shadow"
                    delay={1.5}
                    stagger={0.05}
                    duration={0.4}
                    typewriterEffect={true}
                    cursorBlink={false}
                />
            </div>

            {/* Bottom tab area - navigation is passed up to the parent */}
            <div className="relative z-10 w-full max-w-5xl p-4">
                <div className="flex justify-center items-center gap-4 bg-black/20 backdrop-blur-sm p-2 rounded-xl">
                    {heroTabs.map((tab, index) => (
                        <button 
                            key={tab.title} 
                            onClick={() => onTabSelect(index + 1)} // Map tabs to slides 2, 3, 4, etc.
                            className={`flex-1 p-3 rounded-lg transition-colors duration-300 text-sm md:text-base ${activeTabIndex === (index + 1) ? 'bg-white/20' : 'bg-transparent hover:bg-white/10'}`}
                        >
                            {tab.title}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}; 