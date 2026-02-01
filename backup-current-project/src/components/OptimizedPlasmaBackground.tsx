import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

interface OptimizedPlasmaBackgroundProps {
  className?: string;
  fallbackGradient?: string;
  onLoad?: () => void;
}

const OptimizedPlasmaBackground: React.FC<OptimizedPlasmaBackgroundProps> = ({ 
  className = '',
  fallbackGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  onLoad
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const uniformsRef = useRef<any>(null);
  const animationIdRef = useRef<number | null>(null);
  const [isWebGLLoaded, setIsWebGLLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasWebGLSupport, setHasWebGLSupport] = useState(true);

  // Simplified vertex shader
  const vertexShader = `
    void main() {
      gl_Position = vec4(position, 1.0);
    }
  `;

  // Simplified fragment shader with reduced complexity and specific RGB colors
  const fragmentShader = `
    uniform vec2 u_resolution;
    uniform float u_time;
    
    vec2 hash2(vec2 p) {
      return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 2.0 - 1.0);
    }
    
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(dot(hash2(i), f), dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), f.x),
                 mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)), dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), f.x), f.y);
    }
    
    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
      
      // Simplified plasma effect with specific RGB colors
      float n = noise(uv * 8.0 + u_time * 0.5);
      n += noise(uv * 16.0 - u_time * 0.3) * 0.5;
      n += noise(uv * 32.0 + u_time * 0.2) * 0.25;
      
      // Specific RGB colors converted to normalized values (0-1)
      // Bright: (218,138,235) -> (0.855, 0.541, 0.922)
      // Medium: (163,100,176) -> (0.639, 0.392, 0.690)
      // Low: (123,76,133) -> (0.482, 0.298, 0.522)
      
      vec3 color1 = vec3(0.482, 0.298, 0.522); // Low purple
      vec3 color2 = vec3(0.855, 0.541, 0.922); // Bright purple
      vec3 color3 = vec3(0.639, 0.392, 0.690); // Medium purple
      
      // Mix colors based on noise with enhanced saturation
      vec3 finalColor = mix(color1, color2, n);
      finalColor = mix(finalColor, color3, noise(uv * 4.0 + u_time * 0.1));
      
      // Add subtle animation with increased intensity for more saturation
      finalColor += 0.08 * sin(u_time + uv.x * 10.0) * sin(u_time + uv.y * 10.0); // Increased from 0.05
      
      // Clamp to controlled exposure levels while maintaining color vibrancy
      finalColor = clamp(finalColor, 0.0, 0.9);
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  // Check WebGL support
  const checkWebGLSupport = () => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch (e) {
      return false;
    }
  };

  // Initialize WebGL with lazy loading
  const initWebGL = async () => {
    if (!containerRef.current || !canvasRef.current || !hasWebGLSupport) {
      setIsLoading(false);
      return;
    }

    try {
      const container = containerRef.current;
      const canvas = canvasRef.current;

      // Create scene
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // Create camera
      const camera = new THREE.Camera();
      camera.position.z = 1;
      cameraRef.current = camera;

      // Create renderer with performance optimizations
      const renderer = new THREE.WebGLRenderer({ 
        canvas,
        alpha: true,
        antialias: false, // Disable antialiasing for performance
        powerPreference: "high-performance"
      });
      
      // Optimize renderer settings
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio
      renderer.setSize(container.offsetWidth, container.offsetHeight);
      rendererRef.current = renderer;

      // Create uniforms
      const uniforms = {
        u_time: { type: "f", value: 0.0 },
        u_resolution: { type: "v2", value: new THREE.Vector2() }
      };
      uniformsRef.current = uniforms;

      // Create geometry and material
      const geometry = new THREE.PlaneGeometry(2, 2);
      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader
      });

      // Create mesh
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      // Update resolution uniform
      uniforms.u_resolution.value.x = renderer.domElement.width;
      uniforms.u_resolution.value.y = renderer.domElement.height;

      // Start animation with throttled frame rate
      let lastTime = 0;
      const targetFPS = 30; // Reduce from 60fps to 30fps for better performance
      const frameInterval = 1000 / targetFPS;

      const animate = (time: number) => {
        if (time - lastTime >= frameInterval) {
          if (!sceneRef.current || !rendererRef.current || !cameraRef.current || !uniformsRef.current) return;

          uniformsRef.current.u_time.value = time * 0.001; // Slower animation
          rendererRef.current.render(sceneRef.current, cameraRef.current);
          lastTime = time;
        }
        
        animationIdRef.current = requestAnimationFrame(animate);
      };

      animate(0);

      // Handle resize with debouncing
      let resizeTimeout: NodeJS.Timeout;
      const handleResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          if (!containerRef.current || !rendererRef.current || !uniformsRef.current) return;
          
          const width = containerRef.current.offsetWidth;
          const height = containerRef.current.offsetHeight;
          
          rendererRef.current.setSize(width, height);
          uniformsRef.current.u_resolution.value.x = width;
          uniformsRef.current.u_resolution.value.y = height;
        }, 100);
      };

      window.addEventListener('resize', handleResize);

      setIsWebGLLoaded(true);
      setIsLoading(false);
      onLoad?.();

      // Cleanup function
      return () => {
        window.removeEventListener('resize', handleResize);
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
        }
        if (rendererRef.current) {
          rendererRef.current.dispose();
        }
      };
    } catch (error) {
      console.warn('WebGL initialization failed, falling back to CSS:', error);
      setHasWebGLSupport(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check WebGL support first
    const webGLSupported = checkWebGLSupport();
    setHasWebGLSupport(webGLSupported);

    if (webGLSupported) {
      // Lazy load WebGL after a short delay to prioritize content
      const timer = setTimeout(() => {
        initWebGL();
      }, 100);

      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`absolute inset-0 ${className}`}
      style={{ zIndex: -1 }}
    >
      {/* CSS Fallback - shows immediately */}
      {!isWebGLLoaded && (
        <div 
          className="absolute inset-0 animate-pulse"
          style={{ 
            background: fallbackGradient,
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}
        />
      )}
      
      {/* WebGL Canvas - loads after delay */}
      {hasWebGLSupport && (
        <canvas 
          ref={canvasRef} 
          className={`w-full h-full block transition-opacity duration-500 ${
            isWebGLLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default OptimizedPlasmaBackground; 