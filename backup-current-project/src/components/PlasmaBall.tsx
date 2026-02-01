import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import './PlasmaBall.css';

interface PlasmaBallProps {
  size?: number;
  className?: string;
  onClick?: () => void;
}

const PlasmaBall: React.FC<PlasmaBallProps> = ({
  size = 200,
  className = '',
  onClick
}) => {
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

  // Fragment shader - modified to create a circular plasma ball
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
      float s = (sin(u_time) * 0.5 + 0.5);
      
      float _c = cos(p.x * 0.1);
      float _s = sin(p.x * 0.1);
      mat2 mat = mat2(_c, -_s, _s, _c);
      
      for (int i = 0; i < 5; i++) {
        p += cos(p.yxz * 3.0 + vec3(0.0, u_time, 10.6)) * (0.25 + s * 0.2);
        p += sin(p.yxz + vec3(u_time, 0.1, 0.0)) * (0.5 - s * 0.1);
        p *= 1.0 + s * 0.1;
        p.xy *= mat;
      }

      return length(p);
    }

    vec3 envMap(vec3 rd) {
      rd.xy -= u_time * 0.2;
      rd /= 4.0;
      
      vec3 col = texture2D(u_environment, rd.xy - 0.5).rgb;
      col *= normalize(col);
      return col;
    }

    float bumpMap(vec2 uv, float height) {
      float bump = sinnoise(vec3(uv, 1.0));
      return bump * height;
    }

    vec4 renderPass(vec2 uv) {
      vec3 surfacePos = vec3(uv, 0.0);
      vec3 ray = normalize(vec3(uv, 1.0));
      vec3 lightPos = vec3(cos(u_time * 0.5 + 2.0) * 2.0, 1.0 + sin(u_time * 0.5 + 2.0) * 2.0, -3.0);
      vec3 normal = vec3(0.0, 0.0, -1.0);

      vec2 sampleDistance = vec2(0.001, 0.0);

      float fx = bumpMap(surfacePos.xy - sampleDistance.xy, 1.0);
      float fy = bumpMap(surfacePos.xy - sampleDistance.yx, 1.0);
      float f = bumpMap(surfacePos.xy, 1.0);
      float freq = (f + fx + fy);
      freq = freq * freq;
      
      fx = (fx - f) / sampleDistance.x;
      fy = (fy - f) / sampleDistance.x;
      normal = normalize(normal + vec3(fx, fy, 0.0) * 0.2);           

      vec3 lightV = lightPos - surfacePos;
      float lightDist = max(length(lightV), 0.001);
      lightV /= lightDist;

      // Specific RGB colors converted to normalized values (0-1)
      // Bright: (218,138,235) -> (0.855, 0.541, 0.922)
      // Medium: (163,100,176) -> (0.639, 0.392, 0.690)
      // Low: (123,76,133) -> (0.482, 0.298, 0.522)
      
      vec3 lightColour = vec3(0.855, 0.541, 0.922); // Bright purple
      
      // Enhanced metallic properties with specific colors
      float shininess = 0.7; // Increased for more saturation
      float brightness = 1.0; // Increased for more vibrant colors
      
      float falloff = 0.08; // Adjusted falloff for better contrast
      float attenuation = 1.0 / (1.0 + lightDist * lightDist * falloff);
      
      float diffuse = max(dot(normal, lightV), 0.0);
      float specular = pow(max(dot(reflect(-lightV, normal), -ray), 0.0), 64.0) * shininess; // Higher specular power
      
      // Plasma effect with specific RGB colors
      vec3 plasma = mix(vec3(0.482, 0.298, 0.522), vec3(0.855, 0.541, 0.922), smoothstep(80.0, 100.0, freq)); // Low to Bright
      vec2 n = hash2(uv * 200.0 + u_time * 5000.0);
      plasma += hash2(n).x * 0.2; // Increased noise intensity for more saturation
      plasma *= 1.0; // Increased overall brightness for more vibrant colors
      
      // Add metallic highlights with bright purple
      plasma += vec3(0.855, 0.541, 0.922) * specular * 0.4; // Increased highlight intensity
      
      vec3 reflect_ray = reflect(vec3(uv, 1.0), normal);
      vec3 tex = envMap(reflect_ray);
      
      // Purple-tinted environment mapping with specific colors
      vec3 texCol = (vec3(0.482, 0.298, 0.522) + tex * brightness * vec3(0.855, 0.541, 0.922)) * 0.6; // Increased intensity
      
      // Base color using low RGB
      vec3 baseColor = vec3(0.482, 0.298, 0.522); // Low purple
      vec3 colour = (texCol * (diffuse * vec3(1.0, 0.9, 1.0) * 2.0 + 0.5) + lightColour * specular * f * 2.0) * attenuation * 1.5; // Increased multipliers
      colour = mix(baseColor, colour, 0.7); // Increased mixing
      colour *= 1.2; // Increased overall brightness
      
      // Enhanced plasma mixing with specific colors
      colour = mix(colour, plasma, 1.0 - smoothstep(80.0, 110.0, freq));
      
      // Clamp to maintain the specific color range while allowing some brightness
      colour = clamp(colour, 0.0, 0.9);

      return vec4(colour, 1.0);
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
      
      // Create circular mask
      float dist = length(uv);
      float circle = smoothstep(1.0, 0.95, dist);
      
      // Apply circular mask to plasma effect
      vec4 render = renderPass(uv);
      render *= circle;
      
      // Add metallic purple glow effect outside the circle with specific RGB colors
      float glow = smoothstep(1.0, 0.8, dist) * 0.3; // Increased intensity for more saturation
      render += vec4(0.639, 0.392, 0.690, 1.0) * glow; // Medium purple glow using specific RGB
      
      // Fade out at edges
      render.a *= smoothstep(1.0, 0.9, dist);
      
      // Clamp final result to maintain color integrity
      render.rgb = clamp(render.rgb, 0.0, 0.9);
      
      gl_FragColor = render;
    }
  `;

  const initThreeJS = async () => {
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

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ 
      canvas,
      alpha: true,
      antialias: true 
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(size, size);
    rendererRef.current = renderer;

    // Load textures
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");

    try {
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(
          'https://s3-us-west-2.amazonaws.com/s.cdpn.io/982762/noise.png',
          resolve,
          undefined,
          reject
        );
      });

      const environment = await new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(
          'https://s3-us-west-2.amazonaws.com/s.cdpn.io/982762/env_lat-lon.png',
          resolve,
          undefined,
          reject
        );
      });

      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.minFilter = THREE.LinearFilter;

      environment.wrapS = THREE.RepeatWrapping;
      environment.wrapT = THREE.RepeatWrapping;
      environment.minFilter = THREE.LinearFilter;

      // Create uniforms
      const uniforms = {
        u_time: { type: "f", value: 1.0 },
        u_resolution: { type: "v2", value: new THREE.Vector2() },
        u_noise: { type: "t", value: texture },
        u_environment: { type: "t", value: environment },
        u_mouse: { type: "v2", value: new THREE.Vector2() }
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
      material.extensions = { derivatives: true };

      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      // Set initial resolution
      uniforms.u_resolution.value.x = renderer.domElement.width;
      uniforms.u_resolution.value.y = renderer.domElement.height;

      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to load textures:', error);
    }
  };

  const animate = (time: number) => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current || !uniformsRef.current) return;

    const uniforms = uniformsRef.current;
    uniforms.u_time.value = time * 0.0005;

    rendererRef.current.render(sceneRef.current, cameraRef.current);
    animationIdRef.current = requestAnimationFrame(animate);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!uniformsRef.current) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const ratio = rect.height / rect.width;
    uniformsRef.current.u_mouse.value.x = (e.clientX - rect.left - rect.width / 2) / rect.width / ratio;
    uniformsRef.current.u_mouse.value.y = (e.clientY - rect.top - rect.height / 2) / rect.height * -1;
  };

  const handleResize = () => {
    if (!containerRef.current || !rendererRef.current || !uniformsRef.current) return;

    const container = containerRef.current;
    rendererRef.current.setSize(size, size);
    uniformsRef.current.u_resolution.value.x = rendererRef.current.domElement.width;
    uniformsRef.current.u_resolution.value.y = rendererRef.current.domElement.height;
  };

  useEffect(() => {
    if (!isInitialized) {
      initThreeJS();
    }
  }, [isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      animate(0);
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
        }
      };
    }
  }, [isInitialized]);

  return (
    <div 
      ref={containerRef}
      className={`plasma-ball-container ${className}`}
      style={{ width: size, height: size }}
      onMouseMove={handleMouseMove}
      onClick={onClick}
    >
      <canvas ref={canvasRef} />
    </div>
  );
};

export default PlasmaBall; 