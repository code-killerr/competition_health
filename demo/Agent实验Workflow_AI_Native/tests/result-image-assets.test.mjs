import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const assets = [
  'chip-device.jpg',
  'lab-pipette.png',
  'cryosection.jpg',
  'fluorescence.png',
  'nuclei-qc.jpg',
  'droplet.webp',
  'library-peak.jpg',
  'spatial-map.jpg',
  'gene-heatmap.jpg'
];

assets.forEach(name => {
  const file = path.join(root, 'assets', 'reference-sop', name);
  assert.ok(fs.existsSync(file), `参考配图不存在：${name}`);
  assert.ok(fs.statSync(file).size > 1000, `参考配图文件异常：${name}`);
});

assert.match(html, /const resultImageResources=\[/, '结果页需要声明参考图片资源');
['library-peak.jpg', 'spatial-map.jpg', 'gene-heatmap.jpg'].forEach(name => {
  assert.match(html, new RegExp(`assets/reference-sop/${name}`), `结果页未绑定图片：${name}`);
});
assert.match(html, /function openResultImage\(id\)/, '结果图片需要支持放大预览');
assert.match(html, /图片仅在对应步骤完成后标记为“已获取”/, '结果图片需要明确获取状态边界');

console.log('结果图片资源检查通过');
