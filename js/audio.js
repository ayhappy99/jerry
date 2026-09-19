// WebAudio로 합성하는 효과음과 배경음. 오디오 파일을 쓰지 않는다.
// 배경음도 직접 합성한 코드 진행이므로 저작권·표시 의무가 없다.
// AudioContext는 첫 사용자 제스처(unlock 호출) 시점에만 만든다.
// 소리 끔 상태에서는 컨텍스트를 아예 만들지 않는다.

const MASTER_GAIN = 0.22;
const REEL_TICK_MS = 70;
const NOISE_SECONDS = 0.12;

// 아르페지오 음계 (C5 E5 G5 C6 E6 ...)
const WIN_NOTES = [523.25, 659.25, 783.99];
const BIG_WIN_NOTES = [523.25, 659.25, 783.99, 1046.5, 1318.5];
const JACKPOT_NOTES = [523.25, 523.25, 659.25, 783.99, 1046.5, 1046.5, 1318.5, 1567.98];

// ── 배경음 ────────────────────────────────
// 일렉트로 하우스 128 BPM. 16분음표 한 칸을 step으로 센다.
// 4코드 × 1마디(16step) = 4마디 루프, 7.5초.
const MUSIC = {
  bpm: 128,
  stepsPerBar: 16,
  lookahead: 0.3,
  pumpMs: 40,
  busGain: 0.62,
  duckGain: 0.1,
  fadeIn: 0.8,
  fadeOut: 0.35,
};

// 각 악기의 게인. 합쳐도 효과음 피크(0.55)를 넘지 않게 낮게 잡는다.
const VOICE = {
  kick: 0.38,
  kickClick: 0.12,
  bass: 0.22,
  hatOpen: 0.09,
  hatClosed: 0.045,
  clap: 0.14,
  stab: 0.075,
  arp: 0.07,
};

// vi - IV - I - V. 밝고 전진하는 하우스 진행이다.
const PROGRESSION = [
  { bass: 110.0, chord: [220.0, 261.63, 329.63] },  // Am
  { bass: 87.31, chord: [174.61, 220.0, 261.63] },  // F
  { bass: 130.81, chord: [196.0, 261.63, 329.63] }, // C
  { bass: 98.0, chord: [196.0, 246.94, 293.66] },   // G
];

// 16분음표 자리(0~15) 기준 리듬 패턴
const PATTERN = {
  kick: [0, 4, 8, 12],
  clap: [4, 12],
  hatOpen: [2, 6, 10, 14],
  hatClosed: [1, 3, 5, 7, 9, 11, 13, 15],
  bass: [0, 3, 6, 10, 14],
  stab: [6, 14],
};

// 아르페지오 자리는 마디마다 번갈아 쓴다.
const ARP_PATTERNS = [
  [2, 5, 8, 11],
  [1, 4, 7, 10, 13],
];

const STEP_SECONDS = 60 / MUSIC.bpm / 4;
const LOOP_STEPS = PROGRESSION.length * MUSIC.stepsPerBar;

let audio = null;
let enabled = false;
let musicEnabled = false;
let reelTimer = null;
let music = null;
let noiseBuffer = null;

function createContext() {
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(ctx.destination);
  // 효과음과 배경음을 따로 둬 배경음만 줄일(덕킹) 수 있게 한다.
  const sfx = ctx.createGain();
  sfx.gain.value = 1;
  sfx.connect(master);
  const musicBus = ctx.createGain();
  musicBus.gain.value = 0.0001;
  musicBus.connect(master);
  return { ctx, master, sfx, musicBus };
}

export function setEnabled(on) {
  enabled = on;
  if (!on) {
    stopReelLoop();
    stopMusic();
  }
}

export function setMusicEnabled(on) {
  musicEnabled = on;
  if (on) startMusic();
  else stopMusic();
}

// 첫 사용자 제스처에서 호출한다. 여기가 컨텍스트를 만드는 유일한 지점이다.
export function unlock() {
  if (!enabled) return;
  if (audio === null) audio = createContext();
  if (audio.ctx.state === 'suspended') audio.ctx.resume();
  startMusic();
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
  const { ctx, sfx } = audio;
  const delay = ctx.createDelay(0.6);
  delay.delayTime.value = 0.15;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.44;
  const wet = ctx.createGain();
  wet.gain.value = wetGain;
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  wet.connect(sfx);
  return delay;
}

// 오실레이터 한 음. time은 AudioContext 절대 시각이다.
function playVoice({
  time,
  freq,
  endFreq = null,
  type = 'sine',
  dur = 0.2,
  attack = 0.02,
  gain = 0.5,
  target,
  filterFreq = null,
  send = null,
}) {
  const { ctx } = audio;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  if (endFreq !== null) osc.frequency.exponentialRampToValueAtTime(endFreq, time + dur);
  env.gain.setValueAtTime(0.0001, time);
  env.gain.exponentialRampToValueAtTime(gain, time + Math.min(attack, dur * 0.5));
  env.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  osc.connect(env);

  let tail = env;
  if (filterFreq !== null) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    env.connect(filter);
    tail = filter;
  }
  tail.connect(target);
  if (send !== null) tail.connect(send);
  osc.start(time);
  osc.stop(time + dur + 0.05);
}

// 효과음용 래퍼. at은 현재 시각으로부터의 오프셋이다.
function tone({ freq, endFreq = null, type = 'sine', at = 0, dur = 0.2, gain = 0.5, send = null }) {
  playVoice({
    time: audio.ctx.currentTime + at,
    freq,
    endFreq,
    type,
    dur,
    gain,
    send,
    target: audio.sfx,
  });
}

// 노이즈 한 발. time은 AudioContext 절대 시각이다.
function playNoise({ time, dur = 0.03, gain = 0.4, freq = 2000, q = 1, type = 'bandpass', target }) {
  const { ctx } = audio;
  const source = noiseSource();
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, time);
  env.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  source.connect(filter);
  filter.connect(env);
  env.connect(target);
  source.start(time);
  source.stop(time + dur + 0.01);
}

// 효과음용 래퍼. at은 현재 시각으로부터의 오프셋이다.
function noiseBurst({ at = 0, dur = 0.03, gain = 0.4, freq = 2000, q = 1 }) {
  playNoise({ time: audio.ctx.currentTime + at, dur, gain, freq, q, target: audio.sfx });
}

function arpeggio(notes, { step = 0.09, dur = 0.16, gain = 0.4, type = 'triangle', send = null }) {
  notes.forEach((freq, index) => {
    tone({ freq, type, at: index * step, dur, gain, send });
  });
}

// ── 배경음 스케줄러 ───────────────────────
// 악기마다 함수를 하나씩 둔다. time은 AudioContext 절대 시각이다.

function scheduleKick(time) {
  playVoice({
    time,
    freq: 110,
    endFreq: 42,
    type: 'sine',
    dur: 0.17,
    attack: 0.004,
    gain: VOICE.kick,
    target: audio.musicBus,
  });
  playNoise({ time, dur: 0.012, gain: VOICE.kickClick, freq: 1800, q: 0.9, target: audio.musicBus });
}

function scheduleClap(time) {
  // 짧은 두 발로 손뼉의 플램을 만든다.
  playNoise({ time, dur: 0.02, gain: VOICE.clap * 0.6, freq: 1500, q: 0.8, target: audio.musicBus });
  playNoise({ time: time + 0.012, dur: 0.085, gain: VOICE.clap, freq: 1700, q: 0.7, target: audio.musicBus });
}

function scheduleHat(time, open) {
  playNoise({
    time,
    dur: open ? 0.075 : 0.022,
    gain: open ? VOICE.hatOpen : VOICE.hatClosed,
    freq: 9000,
    q: 0.7,
    type: 'highpass',
    target: audio.musicBus,
  });
}

// 오프비트 스타카토 베이스. 하우스의 추진력을 만드는 자리다.
function scheduleBass(chord, time) {
  playVoice({
    time,
    freq: chord.bass,
    type: 'sawtooth',
    dur: 0.13,
    attack: 0.006,
    gain: VOICE.bass,
    filterFreq: 320,
    target: audio.musicBus,
  });
}

// 코드 스탭. 세 음을 짧게 함께 찍는다.
function scheduleStab(chord, time) {
  for (const freq of chord.chord) {
    playVoice({
      time,
      freq,
      type: 'sawtooth',
      dur: 0.11,
      attack: 0.005,
      gain: VOICE.stab,
      filterFreq: 2600,
      target: audio.musicBus,
    });
  }
}

function scheduleArp(chord, time, index) {
  playVoice({
    time,
    freq: chord.chord[index % chord.chord.length] * 2,
    type: 'triangle',
    dur: 0.16,
    attack: 0.004,
    gain: VOICE.arp,
    filterFreq: 5200,
    target: audio.musicBus,
  });
}

function scheduleStep(step, time) {
  const bar = Math.floor(step / MUSIC.stepsPerBar);
  const chord = PROGRESSION[bar % PROGRESSION.length];
  const local = step % MUSIC.stepsPerBar;
  const arp = ARP_PATTERNS[bar % ARP_PATTERNS.length];

  if (PATTERN.kick.includes(local)) scheduleKick(time);
  if (PATTERN.clap.includes(local)) scheduleClap(time);
  if (PATTERN.hatOpen.includes(local)) scheduleHat(time, true);
  else if (PATTERN.hatClosed.includes(local)) scheduleHat(time, false);
  if (PATTERN.bass.includes(local)) scheduleBass(chord, time);
  if (PATTERN.stab.includes(local)) scheduleStab(chord, time);
  if (arp.includes(local)) scheduleArp(chord, time, step);
}

function pumpMusic() {
  const horizon = audio.ctx.currentTime + MUSIC.lookahead;
  while (music.nextTime < horizon) {
    scheduleStep(music.step, music.nextTime);
    music.nextTime += STEP_SECONDS;
    music.step += 1;
  }
}

function rampMusicBus(value, seconds) {
  const { ctx, musicBus } = audio;
  const now = ctx.currentTime;
  musicBus.gain.cancelScheduledValues(now);
  musicBus.gain.setValueAtTime(Math.max(musicBus.gain.value, 0.0001), now);
  musicBus.gain.exponentialRampToValueAtTime(Math.max(value, 0.0001), now + seconds);
}

export function startMusic() {
  if (!ready() || !musicEnabled || music !== null) return;
  music = { step: 0, nextTime: audio.ctx.currentTime + 0.12, timer: null };
  rampMusicBus(MUSIC.busGain, MUSIC.fadeIn);
  music.timer = setInterval(pumpMusic, MUSIC.pumpMs);
  pumpMusic();
}

export function stopMusic() {
  if (music === null) return;
  clearInterval(music.timer);
  music = null;
  rampMusicBus(0, MUSIC.fadeOut);
}

// 빅윈·잭팟 연출 동안 배경음만 낮춘다.
export function duckMusic(seconds) {
  if (music === null) return;
  const { ctx, musicBus } = audio;
  const now = ctx.currentTime;
  musicBus.gain.cancelScheduledValues(now);
  musicBus.gain.setValueAtTime(musicBus.gain.value, now);
  musicBus.gain.linearRampToValueAtTime(MUSIC.duckGain, now + 0.18);
  musicBus.gain.linearRampToValueAtTime(MUSIC.busGain, now + Math.max(seconds, 0.6));
}

// ── 효과음 ────────────────────────────────

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
