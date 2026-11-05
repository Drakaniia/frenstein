import * as THREE from 'three';

export const PARTICLE_COUNT = 15000;

/**
 * Pure particle-formation helpers. Each function writes into the shared
 * `targetPositions` and `colors` buffers that the particle system lerps
 * toward during its animation loop.
 */

export const createDispersed = (targetPositions: Float32Array, colors: Float32Array) => {
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

export const createSaturn = (targetPositions: Float32Array, colors: Float32Array) => {
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

export const createText = (targetPositions: Float32Array, colors: Float32Array) => {
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
    ctx.fillText('I Love You', width / 2, height / 2 - 40);
    ctx.fillText('Frenstein', width / 2, height / 2 + 40);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const validPoints: number[] = [];

    // Sample pixels to get text shape
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const index = (y * width + x) * 4;
        if (data[index] > 128) {
          // If pixel is bright
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
