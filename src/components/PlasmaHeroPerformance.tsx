import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

interface PlasmaHeroPerformanceProps {
  className?: string;
}

const PlasmaHeroPerformance: React.FC<PlasmaHeroPerformanceProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const uniformsRef = useRef<any>(null);
  const animationIdRef = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Vertex shader
  const vertexShader = `
    void main() {
      gl_Position = vec4(position, 1.0);
    }
  `;

  // Fragment shader - muted silver metallic greyish version with 40% slower speed
  const fragmentShader = `
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform float u_time;
    uniform sampler2D u_noise;
    uniform sampler2D u_environment;
    
    vec2 hash2(vec2 p) {
      vec2 o = texture2D(u_noise, (p+0.5)/256.0).xy;
      return o;
    }
    
    float sinnoise(vec3 p) {
      // Balanced performance and wave dynamics
      float s = (sin(u_time * 0.6) * 0.5 + 0.5);
      
      // Restored wave dynamics while keeping performance
      float _c = cos(p.x * 0.2); // Balanced frequency for waves
      float _s = sin(p.x * 0.2); // Balanced frequency for waves
      mat2 mat = mat2(_c, -_s, _s, _c);
      
      // Balanced iterations for waves vs performance
      for (int i = 0; i < 4; i++) {
        p += cos(p.yxz * 3.5 + vec3(0.0, u_time * 0.6, 10.6)) * (0.25 + s * 0.2); // Restored wave complexity
        p += sin(p.yxz + vec3(u_time * 0.6, 0.1, 0.0)) * (0.5 - s * 0.1);
        p *= 1.0 + s * 0.1;
        p.xy *= mat;
      }

      return length(p);
    }

    vec3 envMap(vec3 rd) {
      // Optimized environment mapping - reduced calculations
      rd.xy -= u_time * 0.6 * 0.1; // Reduced movement for performance
      rd /= 4.0;
      
      vec3 col = texture2D(u_environment, rd.xy - 0.5).rgb;
      return col * 0.8; // Simplified normalization for performance
    }

    float bumpMap(vec2 uv, float height) {
      float bump = sinnoise(vec3(uv, 1.0));
      return bump * height;
    }

    vec4 renderPass(vec2 uv) {
      vec3 surfacePos = vec3(uv, 0.0);
      vec3 ray = normalize(vec3(uv, 1.0));
      // 40% slower light movement
      vec3 lightPos = vec3(cos(u_time * 0.6 * 0.5 + 2.0) * 2.0, 1.0 + sin(u_time * 0.6 * 0.5 + 2.0) * 2.0, -3.0);
      vec3 normal = vec3(0.0, 0.0, -1.0);

      vec2 sampleDistance = vec2(0.001, 0.0);

      float fx = bumpMap(surfacePos.xy - sampleDistance.xy, 1.0);
      float fy = bumpMap(surfacePos.xy - sampleDistance.yx, 1.0);
      float f = bumpMap(surfacePos.xy, 1.0);
      float freq = (f + fx + fy);
      freq = freq * freq;
      
      // Enhanced wave dynamics for more visible waves
      float waveIntensity = sin(u_time * 0.6) * 0.5 + 0.5;
      freq = freq * (0.4 + waveIntensity * 2.5); // Enhanced wave intensity for more prominent waves
      
      fx = (fx - f) / sampleDistance.x;
      fy = (fy - f) / sampleDistance.x;
      normal = normalize(normal + vec3(fx, fy, 0.0) * 0.1); // Reduced bump mapping intensity for smoother appearance           

      vec3 lightV = lightPos - surfacePos;
      float lightDist = max(length(lightV), 0.001);
      lightV /= lightDist;

      // Scandinavian minimalist colors - muted blues, grays, and soft whites
      // Soft indigo: (99, 102, 241) -> (0.388, 0.400, 0.945)
      // Light gray-blue: (148, 163, 184) -> (0.580, 0.639, 0.722)
      // Dark slate: (51, 65, 85) -> (0.200, 0.255, 0.333)
      // Very light: (226, 232, 240) -> (0.886, 0.910, 0.941)
      
      vec3 lightColour = vec3(0.580, 0.639, 0.722); // Soft gray-blue as brightest
      
      // Subtle lighting for minimalist aesthetic
      float shininess = 0.25;
      float brightness = 0.5;
      
      float falloff = 0.15;
      float attenuation = 1.0 / (1.0 + lightDist * lightDist * falloff);
      
      float diffuse = max(dot(normal, lightV), 0.0);
      float specular = pow(max(dot(reflect(-lightV, normal), -ray), 0.0), 32.0) * shininess;
      
      // Subtle plasma effect with gentle waves
      vec3 plasma = mix(vec3(0.200, 0.255, 0.333), vec3(0.388, 0.400, 0.545), smoothstep(80.0, 100.0, freq)); // Dark to soft indigo
      vec2 n = hash2(uv * 20.0 + u_time * 300.0);
      plasma += hash2(n).x * 0.02; // Very subtle noise
      plasma *= 0.85; // Reduced brightness for elegance
      
      // Minimal highlights
      plasma += vec3(0.886, 0.910, 0.941) * specular * 0.15; // Very subtle light highlights
      
      vec3 reflect_ray = reflect(vec3(uv, 1.0), normal);
      vec3 tex = envMap(reflect_ray);
      
      // Subtle environment mapping
      vec3 texCol = (vec3(0.200, 0.255, 0.333) + tex * brightness * vec3(0.580, 0.639, 0.722)) * 0.4;
      
      // Base color using dark slate
      vec3 baseColor = vec3(0.200, 0.255, 0.333);
      vec3 colour = (texCol * (diffuse * vec3(0.9, 0.95, 1.0) * 1.2 + 0.5) + lightColour * specular * f * 0.8) * attenuation * 0.9;
      colour = mix(baseColor, colour, 0.6); // Subtle mixing
      colour *= 0.85; // Reduced overall brightness
      
      // Gentle plasma mixing
      float plasmaMix = 0.9 - smoothstep(80.0, 110.0, freq);
      plasmaMix = smoothstep(0.5, 0.8, plasmaMix);
      colour = mix(colour, plasma, plasmaMix * 0.7); // Reduced plasma intensity
      
      // Clamp to maintain subtle elegance
      colour = clamp(colour, 0.0, 0.65);

      return vec4(colour, 1.0);
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
      
      // Apply plasma effect to full screen
      vec4 render = renderPass(uv);
      
      gl_FragColor = render;
    }
  `;

  useEffect(() => {
    if (isInitialized) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    camera.position.z = 1;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);

    // Load textures
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");

    Promise.all([
      new Promise<THREE.Texture>((resolve) => {
        loader.load('https://s3-us-west-2.amazonaws.com/s.cdpn.io/982762/noise.png', (texture) => {
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.minFilter = THREE.LinearFilter;
          resolve(texture);
        });
      }),
      new Promise<THREE.Texture>((resolve) => {
        loader.load('https://s3-us-west-2.amazonaws.com/s.cdpn.io/982762/env_lat-lon.png', (texture) => {
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.minFilter = THREE.LinearFilter;
          resolve(texture);
        });
      })
    ]).then(([noiseTexture, environmentTexture]) => {
      // Uniforms
      const uniforms = {
        u_time: { type: "f", value: 1.0 },
        u_resolution: { type: "v2", value: new THREE.Vector2() },
        u_noise: { type: "t", value: noiseTexture },
        u_environment: { type: "t", value: environmentTexture },
        u_mouse: { type: "v2", value: new THREE.Vector2() }
      };

      // Material
      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader
      });
      material.extensions.derivatives = true;

      // Mesh
      const geometry = new THREE.PlaneGeometry(2, 2);
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      // Store references
      sceneRef.current = scene;
      rendererRef.current = renderer;
      cameraRef.current = camera;
      uniformsRef.current = uniforms;

      // Set initial resolution
      uniforms.u_resolution.value.x = renderer.domElement.width;
      uniforms.u_resolution.value.y = renderer.domElement.height;

      // Mouse interaction
      const handleMouseMove = (e: MouseEvent) => {
        const ratio = window.innerHeight / window.innerWidth;
        uniforms.u_mouse.value.x = (e.pageX - window.innerWidth / 2) / window.innerWidth / ratio;
        uniforms.u_mouse.value.y = (e.pageY - window.innerHeight / 2) / window.innerHeight * -1;
      };

      document.addEventListener('pointermove', handleMouseMove);

      // Animation loop
      let then = 0;
      const animate = (now: number) => {
        animationIdRef.current = requestAnimationFrame(animate);
        
        const delta = now - then;
        then = now;
        
        // Match plasmaball timing
        uniforms.u_time.value += delta * 0.0005;
        
        renderer.render(scene, camera);
      };

      animate(0);

      // Handle resize
      const handleResize = () => {
        if (!container || !renderer || !uniforms) return;
        
        renderer.setSize(container.clientWidth, container.clientHeight);
        uniforms.u_resolution.value.x = renderer.domElement.width;
        uniforms.u_resolution.value.y = renderer.domElement.height;
      };

      window.addEventListener('resize', handleResize);
      handleResize();

      setIsInitialized(true);

      // Cleanup function
      return () => {
        document.removeEventListener('pointermove', handleMouseMove);
        window.removeEventListener('resize', handleResize);
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
        }
      };
    });
  }, [isInitialized]);

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
      <canvas ref={canvasRef} />
    </div>
  );
};

export default PlasmaHeroPerformance; 