import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LandingCard } from '@/components/LandingCard';
import { HeroSection } from '@/components/HeroSection';
import { ScrollMessage } from '@/components/ScrollMessage';
import { MemoryGallery } from '@/components/MemoryGallery';
import { HoverMouse } from '@/components/HoverMouse';
import { ConfettiEffect } from '@/components/ConfettiEffect';
import { GlobalBackground } from '@/components/GlobalBackground';

const Index = () => {
  const [opened, setOpened] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleOpen = () => {
    setShowConfetti(true);
    setTimeout(() => {
      setOpened(true);
      setShowConfetti(false);
    }, 800);
  };

  return (
    <>
      {/* Global background applied to all sections */}
      <GlobalBackground />

      <ConfettiEffect trigger={showConfetti} />

      {!opened ? (
        <LandingCard onOpen={handleOpen} />
      ) : (
        <>
          <HeroSection />
          <ScrollMessage />
          <MemoryGallery />
          <HoverMouse />
          
          {/* Navigation to particle system */}
          <div className="min-h-screen flex items-center justify-center relative z-10 bg-black/60">
            <div className="text-center space-y-8 px-4">
              <h2 className="text-5xl md:text-7xl font-bold text-white mb-4">
                Ready for More?
              </h2>
              <p className="text-xl md:text-2xl text-white/80 mb-8">
                Experience an interactive 3D particle system controlled by your hand gestures
              </p>
              <div className="flex justify-center">
                <Link
                  to="/final"
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full text-lg font-semibold hover:scale-105 transition-transform duration-300 shadow-lg hover:shadow-purple-500/50"
                >
                  🎨 Enter Particle Experience
                </Link>
              </div>
              <p className="text-sm text-white/60 mt-4">
                Camera access required for hand tracking
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Index;
