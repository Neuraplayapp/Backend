import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface Bubble {
    x: number;
    y: number;
    radius: number;
    velocity: number;
    opacity: number;
    hue: number;
}

interface Star {
    x: number;
    y: number;
    size: number;
    rotation: number;
    rotationSpeed: number;
    floatOffset: number;
    floatSpeed: number;
}

interface Shape {
    x: number;
    y: number;
    size: number;
    type: 'circle' | 'triangle' | 'square';
    rotation: number;
    rotationSpeed: number;
    velocity: { x: number; y: number };
    hue: number;
    opacity: number;
}

const AnimatedBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { isDarkMode } = useTheme();
    const animationFrameRef = useRef<number>();
    const bubblesRef = useRef<Bubble[]>([]);
    const starsRef = useRef<Star[]>([]);
    const shapesRef = useRef<Shape[]>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initializeElements();
        };

        // Initialize floating elements
        const initializeElements = () => {
            // Create bubbles
            bubblesRef.current = Array.from({ length: 20 }, () => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 40 + 20,
                velocity: Math.random() * 0.5 + 0.3,
                opacity: Math.random() * 0.3 + 0.1,
                hue: Math.random() * 60 + 260, // Purple hues
            }));

            // Create stars
            starsRef.current = Array.from({ length: 15 }, () => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 30 + 15,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.02,
                floatOffset: Math.random() * Math.PI * 2,
                floatSpeed: Math.random() * 0.02 + 0.01,
            }));

            // Create geometric shapes
            shapesRef.current = Array.from({ length: 12 }, () => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 50 + 30,
                type: ['circle', 'triangle', 'square'][Math.floor(Math.random() * 3)] as 'circle' | 'triangle' | 'square',
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.03,
                velocity: {
                    x: (Math.random() - 0.5) * 0.5,
                    y: (Math.random() - 0.5) * 0.5,
                },
                hue: Math.random() * 60 + 260,
                opacity: Math.random() * 0.2 + 0.1,
            }));
        };

        // Draw a star shape
        const drawStar = (x: number, y: number, size: number, rotation: number, opacity: number) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.beginPath();

            const spikes = 5;
            const outerRadius = size;
            const innerRadius = size / 2;

            for (let i = 0; i < spikes * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (Math.PI / spikes) * i;
                const px = Math.cos(angle) * radius;
                const py = Math.sin(angle) * radius;

                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }

            ctx.closePath();
            ctx.fillStyle = isDarkMode
                ? `hsla(280, 70%, 60%, ${opacity})`
                : `hsla(280, 70%, 70%, ${opacity})`;
            ctx.fill();
            ctx.strokeStyle = isDarkMode
                ? `hsla(280, 90%, 80%, ${opacity * 0.5})`
                : `hsla(280, 90%, 60%, ${opacity * 0.5})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        };

        // Draw geometric shape
        const drawShape = (shape: Shape) => {
            ctx.save();
            ctx.translate(shape.x, shape.y);
            ctx.rotate(shape.rotation);

            ctx.fillStyle = isDarkMode
                ? `hsla(${shape.hue}, 70%, 60%, ${shape.opacity})`
                : `hsla(${shape.hue}, 70%, 70%, ${shape.opacity})`;
            ctx.strokeStyle = isDarkMode
                ? `hsla(${shape.hue}, 90%, 80%, ${shape.opacity * 0.5})`
                : `hsla(${shape.hue}, 90%, 60%, ${shape.opacity * 0.5})`;
            ctx.lineWidth = 2;

            ctx.beginPath();

            switch (shape.type) {
                case 'circle':
                    ctx.arc(0, 0, shape.size / 2, 0, Math.PI * 2);
                    break;
                case 'triangle':
                    ctx.moveTo(0, -shape.size / 2);
                    ctx.lineTo(shape.size / 2, shape.size / 2);
                    ctx.lineTo(-shape.size / 2, shape.size / 2);
                    ctx.closePath();
                    break;
                case 'square':
                    ctx.rect(-shape.size / 2, -shape.size / 2, shape.size, shape.size);
                    break;
            }

            ctx.fill();
            ctx.stroke();
            ctx.restore();
        };

        // Animation loop
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Animate bubbles
            bubblesRef.current.forEach((bubble) => {
                // Draw bubble with gradient
                const gradient = ctx.createRadialGradient(
                    bubble.x,
                    bubble.y,
                    0,
                    bubble.x,
                    bubble.y,
                    bubble.radius
                );

                gradient.addColorStop(0, isDarkMode
                    ? `hsla(${bubble.hue}, 70%, 60%, ${bubble.opacity})`
                    : `hsla(${bubble.hue}, 70%, 80%, ${bubble.opacity})`
                );
                gradient.addColorStop(0.7, isDarkMode
                    ? `hsla(${bubble.hue}, 70%, 50%, ${bubble.opacity * 0.5})`
                    : `hsla(${bubble.hue}, 70%, 70%, ${bubble.opacity * 0.5})`
                );
                gradient.addColorStop(1, 'transparent');

                ctx.beginPath();
                ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();

                // Add glossy highlight
                const highlight = ctx.createRadialGradient(
                    bubble.x - bubble.radius / 3,
                    bubble.y - bubble.radius / 3,
                    0,
                    bubble.x - bubble.radius / 3,
                    bubble.y - bubble.radius / 3,
                    bubble.radius / 2
                );
                highlight.addColorStop(0, `rgba(255, 255, 255, ${bubble.opacity * 0.6})`);
                highlight.addColorStop(1, 'transparent');

                ctx.beginPath();
                ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
                ctx.fillStyle = highlight;
                ctx.fill();

                // Move bubble up
                bubble.y -= bubble.velocity;

                // Reset bubble at bottom when it goes off top
                if (bubble.y + bubble.radius < 0) {
                    bubble.y = canvas.height + bubble.radius;
                    bubble.x = Math.random() * canvas.width;
                }
            });

            // Animate stars
            starsRef.current.forEach((star) => {
                star.rotation += star.rotationSpeed;
                star.floatOffset += star.floatSpeed;
                const floatY = Math.sin(star.floatOffset) * 10;

                drawStar(star.x, star.y + floatY, star.size, star.rotation, 0.3);
            });

            // Animate geometric shapes
            shapesRef.current.forEach((shape) => {
                drawShape(shape);

                shape.x += shape.velocity.x;
                shape.y += shape.velocity.y;
                shape.rotation += shape.rotationSpeed;

                // Bounce off edges
                if (shape.x < 0 || shape.x > canvas.width) shape.velocity.x *= -1;
                if (shape.y < 0 || shape.y > canvas.height) shape.velocity.y *= -1;
            });

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isDarkMode]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 1 }}
        />
    );
};

export default AnimatedBackground;