const { isFunction } = require('util');

const pages = {};
global.Page = (opts) => {
  pages.detail = opts;
};
global.wx = {
  getStorageSync: () => ({}),
  setStorageSync: () => {},
  createInnerAudioContext: () => ({}),
  vibrateShort: () => {},
  showToast: () => {},
  navigateTo: () => {},
  getRecorderManager: () => ({
    onStart: () => {},
    onStop: () => {},
    onError: () => {},
    start: () => {},
    stop: () => {}
  }),
};
global.getApp = () => ({});
require('./detail.js');

try {
  let hasError = false;
  Object.keys(pages.detail).forEach(key => {
    if (typeof pages.detail[key] === 'function') {
      try {
        const fnStr = pages.detail[key].toString();
        // Check if function can be parsed
        // We use eval so it handles object method syntax like "onLoad(options) { ... }"
        eval('({' + fnStr + '})');
      } catch(e) {
        console.log(`Error parsing function ${key}:`, e.message);
        hasError = true;
      }
    }
  });
  if(!hasError) console.log("detail.js parsed successfully");
} catch(e) {
  console.log("Error evaluating page object:", e.message);
}
