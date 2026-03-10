const fs = require('fs');

function checkJsFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = dir + '/' + file;
    if (fs.statSync(fullPath).isDirectory()) {
      checkJsFiles(fullPath);
    } else if (fullPath.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/\[[^\]]+\]/) && !line.includes('if (') && !line.includes('console.log') && !line.includes('wx.setStorageSync') && !line.includes('.map(') && !line.match(/\] = /) && !line.includes('//') && line.trim().length > 0) {
          console.log(`${fullPath}:${i+1} ${line.trim()}`);
        }
      }
    }
  }
}

checkJsFiles('frontend/pages');
