import { Asset } from 'expo-asset';
import { Audio } from 'expo-av';

class MusicManager {
  private static instance: MusicManager;
  private sound: Audio.Sound | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private volume: number = 0.5;
  private isLoaded: boolean = false;

  private constructor() {
    this.setupAudio();
  }

  public static getInstance(): MusicManager {
    if (!MusicManager.instance) {
      MusicManager.instance = new MusicManager();
    }
    return MusicManager.instance;
  }

  private async setupAudio() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.warn('Erro ao configurar áudio:', error);
    }
  }

  public async loadMusic(source: string | number, autoPlay: boolean = false) {
    try {
      // Se já carregou, não carrega novamente
      if (this.isLoaded && this.sound) {
        console.log('Música já foi carregada');
        if (autoPlay && !this.isPlaying) {
          await this.play();
        }
        return;
      }

      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

      console.log('Carregando música...', typeof source === 'string' ? source : 'asset');

      let uri;
      if (typeof source === 'string') {
        uri = { uri: source };
      } else {
        // Para assets require(), usar Asset do Expo
        const asset = Asset.fromModule(source);
        await asset.downloadAsync();
        uri = { uri: asset.localUri || asset.uri };
      }

      const { sound } = await Audio.Sound.createAsync(
        uri,
        {
          shouldPlay: autoPlay,
          isLooping: true,
          volume: this.isMuted ? 0 : this.volume,
        }
      );

      this.sound = sound;
      this.isLoaded = true;
      if (autoPlay) {
        this.isPlaying = true;
      }
      console.log('Música carregada com sucesso');
    } catch (error) {
      console.warn('Erro ao carregar música:', error);
      this.isLoaded = false;
    }
  }

  public async play() {
    try {
      if (this.sound && !this.isPlaying) {
        await this.sound.playAsync();
        this.isPlaying = true;
      }
    } catch (error) {
      console.warn('Erro ao reproduzir música:', error);
    }
  }

  public async pause() {
    try {
      if (this.sound && this.isPlaying) {
        await this.sound.pauseAsync();
        this.isPlaying = false;
      }
    } catch (error) {
      console.warn('Erro ao pausar música:', error);
    }
  }

  public async stop() {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        this.isPlaying = false;
      }
    } catch (error) {
      console.warn('Erro ao parar música:', error);
    }
  }

  public async togglePlayPause() {
    if (this.isPlaying) {
      await this.pause();
    } else {
      await this.play();
    }
  }

  public async setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    try {
      if (this.sound && !this.isMuted) {
        await this.sound.setVolumeAsync(this.volume);
      }
    } catch (error) {
      console.warn('Erro ao definir volume:', error);
    }
  }

  public async toggleMute() {
    this.isMuted = !this.isMuted;
    try {
      if (this.sound) {
        await this.sound.setVolumeAsync(this.isMuted ? 0 : this.volume);
      }
    } catch (error) {
      console.warn('Erro ao alterar mute:', error);
    }
  }

  public getStatus() {
    return {
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
      volume: this.volume,
    };
  }

  public async cleanup() {
    try {
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
        this.isPlaying = false;
        this.isLoaded = false;
      }
    } catch (error) {
      console.warn('Erro ao limpar áudio:', error);
    }
  }
}

export default MusicManager;
