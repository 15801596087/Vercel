// 番茄专注 · 入口（步骤 5：装配 UI；渲染与事件绑定统一收拢到 ui.js）
(function () {
  'use strict';

  // 读取持久化设置，应用到计时引擎（时长以分钟存储，转为秒传入）
  const settings = Store.loadSettings();
  Timer.init(settings.focusDuration * 60, settings.breakDuration * 60);

  // UI.init() 内部完成 DOM 引用、事件绑定与首次渲染
  UI.init();
})();
