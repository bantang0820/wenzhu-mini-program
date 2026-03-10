const { execSync } = require('child_process');
try {
  const result = execSync('npx miniprogram-compiler compile frontend/pages/detail/detail.wxml');
  console.log(result.toString());
} catch (e) {
  console.log(e.stdout.toString());
  console.log(e.stderr.toString());
}
