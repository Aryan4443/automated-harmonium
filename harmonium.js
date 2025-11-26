// Harmonium Audio Engine
class Harmonium {
    constructor() {
        this.audioContext = null;
        this.oscillators = new Map();
        this.gainNodes = new Map();
        this.reverbNode = null;
        this.masterGain = null;
        this.airPressure = 100; // Start with full pressure
        this.maxPressure = 100;
        this.pressureDecayRate = 0.1; // Much slower decay
        this.isPumping = false;
        this.autoPumpEnabled = true; // Auto-maintain pressure
        this.volume = 0.7;
        this.reverbAmount = 0.3;
        this.currentOctave = 4;
        this.deviceOrientationEnabled = false;
        this.scrollControlEnabled = false;
        this.currentTiltNote = null;
        this.tiltAngle = 0;
        this.lastScrollY = 0;
        this.lastActivityTime = Date.now();
        this.inactivityTimeout = 30000; // 30 seconds
        this.inactivityTimer = null;
        
        // Note frequencies (C4 = middle C)
        this.noteFrequencies = {
            'C': 261.63,
            'C#': 277.18,
            'D': 293.66,
            'D#': 311.13,
            'E': 329.63,
            'F': 349.23,
            'F#': 369.99,
            'G': 392.00,
            'G#': 415.30,
            'A': 440.00,
            'A#': 466.16,
            'B': 493.88
        };
        
        // Keyboard mapping - Use Shift + white key for black keys (easier!)
        this.keyMap = {
            'a': { note: 'C', isBlack: false },
            's': { note: 'D', isBlack: false },
            'd': { note: 'E', isBlack: false },
            'f': { note: 'F', isBlack: false },
            'g': { note: 'G', isBlack: false },
            'h': { note: 'A', isBlack: false },
            'j': { note: 'B', isBlack: false }
        };
        
        // Black keys using Shift + white key
        this.blackKeyMap = {
            'a': 'C#',  // Shift+A = C#
            's': 'D#',  // Shift+S = D#
            'f': 'F#',  // Shift+F = F#
            'g': 'G#',  // Shift+G = G#
            'h': 'A#'   // Shift+H = A#
        };
        
        this.initAudio();
        this.setupKeyboard();
        this.setupControls();
        this.setupBellows();
        this.setupDeviceOrientation();
        this.setupScrollControl();
        this.startPressureDecay();
        this.startInactivityCheck();
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.audioContext.destination);
            
            // Create reverb using convolver (simple delay-based reverb)
            this.createReverb();
            
            console.log('Audio context initialized');
        } catch (error) {
            console.error('Error initializing audio:', error);
        }
    }
    
    createReverb() {
        // Simple reverb using delay nodes
        const convolver = this.audioContext.createConvolver();
        const delay1 = this.audioContext.createDelay();
        const delay2 = this.audioContext.createDelay();
        const gain1 = this.audioContext.createGain();
        const gain2 = this.audioContext.createGain();
        
        delay1.delayTime.value = 0.03;
        delay2.delayTime.value = 0.05;
        gain1.gain.value = 0.3;
        gain2.gain.value = 0.2;
        
        this.masterGain.connect(delay1);
        this.masterGain.connect(delay2);
        delay1.connect(gain1);
        delay2.connect(gain2);
        gain1.connect(this.masterGain);
        gain2.connect(this.masterGain);
        
        this.reverbNode = { delay1, delay2, gain1, gain2 };
    }
    
    setupKeyboard() {
        const keyboard = document.getElementById('keyboard');
        const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        const blackKeys = ['C#', 'D#', null, 'F#', 'G#', 'A#', null];
        
        // Create white keys
        whiteKeys.forEach((note, index) => {
            const key = document.createElement('div');
            key.className = 'key white';
            key.dataset.note = note;
            key.dataset.octave = this.currentOctave;
            
            const label = document.createElement('div');
            label.className = 'key-label';
            label.textContent = note;
            key.appendChild(label);
            
            key.addEventListener('mousedown', () => this.playNote(note, this.currentOctave));
            key.addEventListener('mouseup', () => this.stopNote(note, this.currentOctave));
            key.addEventListener('mouseleave', () => this.stopNote(note, this.currentOctave));
            
            keyboard.appendChild(key);
            
            // Add black key if exists
            if (blackKeys[index]) {
                const blackKey = document.createElement('div');
                blackKey.className = 'key black';
                blackKey.dataset.note = blackKeys[index];
                blackKey.dataset.octave = this.currentOctave;
                
                const blackLabel = document.createElement('div');
                blackLabel.className = 'key-label';
                blackLabel.textContent = blackKeys[index];
                blackKey.appendChild(blackLabel);
                
                blackKey.addEventListener('mousedown', () => this.playNote(blackKeys[index], this.currentOctave));
                blackKey.addEventListener('mouseup', () => this.stopNote(blackKeys[index], this.currentOctave));
                blackKey.addEventListener('mouseleave', () => this.stopNote(blackKeys[index], this.currentOctave));
                
                keyboard.appendChild(blackKey);
            }
        });
        
        // Setup computer keyboard
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }
    
    handleKeyDown(e) {
        const key = e.key.toLowerCase();
        const isShiftPressed = e.shiftKey;
        
        if (key === ' ') {
            e.preventDefault();
            this.startPumping();
            return;
        }
        
        if (key === 'z') {
            this.updateActivityTime();
            this.changeOctave(-1);
            return;
        }
        
        if (key === 'x') {
            this.updateActivityTime();
            this.changeOctave(1);
            return;
        }
        
        // Check for black keys first (Shift + white key)
        if (isShiftPressed && this.blackKeyMap[key]) {
            const note = this.blackKeyMap[key];
            if (this.airPressure > 5 || this.autoPumpEnabled) {
                this.updateActivityTime();
                this.playNote(note, this.currentOctave);
                this.highlightKey(note, this.currentOctave, true);
            }
            return;
        }
        
        // White keys
        const keyInfo = this.keyMap[key];
        if (keyInfo && (this.airPressure > 5 || this.autoPumpEnabled)) {
            this.updateActivityTime();
            this.playNote(keyInfo.note, this.currentOctave);
            this.highlightKey(keyInfo.note, this.currentOctave, true);
        }
    }
    
    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        const isShiftPressed = e.shiftKey;
        
        if (key === ' ') {
            this.stopPumping();
            return;
        }
        
        // Check for black keys first (Shift + white key)
        if (isShiftPressed && this.blackKeyMap[key]) {
            const note = this.blackKeyMap[key];
            this.stopNote(note, this.currentOctave);
            this.highlightKey(note, this.currentOctave, false);
            return;
        }
        
        // White keys
        const keyInfo = this.keyMap[key];
        if (keyInfo) {
            this.stopNote(keyInfo.note, this.currentOctave);
            this.highlightKey(keyInfo.note, this.currentOctave, false);
        }
    }
    
    highlightKey(note, octave, active) {
        const key = document.querySelector(`[data-note="${note}"][data-octave="${octave}"]`);
        if (key) {
            key.classList.toggle('active', active);
        }
    }
    
    changeOctave(delta) {
        this.currentOctave = Math.max(2, Math.min(6, this.currentOctave + delta));
        document.getElementById('octave').value = this.currentOctave;
        
        // Update all keys with new octave
        document.querySelectorAll('.key').forEach(key => {
            key.dataset.octave = this.currentOctave;
        });
    }
    
    getFrequency(note, octave) {
        const baseFreq = this.noteFrequencies[note];
        const octaveMultiplier = Math.pow(2, octave - 4);
        return baseFreq * octaveMultiplier;
    }
    
    playNote(note, octave) {
        // Update activity time
        this.updateActivityTime();
        
        // With auto-pump, pressure is always maintained, but we can still check
        if (!this.autoPumpEnabled && this.airPressure < 5) {
            return; // Need air pressure to play (only in manual mode)
        }
        
        const noteId = `${note}-${octave}`;
        
        if (this.oscillators.has(noteId)) {
            return; // Already playing
        }
        
        try {
            // Create multiple oscillators for richer harmonium sound
            const osc1 = this.audioContext.createOscillator();
            const osc2 = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            const frequency = this.getFrequency(note, octave);
            
            // Main tone
            osc1.type = 'sine';
            osc1.frequency.value = frequency;
            
            // Harmonic for richer sound
            osc2.type = 'sine';
            osc2.frequency.value = frequency * 2;
            
            // Envelope for natural attack and release
            const now = this.audioContext.currentTime;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.3 * (this.airPressure / 100), now + 0.05);
            gain.gain.linearRampToValueAtTime(0.2 * (this.airPressure / 100), now + 0.1);
            
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(this.masterGain);
            
            osc1.start();
            osc2.start();
            
            this.oscillators.set(noteId, { osc1, osc2, gain });
            this.gainNodes.set(noteId, gain);
            
            // Consume air pressure (minimal consumption with auto-pump)
            if (!this.autoPumpEnabled) {
                this.airPressure = Math.max(0, this.airPressure - 0.3);
            } else {
                // Very minimal consumption with auto-pump
                this.airPressure = Math.max(80, this.airPressure - 0.05);
            }
        } catch (error) {
            console.error('Error playing note:', error);
        }
    }
    
    stopNote(note, octave) {
        const noteId = `${note}-${octave}`;
        const oscData = this.oscillators.get(noteId);
        
        if (oscData) {
            const { osc1, osc2, gain } = oscData;
            const now = this.audioContext.currentTime;
            
            // Natural release
            gain.gain.cancelScheduledValues(now);
            gain.gain.setValueAtTime(gain.gain.value, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.2);
            
            setTimeout(() => {
                try {
                    osc1.stop();
                    osc2.stop();
                } catch (e) {
                    // Oscillator already stopped
                }
                this.oscillators.delete(noteId);
                this.gainNodes.delete(noteId);
            }, 200);
        }
    }
    
    setupBellows() {
        const pumpBtn = document.getElementById('pumpBtn');
        const bellows = document.getElementById('bellows');
        
        pumpBtn.addEventListener('mousedown', () => this.startPumping());
        pumpBtn.addEventListener('mouseup', () => this.stopPumping());
        pumpBtn.addEventListener('mouseleave', () => this.stopPumping());
    }
    
    startPumping() {
        if (this.isPumping) return;
        
        this.isPumping = true;
        document.getElementById('bellows').classList.add('pumping');
        
        const pumpInterval = setInterval(() => {
            if (this.isPumping && this.airPressure < this.maxPressure) {
                this.airPressure = Math.min(this.maxPressure, this.airPressure + 2);
                this.updatePressureDisplay();
            } else {
                clearInterval(pumpInterval);
            }
        }, 50);
    }
    
    stopPumping() {
        this.isPumping = false;
        document.getElementById('bellows').classList.remove('pumping');
    }
    
    startPressureDecay() {
        // Auto-maintain pressure
        setInterval(() => {
            if (this.autoPumpEnabled) {
                // Automatically maintain pressure between 80-100%
                if (this.airPressure < 80) {
                    this.airPressure = Math.min(this.maxPressure, this.airPressure + 1);
                    this.updatePressureDisplay();
                } else if (this.airPressure > 0 && !this.isPumping) {
                    // Very slow decay when above 80%
                    this.airPressure = Math.max(80, this.airPressure - this.pressureDecayRate);
                    this.updatePressureDisplay();
                }
            } else {
                // Manual mode - original behavior
                if (!this.isPumping && this.airPressure > 0) {
                    this.airPressure = Math.max(0, this.airPressure - this.pressureDecayRate);
                    this.updatePressureDisplay();
                    
                    // Stop all notes if pressure is too low
                    if (this.airPressure < 5) {
                        this.oscillators.forEach((oscData, noteId) => {
                            const [note, octave] = noteId.split('-');
                            this.stopNote(note, parseInt(octave));
                        });
                    }
                }
            }
        }, 100);
        
        // Initialize pressure display
        this.updatePressureDisplay();
    }
    
    updatePressureDisplay() {
        const pressureFill = document.getElementById('pressureFill');
        const pressureValue = document.getElementById('pressureValue');
        
        const percentage = Math.round(this.airPressure);
        pressureFill.style.width = percentage + '%';
        pressureValue.textContent = percentage + '%';
    }
    
    setupControls() {
        // Octave control
        document.getElementById('octave').addEventListener('change', (e) => {
            this.updateActivityTime();
            this.currentOctave = parseInt(e.target.value);
            document.querySelectorAll('.key').forEach(key => {
                key.dataset.octave = this.currentOctave;
            });
        });
        
        // Volume control
        const volumeSlider = document.getElementById('volume');
        volumeSlider.addEventListener('input', (e) => {
            this.updateActivityTime();
            this.volume = e.target.value / 100;
            this.masterGain.gain.value = this.volume;
            document.getElementById('volumeValue').textContent = e.target.value + '%';
        });
        
        // Reverb control
        const reverbSlider = document.getElementById('reverb');
        reverbSlider.addEventListener('input', (e) => {
            this.updateActivityTime();
            this.reverbAmount = e.target.value / 100;
            if (this.reverbNode) {
                this.reverbNode.gain1.gain.value = this.reverbAmount * 0.3;
                this.reverbNode.gain2.gain.value = this.reverbAmount * 0.2;
            }
            document.getElementById('reverbValue').textContent = e.target.value + '%';
        });
    }
    
    setupDeviceOrientation() {
        // Check if device orientation is supported
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            // iOS 13+ requires permission
            const orientationButton = document.createElement('button');
            orientationButton.textContent = 'Enable Tilt Control';
            orientationButton.className = 'pump-button';
            orientationButton.style.marginTop = '10px';
            orientationButton.addEventListener('click', async () => {
                try {
                    const permission = await DeviceOrientationEvent.requestPermission();
                    if (permission === 'granted') {
                        this.enableDeviceOrientation();
                        orientationButton.textContent = 'Tilt Control: ON';
                        orientationButton.disabled = true;
                    }
                } catch (error) {
                    console.error('Error requesting orientation permission:', error);
                }
            });
            document.querySelector('.bellows-control').appendChild(orientationButton);
        } else if (window.DeviceOrientationEvent) {
            // Android and other browsers - try to enable automatically
            try {
                this.enableDeviceOrientation();
            } catch (e) {
                console.log('Device orientation not available');
            }
        }
    }
    
    setupScrollControl() {
        // Enable scroll-based control as the primary method
        this.scrollControlEnabled = true;
        this.lastScrollY = window.scrollY || document.documentElement.scrollTop;
        this.virtualScrollPosition = 90; // Start in middle (90 degrees = middle note)
        this.wheelSensitivity = 1.5; // Higher sensitivity for smaller movements
        
        // Handle mouse wheel - PRIMARY CONTROL METHOD
        let wheelTimeout;
        window.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            // Always use wheel/trackpad as primary control
            clearTimeout(wheelTimeout);
            
            // Update activity time on wheel movement
            this.updateActivityTime();
            
            // More sensitive control - smaller movements change notes
            // Use a smaller range (0-120 degrees) for more precision
            this.virtualScrollPosition += e.deltaY * this.wheelSensitivity;
            this.virtualScrollPosition = Math.max(0, Math.min(this.virtualScrollPosition, 120)); // 0-120 degree range
            
            // Immediately update note based on wheel position
            const angle = this.virtualScrollPosition;
            this.handleTilt(angle, 0);
        }, { passive: false });
        
        // Handle page scroll as fallback
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            
            scrollTimeout = setTimeout(() => {
                const currentScrollY = window.scrollY || document.documentElement.scrollTop;
                const scrollDelta = currentScrollY - this.lastScrollY;
                
                // Only use scroll if device orientation is not active
                if (!this.deviceOrientationEnabled || Math.abs(scrollDelta) > 10) {
                    this.handleScrollControl(currentScrollY);
                }
                
                this.lastScrollY = currentScrollY;
            }, 50);
        });
    }
    
    handleScrollControl(scrollY) {
        // Only use scroll if device orientation is not actively providing data
        // Check if we've received orientation data recently
        if (this.deviceOrientationEnabled && this.tiltAngle !== 0) {
            // Device orientation is active, don't use scroll
            return;
        }
        
        // Map scroll position to angle (0-120 degrees for consistency)
        // Use viewport height as reference
        const viewportHeight = window.innerHeight;
        const documentHeight = Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.clientHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
        );
        const maxScroll = Math.max(documentHeight - viewportHeight, viewportHeight);
        const scrollRatio = Math.min(Math.max(scrollY / maxScroll, 0), 1);
        const angle = scrollRatio * 120; // Use 0-120 range
        
        this.handleTilt(angle, 0);
    }
    
    enableDeviceOrientation() {
        this.deviceOrientationEnabled = true;
        
        window.addEventListener('deviceorientation', (e) => {
            // beta: front-to-back tilt (-180 to 180)
            // gamma: left-to-right tilt (-90 to 90)
            const beta = e.beta; // Up/down tilt
            const gamma = e.gamma; // Left/right tilt
            
            if (beta !== null && beta !== undefined) {
                this.handleTilt(beta, gamma);
            }
        });
    }
    
    handleTilt(beta, gamma) {
        // Normalize angle to working range
        // For wheel control: 0-120 degrees (more sensitive)
        // For device orientation: normalize to 0-120 range
        let normalizedAngle = beta;
        
        // If using device orientation, map from -90 to 90 range to 0-120
        if (this.deviceOrientationEnabled && beta >= -90 && beta <= 90) {
            // Map device orientation to 0-120 range (more sensitive)
            normalizedAngle = ((beta + 90) / 180) * 120;
        } else {
            // Already in 0-120 range from wheel control
            normalizedAngle = Math.max(0, Math.min(beta, 120));
        }
        
        this.tiltAngle = normalizedAngle;
        
        // Map angle to notes (12 notes in an octave)
        // Use 0-120 degree range divided into 12 sections for more precision
        const noteIndex = Math.floor((normalizedAngle / 120) * 12);
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const note = notes[Math.min(noteIndex, 11)];
        
        // Play notes (pressure is auto-maintained)
        if (this.airPressure > 5 || this.autoPumpEnabled) {
            // If note changed, stop old note and play new one
            if (this.currentTiltNote !== note) {
                if (this.currentTiltNote) {
                    this.stopNote(this.currentTiltNote, this.currentOctave);
                }
                this.currentTiltNote = note;
                this.playNote(note, this.currentOctave);
                this.highlightKey(note, this.currentOctave, true);
            }
        } else {
            // Stop note if pressure is too low
            if (this.currentTiltNote) {
                this.stopNote(this.currentTiltNote, this.currentOctave);
                this.highlightKey(this.currentTiltNote, this.currentOctave, false);
                this.currentTiltNote = null;
            }
        }
        
        // Update tilt display
        this.updateTiltDisplay(note, normalizedAngle);
    }
    
    updateTiltDisplay(note, angle) {
        let tiltInfo = document.getElementById('tiltInfo');
        if (!tiltInfo) {
            tiltInfo = document.createElement('div');
            tiltInfo.id = 'tiltInfo';
            tiltInfo.style.cssText = 'margin-top: 10px; padding: 10px; background: rgba(102, 126, 234, 0.1); border-radius: 8px; text-align: center;';
            document.querySelector('.bellows-control').appendChild(tiltInfo);
        }
        // Calculate position indicator
        const positionPercent = Math.round((angle / 120) * 100);
        const positionBar = '<div style="width: 100%; height: 8px; background: #e0e0e0; border-radius: 4px; margin: 5px 0; overflow: hidden;"><div style="width: ' + positionPercent + '%; height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); transition: width 0.1s;"></div></div>';
        
        tiltInfo.innerHTML = `
            <strong>Note Control:</strong> ${note} 
            <div style="margin-top: 5px; font-size: 0.9em; color: #666;">
                Use mouse wheel/trackpad to change notes
            </div>
            ${positionBar}
        `;
    }
    
    updateActivityTime() {
        this.lastActivityTime = Date.now();
    }
    
    startInactivityCheck() {
        // Check every second if harmonium has been inactive for 30 seconds
        setInterval(() => {
            const timeSinceLastActivity = Date.now() - this.lastActivityTime;
            
            if (timeSinceLastActivity >= this.inactivityTimeout) {
                // Stop all notes if inactive for 30 seconds
                this.stopAllNotes();
            }
        }, 1000); // Check every second
    }
    
    stopAllNotes() {
        // Stop all currently playing notes
        this.oscillators.forEach((oscData, noteId) => {
            const [note, octave] = noteId.split('-');
            this.stopNote(note, parseInt(octave));
        });
        
        // Clear current tilt note
        if (this.currentTiltNote) {
            this.highlightKey(this.currentTiltNote, this.currentOctave, false);
            this.currentTiltNote = null;
        }
        
        // Reset virtual scroll position to middle
        this.virtualScrollPosition = 60; // Middle of range
    }
}

// Initialize harmonium when page loads
window.addEventListener('DOMContentLoaded', () => {
    const harmonium = new Harmonium();
    
    // Click to start audio context (browser requirement)
    document.addEventListener('click', () => {
        if (harmonium.audioContext.state === 'suspended') {
            harmonium.audioContext.resume();
        }
    }, { once: true });
});

