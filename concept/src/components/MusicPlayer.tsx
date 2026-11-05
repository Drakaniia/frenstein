import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import CoverImage from '@/assets/Cover of seven by Taylor Swift.jpg';
import AudioFile from '@/assets/seven - Taylor Swift.mp3';

/** Audio player extracted from HoverMouse.tsx — owns playback state and controls. */
export const MusicPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTrack] = useState({
    title: 'seven',
    artist: 'Taylor Swift',
    coverImage: CoverImage,
    audioFile: AudioFile,
  });

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  return (
    <>
      {/* Audio Element */}
      <audio ref={audioRef} src={currentTrack.audioFile} preload="metadata" />

      {/* Music Player */}
      <Card className="p-4 mb-6">
        <div className="text-center mb-4">
          {/* Album Cover */}
          <div className="w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden shadow-lg">
            <img
              src={currentTrack.coverImage}
              alt={`${currentTrack.title} cover`}
              className="w-full h-full object-cover"
              onError={e => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML =
                    '<div class="w-full h-full bg-gradient-to-r from-pink-400 to-purple-500 rounded-full flex items-center justify-center"><svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15" /></svg></div>';
                }
              }}
            />
          </div>
          <h3 className="font-semibold text-gray-800">{currentTrack.title}</h3>
          <p className="text-sm text-gray-600">{currentTrack.artist}</p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4 cursor-pointer" onClick={handleProgressClick}>
          <div
            className="bg-gradient-to-r from-pink-400 to-purple-500 h-2 rounded-full transition-all duration-100"
            style={{
              width: duration ? `${(currentTime / duration) * 100}%` : '0%',
            }}
          ></div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-4">
          <Button variant="ghost" size="sm">
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button
            onClick={togglePlay}
            className="bg-gradient-to-r from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm">
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </Card>
    </>
  );
};
