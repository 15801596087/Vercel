// audio.js · 提示音（步骤 3：Web Audio API 生成蜂鸣，无外部音频资源）
// 步骤 4 起 isEnabled/setEnabled 统一走 Store（读写 localStorage 的单一入口）。

window.Sound = {
  _ctx: null,

  // 创建/恢复 AudioContext。必须在用户首次点击（开始按钮）时调用，以绕过浏览器自动播放限制。
  init() {
    if (!this._ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this._ctx = new AC();
    }
    if (this._ctx && this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
  },

  // 播放提示音：3 声 880Hz 短蜂鸣，每声 0.15s、间隔 0.15s
  beep() {
    if (!this._ctx) return;
    const BEEP_COUNT = 3;
    const BEEP_DURATION = 0.15; // 秒
    const BEEP_GAP = 0.15;      // 秒
    const start = this._ctx.currentTime;
    for (let i = 0; i < BEEP_COUNT; i++) {
      this._tone(880, start + i * (BEEP_DURATION + BEEP_GAP), BEEP_DURATION);
    }
  },

  // 是否开启提示音（读 Store，默认 true）
  isEnabled() {
    return Store.loadSettings().soundEnabled;
  },

  // 开关提示音（写入 Store）
  setEnabled(bool) {
    Store.saveSettings({ soundEnabled: bool });
  },

  // 单声蜂鸣：正弦波 + 音量包络（快起快落，避免爆音）
  _tone(freq, startAt, duration) {
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.4, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.02);
  },
};
