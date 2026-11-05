import { useEffect, useRef, useState } from 'react';
import { useParticleSystem } from './useParticleSystem';
import { createHandState, initializeHands, type HandState } from './handTracking';

const ParticleSystem3D = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [gestureLabel, setGestureLabel] = useState('Detecting...');
  const [cameraReady, setCameraReady] = useState(false);
  const handStateRef = useRef<HandState | null>(null);
  if (handStateRef.current === null) {
    handStateRef.current = createHandState();
  }
  const handState = handStateRef.current;

  const { setFormation } = useParticleSystem(containerRef, handState);

  useEffect(() => {
    if (!videoRef.current) return;

    initializeHands({
      videoRef,
      handState,
      setGestureLabel,
      setCameraReady,
      onGestureChange: (gesture) => {
        if (gesture === 'pinky' || gesture === 'peace') {
          setFormation('text');
        } else if (gesture === 'open') {
          setFormation('dispersed');
        } else if (gesture === 'fist') {
          setFormation('saturn');
        }
      },
    });
  }, [setFormation, handState]);

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
            <div className="text-white/70 text-xs">{gestureLabel}</div>
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
