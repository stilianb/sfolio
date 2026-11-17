/**
 * PBKDF2-SHA256 and AES-256-GCM for the password page.
 * Browsers only expose crypto.subtle on HTTPS, and the custom domain is still
 * served over HTTP until GitHub issues a certificate. This runs in either place.
 */

const SBOX = Uint8Array.of(
  99, 124, 119, 123, 242, 107, 111, 197, 48, 1, 103, 43, 254, 215, 171, 118, 202, 130, 201, 125, 250, 89, 71,
  240, 173, 212, 162, 175, 156, 164, 114, 192, 183, 253, 147, 38, 54, 63, 247, 204, 52, 165, 229, 241, 113, 216,
  49, 21, 4, 199, 35, 195, 24, 150, 5, 154, 7, 18, 128, 226, 235, 39, 178, 117, 9, 131, 44, 26, 27, 110, 90, 160,
  82, 59, 214, 179, 41, 227, 47, 132, 83, 209, 0, 237, 32, 252, 177, 91, 106, 203, 190, 57, 74, 76, 88, 207, 208,
  239, 170, 251, 67, 77, 51, 133, 69, 249, 2, 127, 80, 60, 159, 168, 81, 163, 64, 143, 146, 157, 56, 245, 188,
  182, 218, 33, 16, 255, 243, 210, 205, 12, 19, 236, 95, 151, 68, 23, 196, 167, 126, 61, 100, 93, 25, 115, 96,
  129, 79, 220, 34, 42, 144, 136, 70, 238, 184, 20, 222, 94, 11, 219, 224, 50, 58, 10, 73, 6, 36, 92, 194, 211,
  172, 98, 145, 149, 228, 121, 231, 200, 55, 109, 141, 213, 78, 169, 108, 86, 244, 234, 101, 122, 174, 8, 186,
  120, 37, 46, 28, 166, 180, 198, 232, 221, 116, 31, 75, 189, 139, 138, 112, 62, 181, 102, 72, 3, 246, 14, 97,
  53, 87, 185, 134, 193, 29, 158, 225, 248, 152, 17, 105, 217, 142, 148, 155, 30, 135, 233, 206, 85, 40, 223,
  140, 161, 137, 13, 191, 230, 66, 104, 65, 153, 45, 15, 176, 84, 187, 22,
);

const RCON = Uint8Array.of(0, 1, 2, 4, 8, 16, 32, 64, 128, 27, 54);

function xtime(a) {
  return ((a << 1) ^ (a & 0x80 ? 0x1b : 0)) & 255;
}

function mul(a, b) {
  let p = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a;
    const hi = a & 0x80;
    a = (a << 1) & 255;
    if (hi) a ^= 0x1b;
    b >>= 1;
  }
  return p;
}

export function expandKey(key) {
  const w = new Uint8Array(240);
  w.set(key);
  let bytes = 32;
  let rcon = 1;
  const t = new Uint8Array(4);
  while (bytes < 240) {
    t.set(w.subarray(bytes - 4, bytes));
    if (bytes % 32 === 0) {
      const a = t[0];
      t[0] = SBOX[t[1]] ^ RCON[rcon++];
      t[1] = SBOX[t[2]];
      t[2] = SBOX[t[3]];
      t[3] = SBOX[a];
    } else if (bytes % 32 === 16) {
      t[0] = SBOX[t[0]];
      t[1] = SBOX[t[1]];
      t[2] = SBOX[t[2]];
      t[3] = SBOX[t[3]];
    }
    for (let i = 0; i < 4; i++) w[bytes] = w[bytes - 32] ^ t[i], bytes++;
  }
  return w;
}

export function encryptBlock(block, roundKeys) {
  const s = new Uint8Array(block);
  addRound(s, roundKeys, 0);
  for (let round = 1; round < 14; round++) {
    subShift(s);
    mix(s);
    addRound(s, roundKeys, round * 16);
  }
  subShift(s);
  addRound(s, roundKeys, 224);
  return s;
}

function addRound(s, keys, offset) {
  for (let i = 0; i < 16; i++) s[i] ^= keys[offset + i];
}

function subShift(s) {
  const t = Uint8Array.from(s, (b) => SBOX[b]);
  s[0] = t[0];
  s[1] = t[5];
  s[2] = t[10];
  s[3] = t[15];
  s[4] = t[4];
  s[5] = t[9];
  s[6] = t[14];
  s[7] = t[3];
  s[8] = t[8];
  s[9] = t[13];
  s[10] = t[2];
  s[11] = t[7];
  s[12] = t[12];
  s[13] = t[1];
  s[14] = t[6];
  s[15] = t[11];
}

function mix(s) {
  for (let c = 0; c < 4; c++) {
    const i = c * 4;
    const a0 = s[i];
    const a1 = s[i + 1];
    const a2 = s[i + 2];
    const a3 = s[i + 3];
    s[i] = mul(a0, 2) ^ mul(a1, 3) ^ a2 ^ a3;
    s[i + 1] = a0 ^ mul(a1, 2) ^ mul(a2, 3) ^ a3;
    s[i + 2] = a0 ^ a1 ^ mul(a2, 2) ^ mul(a3, 3);
    s[i + 3] = mul(a0, 3) ^ a1 ^ a2 ^ mul(a3, 2);
  }
}

function rotr(x, n) {
  return (x >>> n) | (x << (32 - n));
}

function sha256(message) {
  const bitLen = message.length * 8;
  const withOne = message.length + 1;
  const pad = (64 - ((withOne + 8) % 64)) % 64;
  const data = new Uint8Array(withOne + pad + 8);
  data.set(message);
  data[message.length] = 0x80;
  const view = new DataView(data.buffer);
  view.setUint32(data.length - 4, bitLen >>> 0);
  view.setUint32(data.length - 8, Math.floor(bitLen / 0x100000000));

  const k = Uint32Array.of(
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98,
    0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8,
    0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
    0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
    0xc67178f2,
  );
  const h = Uint32Array.of(0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19);
  const w = new Uint32Array(64);

  for (let off = 0; off < data.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + s1 + ch + k[i] + w[i]) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (s0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hh) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) outView.setUint32(i * 4, h[i]);
  return out;
}

function hmac(key, message) {
  const block = 64;
  let k = key.length > block ? sha256(key) : key;
  if (k.length < block) {
    const padded = new Uint8Array(block);
    padded.set(k);
    k = padded;
  }
  const o = new Uint8Array(block);
  const i = new Uint8Array(block);
  for (let n = 0; n < block; n++) {
    o[n] = k[n] ^ 0x5c;
    i[n] = k[n] ^ 0x36;
  }
  const inner = new Uint8Array(block + message.length);
  inner.set(i);
  inner.set(message, block);
  return sha256(concat(o, sha256(inner)));
}

function concat(...parts) {
  const len = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function pbkdf2Sha256(password, salt, iterations, bytes) {
  const blocks = Math.ceil(bytes / 32);
  const out = new Uint8Array(blocks * 32);
  for (let block = 1; block <= blocks; block++) {
    const tail = new Uint8Array(4);
    new DataView(tail.buffer).setUint32(0, block);
    let u = hmac(password, concat(salt, tail));
    const t = new Uint8Array(u);
    for (let i = 1; i < iterations; i++) {
      u = hmac(password, u);
      for (let j = 0; j < 32; j++) t[j] ^= u[j];
    }
    out.set(t, (block - 1) * 32);
  }
  return out.subarray(0, bytes);
}

function xorBlock(a, b) {
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i++) out[i] = a[i] ^ b[i];
  return out;
}

function shiftRight(block) {
  let carry = 0;
  for (let i = 0; i < 16; i++) {
    const next = block[i] & 1;
    block[i] = (block[i] >> 1) | (carry ? 0x80 : 0);
    carry = next;
  }
  return carry;
}

function gmul(x, y) {
  const z = new Uint8Array(16);
  const v = new Uint8Array(y);
  for (let i = 0; i < 16; i++) {
    for (let bit = 7; bit >= 0; bit--) {
      if ((x[i] >> bit) & 1) for (let j = 0; j < 16; j++) z[j] ^= v[j];
      const lsb = shiftRight(v);
      if (lsb) v[0] ^= 0xe1;
    }
  }
  return z;
}

function ghash(hashKey, data) {
  let y = new Uint8Array(16);
  for (let offset = 0; offset < data.length; offset += 16) {
    const block = new Uint8Array(16);
    block.set(data.subarray(offset, Math.min(offset + 16, data.length)));
    y = gmul(xorBlock(y, block), hashKey);
  }
  return y;
}

function inc32(counter) {
  const out = new Uint8Array(counter);
  const view = new DataView(out.buffer);
  view.setUint32(12, (view.getUint32(12) + 1) >>> 0);
  return out;
}

function ctrXor(roundKeys, counter, data) {
  const out = new Uint8Array(data.length);
  let ctr = counter;
  for (let offset = 0; offset < data.length; offset += 16) {
    ctr = inc32(ctr);
    const stream = encryptBlock(ctr, roundKeys);
    const end = Math.min(16, data.length - offset);
    for (let i = 0; i < end; i++) out[offset + i] = data[offset + i] ^ stream[i];
  }
  return out;
}

function lenBlock(aadLen, cipherLen) {
  const out = new Uint8Array(16);
  const view = new DataView(out.buffer);
  view.setUint32(4, aadLen * 8);
  const bits = cipherLen * 8;
  view.setUint32(8, Math.floor(bits / 0x100000000));
  view.setUint32(12, bits >>> 0);
  return out;
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Decrypts ciphertext||tag. Throws when the tag does not match. */
export function aesGcmDecrypt(key, iv, data) {
  if (iv.length !== 12) throw new Error("bad iv");
  if (data.length < 16) throw new Error("bad ciphertext");
  const cipher = data.subarray(0, data.length - 16);
  const tag = data.subarray(data.length - 16);
  const roundKeys = expandKey(key);
  const hashKey = encryptBlock(new Uint8Array(16), roundKeys);
  const j0 = new Uint8Array(16);
  j0.set(iv);
  j0[15] = 1;
  const plain = ctrXor(roundKeys, j0, cipher);
  const padded = cipher.length % 16 === 0 ? cipher : concat(cipher, new Uint8Array(16 - (cipher.length % 16)));
  const g = ghash(hashKey, concat(padded, lenBlock(0, cipher.length)));
  const expect = xorBlock(encryptBlock(j0, roundKeys), g);
  if (!constantTimeEqual(expect, tag)) throw new Error("bad tag");
  return plain;
}
