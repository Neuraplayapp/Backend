import React from 'react';

interface FastHeroBackgroundProps {
  className?: string;
}

const FastHeroBackground: React.FC<FastHeroBackgroundProps> = ({ className = '' }) => {
  return (
    <div 
      className={`absolute inset-0 ${className}`}
      style={{ zIndex: -1 }}
    >
      {/* Immediate CSS gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradientShift 8s ease infinite'
        }}
      />
      
      {/* Animated overlay for extra visual interest */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%)',
          animation: 'float 6s ease-in-out infinite'
        }}
      />
      
      {/* Subtle particle effect */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 1px, transparent 1px),
            radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 1px, transparent 1px),
            radial-gradient(circle at 50% 10%, rgba(255,255,255,0.1) 1px, transparent 1px),
            radial-gradient(circle at 10% 50%, rgba(255,255,255,0.1) 1px, transparent 1px),
            radial-gradient(circle at 90% 90%, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px, 150px 150px, 200px 200px, 120px 120px, 180px 180px',
          animation: 'particleFloat 10s linear infinite'
        }}
      />
      

    </div>
  );
};

export default FastHeroBackground; 