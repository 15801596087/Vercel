// ui.js · DOM 渲染、事件绑定、视图切换（步骤 5 + 7：含数据导出/导入）
// 职责：把计时器 / 存储状态渲染到页面，绑定用户交互，切换「计时 / 设置」视图。
window.UI = (function () {
  'use strict';

  const RING_CIRCUMFERENCE = 703.72; // 2π×112，与 css/.ring-bar 的 stroke-dasharray 一致
  const MIN_DURATION = 1;            // 时长下限（分钟）
  const MAX_DURATION = 999;          // 时长上限（分钟），防溢出

  // 阶段 → 展示信息（标签文案/样式、阶段小字、圆盘颜色）
  const PHASE_META = {
    idle:  { tag: '准备开始', tagClass: 'tag tag-neutral',   phase: '专注', color: 'var(--primary-500)' },
    focus: { tag: '专注中',   tagClass: 'tag tag-primary',   phase: '专注', color: 'var(--primary-500)' },
    break: { tag: '休息中',   tagClass: 'tag tag-secondary', phase: '休息', color: 'var(--secondary-500)' },
  };

  let els = {};

  // 秒 → mm:ss
  function format(sec) {
    sec = Math.max(0, sec);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  // 主计时视图：数字、状态标签、阶段小字、圆盘颜色与进度、按钮文案
  function renderTimer() {
    const state = Timer.getState();
    const paused = Timer.isPaused();
    const meta = PHASE_META[state] || PHASE_META.idle;

    els.time.textContent = format(Timer.getRemaining());

    if (paused && state !== 'idle') {
      els.statusTag.textContent = '已暂停';
      els.statusTag.className = 'tag tag-neutral';
    } else {
      els.statusTag.textContent = meta.tag;
      els.statusTag.className = meta.tagClass;
    }

    els.phase.textContent = meta.phase;

    els.ringBar.style.stroke = meta.color;
    els.ringBar.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - Timer.getProgress()));

    if (state === 'idle') {
      els.btnStart.textContent = '▶ 开始';
    } else if (paused) {
      els.btnStart.textContent = '▶ 继续';
    } else {
      els.btnStart.textContent = '⏸ 暂停';
    }
  }

  // 完成统计（今日番茄数）。步骤 6 正式接「每完成 +1」，本步直接读存储。
  function renderStats() {
    els.statCount.textContent = '🍅 × ' + Store.getTodayCount();
  }

  // 切换视图。进入设置页时把存储回填到表单；返回时刷新计时视图。
  function showView(name) {
    const toSettings = name === 'settings';
    els.viewTimer.hidden = toSettings;
    els.viewSettings.hidden = !toSettings;
    if (toSettings) {
      syncSettingsForm();
    } else {
      renderTimer();
      renderStats();
    }
  }

  // 把存储里的设置回填到设置页表单
  function syncSettingsForm() {
    const s = Store.loadSettings();
    els.inputFocus.value = s.focusDuration;
    els.inputBreak.value = s.breakDuration;
    setSwitch(s.soundEnabled);
  }

  function setSwitch(on) {
    els.soundSwitch.classList.toggle('on', on);
    els.soundSwitch.setAttribute('aria-checked', String(on));
  }

  // 解析并规整时长（分钟）：非法 / 空值回退到当前值，越界夹紧
  function parseDuration(raw, current) {
    if (raw == null || String(raw).trim() === '') return current;
    const n = Number(raw);
    if (!Number.isFinite(n)) return current;
    return Math.min(MAX_DURATION, Math.max(MIN_DURATION, Math.round(n)));
  }

  // 修改专注/休息时长：立即保存；计时引擎在「下次开始 / 下一阶段」生效，
  // 若当前处于 idle 则立即反映到圆盘（不打断进行中的计时）。
  function setDuration(kind, minutes) {
    if (kind === 'focus') {
      Store.saveSettings({ focusDuration: minutes });
      Timer.focusDuration = minutes * 60;
    } else {
      Store.saveSettings({ breakDuration: minutes });
      Timer.breakDuration = minutes * 60;
    }
    // idle：重置以立即显示新专注时长；计时中 / 暂停则保留当前进度
    if (Timer.getState() === 'idle') {
      Timer.reset();
    }
    syncSettingsForm();
  }

  // 步进按钮：在当前值基础上 ±1
  function step(kind, delta) {
    const input = kind === 'focus' ? els.inputFocus : els.inputBreak;
    const key = kind === 'focus' ? 'focusDuration' : 'breakDuration';
    const current = parseDuration(input.value, Store.loadSettings()[key]);
    const next = Math.min(MAX_DURATION, Math.max(MIN_DURATION, current + delta));
    input.value = next;
    setDuration(kind, next);
  }

  // 导出的备份文件名：fanqie-backup-YYYYMMDD.json
  function backupFileName() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return 'fanqie-backup-' + y + m + day + '.json';
  }

  // 把存储里的设置/统计重新应用到界面与计时引擎（导入成功后调用）
  function applySettings() {
    const s = Store.loadSettings();
    Timer.init(s.focusDuration * 60, s.breakDuration * 60); // 设时长并重置到 idle
    syncSettingsForm();
    renderTimer();
    renderStats();
  }

  function init() {
    els = {
      viewTimer:    document.getElementById('view-timer'),
      viewSettings: document.getElementById('view-settings'),
      statusTag:    document.getElementById('status-tag'),
      ringBar:      document.getElementById('ring-bar'),
      time:         document.getElementById('timer-time'),
      phase:        document.getElementById('timer-phase'),
      btnStart:     document.getElementById('btn-start'),
      btnReset:     document.getElementById('btn-reset'),
      statCount:    document.getElementById('stat-count'),
      btnSettings:  document.getElementById('btn-settings'),
      btnBack:      document.getElementById('btn-back'),
      inputFocus:   document.getElementById('input-focus'),
      inputBreak:   document.getElementById('input-break'),
      focusMinus:   document.getElementById('focus-minus'),
      focusPlus:    document.getElementById('focus-plus'),
      breakMinus:   document.getElementById('break-minus'),
      breakPlus:    document.getElementById('break-plus'),
      soundSwitch:  document.getElementById('sound-switch'),
      btnExport:    document.getElementById('btn-export'),
      btnImport:    document.getElementById('btn-import'),
      inputImport:  document.getElementById('input-import'),
    };

    // —— 计时控制 ——
    els.btnStart.addEventListener('click', function () {
      Sound.init(); // 首次点击创建/恢复 AudioContext（浏览器自动播放限制）
      if (Timer.getState() === 'idle' || Timer.isPaused()) {
        Timer.start();
      } else {
        Timer.pause();
      }
    });
    els.btnReset.addEventListener('click', function () {
      Timer.reset();
    });

    // —— 视图切换（切换期间计时器不停）——
    els.btnSettings.addEventListener('click', function () { showView('settings'); });
    els.btnBack.addEventListener('click', function () { showView('timer'); });

    // —— 时长步进 ——
    els.focusMinus.addEventListener('click', function () { step('focus', -1); });
    els.focusPlus.addEventListener('click', function () { step('focus', +1); });
    els.breakMinus.addEventListener('click', function () { step('break', -1); });
    els.breakPlus.addEventListener('click', function () { step('break', +1); });

    // —— 时长直接输入（失焦 / 回车生效）——
    els.inputFocus.addEventListener('change', function () {
      setDuration('focus', parseDuration(this.value, Store.loadSettings().focusDuration));
    });
    els.inputBreak.addEventListener('change', function () {
      setDuration('break', parseDuration(this.value, Store.loadSettings().breakDuration));
    });

    // —— 提示音开关 ——
    els.soundSwitch.addEventListener('click', function () {
      const next = !Sound.isEnabled();
      Sound.setEnabled(next);
      setSwitch(next);
    });

    // —— 数据导出 / 导入（步骤 7）——
    els.btnExport.addEventListener('click', function () {
      const json = Store.exportData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backupFileName();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    els.btnImport.addEventListener('click', function () {
      els.inputImport.value = ''; // 清空，允许连续选择同一个文件
      els.inputImport.click();
    });

    els.inputImport.addEventListener('change', function () {
      const file = this.files && this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        if (Store.importData(String(reader.result))) {
          applySettings();
          alert('导入成功：设置与统计已恢复。');
        } else {
          alert('导入失败：文件内容非法或已损坏，未做任何改动。');
        }
      };
      reader.onerror = function () {
        alert('导入失败：无法读取文件。');
      };
      reader.readAsText(file);
    });

    // —— 计时引擎回调 ——
    Timer.onTick(renderTimer);
    Timer.onPhaseEnd(function () {
      renderTimer();
      renderStats(); // 步骤 6 前统计尚未 +1，这里仅刷新显示
    });

    // 初始渲染
    renderTimer();
    renderStats();
  }

  return { init, showView, renderTimer, renderStats };
})();
