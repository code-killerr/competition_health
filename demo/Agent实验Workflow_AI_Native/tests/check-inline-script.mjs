import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match => match[1]);

assert.ok(scripts.length > 0, '页面中没有找到可检查的内联脚本');

scripts.forEach((script, index) => {
  try {
    new Function(script);
  } catch (error) {
    throw new Error(`第 ${index + 1} 个内联脚本存在语法错误：${error.message}`);
  }
});

console.log(`内联脚本语法检查通过：${scripts.length} 个脚本`);
