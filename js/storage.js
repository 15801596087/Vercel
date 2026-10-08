// storage.js · localStorage 读写、今日统计、导出/导入（步骤 4 + 7）
// 约定：所有值以字符串存 localStorage，读时再解析回数字/布尔。

window.Store = (function () {
  'use strict';

  const KEYS = Constants.STORAGE_KEYS;

  // 今天日期字符串 YYYY-MM-DD（本地时区）
  function todayString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  // 读数字；无值或非法返回 fallback
  function readNumber(key, fallback) {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  // 读取设置；无值用 Constants 默认
  function loadSettings() {
    const rawSound = localStorage.getItem(KEYS.soundEnabled);
    return {
      focusDuration: readNumber(KEYS.focusDuration, Constants.FOCUS_DEFAULT),
      breakDuration: readNumber(KEYS.breakDuration, Constants.BREAK_DEFAULT),
      soundEnabled: rawSound === null ? Constants.SOUND_DEFAULT : (rawSound === 'true' || rawSound === '1'),
    };
  }

  // 合并写入设置（partial 只传需更新的字段，未传的保留原值）
  function saveSettings(partial) {
    const next = Object.assign({}, loadSettings(), partial);
    localStorage.setItem(KEYS.focusDuration, String(next.focusDuration));
    localStorage.setItem(KEYS.breakDuration, String(next.breakDuration));
    localStorage.setItem(KEYS.soundEnabled, String(next.soundEnabled));
  }

  // 今日完成数；若 todayDate 不是今天则视为 0
  function getTodayCount() {
    if (localStorage.getItem(KEYS.todayDate) !== todayString()) return 0;
    return readNumber(KEYS.todayCount, 0);
  }

  // 专注完成 +1（今日与累计都 +1）；跨天先把今日归零再 +1
  function incrementTodayCount() {
    const today = todayString();
    if (localStorage.getItem(KEYS.todayDate) !== today) {
      localStorage.setItem(KEYS.todayDate, today);
      localStorage.setItem(KEYS.todayCount, '0');
    }
    localStorage.setItem(KEYS.todayCount, String(readNumber(KEYS.todayCount, 0) + 1));
    localStorage.setItem(KEYS.totalCount, String(readNumber(KEYS.totalCount, 0) + 1));
  }

  // 导出：把设置与统计组装成 JSON 字符串
  function exportData() {
    const data = {
      settings: loadSettings(),
      todayDate: localStorage.getItem(KEYS.todayDate),
      todayCount: readNumber(KEYS.todayCount, 0),
      totalCount: readNumber(KEYS.totalCount, 0),
    };
    return JSON.stringify(data, null, 2);
  }

  // 导入：解析并校验 JSON，通过则整体写回 localStorage 并返回 true，否则返回 false（不破坏现有数据）
  function importData(jsonStr) {
    let data;
    try {
      data = JSON.parse(jsonStr);
    } catch (e) {
      return false;
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;

    // 设置项：必须存在且类型正确（且时长为正数）
    const s = data.settings;
    if (!s || typeof s !== 'object') return false;
    if (typeof s.focusDuration !== 'number' || !Number.isFinite(s.focusDuration) || s.focusDuration <= 0) return false;
    if (typeof s.breakDuration !== 'number' || !Number.isFinite(s.breakDuration) || s.breakDuration <= 0) return false;
    if (typeof s.soundEnabled !== 'boolean') return false;

    // 统计项：缺失或非法按 0 / 今天兜底，避免因个别字段问题整份导入失败
    const todayCount = (typeof data.todayCount === 'number' && Number.isFinite(data.todayCount)) ? Math.floor(data.todayCount) : 0;
    const totalCount = (typeof data.totalCount === 'number' && Number.isFinite(data.totalCount)) ? Math.floor(data.totalCount) : 0;
    const todayDate = typeof data.todayDate === 'string' ? data.todayDate : todayString();

    localStorage.setItem(KEYS.focusDuration, String(s.focusDuration));
    localStorage.setItem(KEYS.breakDuration, String(s.breakDuration));
    localStorage.setItem(KEYS.soundEnabled, String(s.soundEnabled));
    localStorage.setItem(KEYS.todayDate, todayDate);
    localStorage.setItem(KEYS.todayCount, String(todayCount));
    localStorage.setItem(KEYS.totalCount, String(totalCount));
    return true;
  }

  return {
    loadSettings,
    saveSettings,
    getTodayCount,
    incrementTodayCount,
    exportData,
    importData,
  };
})();
