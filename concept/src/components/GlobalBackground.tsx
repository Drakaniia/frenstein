import { useEffect, useRef } from 'react';

export const GlobalBackground = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    // Create a smooth S-curve path across the entire viewport
    const updatePath = () => {
      if (!svgRef.current || !pathRef.current) return;

      const svgRect = svgRef.current.getBoundingClientRect();
      const width = svgRect.width;
      const height = svgRect.height;

      // Define a beautiful S-curve that spans the entire page
      const startX = width * 0.2;
      const startY = height * 0.1;
      const endX = width * 0.8;
      const endY = height * 0.9;

      // Control points for smooth S-curve
      const cp1x = width * 0.8;
      const cp1y = height * 0.3;
      const cp2x = width * 0.2;
      const cp2y = height * 0.7;

      const pathData = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
      pathRef.current.setAttribute('d', pathData);

      // Get path length for animation
      const pathLength = pathRef.current.getTotalLength();
      pathRef.current.style.strokeDasharray = `${pathLength}`;
      pathRef.current.style.strokeDashoffset = `0`;
    };

    // Initial path setup
    updatePath();

    // Update path on resize
    window.addEventListener('resize', updatePath);

    return () => {
      window.removeEventListener('resize', updatePath);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {/* Global gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-50 via-white to-rose-50" />

      {/* Background hearts scattered across the entire viewport */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(25)].map((_, i) => (
          <div
            key={i}
            className="absolute text-pink-300 opacity-20 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              fontSize: `${Math.random() * 30 + 20}px`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          >
            ♡
          </div>
        ))}
      </div>

      {/* Global SVG Path Overlay - Big S Curve */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ overflow: 'visible' }}
        preserveAspectRatio="none"
      >
        <defs>
          {/* Glow filter */}
          <filter id="globalGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          ref={pathRef}
          stroke="url(#globalPathGradient)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#globalGlow)"
          opacity="0.5"
        />
      </svg>
    </div>
  );
};
