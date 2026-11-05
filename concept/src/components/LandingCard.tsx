import { useRef, useState } from 'react';
import { animate } from 'motion';
import { Card } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import giigGif from '@/assets/giig.gif';

interface LandingCardProps {
  onOpen: () => void;
}

export const LandingCard = ({ onOpen }: LandingCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pin, setPin] = useState(['', '', '', '']);
  const [isAnimating, setIsAnimating] = useState(false);
  const correctPin = '2306';

  const handlePinInput = (index: number, value: string) => {
    if (isAnimating) return;
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (value && index < 3) {
      const nextInput = document.getElementById(`pin-${index + 1}`);
      nextInput?.focus();
    }

    if (newPin.every(digit => digit !== '') && newPin.join('') === correctPin) {
      setIsAnimating(true);
      // Spring-based exit: critically damped for a smooth, decisive vanish
      // with a subtle rotation that carries momentum
      setTimeout(() => {
        animate(
          cardRef.current!,
          { scale: 0, rotate: 360, opacity: 0 },
          { type: 'spring', bounce: 0, duration: 0.5 }
        ).then(() => onOpen());
      }, 200);
    } else if (newPin.every(digit => digit !== '')) {
      // Spring-based shake: impulse displacement that oscillates and settles naturally
      setIsAnimating(true);
      animate(
        cardRef.current!,
        { x: [0, -12, 10, -8, 6, -3, 0] },
        { type: 'spring', bounce: 0.4, duration: 0.5 }
      ).then(() => {
        setIsAnimating(false);
        setPin(['', '', '', '']);
        document.getElementById('pin-0')?.focus();
      });
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Ambient background glow — material depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-50/80 via-white/60 to-rose-50/80 backdrop-blur-sm" />

      <Card
        ref={cardRef}
        className="relative z-10 bg-white/75 backdrop-blur-xl shadow-2xl overflow-hidden max-w-4xl w-full mx-4
          border border-white/40 ring-1 ring-black/5"
        style={{
          boxShadow:
            '0 25px 60px -12px rgba(236, 72, 153, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.4) inset',
        }}
      >
        <div className="flex flex-col md:flex-row">
          {/* Left side - Picture Area */}
          <div className="md:w-1/2 bg-gradient-to-br from-pink-300/90 to-rose-300/90 backdrop-blur-sm p-8 flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-90 h-90 items-center justify-center mb-4 mx-auto">
                <img
                  src={giigGif}
                  alt="Animated GIF"
                  className="w-full h-full object-cover rounded-2xl shadow-lg"
                />
              </div>
            </div>
          </div>

          {/* Right side - Vault Lock */}
          <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-gradient-to-br from-pink-50/90 to-white/90 backdrop-blur-sm">
            <div className="text-center space-y-6">
              {/* Lock Icon */}
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-pink-400 rounded-full blur-xl opacity-30 animate-pulse" />
                <div className="relative bg-gradient-to-br from-pink-400 to-rose-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-lg">
                  <Lock className="w-10 h-10 text-white" />
                </div>
              </div>

              <h2
                className="text-3xl font-bold text-gray-800 tracking-tight"
                style={{ letterSpacing: '-0.01em' }}
              >
                Enter PIN to Unlock
              </h2>
              <p className="text-pink-600 text-sm">
                Your special message awaits...
              </p>

              {/* PIN Input */}
              <div className="flex gap-3 justify-center mt-8">
                {pin.map((digit, index) => (
                  <input
                    key={index}
                    id={`pin-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handlePinInput(index, e.target.value)}
                    onKeyDown={e => handleKeyDown(index, e)}
                    disabled={isAnimating}
                    className="w-14 h-14 text-center text-2xl font-bold border-2 border-pink-300/80 rounded-lg
                      focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200
                      bg-white/80 backdrop-blur-sm transition-all duration-100
                      disabled:opacity-50"
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              {/* Numpad — pointer-down feedback per Apple: respond on press, not release */}
              <div className="mt-6 space-y-2">
                {[
                  [1, 2, 3],
                  [4, 5, 6],
                  [7, 8, 9],
                ].map((row, ri) => (
                  <div key={ri} className="flex gap-2 justify-center">
                    {row.map(num => (
                      <button
                        key={num}
                        disabled={isAnimating}
                        onClick={() => {
                          const emptyIndex = pin.findIndex(d => d === '');
                          if (emptyIndex !== -1)
                            handlePinInput(emptyIndex, num.toString());
                        }}
                        className="w-12 h-12 bg-pink-100/80 backdrop-blur-sm rounded-lg font-semibold text-pink-700
                          transition-all duration-75
                          hover:bg-pink-200/90
                          active:scale-90 active:bg-pink-300
                          disabled:opacity-50 disabled:cursor-not-allowed
                          border border-pink-200/50"
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                ))}
                <div className="flex gap-2 justify-center">
                  <button
                    disabled={isAnimating}
                    onClick={() => setPin(['', '', '', ''])}
                    className="w-12 h-12 bg-gray-100/80 backdrop-blur-sm rounded-lg font-semibold text-gray-700 text-xs
                      transition-all duration-75 hover:bg-gray-200/90 active:scale-90 active:bg-gray-300
                      disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200/50"
                  >
                    CLR
                  </button>
                  <button
                    disabled={isAnimating}
                    onClick={() => {
                      const emptyIndex = pin.findIndex(d => d === '');
                      if (emptyIndex !== -1) handlePinInput(emptyIndex, '0');
                    }}
                    className="w-12 h-12 bg-pink-100/80 backdrop-blur-sm rounded-lg font-semibold text-pink-700
                      transition-all duration-75 hover:bg-pink-200/90 active:scale-90 active:bg-pink-300
                      disabled:opacity-50 disabled:cursor-not-allowed border border-pink-200/50"
                  >
                    0
                  </button>
                  <button
                    disabled={isAnimating}
                    onClick={() => {
                      const lastFilledIndex = pin
                        .map((d, i) => (d ? i : -1))
                        .filter(i => i !== -1)
                        .pop();
                      if (lastFilledIndex !== undefined) {
                        const newPin = [...pin];
                        newPin[lastFilledIndex] = '';
                        setPin(newPin);
                      }
                    }}
                    className="w-12 h-12 bg-gray-100/80 backdrop-blur-sm rounded-lg font-semibold text-gray-700 text-xs
                      transition-all duration-75 hover:bg-gray-200/90 active:scale-90 active:bg-gray-300
                      disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200/50"
                  >
                    ←
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
