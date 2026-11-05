import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Cake, Sparkles } from 'lucide-react';
import HeroImage from '@/assets/Hero Image.png';

gsap.registerPlugin(ScrollTrigger);

export const HeroSection = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cakeRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline();

    // Initial animations
    tl.from(heroRef.current, {
      opacity: 0,
      scale: 0.8,
      duration: 0.8,
      ease: 'back.out',
    })
      .from(titleRef.current, {
        opacity: 0,
        y: 50,
        duration: 0.6,
        ease: 'power3.out',
      })
      .from(
        cakeRef.current,
        {
          opacity: 0,
          scale: 0,
          rotation: -180,
          duration: 0.8,
          ease: 'elastic.out',
        },
        '-=0.4'
      );

    // Continuous sparkle animation
    gsap.to('.sparkle', {
      rotation: 360,
      duration: 4,
      ease: 'linear',
      repeat: -1,
    });

    // Set initial positions - intro content centered, image hidden on right
    gsap.set(introRef.current, {
      xPercent: 0, // Start at center
      x: 0,
    });
    gsap.set(imageContainerRef.current, {
      x: '100%', // Start completely hidden on the right
      opacity: 0,
    });

    // Scroll-triggered animations with pinning
    ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top top',
      end: '+=20%',
      scrub: 1,
      pin: true, // Pin the section during scroll
      anticipatePin: 1,
      onUpdate: self => {
        const progress = self.progress;

        // Move intro content to the left gradually (starts moving right away)
        gsap.to(introRef.current, {
          x: -progress * 300,
          duration: 0.4,
          ease: 'power2.out',
        });

        // Image reveals earlier - starts at 30% scroll progress
        const imageProgress = Math.max(0, (progress - 0.3) / 0.7); // Starts at 30%, full at 100%

        gsap.to(imageContainerRef.current, {
          x: (1 - imageProgress) * 50 + '%', // Move from 100% to 0%
          opacity: imageProgress,
          duration: 0.4,
          ease: 'power2.out',
        });
      },
    });

    return () => {
      // Only kill ScrollTriggers that belong to this component
      ScrollTrigger.getAll().forEach(trigger => {
        if (trigger.trigger === containerRef.current) {
          trigger.kill();
        }
      });
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="min-h-screen relative overflow-hidden bg-transparent z-10"
    >
      {/* Hero intro content - starts centered */}
      <div
        ref={heroRef}
        className="absolute inset-0 flex items-center justify-center px-4"
      >
        <div
          ref={introRef}
          className="relative z-10 text-center max-w-4xl mx-auto"
        >
          <div className="mb-8 flex justify-center gap-8">
            <Sparkles className="sparkle w-12 h-12 text-primary" />
            <div ref={cakeRef}>
              <Cake className="w-24 h-24 text-secondary" fill="currentColor" />
            </div>
            <Sparkles className="sparkle w-12 h-12 text-accent" />
          </div>

          <h1
            ref={titleRef}
            className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-celebration             
bg-clip-text text-transparent"
          >
            Happy Birthday My Baby! 🎉
          </h1>

          <div className="mt-12 inline-block">
            <div className="animate-bounce text-4xl">👇</div>
            <p className="text-sm text-muted-foreground mt-2">
              Scroll to see more
            </p>
          </div>
        </div>
      </div>

      {/* Image container - starts hidden on the right, reveals sooner during scroll */}
      <div
        ref={imageContainerRef}
        className="absolute right-0 top-0 w-1/2 h-full flex items-center justify-center opacity-0"
        style={{ transform: 'translateX(100%)' }}
      >
        <div className="w-full h-full flex items-center justify-center p-8">
          <img
            src={HeroImage}
            alt="Hero Image"
            className="max-w-full max-h-full"
          />
        </div>
      </div>
    </section>
  );
};
