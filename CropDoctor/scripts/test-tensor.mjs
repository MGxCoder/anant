// Run: npm test   (Node 22.18+ strips TypeScript types natively)
// Checks on-device preprocessing (PNG -> float32 RGB 0..255) and top-k against fixtures encoded by PIL / a hand encoder.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pngToModelInput, topK } from '../src/utils/tensor.ts';

const dir = new URL('./fixtures/', import.meta.url);
const expected = JSON.parse(readFileSync(new URL('expected.json', dir)));

for (const [name, exp] of Object.entries(expected)) {
  const png = new Uint8Array(readFileSync(new URL(`${name}.png`, dir)));
  const input = pngToModelInput(png, exp.width);
  assert.equal(input.length, exp.width * exp.height * 3);
  assert.ok(input.every((v) => Number.isInteger(v) && v >= 0 && v <= 255), `${name}: values must be raw 0..255`);
  assert.ok(Math.max(...input) > 1, `${name}: input looks normalized`);
  assert.equal(createHash('sha256').update(Uint8Array.from(input)).digest('hex'), exp.rgbSha256, `${name}: pixels differ from PIL`);
  console.log(`ok  ${name}.png -> float32 RGB identical to PIL`);
}

const sq = new Uint8Array(readFileSync(new URL('rgb.png', dir)));
assert.throws(() => pngToModelInput(sq, 224), /Expected 224x224/);
assert.throws(() => pngToModelInput(new Uint8Array(64), 224), /Not a PNG/);
console.log('ok  wrong size / non-PNG rejected');

const probs = new Float32Array(38).fill(0.01);
probs[30] = 0.5; probs[2] = 0.2; probs[37] = 0.1;
assert.deepEqual(topK(probs, 3).map((t) => t.index), [30, 2, 37]);
console.log('ok  topK');
