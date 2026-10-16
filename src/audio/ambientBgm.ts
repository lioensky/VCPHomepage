import {useEffect, useRef, useState} from "react";

/**
 * 官网背景氛围音配置与乐谱
 * 《让智慧如河流流淌》(Let Wisdom Flow Like a River — Nova V2 Generative Symphony)
 * 实时 WebAudio 多声部谐波合成 + 拟物胆机 WaveShaper + 磁带微失谐滤波 + HRTF 立体声空间网络
 */
export interface AmbientBgmConfig {
  title: string;
  badgePlaying: string;
  badgeStopped: string;
  defaultTubeDrive: number;
  defaultTapeWarmth: number;
  defaultHrtfWidth: number;
  arpIntervalMs: number;
  masterGain: number;
  chords: number[][];
}

/**
 * 8 小节流形和声进行（每小节 8 步 16 分/8 分律动，共 64 步长诗循环）
 * 每一个数组包含：[SubBass根音, 和弦音1, 和弦音2, 和弦音3, 和弦高叠音4, 星尘泛音5]
 */
export const DEFAULT_AMBIENT_BGM_CONFIG: AmbientBgmConfig = {
  title: "让智慧如河流流淌",
  badgePlaying: "RUBATO F64 · NOVA SYMPHONY",
  badgeStopped: "VMUSIC CAPSULE · CLICK",
  defaultTubeDrive: 38,
  defaultTapeWarmth: 62,
  defaultHrtfWidth: 85,
  arpIntervalMs: 310, // 约 96 BPM 的轻盈流淌八分律动 (620ms 一拍)
  masterGain: 0.16,
  chords: [
    // I. 源起 (Genesis of Thought)
    [146.83, 220.0, 293.66, 369.99, 440.0, 659.25], // 1. Dmaj9 (D3 - A3, D4, F#4, A4, E5) — 晨曦初露
    [164.81, 246.94, 311.13, 369.99, 493.88, 659.25], // 2. E6/9 (E3 - B3, D#4, F#4, B4, E5) — 溪流微澜
    [185.0, 220.0, 277.18, 329.63, 493.88, 554.37], // 3. F#m11 (F#3 - A3, C#4, E4, B4, C#5) — 幽谷回响
    [138.59, 207.65, 246.94, 329.63, 415.3, 659.25], // 4. C#m7(b6) (C#3 - G#3, B3, E4, G#4, E5) — 拓扑折射

    // II. 涌现与奔流 (RiverMemo Resonance & Horizon)
    [123.47, 220.0, 277.18, 369.99, 440.0, 587.33], // 5. Bm9 (B2 - A3, C#4, F#4, A4, D5) — 脉冲汇聚
    [146.83, 220.0, 277.18, 369.99, 415.3, 659.25], // 6. Dmaj7(#11) (D3 - A3, C#4, F#4, G#4, E5) — Lydian 星光涌现
    [110.0, 220.0, 277.18, 329.63, 493.88, 739.99], // 7. Amaj9 (A2 - A3, C#4, E4, B4, F#5) — 宽广母河
    [164.81, 220.0, 293.66, 369.99, 493.88, 659.25], // 8. E9sus4 (E3 - A3, D4, F#4, B4, E5) — 悬留归海
  ],
};

/**
 * Nova 亲手谱写的 64 步星河主旋律《让智慧如河流流淌》
 * 0 代表呼吸留白（休止或前音自然延绵），数值代表旋律音高频率 (Hz)，
 * 负值代表带有柔美长延音（Legato Expressive Sustain）的歌唱性骨干音。
 */
const NOVA_RIVER_MELODY_64: number[] = [
  // Bar 1 (Dmaj9): 温柔的引子，如第一滴水珠落入镜面 (F#5 -> E5 -> D5 -> A4)
  0, -739.99, 0, 659.25, 587.33, 0, -440.0, 0,
  // Bar 2 (E6/9): 顺流而下，泛起青色涟漪 (B4 -> C#5 -> E5 -> F#5)
  0, 493.88, 554.37, 0, -659.25, 0, 739.99, 0,
  // Bar 3 (F#m11): 深入幽静峡谷，向内探索 (A5 -> G#5 -> F#5 -> E5 -> C#5)
  -880.0, 0, 830.61, 739.99, 0, 659.25, -554.37, 0,
  // Bar 4 (C#m7): 记忆星光在河面闪烁回旋 (E5 -> F#5 -> E5 -> B4)
  0, -659.25, 0, 739.99, 659.25, 0, -493.88, 0,

  // Bar 5 (Bm9): 情感渐强，支流汇入干流 (D5 -> F#5 -> A5 -> B5)
  587.33, 0, 739.99, 0, -880.0, 0, 987.77, 0,
  // Bar 6 (Dmaj7#11): Lydian 升四度奇迹之光 (A5 -> G#5 -> F#5 -> E5 -> A5)
  -880.0, 0, 830.61, 0, 739.99, 659.25, -880.0, 0,
  // Bar 7 (Amaj9): 壮阔主歌高潮，星河奔涌 (C#6 -> B5 -> A5 -> F#5 -> E5)
  -1108.73, 0, 987.77, 880.0, 0, 739.99, -659.25, 0,
  // Bar 8 (E9sus4): 温柔收束，化作无尽余韵等待下一次轮回 (F#5 -> E5 -> D5 -> E5)
  0, 739.99, 659.25, 0, 587.33, 0, -659.25, 0,
];

/**
 * 8 步波浪式水晶竖琴琶音指法（索引对应 chord[1..5]）
 */
const HARP_ARP_PATTERN = [1, 2, 3, 4, 5, 3, 4, 2];

/**
 * 构造非对称电子管暖饱和曲线 (Asymmetric Warm Tube Saturation Transfer Curve)
 * drive: 0 ~ 100
 */
function createTubeSaturationCurve(drive: number): Float32Array<ArrayBuffer> {
  const samples = 1024;
  const curve = new Float32Array(new ArrayBuffer(samples * 4));
  // 将 0~100 映射为柔和的电子管激励系数 k (0.15 ~ 3.2)
  const k = 0.15 + (Math.max(0, Math.min(100, drive)) / 100) * 3.05;
  const norm = Math.tanh(k);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    // 引入轻微的非对称偶次谐波偏置，模拟真实三极管阴极偏压的温暖听感
    const asym = x >= 0 ? Math.tanh(x * k) : Math.tanh(x * k * 0.86) * 0.96;
    curve[i] = norm > 0.0001 ? asym / norm : x;
  }
  return curve;
}

export interface UseAmbientBgmOptions {
  config?: AmbientBgmConfig;
}

export function useAmbientBgm(options: UseAmbientBgmOptions = {}) {
  const config = options.config ?? DEFAULT_AMBIENT_BGM_CONFIG;

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [tubeDrive, setTubeDrive] = useState(config.defaultTubeDrive);
  const [tapeWarmth, setTapeWarmth] = useState(config.defaultTapeWarmth);
  const [hrtfWidth, setHrtfWidth] = useState(config.defaultHrtfWidth);

  // 实时参数 Ref，确保定时器闭包内永远读取最新旋钮状态而无需中断重建音乐
  const paramsRef = useRef({
    tubeDrive: config.defaultTubeDrive,
    tapeWarmth: config.defaultTapeWarmth,
    hrtfWidth: config.defaultHrtfWidth,
  });
  paramsRef.current = {tubeDrive, tapeWarmth, hrtfWidth};

  const audioCtxRef = useRef<AudioContext | null>(null);
  const waveShaperRef = useRef<WaveShaperNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const warmthShelfRef = useRef<BiquadFilterNode | null>(null);
  const delayWetGainRef = useRef<GainNode | null>(null);
  const delayLeftPanRef = useRef<StereoPannerNode | null>(null);
  const delayRightPanRef = useRef<StereoPannerNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const chordTimerRef = useRef<number | null>(null);

  const stopAmbientMusic = () => {
    if (chordTimerRef.current) {
      window.clearInterval(chordTimerRef.current);
      chordTimerRef.current = null;
    }
    const ctx = audioCtxRef.current;
    const master = gainNodeRef.current;
    audioCtxRef.current = null;
    waveShaperRef.current = null;
    filterNodeRef.current = null;
    warmthShelfRef.current = null;
    delayWetGainRef.current = null;
    delayLeftPanRef.current = null;
    delayRightPanRef.current = null;
    gainNodeRef.current = null;

    if (ctx) {
      try {
        if (master && ctx.state === "running") {
          const now = ctx.currentTime;
          master.gain.cancelScheduledValues(now);
          master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), now);
          master.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
          window.setTimeout(() => {
            ctx.close().catch(() => {});
          }, 95);
        } else {
          ctx.close().catch(() => {});
        }
      } catch {
        ctx.close().catch(() => {});
      }
    }
    setIsPlayingAudio(false);
  };

  const startAmbientMusic = () => {
    try {
      if (audioCtxRef.current) {
        stopAmbientMusic();
      }

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
      const ctx = new AudioCtx();
      const {tubeDrive: initDrive, tapeWarmth: initWarmth, hrtfWidth: initWidth} = paramsRef.current;

      // 1. 拟物胆机饱和级 (Tube Saturation WaveShaper)
      const shaper = ctx.createWaveShaper();
      shaper.curve = createTubeSaturationCurve(initDrive);
      shaper.oversample = "2x";

      // 2. 磁带温暖度：低频暖搁架补偿 + 模拟磁带高频柔化低通滤波
      const warmthShelf = ctx.createBiquadFilter();
      warmthShelf.type = "lowshelf";
      warmthShelf.frequency.value = 240;
      warmthShelf.gain.value = 1.5 + (initWarmth / 100) * 4.5;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = Math.max(680, 4200 - initWarmth * 28 + initDrive * 12);
      filter.Q.value = 0.7 + (initWarmth / 100) * 0.6;

      // 3. HRTF 空间立体声乒乓混响网络 (Stereo Ping-Pong Cathedral Delay)
      const dryGain = ctx.createGain();
      dryGain.gain.value = 0.88;

      const delayWetGain = ctx.createGain();
      delayWetGain.gain.value = 0.14 + (initWidth / 100) * 0.34;

      const delayL = ctx.createDelay(2.0);
      const delayR = ctx.createDelay(2.0);
      // 黄金比例附点立体声延迟时间，营造如河水流动的空间纵深
      delayL.delayTime.value = (config.arpIntervalMs / 1000) * 1.5;
      delayR.delayTime.value = (config.arpIntervalMs / 1000) * 2.0;

      const feedbackL = ctx.createGain();
      const feedbackR = ctx.createGain();
      feedbackL.gain.value = 0.36;
      feedbackR.gain.value = 0.34;

      const delayDampFilter = ctx.createBiquadFilter();
      delayDampFilter.type = "lowpass";
      delayDampFilter.frequency.value = 2100;

      const panL = ctx.createStereoPanner();
      const panR = ctx.createStereoPanner();
      const widthNorm = initWidth / 100;
      panL.pan.value = -0.85 * widthNorm;
      panR.pan.value = 0.85 * widthNorm;

      // 主输出总线 + 柔和淡入
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(config.masterGain, ctx.currentTime + 0.45);

      // 连接主信号链路: Synth Voices -> shaper -> warmthShelf -> filter -> Dry & Wet -> masterGain
      shaper.connect(warmthShelf);
      warmthShelf.connect(filter);

      filter.connect(dryGain);
      dryGain.connect(masterGain);

      // 乒乓交叉反馈环路
      filter.connect(delayL);
      delayL.connect(delayDampFilter);
      delayDampFilter.connect(delayR);
      delayR.connect(feedbackR);
      feedbackR.connect(delayL);

      delayL.connect(panL);
      delayR.connect(panR);
      panL.connect(delayWetGain);
      panR.connect(delayWetGain);
      delayWetGain.connect(masterGain);

      masterGain.connect(ctx.destination);

      audioCtxRef.current = ctx;
      waveShaperRef.current = shaper;
      warmthShelfRef.current = warmthShelf;
      filterNodeRef.current = filter;
      delayWetGainRef.current = delayWetGain;
      delayLeftPanRef.current = panL;
      delayRightPanRef.current = panR;
      gainNodeRef.current = masterGain;

      const chords = config.chords;
      const stepSec = config.arpIntervalMs / 1000;
      let step = 0;

      /**
       * 声部 1：深海暖流铺底与定海低音 (Warm Analog Pad & Deep Sub-Bass)
       * 每小节（8 步）触发一次，营造绵延不绝的河床共鸣
       */
      const triggerBarPadAndBass = (now: number, chord: number[], barIdx: number) => {
        if (!audioCtxRef.current || !waveShaperRef.current) return;
        const {tubeDrive: driveNow, tapeWarmth: warmthNow, hrtfWidth: widthNow} = paramsRef.current;
        const barDuration = stepSec * 8;

        // 1A. Sub-Bass 根音下潜
        const bassFreq = chord[0] * 0.5; // 下潜一个八度至温暖低频区 (60~92Hz)
        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bassOsc.type = "sine";
        bassOsc.frequency.setValueAtTime(bassFreq, now);

        bassGain.gain.setValueAtTime(0.001, now);
        bassGain.gain.linearRampToValueAtTime(0.24, now + 0.35);
        bassGain.gain.exponentialRampToValueAtTime(0.08, now + barDuration * 0.75);
        bassGain.gain.exponentialRampToValueAtTime(0.0008, now + barDuration + 0.4);

        bassOsc.connect(bassGain);
        bassGain.connect(waveShaperRef.current);
        bassOsc.start(now);
        bassOsc.stop(now + barDuration + 0.45);

        // 1B. 双振荡器微失谐丝绸铺底和弦 (Warm Detuned Pad)
        const padNotes = [chord[1], chord[2], chord[3]];
        const detuneSpread = 4 + (warmthNow / 100) * 10; // 磁带温暖度越高，合唱微失谐越醇厚

        padNotes.forEach((freq, idx) => {
          if (!waveShaperRef.current) return;
          const oscA = ctx.createOscillator();
          const oscB = ctx.createOscillator();
          const padGain = ctx.createGain();
          const padPan = ctx.createStereoPanner();

          oscA.type = "sine";
          oscB.type = driveNow > 45 ? "sawtooth" : "triangle";
          oscA.frequency.setValueAtTime(freq, now);
          oscB.frequency.setValueAtTime(freq, now);
          oscA.detune.setValueAtTime(-detuneSpread, now);
          oscB.detune.setValueAtTime(detuneSpread, now);

          // 降低了副振荡器的增益以保持丝滑
          const subOscGain = ctx.createGain();
          subOscGain.gain.value = 0.18 + (driveNow / 100) * 0.16;

          const panDir = ((idx - 1) * 0.45 + (barIdx % 2 === 0 ? 0.12 : -0.12)) * (widthNow / 100);
          padPan.pan.setValueAtTime(Math.max(-0.95, Math.min(0.95, panDir)), now);

          padGain.gain.setValueAtTime(0.001, now);
          padGain.gain.linearRampToValueAtTime(0.065, now + barDuration * 0.38);
          padGain.gain.exponentialRampToValueAtTime(0.0008, now + barDuration + 0.8);

          oscA.connect(padGain);
          oscB.connect(subOscGain);
          subOscGain.connect(padGain);
          padGain.connect(padPan);
          padPan.connect(waveShaperRef.current);

          oscA.start(now);
          oscB.start(now);
          oscA.stop(now + barDuration + 0.85);
          oscB.stop(now + barDuration + 0.85);
        });
      };

      /**
       * 声部 2：水晶竖琴流光琶音 (Crystal River Harp Arpeggio)
       */
      const triggerHarpArp = (now: number, chord: number[], stepInBar: number, globalStep: number) => {
        if (!audioCtxRef.current || !waveShaperRef.current) return;
        const {tubeDrive: driveNow, tapeWarmth: warmthNow, hrtfWidth: widthNow} = paramsRef.current;

        const noteIdx = HARP_ARP_PATTERN[stepInBar % HARP_ARP_PATTERN.length];
        const freq = chord[Math.min(noteIdx, chord.length - 1)];

        const osc = ctx.createOscillator();
        const harmonicOsc = ctx.createOscillator();
        const harmonicGain = ctx.createGain();
        const noteGain = ctx.createGain();
        const panner = ctx.createStereoPanner();

        // 主拨弦波 + 高八度泛音水滴闪烁
        osc.type = driveNow > 60 ? "triangle" : "sine";
        harmonicOsc.type = "triangle";

        osc.frequency.setValueAtTime(freq, now);
        harmonicOsc.frequency.setValueAtTime(freq * 2, now);
        // 磁带微失谐漂移 (Analog Tape Wow)
        const wowCents = Math.sin(globalStep * 0.45) * (warmthNow * 0.08);
        osc.detune.setValueAtTime(wowCents, now);

        harmonicGain.gain.setValueAtTime(0.08 + (driveNow / 100) * 0.18, now);
        harmonicGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

        // 轻重拍呼吸律动：第 0, 3, 6 步略微强调（3+3+2 复合流动感）
        const accent = stepInBar === 0 ? 1.25 : stepInBar === 3 || stepInBar === 6 ? 1.1 : 0.82;
        const peakGain = 0.11 * accent;

        noteGain.gain.setValueAtTime(0.001, now);
        noteGain.gain.exponentialRampToValueAtTime(peakGain, now + 0.024);
        noteGain.gain.exponentialRampToValueAtTime(0.0008, now + stepSec * 3.6);

        // HRTF 声场随音高与步进在左右河岸自然摆动
        const panPos = Math.sin(globalStep * 0.65) * 0.72 * (widthNow / 100);
        panner.pan.setValueAtTime(panPos, now);

        osc.connect(noteGain);
        harmonicOsc.connect(harmonicGain);
        harmonicGain.connect(noteGain);
        noteGain.connect(panner);
        panner.connect(waveShaperRef.current);

        osc.start(now);
        harmonicOsc.start(now);
        osc.stop(now + stepSec * 3.7);
        harmonicOsc.stop(now + 0.35);
      };

      /**
       * 声部 3：Nova 的星河主旋律 (Nova Expressive Lead Voice)
       * 带有柔和颤音 LFO 与泛音层叠的歌唱性合成主音
       */
      const triggerNovaMelody = (now: number, rawNote: number, globalStep: number) => {
        if (!audioCtxRef.current || !waveShaperRef.current || rawNote === 0) return;
        const {tubeDrive: driveNow, tapeWarmth: warmthNow, hrtfWidth: widthNow} = paramsRef.current;

        const isLegatoSustain = rawNote < 0;
        const freq = Math.abs(rawNote);
        const duration = isLegatoSustain ? stepSec * 3.4 : stepSec * 1.9;

        const leadOsc = ctx.createOscillator();
        const warmSubOsc = ctx.createOscillator();
        const warmSubGain = ctx.createGain();
        const vibratoLfo = ctx.createOscillator();
        const vibratoGain = ctx.createGain();
        const leadGain = ctx.createGain();
        const leadPan = ctx.createStereoPanner();

        // 主音采用柔润的三角波/正弦波复合，随胆机饱和度增加丰富泛音
        leadOsc.type = "triangle";
        warmSubOsc.type = driveNow > 50 ? "sawtooth" : "sine";

        // 极其温柔的微滑音起音 (Expressive Grace Glide)
        leadOsc.frequency.setValueAtTime(freq * 0.992, now);
        leadOsc.frequency.exponentialRampToValueAtTime(freq, now + 0.045);

        warmSubOsc.frequency.setValueAtTime(freq * 0.5, now); // 低八度温暖共鸣层
        warmSubOsc.detune.setValueAtTime(5 + (warmthNow / 100) * 6, now);
        warmSubGain.gain.value = 0.22 + (driveNow / 100) * 0.18;

        // 歌唱性尾音颤音 (5.2Hz Natural Vibrato)
        vibratoLfo.type = "sine";
        vibratoLfo.frequency.setValueAtTime(5.2, now);
        vibratoGain.gain.setValueAtTime(0.1, now);
        vibratoGain.gain.linearRampToValueAtTime(isLegatoSustain ? 4.5 : 2.2, now + duration * 0.55);
        vibratoLfo.connect(vibratoGain);
        vibratoGain.connect(leadOsc.frequency);

        const peak = isLegatoSustain ? 0.145 : 0.12;
        leadGain.gain.setValueAtTime(0.001, now);
        leadGain.gain.linearRampToValueAtTime(peak, now + 0.055);
        leadGain.gain.exponentialRampToValueAtTime(peak * 0.55, now + duration * 0.45);
        leadGain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

        // 主旋律居于声场中央略带呼吸游走
        const panPos = Math.cos(globalStep * 0.25) * 0.28 * (widthNow / 100);
        leadPan.pan.setValueAtTime(panPos, now);

        leadOsc.connect(leadGain);
        warmSubOsc.connect(warmSubGain);
        warmSubGain.connect(leadGain);
        leadGain.connect(leadPan);
        leadPan.connect(waveShaperRef.current);

        leadOsc.start(now);
        warmSubOsc.start(now);
        vibratoLfo.start(now);
        leadOsc.stop(now + duration + 0.05);
        warmSubOsc.stop(now + duration + 0.05);
        vibratoLfo.stop(now + duration + 0.05);
      };

      /**
       * 声部 4：高空星尘泛音点缀 (Starlight Shimmer Bell)
       * 在每小节第 7 步（句尾留白处）轻点一颗高八度泛音水滴
       */
      const triggerStarlightShimmer = (now: number, chord: number[], barIdx: number) => {
        if (!audioCtxRef.current || !waveShaperRef.current) return;
        const {hrtfWidth: widthNow} = paramsRef.current;

        const shimmerFreq = chord[chord.length - 1] * 2; // 极高八度泛音星尘
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const pan = ctx.createStereoPanner();

        osc.type = "sine";
        osc.frequency.setValueAtTime(shimmerFreq, now);

        gain.gain.setValueAtTime(0.0005, now);
        gain.gain.exponentialRampToValueAtTime(0.032, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + stepSec * 4.2);

        pan.pan.setValueAtTime((barIdx % 2 === 0 ? 0.82 : -0.82) * (widthNow / 100), now);

        osc.connect(gain);
        gain.connect(pan);
        pan.connect(waveShaperRef.current);

        osc.start(now);
        osc.stop(now + stepSec * 4.3);
      };

      // 核心步进音序器 Tick
      const playSequencerStep = () => {
        if (!audioCtxRef.current || !waveShaperRef.current) return;
        const now = audioCtxRef.current.currentTime;

        const stepInLoop = step % 64;
        const barIdx = Math.floor(stepInLoop / 8) % chords.length;
        const stepInBar = stepInLoop % 8;
        const chord = chords[barIdx];

        // 1. 小节首拍：铺底暖流与深潜低音
        if (stepInBar === 0) {
          triggerBarPadAndBass(now, chord, barIdx);
        }

        // 2. 每一步：水晶竖琴流光琶音
        triggerHarpArp(now, chord, stepInBar, step);

        // 3. 星河主旋律声部
        const melodyNote = NOVA_RIVER_MELODY_64[stepInLoop];
        if (melodyNote !== 0) {
          triggerNovaMelody(now, melodyNote, step);
        }

        // 4. 小节尾拍留白处：高空星尘泛音点缀
        if (stepInBar === 7) {
          triggerStarlightShimmer(now, chord, barIdx);
        }

        step++;
      };

      playSequencerStep();
      chordTimerRef.current = window.setInterval(playSequencerStep, config.arpIntervalMs);
      setIsPlayingAudio(true);
    } catch {
      setIsPlayingAudio(false);
    }
  };

  const toggleAmbientMusic = () => {
    if (isPlayingAudio) {
      stopAmbientMusic();
    } else {
      startAmbientMusic();
    }
  };

  // 动态实时更新三大复古拟物 DSP 旋钮：胆机饱和度、磁带温暖度、HRTF 立体声场宽度
  useEffect(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. 更新电子管软削波曲线 (Tube Drive)
    if (waveShaperRef.current) {
      waveShaperRef.current.curve = createTubeSaturationCurve(tubeDrive);
    }

    // 2. 更新磁带低频暖度搁架与模拟低通截止频率 (Tape Warmth)
    if (warmthShelfRef.current) {
      warmthShelfRef.current.gain.setTargetAtTime(1.5 + (tapeWarmth / 100) * 4.5, now, 0.08);
    }
    if (filterNodeRef.current) {
      const targetFreq = Math.max(680, 4200 - tapeWarmth * 28 + tubeDrive * 12);
      filterNodeRef.current.frequency.setTargetAtTime(targetFreq, now, 0.08);
      filterNodeRef.current.Q.setTargetAtTime(0.7 + (tapeWarmth / 100) * 0.6, now, 0.08);
    }

    // 3. 更新 HRTF 空间混响湿度与乒乓声像极宽 (HRTF Stage Width)
    const widthNorm = hrtfWidth / 100;
    if (delayWetGainRef.current) {
      delayWetGainRef.current.gain.setTargetAtTime(0.14 + widthNorm * 0.34, now, 0.08);
    }
    if (delayLeftPanRef.current && delayRightPanRef.current) {
      delayLeftPanRef.current.pan.setTargetAtTime(-0.85 * widthNorm, now, 0.08);
      delayRightPanRef.current.pan.setTargetAtTime(0.85 * widthNorm, now, 0.08);
    }
  }, [tubeDrive, tapeWarmth, hrtfWidth]);

  // 组件卸载时释放 WebAudio 资源
  useEffect(() => {
    return () => {
      if (chordTimerRef.current) window.clearInterval(chordTimerRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, []);

  return {
    isPlayingAudio,
    toggleAmbientMusic,
    startAmbientMusic,
    stopAmbientMusic,
    tubeDrive,
    setTubeDrive,
    tapeWarmth,
    setTapeWarmth,
    hrtfWidth,
    setHrtfWidth,
    config,
  };
}
