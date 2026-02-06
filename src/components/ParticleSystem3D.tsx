import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

declare global {
  interface Window {
    Hands: unknown;
    Camera: unknown;
  }
}

const ParticleSystem3D = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [gestureLabel, setGestureLabel] = useState("Detecting...");
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !videoRef.current) return;

    const PARTICLE_COUNT = 15000;
    let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, particles: THREE.Points, geometry: THREE.BufferGeometry;
    let positions: Float32Array, targetPositions: Float32Array, colors: Float32Array;
    let currentGesture = "none";
    let animationId: number;
    
    // Hand tracking for rotation control
    let handPosition = { x: 0, y: 0, z: 0 };
    let lastHandPosition = { x: 0, y: 0, z: 0 };
    const rotationVelocity = { x: 0, y: 0 };

    const createDispersed = () => {
      // Widely dispersed particles everywhere
      const colorA = new THREE.Color(0x00ffff);
      const colorB = new THREE.Color(0xff00ff);
      const colorC = new THREE.Color(0xffff00);
      
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        // Large random spread in all directions
        const range = 80;
        targetPositions[i3] = (Math.random() - 0.5) * range;
        targetPositions[i3 + 1] = (Math.random() - 0.5) * range;
        targetPositions[i3 + 2] = (Math.random() - 0.5) * range;
        
        // Random vibrant colors
        const colorChoice = Math.random();
        let mixedColor;
        if (colorChoice < 0.33) {
          mixedColor = colorA.clone().lerp(colorB, Math.random());
        } else if (colorChoice < 0.66) {
          mixedColor = colorB.clone().lerp(colorC, Math.random());
        } else {
          mixedColor = colorC.clone().lerp(colorA, Math.random());
        }
        
        colors[i3] = mixedColor.r; 
        colors[i3 + 1] = mixedColor.g; 
        colors[i3 + 2] = mixedColor.b;
      }
    };

    const createSaturn = () => {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        if (i < PARTICLE_COUNT * 0.6) {
          // Planet sphere with natural spread
          const u = Math.random(); 
          const v = Math.random();
          const theta = 2 * Math.PI * u;
          const phi = Math.acos(2 * v - 1);
          const r = 10 + (Math.random() - 0.5) * 3; // Vary radius for depth
          
          targetPositions[i3] = r * Math.sin(phi) * Math.cos(theta);
          targetPositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
          targetPositions[i3 + 2] = r * Math.cos(phi);
        } else {
          // Ring with thickness
          const angle = Math.random() * Math.PI * 2;
          const r = 15 + Math.random() * 8;
          const thickness = (Math.random() - 0.5) * 3; // Ring thickness
          
          targetPositions[i3] = Math.cos(angle) * r;
          targetPositions[i3 + 1] = thickness;
          targetPositions[i3 + 2] = Math.sin(angle) * r;
        }
        colors[i3] = 1; 
        colors[i3 + 1] = 0.7; 
        colors[i3 + 2] = 0.2;
      }
    };

    const createText = (text: string) => {
      // Create a temporary canvas to sample text coordinates
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const width = 600;
      const height = 300;
      canvas.width = width;
      canvas.height = height;

      if (ctx) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Draw text on two lines
        ctx.fillText("I Love You", width / 2, height / 2 - 40);
        ctx.fillText("Frenstein", width / 2, height / 2 + 40);

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const validPoints: number[] = [];

        // Sample pixels to get text shape
        for (let y = 0; y < height; y += 2) {
          for (let x = 0; x < width; x += 2) {
            const index = (y * width + x) * 4;
            if (data[index] > 128) { // If pixel is bright
              validPoints.push(x - width / 2, -(y - height / 2));
            }
          }
        }

        if (validPoints.length > 0) {
          for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            // Reuse points if we have fewer points than particles
            const pointIndex = (i % (validPoints.length / 2)) * 2;

            // Scale and add minimal spread for readability
            const scale = 0.25;
            const spread = 1.5; // Reduced from 4 to 1.5 for tighter text
            const randomX = (Math.random() - 0.5) * spread;
            const randomY = (Math.random() - 0.5) * spread;
            const randomZ = (Math.random() - 0.5) * spread * 1.5; // Reduced Z spread
            
            targetPositions[i3] = validPoints[pointIndex] * scale + randomX;
            targetPositions[i3 + 1] = validPoints[pointIndex + 1] * scale + randomY;
            targetPositions[i3 + 2] = randomZ;

            // Pink/Purple gradient with depth
            const depthFactor = (randomZ + spread * 0.75) / (spread * 1.5);
            colors[i3] = 0.9 + depthFactor * 0.1;
            colors[i3 + 1] = 0.3 + depthFactor * 0.2;
            colors[i3 + 2] = 0.7 + depthFactor * 0.3;
          }
        }
      }
    };

    const initThree = () => {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 50;

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (containerRef.current) {
        containerRef.current.appendChild(renderer.domElement);
      }

      geometry = new THREE.BufferGeometry();
      positions = new Float32Array(PARTICLE_COUNT * 3);
      targetPositions = new Float32Array(PARTICLE_COUNT * 3);
      colors = new Float32Array(PARTICLE_COUNT * 3);

      for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 100;
        targetPositions[i] = positions[i];
        colors[i] = Math.random();
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending
      });

      particles = new THREE.Points(geometry, material);
      scene.add(particles);
      
      window.addEventListener('resize', onWindowResize);
      createDispersed(); // Start with dispersed particles
    };

    const onResults = (results: { multiHandLandmarks?: unknown[]; multiHandedness?: unknown[] }) => {
      if (results.multiHandLandmarks && results.multiHandedness) {
        let detectedHands = 0;
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
          const landmarks = results.multiHandLandmarks[i] as { x: number; y: number; z: number }[];
          const handedness = (results.multiHandedness[i] as { label: string }).label;
          detectedHands++;

          // Track hand position for rotation control (mirrored for natural perspective)
          const palmCenter = landmarks[9];
          lastHandPosition = { ...handPosition };
          handPosition = {
            x: -(palmCenter.x - 0.5) * 2, // Negative X for left-right mirroring
            y: (palmCenter.y - 0.5) * 2,  // Positive Y for up-down mirroring
            z: palmCenter.z
          };

          if (handedness === "Left") {
            const isIndexUp = landmarks[8].y < landmarks[6].y;
            const isMiddleUp = landmarks[12].y < landmarks[10].y;
            const isRingUp = landmarks[16].y < landmarks[14].y;
            const isPinkyUp = landmarks[20].y < landmarks[18].y;

            let gesture = "none";
            
            // Check for pinky pointing (only pinky up)
            if (!isIndexUp && !isMiddleUp && !isRingUp && isPinkyUp) {
              gesture = "pinky";
              if (currentGesture !== "pinky") { 
                createText("I Love You Frenstein"); 
                currentGesture = "pinky"; 
              }
            } else if (isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp) {
              gesture = "peace";
              if (currentGesture !== "peace") { 
                createText("I Love You Frenstein"); 
                currentGesture = "peace"; 
              }
            } else if (isIndexUp && isMiddleUp && isRingUp && isPinkyUp) {
              gesture = "open";
              if (currentGesture !== "open") { 
                createDispersed(); 
                currentGesture = "open"; 
              }
            } else if (!isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
              gesture = "fist";
              if (currentGesture !== "fist") { 
                createSaturn(); 
                currentGesture = "fist"; 
              }
            }
            setGestureLabel(`LEFT hand: ${gesture} (${detectedHands} hand${detectedHands > 1 ? 's' : ''} detected)`);
          } else {
            setGestureLabel(`RIGHT hand detected (use LEFT hand) - ${detectedHands} hand${detectedHands > 1 ? 's' : ''} total`);
          }
        }
      } else {
        setGestureLabel('No hands detected - show your LEFT hand');
        // Decay rotation when no hand detected
        rotationVelocity.x *= 0.95;
        rotationVelocity.y *= 0.95;
      }
    };

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      const posAttr = geometry.attributes.position;
      const colAttr = geometry.attributes.color;

      // Smooth particle interpolation
      for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
        positions[i] += (targetPositions[i] - positions[i]) * 0.05;
      }
      
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      
      // Hand-controlled rotation
      const deltaX = handPosition.x - lastHandPosition.x;
      const deltaY = handPosition.y - lastHandPosition.y;
      
      // Update rotation velocity based on hand movement
      rotationVelocity.y += deltaX * 0.5;
      rotationVelocity.x += deltaY * 0.5;
      
      // Apply rotation with damping
      particles.rotation.y += rotationVelocity.y * 0.1;
      particles.rotation.x += rotationVelocity.x * 0.1;
      
      // Damping
      rotationVelocity.x *= 0.92;
      rotationVelocity.y *= 0.92;
      
      renderer.render(scene, camera);
    };

    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    const initializeHands = async () => {
      try {
        console.log('Loading MediaPipe scripts...');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
        console.log('MediaPipe scripts loaded');

        if (!window.Hands) {
          throw new Error('MediaPipe Hands not loaded');
        }

        const HandsConstructor = window.Hands as new (config: { locateFile: (file: string) => string }) => {
          setOptions: (options: Record<string, unknown>) => void;
          onResults: (callback: (results: { multiHandLandmarks?: unknown[]; multiHandedness?: unknown[] }) => void) => void;
          send: (data: { image: HTMLVideoElement }) => Promise<void>;
        };

        const hands = new HandsConstructor({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });
        
        hands.setOptions({ 
          maxNumHands: 2, 
          modelComplexity: 1, 
          minDetectionConfidence: 0.5, 
          minTrackingConfidence: 0.5 
        });
        
        hands.onResults(onResults);
        console.log('MediaPipe Hands initialized');

        if (!videoRef.current) {
          throw new Error('Video element not found');
        }

        if (!window.Camera) {
          throw new Error('MediaPipe Camera not loaded');
        }

        const CameraConstructor = window.Camera as new (
          video: HTMLVideoElement,
          config: { onFrame: () => Promise<void>; width: number; height: number }
        ) => { start: () => Promise<void> };

        const cameraFeed = new CameraConstructor(videoRef.current, {
          onFrame: async () => { 
            if (videoRef.current) {
              await hands.send({ image: videoRef.current }); 
            }
          },
          width: 640, 
          height: 480
        });
        
        console.log('Starting camera...');
        await cameraFeed.start();
        console.log('Camera started successfully');
        setCameraReady(true);
        setGestureLabel('Camera ready - show your LEFT hand');
      } catch (error) {
        console.error('Error initializing hands:', error);
        setGestureLabel('Error: ' + (error as Error).message);
      }
    };

    initThree();
    initializeHands();
    animate();

    return () => {
      window.removeEventListener('resize', onWindowResize);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      const container = containerRef.current;
      if (renderer && container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <video
        ref={videoRef}
        className="absolute bottom-6 right-6 z-10 w-48 h-36 rounded-lg object-cover transform scale-x-[-1] border-2 border-white/20"
        autoPlay
        playsInline
        muted
        style={{ display: cameraReady ? 'block' : 'none' }}
      />
      
      <div className="absolute top-6 left-6 z-10 pointer-events-none">
        <div className="bg-black/70 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-2xl pointer-events-auto max-w-xs">
          <div className="text-white/80 text-xs mb-3 text-center">
            Move your LEFT HAND to control particles!
          </div>
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/10 text-center">
              <div className="text-xl mb-1">🖐️</div>
              <div className="text-white/70 text-[10px]">Dispersed</div>
            </div>
            
            <div className="p-2 rounded-lg bg-white/10 text-center">
              <div className="text-xl mb-1">✊</div>
              <div className="text-white/70 text-[10px]">Saturn</div>
            </div>
            
            <div className="p-2 rounded-lg bg-white/10 text-center">
              <div className="text-xl mb-1">✌️</div>
              <div className="text-white/70 text-[10px]">Text</div>
            </div>
            
            <div className="p-2 rounded-lg bg-white/10 text-center">
              <div className="text-xl mb-1">🤙</div>
              <div className="text-white/70 text-[10px]">Text</div>
            </div>
          </div>
          
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-white/60">Camera:</span>
              <span className={`font-semibold ${cameraReady ? 'text-green-400' : 'text-yellow-400'}`}>
                {cameraReady ? '✓ Ready' : '⏳ Loading...'}
              </span>
            </div>
            <div className="text-white/70 text-xs">
              {gestureLabel}
            </div>
          </div>
        </div>
      </div>
      
      {!cameraReady && (
        <div className="absolute bottom-6 right-6 z-10">
          <div className="w-48 h-36 rounded-lg bg-gray-800 flex items-center justify-center border-2 border-white/20">
            <div className="text-white/60 text-xs">Initializing camera...</div>
          </div>
        </div>
      )}
      
      <div className="absolute bottom-6 left-6 z-10">
        <a
          href="/"
          className="px-4 py-2 bg-white/10 backdrop-blur-sm text-white text-sm rounded-full hover:bg-white/20 transition-all border border-white/20 pointer-events-auto"
        >
          ← Back
        </a>
      </div>
    </div>
  );
};

export default ParticleSystem3D;
