import React, { useEffect, useRef, useState } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  intensity?: number;
  className?: string;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ 
  isActive, 
  intensity = 0.5, 
  className = '' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [audioData, setAudioData] = useState<number[]>([]);

  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawVisualizer = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Generate simulated audio data
      const bars = 32;
      const barWidth = canvas.width / bars;
      const data = Array.from({ length: bars }, () => 
        Math.random() * intensity * 100 + Math.sin(Date.now() * 0.01) * 20
      );

      // Draw smokey animated bars
      data.forEach((value, index) => {
        const x = index * barWidth;
        const height = (value / 100) * canvas.height;
        const y = canvas.height - height;

        // Create gradient for smokey effect
        const gradient = ctx.createLinearGradient(x, y, x + barWidth, y + height);
        gradient.addColorStop(0, `rgba(139, 92, 246, ${intensity * 0.8})`);
        gradient.addColorStop(0.5, `rgba(168, 85, 247, ${intensity * 0.6})`);
        gradient.addColorStop(1, `rgba(218, 138, 235, ${intensity * 0.4})`);

        // Draw bar with rounded corners
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x + 1, y, barWidth - 2, height, 4);
        ctx.fill();

        // Add glow effect
        ctx.shadowColor = 'rgba(139, 92, 246, 0.8)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = `rgba(139, 92, 246, ${intensity * 0.3})`;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Add floating particles
      for (let i = 0; i < 5; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 3 + 1;
        
        ctx.fillStyle = `rgba(218, 138, 235, ${intensity * 0.6})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(drawVisualizer);
    };

    drawVisualizer();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, intensity]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={60}
      className={`audio-visualizer ${className}`}
      style={{
        borderRadius: '8px',
        background: 'rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(139, 92, 246, 0.3)'
      }}
    />
  );
};

export default AudioVisualizer; 