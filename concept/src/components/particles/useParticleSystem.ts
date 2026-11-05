import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PARTICLE_COUNT, createDispersed, createSaturn, createText } from './textPoints';
import type { HandState } from './handTracking';

export type Formation = 'dispersed' | 'saturn' | 'text';

/**
 * Owns the Three.js scene: sets up the renderer/camera/particles, runs the
 * animation loop (reading rotation input from `handState`), and exposes a
 * stable `setFormation` callback that targets the formation buffers.
 */
export const useParticleSystem = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  handState: HandState
) => {
  const setFormationRef = useRef<(formation: Formation) => void>(() => {});

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let particles: THREE.Points;
    let geometry: THREE.BufferGeometry;
    let positions: Float32Array;
    let targetPositions: Float32Array;
    let colors: Float32Array;
    let animationId: number;

    const setFormation = (formation: Formation) => {
      if (formation === 'dispersed') {
        createDispersed(targetPositions, colors);
      } else if (formation === 'saturn') {
        createSaturn(targetPositions, colors);
      } else {
        createText(targetPositions, colors);
      }
    };
    setFormationRef.current = setFormation;

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
        blending: THREE.AdditiveBlending,
      });

      particles = new THREE.Points(geometry, material);
      scene.add(particles);

      window.addEventListener('resize', onWindowResize);
      createDispersed(targetPositions, colors); // Start with dispersed particles
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
      const deltaX = handState.position.x - handState.lastPosition.x;
      const deltaY = handState.position.y - handState.lastPosition.y;

      // Update rotation velocity based on hand movement
      handState.rotationVelocity.y += deltaX * 0.5;
      handState.rotationVelocity.x += deltaY * 0.5;

      // Apply rotation with damping
      particles.rotation.y += handState.rotationVelocity.y * 0.1;
      particles.rotation.x += handState.rotationVelocity.x * 0.1;

      // Damping
      handState.rotationVelocity.x *= 0.92;
      handState.rotationVelocity.y *= 0.92;

      renderer.render(scene, camera);
    };

    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    initThree();
    animate();

    return () => {
      window.removeEventListener('resize', onWindowResize);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (renderer && container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [containerRef, handState]);

  const setFormation = useCallback((formation: Formation) => {
    setFormationRef.current(formation);
  }, []);

  return { setFormation };
};
