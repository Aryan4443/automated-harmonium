# 🎹 Digital Harmonium

A beautiful, interactive digital harmonium simulator that runs in your web browser. Play the harmonium using your computer keyboard or by clicking the keys on screen.

## Features

- **Realistic Harmonium Sound**: Uses Web Audio API to generate authentic harmonium tones
- **Interactive Bellows**: Pump the bellows to build air pressure (just like a real harmonium!)
- **Full Keyboard**: Play all notes including sharps/flats
- **Multiple Octaves**: Switch between different octaves
- **Volume & Reverb Controls**: Customize your sound
- **Beautiful UI**: Modern, responsive design

## How to Use

### Getting Started

1. Open `index.html` in a modern web browser (Chrome, Firefox, Safari, or Edge)
2. Click anywhere on the page to activate audio (browser security requirement)
3. Start pumping the bellows by pressing **SPACE** or clicking the "Pump Bellows" button
4. Once you have air pressure, you can play notes!

### Playing Notes

**Computer Keyboard:**

- **White Keys**: `A S D F G H J` (C D E F G A B)
- **Black Keys**: `W E T Y U` (C# D# F# G# A#)
- **Pump Bellows**: `SPACE`
- **Change Octave**: `Z` (lower) and `X` (higher)

**Mouse:**

- Click and hold the keys on screen
- Click the "Pump Bellows" button to build air pressure

### Controls

- **Octave**: Select from octaves 3, 4, or 5 (default: 4)
- **Volume**: Adjust the overall volume (0-100%)
- **Reverb**: Add reverb effect to the sound (0-100%)

## How It Works

The harmonium works just like a real one:

1. You need to pump the bellows to build air pressure
2. Air pressure is consumed when you play notes
3. If air pressure runs out, notes will stop playing
4. Keep pumping to maintain pressure!

## Technical Details

- Built with vanilla JavaScript, HTML5, and CSS3
- Uses Web Audio API for sound generation
- No external dependencies required
- Works offline once loaded

## Browser Compatibility

Works best in:

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Tips

- Pump the bellows continuously while playing for best results
- Try different octaves to explore the full range
- Adjust reverb for a more spacious sound
- Hold keys down to sustain notes (as long as you have air pressure)

Enjoy playing your digital harmonium! 🎵
