export const AUDIO_PROCESSING_CONFIG = {
  // Minimum quality thresholds
  MIN_RECORDING_DURATION: 3, // seconds
  MIN_SPEECH_ENERGY: 30,
  MIN_SNR: 1.5,
  MIN_AUDIO_SIZE: 10000, // bytes
  
  // Gain control
  MAX_GAIN: 5.0,
  MIN_GAIN: 1.0,
  DEFAULT_GAIN: 3.0,
  
  // Filters
  HIGH_PASS_FREQUENCY: 200, // Hz
  LOW_PASS_FREQUENCY: 3400, // Hz
  
  // Compression
  COMPRESSION_THRESHOLD: -30, // dB
  COMPRESSION_RATIO: 12,
  COMPRESSION_ATTACK: 0.003, // seconds
  COMPRESSION_RELEASE: 0.15, // seconds
};