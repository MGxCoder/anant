// Pure preprocessing / postprocessing helpers. No React Native imports so this runs under Node for tests.
import { unzlibSync } from 'fflate';

const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 4: 2, 6: 4 }; // PNG color type -> channels (gray, RGB, gray+A, RGBA)

/** Minimal PNG decoder: 8-bit, non-interlaced, gray/RGB/RGBA. That covers what expo-image-manipulator writes. */
export function decodePng(png: Uint8Array) {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  if (png.length < 33 || sig.some((b, i) => png[i] !== b)) throw new Error('Not a PNG image');
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let width = 0, height = 0, channels = 0;
  const idat: Uint8Array[] = [];
  for (let p = 8; p + 8 <= png.length; ) {
    const len = view.getUint32(p);
    const type = String.fromCharCode(png[p + 4], png[p + 5], png[p + 6], png[p + 7]);
    const data = png.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      width = view.getUint32(p + 8);
      height = view.getUint32(p + 12);
      const [depth, colorType, , , interlace] = data.subarray(8, 13);
      channels = CHANNELS[colorType];
      if (depth !== 8 || !channels || interlace !== 0)
        throw new Error(`Unsupported PNG (depth ${depth}, color type ${colorType}, interlace ${interlace})`);
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (!width || !idat.length) throw new Error('Corrupt PNG');

  const joined = new Uint8Array(idat.reduce((n, c) => n + c.length, 0));
  idat.reduce((off, c) => (joined.set(c, off), off + c.length), 0);
  const raw = unzlibSync(joined);

  const stride = width * channels;
  if (raw.length < height * (stride + 1)) throw new Error('Truncated PNG');
  const out = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1, row = y * stride, prev = row - stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[row + x - channels] : 0;
      const b = y > 0 ? out[prev + x] : 0;
      const c = x >= channels && y > 0 ? out[prev + x - channels] : 0;
      let v = raw[src + x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (filter !== 0) throw new Error(`Bad PNG filter ${filter}`);
      out[row + x] = v; // Uint8Array wraps mod 256, as PNG requires
    }
  }
  return { width, height, channels, data: out };
}

/**
 * PNG bytes -> model input: float32 RGB, HWC, values 0..255.
 * Deliberately NOT normalized: the model's own Rescaling layer (folded into Conv1) maps to [-1, 1].
 */
export function pngToModelInput(png: Uint8Array, size: number): Float32Array {
  const { width, height, channels, data } = decodePng(png);
  if (width !== size || height !== size) throw new Error(`Expected ${size}x${size} image, got ${width}x${height}`);
  const out = new Float32Array(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    const s = i * channels;
    const gray = channels < 3; // alpha (if any) is ignored; photos are opaque
    out[i * 3] = data[s];
    out[i * 3 + 1] = data[gray ? s : s + 1];
    out[i * 3 + 2] = data[gray ? s : s + 2];
  }
  return out;
}

/** Indices of the k highest probabilities, highest first. */
export function topK(probs: ArrayLike<number>, k: number) {
  return Array.from(probs, (p, index) => ({ index, p }))
    .sort((x, y) => y.p - x.p)
    .slice(0, k);
}
