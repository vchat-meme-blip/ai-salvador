class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private isAudioEnabled = false;
  private isContextSuspended = true;
  private resumeCallbacks: (() => void)[] = [];

  constructor() {
    this.initializeAudioContext();
    this.setupGlobalHandlers();
  }

  private initializeAudioContext() {
    try {
      // @ts-ignore - webkitAudioContext for Safari
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      
      // Handle iOS autoplay restrictions
      if (this.audioContext.state === 'suspended') {
        this.isContextSuspended = true;
      }
      
      this.audioContext.addEventListener('statechange', () => {
        if (this.audioContext) {
          this.isContextSuspended = this.audioContext.state === 'suspended';
        }
      });
      
    } catch (error) {
      console.error('Error initializing audio context:', error);
    }
  }

  private setupGlobalHandlers() {
    // Handle user interaction to enable audio
    const enableAudio = async () => {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        try {
          await this.audioContext.resume();
          this.isContextSuspended = false;
          // Call all resume callbacks
          while (this.resumeCallbacks.length > 0) {
            const callback = this.resumeCallbacks.pop();
            if (callback) callback();
          }
        } catch (error) {
          console.error('Error resuming audio context:', error);
        }
      }
    };

    // Add event listeners for user interaction
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach(event => {
      window.addEventListener(event, enableAudio, { once: true });
    });
  }

  async loadAudio(url: string, id: string): Promise<boolean> {
    if (!this.audioContext) {
      console.error('Audio context not initialized');
      return false;
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.audioBuffers.set(id, audioBuffer);
      return true;
    } catch (error) {
      console.error(`Error loading audio ${url}:`, error);
      return false;
    }
  }

  async playSound(id: string, options: { loop?: boolean; volume?: number } = {}) {
    if (!this.audioContext) {
      console.error('Audio context not initialized');
      return null;
    }

    const audioBuffer = this.audioBuffers.get(id);
    if (!audioBuffer) {
      console.error(`Audio buffer not found for id: ${id}`);
      return null;
    }

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    
    source.buffer = audioBuffer;
    source.loop = options.loop || false;
    gainNode.gain.value = options.volume !== undefined ? options.volume : 1.0;
    
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Handle suspended state
    if (this.isContextSuspended) {
      return new Promise<AudioBufferSourceNode>((resolve) => {
        this.resumeCallbacks.push(() => {
          source.start(0);
          resolve(source);
        });
      });
    }

    source.start(0);
    return source;
  }

  // Handle iOS audio context resume
  async resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        this.isContextSuspended = false;
        return true;
      } catch (error) {
        console.error('Error resuming audio context:', error);
        return false;
      }
    }
    return !this.isContextSuspended;
  }

  // Clean up resources
  cleanup() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioBuffers.clear();
  }
}

export const audioPlayer = new AudioPlayer();
