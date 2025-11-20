/**
 * Main Application Entry Point
 * Initializes MVC architecture with Web Audio API
 */

import { SequencerController } from './controllers/SequencerController.js';
import { DrumPlayer } from './libs/audio-player.js';
import { AudioEngine } from './libs/audio-engine.js';
import { AudioBufferLoader } from './libs/audio-buffer-loader.js';
import { SequenceModel } from './models/SequenceModel.js';

// Sample file paths
const SAMPLE_PATHS = {
  kick: './samples/bd_kick/bd_909dwsd.wav',
  clap: './samples/clap/clp_analogue.wav',
  snare: './samples/snare/snr_answer8bit.wav',
  hat: './samples/hats/hat_analog.wav',
  shaker: './samples/shaker_tambourine/shaker_quicky.wav',
  bongo1: './samples/percussion/prc_bongodrm.wav',
  congaz: './samples/percussion/prc_congaz.wav',
  harmony: './samples/percussion/prc_harmony.wav'
};

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🥁 Initializing Drum Sequencer...');

  try {
    // Initialize Audio Engine
    const audioEngine = new AudioEngine();
    const audioContext = await audioEngine.initialize();
    console.log('✅ Audio engine initialized');

    // Load audio samples
    const bufferLoader = new AudioBufferLoader(audioContext);
    console.log('⏳ Loading audio samples...');
    const buffers = await bufferLoader.loadAll(SAMPLE_PATHS);
    console.log('✅ Audio samples loaded');

    // Initialize DrumPlayer
    const drumPlayer = new DrumPlayer(audioContext);
    drumPlayer.loadBuffers(buffers, 0.5);
    console.log('✅ DrumPlayer initialized');

    // Get DOM elements for controller configuration
    const sequencerContainer = document.querySelector('.dm');
    const volumeOutputContainer = document.querySelector('.volume-output');
    
    const controlsElements = {
      playButton: document.getElementById('start'),
      resetButton: document.getElementById('reset'),
      saveButton: document.getElementById('save'),
      deleteButton: document.getElementById('delete'),
      sequenceSelect: document.querySelector('.saved-sequences'),
      sequenceInput: document.getElementById('input-save'),
      tempoSlider: document.querySelector('.seq-tempo-slider'),
      tempoOutput: document.querySelector('.seq-tempo-output'),
      lengthSlider: document.querySelector('.seq-length-slider'),
      lengthOutput: document.querySelector('.seq-length-output')
    };

    const volumeSliders = document.querySelectorAll('.vol-slider');
    
    // Phase 4: Sample controls container (if it exists)
    const sampleControlsContainer = document.querySelector('.sample-controls-container');

    // Create model
    const model = new SequenceModel();

    // Initialize controller with all required configuration
    const controller = new SequencerController({
      audioPlayer: drumPlayer,
      audioEngine: audioEngine,
      model: model,
      sequencerContainer: sequencerContainer,
      controlsElements: controlsElements,
      volumeSliders: volumeSliders,
      volumeOutputContainer: volumeOutputContainer,
      sampleControlsContainer: sampleControlsContainer
    });

    console.log('✅ Drum Sequencer ready!');

    // Expose for debugging (optional)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      window.drumSequencer = {
        controller,
        model,
        drumPlayer
      };
      console.log('🔧 Debug mode: Access via window.drumSequencer');
    }

  } catch (error) {
    console.error('❌ Failed to initialize drum sequencer:', error);
    alert('Failed to initialize audio system. Please check console for details.');
  }
});
