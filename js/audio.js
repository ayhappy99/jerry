// WebAudio로 합성하는 효과음. 오디오 파일을 쓰지 않는다.
// AudioContext는 첫 사용자 제스처(unlock 호출) 시점에만 만든다.
// 소리 끔 상태에서는 컨텍스트를 아예 만들지 않는다.

const MASTER_GAIN = 0.22;
const REEL_TICK_MS = 70;
const NOISE_SECONDS = 0.12;

// 아르페지오 음계 (C5 E5 G5 C6 E6)
const WIN_NOTES = [523.25, 659.25, 783.99];
const BIG_WIN_NOTES = [523.25, 659.25, 783.99, 1046.5, 1318.5];
const JACKPOT_NOTES = [523.25, 523.25, 659.25, 783.99, 1046.5, 1046.5, 1318.5, 1567.98];

let audio = null;
let enabled = false;
let reelTimer = null;
let noiseBuffer = null;

function createContext() {
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(ctx.destination);
  return { ctx, master };
}

export function setEnabled(on) {
  enabled = on;
  if (!on) stopReelLoop();
}

// 첫 사용자 제스처에서 호출한다. 여기가 컨텍스트를 만드는 유일한 지점이다.
export function unlock() {
  if (!enabled) return;
  if (audio === null) audio = createContext();
  if (audio.ctx.state === 'suspended') audio.ctx.resume();
}

function ready() {
  return enabled && audio !== null;
}

function noiseSource() {
  if (noiseBuffer === null) {
    const { ctx } = audio;
    const length = Math.floor(ctx.sampleRate * NOISE_SECONDS);
    noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  const source = audio.ctx.createBufferSource();
  source.buffer = noiseBuffer;
  return source;
}

// 잔향용 피드백 딜레이. 빅윈·잭팟에서만 쓴다.
function createReverb(wetGain) {
  const { ctx, master } = audio;
  const delay = ctx.createDelay(0.6);
  delay.delayTime.value = 0.15;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.44;
  const wet = ctx.createGain();
  wet.gain.value = wetGain;
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  wet.connect(master);
  return delay;
}

function tone({ freq, endFreq = null, type = 'sine', at = 0, dur = 0.2, gain = 0.5, send = null }) {
  const { ctx, master } = audio;
  const start = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq !== null) osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.02, dur * 0.25));
  env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(env);
  env.connect(master);
  if (send !== null) env.connect(send);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function noiseBurst({ at = 0, dur = 0.03, gain = 0.4, freq = 2000, q = 1 }) {
  const { ctx, master } = audio;
  const start = ctx.currentTime + at;
  const source = noiseSource();
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, start);
  env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  source.connect(filter);
  filter.connect(env);
  env.connect(master);
  source.start(start);
  source.stop(start + dur + 0.01);
}

function arpeggio(notes, { step = 0.09, dur = 0.16, gain = 0.4, type = 'triangle', send = null }) {
  notes.forEach((freq, index) => {
    tone({ freq, type, at: index * step, dur, gain, send });
  });
}

// 버튼: 아주 짧은 클릭
export function playButton() {
  if (!ready()) return;
  noiseBurst({ dur: 0.012, gain: 0.3, freq: 1300, q: 1.4 });
}

// 릴 회전: 짧은 노이즈 틱을 70ms 간격으로 반복
export function startReelLoop() {
  if (!ready() || reelTimer !== null) return;
  const tick = () => noiseBurst({ dur: 0.026, gain: 0.26, freq: 2400, q: 0.8 });
  tick();
  reelTimer = setInterval(tick, REEL_TICK_MS);
}

export function stopReelLoop() {
  if (reelTimer === null) return;
  clearInterval(reelTimer);
  reelTimer = null;
}

// 릴 정지: 낮은 트라이앵글 짧게
export function playReelStop() {
  if (!ready()) return;
  tone({ freq: 146.8, type: 'triangle', dur: 0.13, gain: 0.55 });
  noiseBurst({ dur: 0.02, gain: 0.18, freq: 700, q: 1.2 });
}

// 앤티시페이션: 상승 글리산도
export function playAnticipation() {
  if (!ready()) return;
  tone({ freq: 280, endFreq: 1500, type: 'sawtooth', dur: 0.95, gain: 0.16 });
}

// 일반 당첨: 3음 아르페지오
export function playWin() {
  if (!ready()) return;
  arpeggio(WIN_NOTES, { step: 0.09, dur: 0.18, gain: 0.4 });
}

// 라인 하이라이트가 넘어갈 때 찍는 짧은 액센트
export function playLineTick() {
  if (!ready()) return;
  tone({ freq: 880, type: 'triangle', dur: 0.07, gain: 0.26 });
}

// 빅윈: 5음 상승 + 잔향
export function playBigWin() {
  if (!ready()) return;
  arpeggio(BIG_WIN_NOTES, { step: 0.11, dur: 0.24, gain: 0.42, send: createReverb(0.4) });
}

// 잭팟: 긴 팡파르
export function playJackpot() {
  if (!ready()) return;
  const send = createReverb(0.5);
  const steps = [0, 0.16, 0.32, 0.48, 0.66, 0.82, 1.0, 1.22];
  JACKPOT_NOTES.forEach((freq, index) => {
    tone({ freq, type: 'square', at: steps[index], dur: 0.3, gain: 0.22, send });
    tone({ freq: freq / 2, type: 'triangle', at: steps[index], dur: 0.34, gain: 0.3, send });
  });
  tone({ freq: 1046.5, type: 'triangle', at: 1.45, dur: 1.1, gain: 0.4, send });
}

// 카운트업: 고주파 짧은 틱
export function playCountTick() {
  if (!ready()) return;
  tone({ freq: 2600, type: 'sine', dur: 0.022, gain: 0.16 });
}
