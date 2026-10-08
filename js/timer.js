// timer.js · 计时引擎（步骤 2：倒计时 + 开始/暂停/重置 + 阶段切换）
// 状态机见 开发计划.md §0.6；已接提示音（步骤 3）、不接统计（步骤 6）。

window.Timer = {
  state: 'idle',      // 'idle' | 'focus' | 'break'
  paused: false,      // 仅在 focus/break 阶段有意义
  remaining: 0,       // 剩余秒
  intervalId: null,
  focusDuration: Constants.FOCUS_DEFAULT * 60,   // 专注时长（秒）
  breakDuration: Constants.BREAK_DEFAULT * 60,   // 休息时长（秒）

  _tickCb: null,
  _phaseEndCb: null,

  // 设定时长（秒）。步骤 4 由 main.js 读设置后调用；本步用默认值。
  init(focusSeconds, breakSeconds) {
    if (typeof focusSeconds === 'number' && focusSeconds > 0) this.focusDuration = focusSeconds;
    if (typeof breakSeconds === 'number' && breakSeconds > 0) this.breakDuration = breakSeconds;
    this.reset();
  },

  start() {
    if (this.state === 'idle') {
      this.state = 'focus';
      this.remaining = this.focusDuration;
      this.paused = false;
      this._startInterval();
    } else if (this.paused) {
      this.resume();
    }
    this._notifyTick();
  },

  pause() {
    if (this.state === 'idle' || this.paused) return;
    this._stopInterval();
    this.paused = true;
    this._notifyTick();
  },

  resume() {
    if (this.state === 'idle' || !this.paused) return;
    this.paused = false;
    this._startInterval();
    this._notifyTick();
  },

  // 停止计时，回到「准备开始」（专注初始时长）
  reset() {
    this._stopInterval();
    this.paused = false;
    this.state = 'idle';
    this.remaining = this.focusDuration;
    this._notifyTick();
  },

  getState() { return this.state; },
  isPaused() { return this.paused; },
  getRemaining() { return this.remaining; },

  // 当前阶段总秒数（用于进度环比例）
  getPhaseTotal() {
    return this.state === 'break' ? this.breakDuration : this.focusDuration;
  },

  // 剩余比例 0~1（1 = 满）
  getProgress() {
    const total = this.getPhaseTotal();
    return total > 0 ? this.remaining / total : 1;
  },

  onTick(cb) { this._tickCb = cb; },
  onPhaseEnd(cb) { this._phaseEndCb = cb; },

  _startInterval() {
    this._stopInterval();
    // 用 setInterval(1000) 秒级递减；可接受轻微漂移（见计划 §2 说明）
    this.intervalId = setInterval(() => this._tick(), 1000);
  },

  _stopInterval() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  },

  _tick() {
    this.remaining -= 1;
    if (this.remaining <= 0) {
      this._advancePhase();
    }
    this._notifyTick();
  },

  // 阶段到点：专注 → 休息 → 专注 循环；调用 onPhaseEnd(结束阶段, 新阶段)
  _advancePhase() {
    const ended = this.state;
    if (ended === 'focus') {
      this.state = 'break';
      this.remaining = this.breakDuration;
    } else if (ended === 'break') {
      this.state = 'focus';
      this.remaining = this.focusDuration;
    }
    // 步骤 3：阶段到点播放提示音（若已开启）
    if (Sound.isEnabled()) Sound.beep();
    if (typeof this._phaseEndCb === 'function') this._phaseEndCb(ended, this.state);
  },

  _notifyTick() {
    if (typeof this._tickCb === 'function') this._tickCb();
  },
};

// 初始化一次，保证页面打开即 25:00 的「准备开始」状态
window.Timer.init();
