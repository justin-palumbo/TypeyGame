// Every sound the game makes, built from tones and noise with the Web Audio API
// (no sound files), plus speech. Shared by every mode.

const Sound = (() => {
  // C major pentatonic, so any run of chimes sounds pleasant.
  const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0];

  let audio = null;
  let uhOhUntil = 0; // audio time when the current "uh-oh" finishes

  return { SCALE, wake, stop, chime, fanfare, uhOh, warble, rumble, chop, boom, say };

  // Browsers only allow audio after a key press or click, so start it lazily.
  function wake() {
    if (!CONFIG.sounds) return;
    if (!audio) audio = new AudioContext();
    if (audio.state === "suspended") audio.resume();
  }

  // Silences everything, for leaving a mode.
  function stop() {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    // Closing the audio cuts off any sound mid-play; the next key press opens it again.
    audio?.close();
    audio = null;
    uhOhUntil = 0;
  }

  function chime(freq, delay = 0, length = 0.4) {
    if (!audio) return;
    const t = audio.currentTime + delay;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + length);
  }

  function fanfare() {
    [0, 2, 4, 5, 7].forEach((note, i) => chime(SCALE[note], 0.15 + i * 0.1, 0.5));
  }

  // A gentle "uh-oh": two low notes stepping down. Only one plays at a time,
  // so a toddler mashing several keys at once doesn't make a din.
  function uhOh() {
    if (!audio || audio.currentTime < uhOhUntil) return;
    chime(392, 0, 0.15);
    chime(330, 0.14, 0.3);
    uhOhUntil = audio.currentTime + 0.44;
  }

  // UFO engine: a wobbly "woo-woo-woo" that rises as it flies away.
  function warble(length = 2.2) {
    if (!audio) return;
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(500, t);
    osc.frequency.exponentialRampToValueAtTime(1400, t + length);

    // A slow second oscillator bends the pitch up and down for the wobble.
    const wobble = audio.createOscillator();
    wobble.frequency.value = 7;
    const depth = audio.createGain();
    depth.gain.value = 80;
    wobble.connect(depth).connect(osc.frequency);

    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.2, t + 0.2);
    gain.gain.setValueAtTime(0.2, t + length - 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);

    osc.connect(gain).connect(audio.destination);
    [osc, wobble].forEach((o) => {
      o.start(t);
      o.stop(t + length);
    });
  }

  // Engine roar (rockets, the lander, the balloon's burner): filtered white noise
  // that swells, brightens from `from` to `to` Hz, then fades away.
  function rumble(length = 2.4, from = 400, to = 1500) {
    if (!audio) return;
    const t = audio.currentTime;
    const source = noise(length);
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    // Laptop speakers barely play deep bass, so keep the roar above ~400 Hz.
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(to, t + length);

    source.connect(filter).connect(swell(t, length, 2)).connect(audio.destination);
    source.start(t);
  }

  // Propellers and rotors: engine noise chopped into pulses, `rate` a second and speeding up.
  function chop(length, rate) {
    if (!audio) return;
    const t = audio.currentTime;
    const source = noise(length);
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1000;

    // A square wave flips the volume between 0 and 1.
    const pulse = audio.createGain();
    pulse.gain.value = 0.5;
    const flipper = audio.createOscillator();
    flipper.type = "square";
    flipper.frequency.setValueAtTime(rate, t);
    flipper.frequency.linearRampToValueAtTime(rate * 1.5, t + length);
    const depth = audio.createGain();
    depth.gain.value = 0.5;
    flipper.connect(depth).connect(pulse.gain);

    source.connect(filter).connect(pulse).connect(swell(t, length, 2.5)).connect(audio.destination);
    source.start(t);
    flipper.start(t);
    flipper.stop(t + length);
  }

  // An explosion: a sudden crack of noise that rumbles down and away.
  function boom(length = 1.6) {
    if (!audio) return;
    const t = audio.currentTime;
    const source = noise(length);
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2500, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + length);
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);

    source.connect(filter).connect(gain).connect(audio.destination);
    source.start(t);
  }

  function noise(length) {
    const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * length), audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = audio.createBufferSource();
    source.buffer = buffer;
    return source;
  }

  // A volume that swells up to `peak`, then fades away by the end.
  function swell(t, length, peak) {
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + length * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    return gain;
  }

  function say(text) {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel(); // don't let a fast typist queue up a backlog
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1.2;
    speechSynthesis.speak(utterance);
  }
})();
