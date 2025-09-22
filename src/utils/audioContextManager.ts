// Audio context manager to handle browser autoplay policies and music state
class AudioContextManager {
  private static readonly STORAGE_KEY = 'audioState';
  private static instance: AudioContextManager;
  private audioContext: AudioContext | null = null;
  private isUnlocked = false;
  private musicState: {
    isPlaying: boolean;
    isPartyMusic: boolean;
    trackIndex: number;
    volume: number;
  } | null = null;

  private constructor() {
    this.setupAudioContext();
    this.setupUnlockHandlers();
    this.loadState();
  }

  public static getInstance(): AudioContextManager {
    if (!AudioContextManager.instance) {
      AudioContextManager.instance = new AudioContextManager();
    }
    return AudioContextManager.instance;
  }

  private setupAudioContext() {
    try {
      // @ts-ignore - Safari uses webkitAudioContext
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      console.log('AudioContext created');
    } catch (e) {
      console.error('Web Audio API is not supported in this browser', e);
    }
  }

  private setupUnlockHandlers() {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      if (!this.audioContext || this.isUnlocked) return;

      // Create empty buffer
      const buffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      
      // Play the empty buffer
      source.start(0);
      
      // Set a flag to indicate the context is unlocked
      this.isUnlocked = true;
      
      // Clean up
      if (source) {
        source.disconnect();
      }
      
      console.log('AudioContext unlocked');
    };

    // Unlock on any user interaction
    const events = ['touchstart', 'touchend', 'mousedown', 'keydown'];
    const unlockHandler = () => {
      if (this.isUnlocked) {
        events.forEach(event => {
          document.removeEventListener(event, unlockHandler, false);
        });
        return;
      }
      unlock();
    };

    events.forEach(event => {
      document.addEventListener(event, unlockHandler, false);
    });
  }

  public getAudioContext(): AudioContext | null {
    if (!this.audioContext) {
      this.setupAudioContext();
    }
    return this.audioContext;
  }

  public resumeContext(): Promise<void> {
    if (!this.audioContext) {
      return Promise.reject('AudioContext not available');
    }
    return this.audioContext.resume().then(
      () => {
        console.log('AudioContext resumed successfully');
        this.isUnlocked = true;
      },
      (err) => {
        console.error('Failed to resume AudioContext:', err);
        this.isUnlocked = false;
      }
    );
  }

  public get isContextUnlocked(): boolean {
    return this.isUnlocked;
  }

  // State management
  private loadState() {
    try {
      const saved = localStorage.getItem(AudioContextManager.STORAGE_KEY);
      if (saved) {
        this.musicState = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load audio state', e);
      this.clearState();
    }
  }

  public saveMusicState(isPlaying: boolean, isPartyMusic: boolean, trackIndex: number, volume: number) {
    this.musicState = { isPlaying, isPartyMusic, trackIndex, volume };
    try {
      localStorage.setItem(AudioContextManager.STORAGE_KEY, JSON.stringify(this.musicState));
    } catch (e) {
      console.warn('Failed to save audio state', e);
    }
  }

  public getMusicState() {
    return this.musicState;
  }

  public clearState() {
    this.musicState = null;
    try {
      localStorage.removeItem(AudioContextManager.STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear audio state', e);
    }
  }

  public async playAudio(audio: HTMLAudioElement, volume: number = 0.7): Promise<void> {
    try {
      await this.resumeContext();
      audio.volume = 0; // Start silent
      await audio.play();
      // Fade in
      const fadeIn = setInterval(() => {
        if (audio.volume < volume) {
          audio.volume = Math.min(audio.volume + 0.1, volume);
        } else {
          clearInterval(fadeIn);
        }
      }, 100);
    } catch (error) {
      console.error('Error playing audio:', error);
      throw error;
    }
  }
}

export const audioContextManager = AudioContextManager.getInstance();
