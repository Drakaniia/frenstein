import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const messages = [
  'Life will be better with education.',
  "I just don't think that,",
  'A degree is just a paper.',
  'In my perspective,',
  'I will have a better future.',
  'Stop telling me,',
  "It's notorious!",
  'Achieving dreams,',
  'Spending my time in studying and',
  'Overthinking much—yet,',
  "I'll succeed my goals",
  "I don't believe that,",
  'Life is not worthwhile.',
];

export const ScrollMessage = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const lines = containerRef.current?.querySelectorAll('.message-line');
    if (!lines || lines.length === 0) return;

    // Clear existing triggers for this component only
    ScrollTrigger.getAll().forEach(trigger => {
      if (trigger.trigger === containerRef.current) {
        trigger.kill();
      }
    });

    // Create an elegant heart-shaped path across the entire page
    const updatePath = () => {
      if (!svgRef.current || !pathRef.current) return;

      const svgRect = svgRef.current.getBoundingClientRect();
      const width = svgRect.width;
      const height = svgRect.height;

      // Center and scale the heart
      const centerX = width / 2;
      const centerY = height / 2;
      const scale = Math.min(width, height) * 0.35;

      // Mathematical heart curve using parametric equations
      // Starting from bottom point, going counterclockwise
      const numPoints = 100;
      const points = [];

      for (let i = 0; i <= numPoints; i++) {
        const t = (i / numPoints) * 2 * Math.PI;

        // Heart curve equations (parametric form)
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = -(
          13 * Math.cos(t) -
          5 * Math.cos(2 * t) -
          2 * Math.cos(3 * t) -
          Math.cos(4 * t)
        );

        points.push({
          x: centerX + (x * scale) / 16,
          y: centerY + (y * scale) / 16,
        });
      }

      // Create smooth path with curves
      let pathData = `M ${points[0].x} ${points[0].y}`;

      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const next = points[i + 1] || points[0];

        // Calculate control points for smooth curves
        const cp1x = prev.x + (curr.x - prev.x) * 0.5;
        const cp1y = prev.y + (curr.y - prev.y) * 0.5;
        const cp2x = curr.x - (next.x - curr.x) * 0.5;
        const cp2y = curr.y - (next.y - curr.y) * 0.5;

        pathData += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
      }

      pathRef.current.setAttribute('d', pathData);

      // Get path length for animation
      const pathLength = pathRef.current.getTotalLength();
      pathRef.current.style.strokeDasharray = `${pathLength}`;
      pathRef.current.style.strokeDashoffset = `${pathLength}`;
    };

    // Initial path setup
    updatePath();

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: `+=${window.innerHeight * 3}`,
        scrub: 1,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    // Animate lines in sequence
    lines.forEach((line, index) => {
      gsap.set(line, { opacity: 0, y: 30 });

      tl.to(
        line,
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: 'power2.out',
        },
        index * 0.3
      );

      tl.to({}, { duration: 0.2 });
    });

    // Animate path drawing
    if (pathRef.current) {
      const pathLength = pathRef.current.getTotalLength();
      gsap.to(pathRef.current, {
        strokeDashoffset: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: `+=${window.innerHeight * 3}`,
          scrub: true,
        },
      });
    }

    // Progress bar animation
    gsap.to(progressRef.current, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: `+=${window.innerHeight * 3}`,
        scrub: true,
      },
    });

    // Update path on resize
    window.addEventListener('resize', updatePath);

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
      window.removeEventListener('resize', updatePath);
    };
  }, []);

  return (
    <>
      {/* Progress bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-muted z-50">
        <div
          ref={progressRef}
          className="h-full bg-gradient-celebration origin-left scale-x-0"
        />
      </div>

      <section
        ref={containerRef}
        className="min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden"
      >
        {/* SVG Path Overlay - Big S Curve */}
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          style={{ overflow: 'visible' }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ec4899" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#f43f5e" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#fb923c" stopOpacity="0.8" />
            </linearGradient>

            {/* Glow filter */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            ref={pathRef}
            stroke="url(#pathGradient)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            opacity="0.7"
          />
        </svg>

        <div className="max-w-2xl mx-auto space-y-6 relative z-20">
          {messages.map((message, index) => (
            <p
              key={index}
              className="message-line text-xl md:text-3xl font-medium text-center leading-snug"
            >
              {message}
            </p>
          ))}
        </div>
      </section>
    </>
  );
};
