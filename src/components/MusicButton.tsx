import { useCallback, useEffect, useRef, useState } from 'react';
import volumeImg from '../../assets/volume.svg';
import Button from './buttons/Button';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'react-toastify';
import { audioContextManager } from '../utils/audioContextManager';

export default function MusicButton({ isChaseActive, isPartyActive }: { isChaseActive: boolean, isPartyActive: boolean }) {
  const musicUrl = useQuery(api.music.getBackgroundMusic);
  const [userWantsMusic, setUserWantsMusic] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize music state from saved state
  useEffect(() => {
    if (isInitialized) return;

    const savedState = audioContextManager.getMusicState();
    const hasPrompted = localStorage.getItem('audioPromptShown') === 'true';
    
    // First-time prompt if needed
    if (!hasPrompted) {
      // Auto-enable audio for the first time without prompt
      setUserWantsMusic(true);
      audioContextManager.saveMusicState(true, false, 0, 0.5);
      localStorage.setItem('audioPromptShown', 'true');
      localStorage.setItem('musicOn', '1');
    } else if (savedState) {
      // Restore previous state
      setUserWantsMusic(savedState.isPlaying);
      if (savedState.isPartyMusic && savedState.isPlaying) {
        setCurrentSong(savedState.trackIndex);
      }
    } else {
      // Default to music on if no saved state
      setUserWantsMusic(true);
      audioContextManager.saveMusicState(true, false, 0, 0.5);
      localStorage.setItem('musicOn', '1');
    }
    
    setIsInitialized(true);
  }, [isInitialized, isPartyActive]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const partyAudioRef = useRef<HTMLAudioElement | null>(null);
  const [currentSong, setCurrentSong] = useState(0);

  const partyPlaylist = [
    '/assets/mariachi.wav',
    '/assets/cumbia.wav',
    '/assets/salsa.wav',
  ];

  const isPlaying = userWantsMusic && !isChaseActive && !isPartyActive;

  // Initialize audio context on first interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      // This will set up the audio context and unlock it
      audioContextManager.getAudioContext();
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction, { once: true });
    document.addEventListener('keydown', handleFirstInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  // Main audio effect with improved error handling
  useEffect(() => {
    if (!musicUrl) return;
    
    // Clean up old element
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {}
    }
    
    let revokedUrl: string | null = null;
    
    const initializeAudio = async () => {
      try {
        const base = (import.meta as any).env?.BASE_URL || '/';
        const withBase = (p: string) => {
          const normalizedBase = base.endsWith('/') ? base : `${base}/`;
          return p.replace(/^\//, '').startsWith('assets/')
            ? `${normalizedBase}${p.replace(/^\//, '')}`
            : p;
        };
        
        const candidates = Array.from(
          new Set([
            musicUrl,
            withBase('assets/background.mp3'),
            withBase('assets/background.ogg'),
            withBase('assets/background.wav'),
            'assets/background.mp3',
            'assets/background.ogg',
            'assets/background.wav',
          ]),
        );

        let created = false;
        for (const url of candidates) {
          try {
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) continue;
            const blob = await res.blob();
            if (!blob || blob.size === 0) continue;
            
            const objUrl = URL.createObjectURL(blob);
            revokedUrl = objUrl;
            
            const audio = new Audio(objUrl);
            audio.loop = true;
            audio.preload = 'auto';
            audio.volume = 0.5;
            audioRef.current = audio;
            
            // Try to play to warm up the audio context
            if (isPlaying) {
              const playPromise = audio.play();
              if (playPromise !== undefined) {
                playPromise.catch(() => {
                  // Autoplay was prevented, we'll handle this in the play/pause effect
                });
              }
            }
            
            created = true;
            break;
          } catch (e) {
            console.warn(`Failed to load audio from ${url}`, e);
          }
        }
        
        if (!created) throw new Error('No playable audio sources found');
      } catch (e) {
        console.error('Failed to initialize audio element:', e);
        toast.error('Music unavailable. Tap the Music button again or try later.');
      }
    };
    
    initializeAudio();
    
    return () => {
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [musicUrl, isPlaying]);

  // Handle party music state changes
  useEffect(() => {
    if (!isInitialized) return;
    
    if (isPartyActive && userWantsMusic && !isChaseActive) {
      audioContextManager.saveMusicState(true, true, currentSong, 0.5);
    } else if (!isPartyActive && userWantsMusic) {
      audioContextManager.saveMusicState(true, false, 0, 0.5);
    }
  }, [isPartyActive, userWantsMusic, isChaseActive, currentSong, isInitialized]);

  // Party music handler with improved autoplay
  useEffect(() => {
    if (!isInitialized) return;
    
    if (!isPartyActive || !userWantsMusic || isChaseActive) {
      partyAudioRef.current?.pause();
      return;
    }

    const playPartyMusic = async () => {
      if (!partyAudioRef.current) {
        partyAudioRef.current = new Audio();
        partyAudioRef.current.volume = 0.5;
        partyAudioRef.current.preload = 'auto';
        partyAudioRef.current.addEventListener('ended', () => {
          setCurrentSong((prev) => (prev + 1) % partyPlaylist.length);
        });
      }

      try {
        // Only try to play if we don't have a source or if the source is different
        if (!partyAudioRef.current.src || 
            !partyAudioRef.current.src.endsWith(partyPlaylist[currentSong])) {
          partyAudioRef.current.src = partyPlaylist[currentSong];
          
          // Try to play immediately
          const playPromise = partyAudioRef.current.play();
          
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.log('Autoplay prevented, will start after user interaction');
              // Set up a one-time play on user interaction
              const playOnInteraction = () => {
                document.removeEventListener('click', playOnInteraction);
                document.removeEventListener('keydown', playOnInteraction);
                partyAudioRef.current?.play().catch(console.error);
              };
              document.addEventListener('click', playOnInteraction, { once: true });
              document.addEventListener('keydown', playOnInteraction, { once: true });
            });
          }
        } else if (partyAudioRef.current.paused) {
          // If we already have the right source but it's paused, try to play
          await partyAudioRef.current.play().catch(console.error);
        }
      } catch (e) {
        console.error('Error playing party music:', e);
      }
    };

    // Try to play when component mounts or dependencies change
    playPartyMusic();

    // Also try to play when page becomes visible (e.g., after tab switch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isPartyActive && userWantsMusic && !isChaseActive) {
        playPartyMusic();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      partyAudioRef.current?.pause();
    };
  }, [isPartyActive, userWantsMusic, currentSong, partyPlaylist, isChaseActive]);

  // Keep play/pause in sync with state with improved audio context handling
  useEffect(() => {
    if (!isInitialized) return;

    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = async () => {
      try {
        await audioContextManager.resumeContext();
        // Set volume before playing to avoid audio pop
        audio.volume = 0;
        await audio.play();
        // Fade in the audio
        const fadeIn = setInterval(() => {
          if (audio.volume < 0.5) {
            audio.volume = Math.min(audio.volume + 0.1, 0.5);
          } else {
            clearInterval(fadeIn);
          }
        }, 100);
      } catch (error) {
        console.error('Error playing audio:', error);
        // If autoplay fails, set up interaction listeners
        const playOnInteraction = async () => {
          document.removeEventListener('click', playOnInteraction);
          document.removeEventListener('keydown', playOnInteraction);
          try {
            await audioContextManager.resumeContext();
            await audio.play();
            setUserWantsMusic(true);
          } catch (e) {
            console.error('Error playing after interaction:', e);
          }
        };

        document.addEventListener('click', playOnInteraction, { once: true });
        document.addEventListener('keydown', playOnInteraction, { once: true });
      }
    };

    if (userWantsMusic && !isPartyActive && !isChaseActive) {
      void handlePlay();
    } else {
      audio.pause();
    }

    return () => {
      audio.pause();
    };
  }, [userWantsMusic, isPartyActive, isChaseActive, isInitialized]);

  // Toggle music on/off
  const flipSwitch = useCallback(async () => {
    const newState = !userWantsMusic;
    setUserWantsMusic(newState);
    
    try {
      if (newState) {
        await audioContextManager.resumeContext();
        audioContextManager.saveMusicState(true, isPartyActive, currentSong, 0.5);
        localStorage.setItem('musicOn', '1');
      } else {
        audioContextManager.saveMusicState(false, isPartyActive, currentSong, 0);
        localStorage.setItem('musicOn', '0');
      }
    } catch (error) {
      console.error('Error toggling music:', error);
      setUserWantsMusic(!newState); // Revert state on error
    }
  }, [userWantsMusic, isPartyActive, currentSong]);

  const handleKeyPress = useCallback(
    (event: { key: string }) => {
      if (event.key === 'm' || event.key === 'M') {
        void flipSwitch();
      }
    },
    [flipSwitch],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  if (!isInitialized) return null;
  
  return (
    <>
      <Button
        onClick={() => void flipSwitch()}
        className="hidden lg:block"
        title={`${userWantsMusic ? 'Mute' : 'Play'} music (press m)`}
        imgUrl={volumeImg}
      >
        {userWantsMusic ? 'Mute' : 'Music'}
      </Button>
    </>
  );
}