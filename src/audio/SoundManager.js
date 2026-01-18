/**
 * SoundManager - Handles game audio (sound effects and music)
 *
 * Uses Web Audio API for sound effects and HTML5 Audio for music
 */

import { SOUNDS, MUSIC, SOUND_FILES, MUSIC_FILES } from './SoundConstants.js';

export class SoundManager {
    constructor() {
        this.audioContext = null;
        this.soundBuffers = new Map();  // Sound ID -> AudioBuffer
        this.musicElements = new Map();  // Music ID -> HTMLAudioElement

        this.basePath = 'assets/audio/';

        // Volume settings (0.0 - 1.0)
        this.soundVolume = 0.7;
        this.musicVolume = 0.5;

        // Mute states
        this.soundMuted = false;
        this.musicMuted = false;

        // Currently playing music
        this.currentMusic = null;
        this.currentMusicId = null;

        // Master gain node for sound effects
        this.masterGain = null;

        // Track active sounds for cleanup
        this.activeSounds = new Set();
    }

    /**
     * Initialize the audio system
     * Must be called after user interaction (browser requirement)
     */
    async init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = this.soundVolume;
            console.log('SoundManager initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
            return false;
        }
    }

    /**
     * Resume audio context (needed after user interaction)
     */
    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    /**
     * Load a sound effect
     * @param {number} soundId - Sound ID from SOUNDS
     * @returns {Promise<boolean>} True if loaded successfully
     */
    async loadSound(soundId) {
        const filename = SOUND_FILES[soundId];
        if (!filename) {
            console.warn(`Unknown sound ID: ${soundId}`);
            return false;
        }

        if (this.soundBuffers.has(soundId)) {
            return true;  // Already loaded
        }

        try {
            const response = await fetch(this.basePath + filename);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.soundBuffers.set(soundId, audioBuffer);
            return true;
        } catch (error) {
            console.warn(`Failed to load sound ${filename}:`, error);
            return false;
        }
    }

    /**
     * Load multiple sounds
     * @param {number[]} soundIds - Array of sound IDs to load
     */
    async loadSounds(soundIds) {
        const promises = soundIds.map(id => this.loadSound(id));
        await Promise.all(promises);
    }

    /**
     * Load common game sounds
     */
    async loadCommonSounds() {
        const commonSounds = [
            SOUNDS.CLICK_APPROVE,
            SOUNDS.CLICK_DENY,
            SOUNDS.CLICK_MENU_AND_GAME_BUTTON,
            SOUNDS.PHYSIC_UNIT_DEATH,
            SOUNDS.PHYSIC_UNIT_HIT_ENEMY,
            SOUNDS.RANGE_UNIT_SHOT,
            SOUNDS.RAT_DEATH,
            SOUNDS.TROLL_DEATH,
            SOUNDS.GOLD,
            SOUNDS.FLAG,
            SOUNDS.UNIT_LEVELUP,
            SOUNDS.TOOLTIP_OR_MESSAGE
        ];
        await this.loadSounds(commonSounds);
        console.log(`Loaded ${commonSounds.length} common sounds`);
    }

    /**
     * Play a sound effect
     * @param {number} soundId - Sound ID to play
     * @param {object} options - Playback options
     * @returns {AudioBufferSourceNode|null} The audio source node
     */
    play(soundId, options = {}) {
        if (this.soundMuted || !this.audioContext) {
            return null;
        }

        const buffer = this.soundBuffers.get(soundId);
        if (!buffer) {
            // Try to load and play
            this.loadSound(soundId).then(() => {
                this.play(soundId, options);
            });
            return null;
        }

        try {
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;

            // Apply volume adjustment
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = options.volume !== undefined ? options.volume : 1.0;

            source.connect(gainNode);
            gainNode.connect(this.masterGain);

            // Track for cleanup
            this.activeSounds.add(source);
            source.onended = () => {
                this.activeSounds.delete(source);
            };

            // Start playback
            source.start(0);

            return source;
        } catch (error) {
            console.error('Error playing sound:', error);
            return null;
        }
    }

    /**
     * Play a sound at a specific position (for spatial audio)
     * Adjusts volume based on distance from camera
     * @param {number} soundId - Sound ID
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @param {object} camera - Camera with x, y, and viewport info
     */
    playAt(soundId, x, y, camera) {
        if (!camera) {
            return this.play(soundId);
        }

        // Calculate distance from camera center
        const dx = x - (camera.x + camera.viewportWidth / 2);
        const dy = y - (camera.y + camera.viewportHeight / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Attenuate volume based on distance
        const maxDistance = 500;  // Full volume range
        const falloff = 1000;     // Distance where sound becomes inaudible
        let volume = 1.0;

        if (distance > maxDistance) {
            volume = Math.max(0, 1 - (distance - maxDistance) / falloff);
        }

        if (volume > 0.05) {
            return this.play(soundId, { volume });
        }
        return null;
    }

    /**
     * Load music track
     * @param {number} musicId - Music ID from MUSIC
     */
    async loadMusic(musicId) {
        const filename = MUSIC_FILES[musicId];
        if (!filename) {
            console.warn(`Unknown music ID: ${musicId}`);
            return false;
        }

        if (this.musicElements.has(musicId)) {
            return true;  // Already loaded
        }

        const audio = new Audio(this.basePath + filename);
        audio.loop = true;
        audio.volume = this.musicVolume;
        audio.preload = 'auto';

        return new Promise((resolve) => {
            audio.addEventListener('canplaythrough', () => {
                this.musicElements.set(musicId, audio);
                resolve(true);
            }, { once: true });

            audio.addEventListener('error', (e) => {
                console.warn(`Failed to load music ${filename}:`, e);
                resolve(false);
            }, { once: true });

            audio.load();
        });
    }

    /**
     * Play music track
     * @param {number} musicId - Music ID to play
     * @param {boolean} fadeIn - Whether to fade in
     */
    async playMusic(musicId, fadeIn = true) {
        // Stop current music
        if (this.currentMusic) {
            await this.stopMusic(true);
        }

        // Load if not already loaded
        if (!this.musicElements.has(musicId)) {
            await this.loadMusic(musicId);
        }

        const audio = this.musicElements.get(musicId);
        if (!audio) {
            return;
        }

        this.currentMusic = audio;
        this.currentMusicId = musicId;
        audio.currentTime = 0;

        if (this.musicMuted) {
            audio.volume = 0;
        } else if (fadeIn) {
            audio.volume = 0;
            audio.play().catch(e => console.warn('Music play failed:', e));
            this.fadeMusic(0, this.musicVolume, 1000);
        } else {
            audio.volume = this.musicVolume;
            audio.play().catch(e => console.warn('Music play failed:', e));
        }
    }

    /**
     * Play random in-game music
     */
    async playRandomIngameMusic() {
        const tracks = [
            MUSIC.INGAME_1,
            MUSIC.INGAME_2,
            MUSIC.INGAME_3,
            MUSIC.INGAME_4,
            MUSIC.INGAME_5,
            MUSIC.INGAME_6
        ];
        const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
        await this.playMusic(randomTrack);
    }

    /**
     * Stop music
     * @param {boolean} fadeOut - Whether to fade out
     */
    async stopMusic(fadeOut = true) {
        if (!this.currentMusic) return;

        if (fadeOut) {
            await this.fadeMusic(this.currentMusic.volume, 0, 500);
        }

        this.currentMusic.pause();
        this.currentMusic = null;
        this.currentMusicId = null;
    }

    /**
     * Fade music volume
     */
    fadeMusic(fromVolume, toVolume, duration) {
        return new Promise((resolve) => {
            if (!this.currentMusic) {
                resolve();
                return;
            }

            const startTime = performance.now();
            const audio = this.currentMusic;

            const fade = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                audio.volume = fromVolume + (toVolume - fromVolume) * progress;

                if (progress < 1) {
                    requestAnimationFrame(fade);
                } else {
                    resolve();
                }
            };

            requestAnimationFrame(fade);
        });
    }

    /**
     * Set sound effects volume
     * @param {number} volume - 0.0 to 1.0
     */
    setSoundVolume(volume) {
        this.soundVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.soundMuted ? 0 : this.soundVolume;
        }
    }

    /**
     * Set music volume
     * @param {number} volume - 0.0 to 1.0
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.currentMusic && !this.musicMuted) {
            this.currentMusic.volume = this.musicVolume;
        }
    }

    /**
     * Toggle sound mute
     */
    toggleSoundMute() {
        this.soundMuted = !this.soundMuted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.soundMuted ? 0 : this.soundVolume;
        }
        return this.soundMuted;
    }

    /**
     * Toggle music mute
     */
    toggleMusicMute() {
        this.musicMuted = !this.musicMuted;
        if (this.currentMusic) {
            this.currentMusic.volume = this.musicMuted ? 0 : this.musicVolume;
        }
        return this.musicMuted;
    }

    /**
     * Stop all sounds
     */
    stopAllSounds() {
        for (const source of this.activeSounds) {
            try {
                source.stop();
            } catch (e) {
                // Already stopped
            }
        }
        this.activeSounds.clear();
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stopAllSounds();
        this.stopMusic(false);

        if (this.audioContext) {
            this.audioContext.close();
        }

        this.soundBuffers.clear();
        this.musicElements.clear();
    }
}

// Singleton instance
let soundManagerInstance = null;

/**
 * Get or create the SoundManager singleton
 */
export function getSoundManager() {
    if (!soundManagerInstance) {
        soundManagerInstance = new SoundManager();
    }
    return soundManagerInstance;
}
