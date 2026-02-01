import React from 'react';
import TextReveal from './TextReveal';

const TextRevealExample: React.FC = () => {
  return (
    <div className="space-y-20 p-8">
      {/* Basic usage */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Basic Text Reveal</h2>
        <TextReveal 
          text="Hello World"
          className="text-4xl font-bold text-white"
        />
      </div>

      {/* With custom styling */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Gradient Text</h2>
        <TextReveal 
          text="Beautiful Gradient"
          className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
          delay={0.5}
        />
      </div>

      {/* Scroll triggered */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Scroll Triggered</h2>
        <TextReveal 
          text="Scroll to reveal"
          className="text-3xl font-bold text-blue-400"
          triggerOnScroll={true}
          delay={0}
        />
      </div>

      {/* Fast animation */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Fast Animation</h2>
        <TextReveal 
          text="Quick Bounce"
          className="text-4xl font-bold text-green-400"
          stagger={0.05}
          duration={0.5}
        />
      </div>

      {/* Slow animation */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Slow Animation</h2>
        <TextReveal 
          text="Slow and Steady"
          className="text-4xl font-bold text-orange-400"
          stagger={0.3}
          duration={1.2}
        />
      </div>

      {/* Custom bounce height */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">High Bounce</h2>
        <TextReveal 
          text="High Bounce"
          className="text-4xl font-bold text-red-400"
          bounceHeight={-500}
          initialScale={0.1}
        />
      </div>

      {/* Multiple instances */}
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-white mb-4">Multiple Instances</h2>
        <TextReveal 
          text="First Line"
          className="text-3xl font-bold text-white"
          delay={0}
        />
        <TextReveal 
          text="Second Line"
          className="text-3xl font-bold text-blue-300"
          delay={1}
        />
        <TextReveal 
          text="Third Line"
          className="text-3xl font-bold text-purple-300"
          delay={2}
        />
      </div>
    </div>
  );
};

export default TextRevealExample; 