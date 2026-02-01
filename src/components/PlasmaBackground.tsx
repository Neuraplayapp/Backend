import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useTheme } from '../contexts/ThemeContext';

interface PlasmaBackgroundProps {
  className?: string;
  lazyLoad?: boolean;
}

const PlasmaBackground: React.FC<PlasmaBackgroundProps> = ({ 
  className = '', 
  lazyLoad = true 
}) => {
  const { isDarkMode, isBrightMode } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const uniformsRef = useRef<any>(null);
  const animationIdRef = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isVisible, setIsVisible] = useState(!lazyLoad);

  // Optimized vertex shader
  const vertexShader = `
    void main() {
      gl_Position = vec4(position, 1.0);
    }
  `;

  // Proper plasma shader with smooth, flowing gradients
  const fragmentShader = `
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform float u_time;
    uniform float u_theme;
    
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    
    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      for(int i = 0; i < 4; i++) {
        value += amplitude * noise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
      }
      return value;
    }
    
    vec3 plasma(vec2 uv, float time) {
      vec2 p = uv * 3.0;
      
      // Create smooth plasma waves
      float wave1 = sin(p.x * 2.0 + time * 0.5) * cos(p.y * 2.0 + time * 0.3);
      float wave2 = sin(p.x * 4.0 + time * 0.7) * cos(p.y * 4.0 + time * 0.5);
      float wave3 = sin(p.x * 8.0 + time * 0.9) * cos(p.y * 8.0 + time * 0.7);
      
      // Add noise for organic movement
      float noise1 = fbm(p + time * 0.2);
      float noise2 = fbm(p * 2.0 + time * 0.4);
      
      // Combine waves and noise
      float plasma = wave1 * 0.4 + wave2 * 0.3 + wave3 * 0.2 + noise1 * 0.1 + noise2 * 0.05;
      
      // Add some swirling motion
      float angle = atan(p.y, p.x);
      float radius = length(p);
      plasma += 0.1 * sin(angle * 3.0 + time * 0.8) * exp(-radius * 0.5);
      
      return vec3(plasma);
    }
    
    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      
      vec3 plasma1 = plasma(uv, u_time);
      vec3 plasma2 = plasma(uv * 1.5, u_time * 0.7);
      
      vec3 col;
      if (u_theme == 0.0) {
        // Light theme - Smooth purple to blue gradients
        col = mix(vec3(0.8, 0.6, 0.9), vec3(0.4, 0.6, 0.9), plasma1.r);
        col = mix(col, vec3(0.6, 0.4, 0.8), plasma2.r);
      } else if (u_theme == 1.0) {
        // Dark theme - Deep purple to blue
        col = mix(vec3(0.1, 0.05, 0.3), vec3(0.3, 0.1, 0.6), plasma1.r);
        col = mix(col, vec3(0.6, 0.4, 0.9), plasma2.r);
      } else {
        // Bright theme - Orange to red
        col = mix(vec3(1.0, 0.6, 0.4), vec3(0.9, 0.3, 0.2), plasma1.r);
        col = mix(col, vec3(1.0, 0.8, 0.6), plasma2.r);
      }
      
      // Add subtle mouse interaction
      vec2 mouse = u_mouse * 0.5 + 0.5;
      float dist = length(uv - mouse);
      col += 0.15 * exp(-dist * 4.0) * vec3(1.0, 0.8, 0.6);
      
      // Add some sparkle effect
      float sparkle = sin(u_time * 15.0 + uv.x * 100.0) * sin(u_time * 12.0 + uv.y * 80.0);
      col += 0.03 * sparkle * vec3(1.0, 0.9, 0.7);
      
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  // Optimized initialization with reduced texture loading
  const initThreeJS = useCallback(async () => {
    if (!containerRef.current || !canvasRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;

    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.Camera();
    camera.position.z = 1;
    cameraRef.current = camera;

    // Create renderer with optimized settings
    const renderer = new THREE.WebGLRenderer({ 
      canvas,
      alpha: true,
      antialias: false, // Disable antialiasing for performance
      powerPreference: "high-performance"
    });
    
    // Optimize pixel ratio for performance
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    rendererRef.current = renderer;

    // Create uniforms without external textures
    const uniforms = {
      u_time: { type: "f", value: 1.0 },
      u_resolution: { type: "v2", value: new THREE.Vector2() },
      u_mouse: { type: "v2", value: new THREE.Vector2() },
      u_theme: { type: "f", value: isDarkMode ? 1.0 : isBrightMode ? 2.0 : 0.0 }
    };
    uniformsRef.current = uniforms;

    // Create geometry and material
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true
    });

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Update resolution uniform
    uniforms.u_resolution.value.x = renderer.domElement.width;
    uniforms.u_resolution.value.y = renderer.domElement.height;

    // Optimized mouse tracking with throttling
    let mouseTimeout: number;
    const handleMouseMove = (e: MouseEvent) => {
      if (mouseTimeout) return;
      mouseTimeout = window.setTimeout(() => {
        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        uniforms.u_mouse.value.set(x, y);
        mouseTimeout = 0;
      }, 16); // ~60fps throttling
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    setIsInitialized(true);

    // Optimized animation loop with frame limiting
    let lastTime = 0;
    const animate = (time: number) => {
      if (!sceneRef.current || !rendererRef.current || !cameraRef.current || !uniformsRef.current) return;

      // Limit to 30fps for better performance
      if (time - lastTime < 33) {
        animationIdRef.current = requestAnimationFrame(animate);
        return;
      }
      lastTime = time;

      uniformsRef.current.u_time.value = time * 0.0003; // Reduced time multiplier
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationIdRef.current = requestAnimationFrame(animate);
    };

    animate(0);

    // Optimized resize handler
    let resizeTimeout: number;
    const handleResize = () => {
      if (resizeTimeout) return;
      resizeTimeout = window.setTimeout(() => {
        if (!containerRef.current || !rendererRef.current || !uniformsRef.current) return;
        
        const width = containerRef.current.offsetWidth;
        const height = containerRef.current.offsetHeight;
        
        rendererRef.current.setSize(width, height);
        uniformsRef.current.u_resolution.value.x = width;
        uniformsRef.current.u_resolution.value.y = height;
        resizeTimeout = 0;
      }, 100);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (mouseTimeout) clearTimeout(mouseTimeout);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [isDarkMode, isBrightMode]);

  // Lazy loading with intersection observer
  useEffect(() => {
    if (!lazyLoad) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [lazyLoad]);

  // Initialize when visible
  useEffect(() => {
    if (isVisible) {
      const cleanup = initThreeJS();
      return () => {
        cleanup.then(cleanupFn => cleanupFn?.());
      };
    }
  }, [isVisible, initThreeJS]);

  // Update theme uniform when theme changes
  useEffect(() => {
    if (uniformsRef.current) {
      uniformsRef.current.u_theme.value = isDarkMode ? 1.0 : isBrightMode ? 2.0 : 0.0;
    }
  }, [isDarkMode, isBrightMode]);

  return (
    <div 
      ref={containerRef} 
      className={`absolute inset-0 ${className}`}
    >
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block"
      />
    </div>
  );
};

export default PlasmaBackground; 