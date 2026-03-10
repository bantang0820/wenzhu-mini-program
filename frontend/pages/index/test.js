const pages = {};
global.Page = (opts) => { pages.index = opts; };
global.wx = {
  getStorageSync: () => ({}),
  setStorageSync: () => {},
};
global.getApp = () => ({});
require('./index.js');
try {
  let hasError = false;
  Object.keys(pages.index).forEach(key => {
    if (typeof pages.index[key] === 'function') {
      try { eval('({' + pages.index[key].toString() + '})'); } catch(e) { console.log(`Error in ${key}:`, e.message); hasError = true; }
    }
  });
  if(!hasError) console.log("index.js parsed successfully");
} catch(e) { console.log("Error:", e.message); }
