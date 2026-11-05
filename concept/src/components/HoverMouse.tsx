import { Card } from '@/components/ui/card';
import { MusicPlayer } from './MusicPlayer';
import { useMouseTrail } from './useMouseTrail';

export const HoverMouse = () => {
  const { containerRef, trailImages } = useMouseTrail();

  return (
    <section className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 relative overflow-hidden">
      <div className="flex h-screen">
        {/* Left Side - Music Player and Message — heavier translucent material (structural) */}
        <div
          className="w-96 p-6 overflow-y-auto relative z-20"
          style={{
            background: 'rgba(255, 255, 255, 0.55)',
            backdropFilter: 'blur(24px) saturate(180%)',
            boxShadow:
              '4px 0 30px rgba(0, 0, 0, 0.08), inset -1px 0 0 rgba(255, 255, 255, 0.4)',
          }}
        >
          <MusicPlayer />

          {/* Birthday Message — lighter translucent card */}
          <Card
            className="p-6 mt-4"
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(16px) saturate(160%)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)',
            }}
          >
            <h2
              className="text-3xl font-bold mb-4 text-center bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent tracking-tight"
              style={{
                fontFamily: 'Dancing Script, cursive',
                letterSpacing: '-0.01em',
                lineHeight: '1.15',
              }}
            >
              Happy 20th Birthday, Mi Amor!
            </h2>
            <div className="space-y-4 text-gray-700 leading-relaxed">
              <p>
                It's hard to believe how many stories have already been written
                on every page of your chapter. Even though not every moment is a
                good one, each experience—both joyful and painful—has shaped who
                you are today. Life doesn't always follow the path we expect,
                but every obstacle you've faced has added depth to your story
                and strength to your heart.
              </p>
              <p>
                As the poem says, "Don't overthink yet—you'll succeed in your
                goals." Those words remind me that even when life feels
                uncertain, education will always be a light that guides us
                toward a better future. It teaches us that a degree is not just
                a piece of paper, but a symbol of our hard work, sleepless
                nights, and faith in ourselves. We may face doubt, fear, and
                even moments of exhaustion, but the journey of learning shapes
                who we are and who we will become.
              </p>
              <p>
                My sincere apology for the days I wasn't by your side, or when I
                was too stubborn to understand. Especially last year on your
                birthday—I didn't even give you anything, not even a simple
                gesture to show how much I cared. I know there were times when
                my attitude hurt you, when my actions made you upset, and for
                that, I'm truly sorry.
              </p>
              <p>
                I never meant to make you feel unappreciated or unloved.
                Sometimes I get lost in my own thoughts and forget how my
                silence or mistakes can affect others. But please know that deep
                down, I've always valued you and the moments we've shared.
              </p>
              <p>
                I can't change the past, but I can promise to be better—to
                listen more, to care more, and to show more of the gratitude you
                deserve. I'm hoping that you'll still forgive me, still see the
                good in me, and still believe that I'm trying my best to grow
                and make things right.
              </p>
              <p>
                But here we are today. I wish I could be by your side right
                now—to look at you and show you just how lucky I am to have you
                in my life. Every moment with you feels like a reminder that
                even in the most ordinary days, love can make everything
                brighter.
              </p>
              <p>
                Remember that you are deeply loved, cherished, and supported in
                every step you take. You've touched my life in ways words can
                hardly express, and I'll always be grateful for that.
              </p>
              <p>
                May this year bring you endless happiness, success, and
                everything your heart desires. You deserve nothing less than the
                best that life can offer. And no matter where we are or how far
                apart we may be, my thoughts and care will always find their way
                to you.
              </p>
              <p className="text-center font-semibold text-purple-600 mt-6">
                With all my love and best wishes! 💕
              </p>
            </div>
          </Card>
        </div>

        {/* Center - Interactive Trail Area */}
        <div
          ref={containerRef}
          className="flex-1 flex items-center justify-center cursor-none relative overflow-hidden"
        >
          {/* Trail Images */}
          {trailImages.map(img => (
            <div
              key={img.id}
              ref={el => {
                if (el && !img.ref) {
                  img.ref = el;
                }
              }}
              className="absolute pointer-events-none"
              style={{
                left: img.x - 40,
                top: img.y - 50,
                zIndex: 10,
                willChange: 'transform, opacity',
              }}
            >
              {/* Polaroid-style frame */}
              <div
                className="p-2"
                style={{
                  width: '80px',
                  background: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(8px)',
                  boxShadow:
                    '0 10px 30px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.3)',
                }}
              >
                <div className="bg-gray-200 w-full h-20 overflow-hidden">
                  <img
                    src={img.image}
                    alt="trail"
                    className="w-full h-full object-cover"
                    onError={e => {
                      const target = e.target as HTMLImageElement;
                      target.src =
                        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23fbbf24" width="100" height="100"/%3E%3Ctext x="50" y="50" font-size="40" text-anchor="middle" dy=".3em"%3E🎉%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
                <div className="h-4 bg-white/80" />
              </div>
            </div>
          ))}

          <div className="text-center z-0">
            <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 animate-pulse tracking-tight">
              HOVER YOUR MOUSE
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              USE LAPTOP OR DESKTOP FOR BETTER EXPERIENCE
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
