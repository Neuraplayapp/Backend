import React from 'react';

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
                 <h1 className="text-5xl md:text-8xl font-black leading-tight tracking-tighter mb-4 drop-shadow-lg">
                    Your Child is a Genius
                </h1>
                <p className="text-xl md:text-2xl max-w-4xl mx-auto drop-shadow">
                    Unlock the potential with scientifically-backed neuropsychological games.
                </p>
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