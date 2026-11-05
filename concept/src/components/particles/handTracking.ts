import type { RefObject } from 'react';

declare global {
  interface Window {
    Hands: unknown;
    Camera: unknown;
  }
}

/**
 * Shared mutable state bridging hand tracking (writes) and the
 * particle animation loop (reads rotation velocity / position deltas).
 */
export interface HandState {
  position: { x: number; y: number; z: number };
  lastPosition: { x: number; y: number; z: number };
  rotationVelocity: { x: number; y: number };
  currentGesture: string;
}

export const createHandState = (): HandState => ({
  position: { x: 0, y: 0, z: 0 },
  lastPosition: { x: 0, y: 0, z: 0 },
  rotationVelocity: { x: 0, y: 0 },
  currentGesture: 'none',
});

interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

interface HandsResults {
  multiHandLandmarks?: HandLandmark[][];
  multiHandedness?: { label: string }[];
}

export interface InitializeHandsOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  handState: HandState;
  setGestureLabel: (label: string) => void;
  setCameraReady: (ready: boolean) => void;
  /** Called once per gesture *transition* so the caller can trigger a formation. */
  onGestureChange: (gesture: string) => void;
}

const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

export const initializeHands = async ({
  videoRef,
  handState,
  setGestureLabel,
  setCameraReady,
  onGestureChange,
}: InitializeHandsOptions): Promise<void> => {
  try {
    console.log('Loading MediaPipe scripts...');
    await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');
    await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
    console.log('MediaPipe scripts loaded');

    if (!window.Hands) {
      throw new Error('MediaPipe Hands not loaded');
    }

    const HandsConstructor = window.Hands as new (config: {
      locateFile: (file: string) => string;
    }) => {
      setOptions: (options: Record<string, unknown>) => void;
      onResults: (callback: (results: HandsResults) => void) => void;
      send: (data: { image: HTMLVideoElement }) => Promise<void>;
    };

    const hands = new HandsConstructor({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    const onResults = (results: HandsResults) => {
      const { position, lastPosition, rotationVelocity } = handState;

      if (results.multiHandLandmarks && results.multiHandedness) {
        let detectedHands = 0;
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
          const landmarks = results.multiHandLandmarks[i];
          const handedness = results.multiHandedness[i].label;
          detectedHands++;

          // Track hand position for rotation control (mirrored for natural perspective)
          const palmCenter = landmarks[9];
          lastPosition.x = position.x;
          lastPosition.y = position.y;
          lastPosition.z = position.z;
          position.x = -(palmCenter.x - 0.5) * 2; // Negative X for left-right mirroring
          position.y = (palmCenter.y - 0.5) * 2; // Positive Y for up-down mirroring
          position.z = palmCenter.z;

          if (handedness === 'Left') {
            const isIndexUp = landmarks[8].y < landmarks[6].y;
            const isMiddleUp = landmarks[12].y < landmarks[10].y;
            const isRingUp = landmarks[16].y < landmarks[14].y;
            const isPinkyUp = landmarks[20].y < landmarks[18].y;

            let gesture = 'none';

            // Check for pinky pointing (only pinky up)
            if (!isIndexUp && !isMiddleUp && !isRingUp && isPinkyUp) {
              gesture = 'pinky';
              if (handState.currentGesture !== 'pinky') {
                onGestureChange('pinky');
                handState.currentGesture = 'pinky';
              }
            } else if (isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp) {
              gesture = 'peace';
              if (handState.currentGesture !== 'peace') {
                onGestureChange('peace');
                handState.currentGesture = 'peace';
              }
            } else if (isIndexUp && isMiddleUp && isRingUp && isPinkyUp) {
              gesture = 'open';
              if (handState.currentGesture !== 'open') {
                onGestureChange('open');
                handState.currentGesture = 'open';
              }
            } else if (!isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
              gesture = 'fist';
              if (handState.currentGesture !== 'fist') {
                onGestureChange('fist');
                handState.currentGesture = 'fist';
              }
            }
            setGestureLabel(
              `LEFT hand: ${gesture} (${detectedHands} hand${detectedHands > 1 ? 's' : ''} detected)`
            );
          } else {
            setGestureLabel(
              `RIGHT hand detected (use LEFT hand) - ${detectedHands} hand${detectedHands > 1 ? 's' : ''} total`
            );
          }
        }
      } else {
        setGestureLabel('No hands detected - show your LEFT hand');
        // Decay rotation when no hand detected
        rotationVelocity.x *= 0.95;
        rotationVelocity.y *= 0.95;
      }
    };

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
      height: 480,
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
