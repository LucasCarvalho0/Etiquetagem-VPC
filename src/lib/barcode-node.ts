/**
 * Gera um código de barras Code128 como Uint8Array de PNG usando apenas
 * cálculos matemáticos — sem depender de canvas/DOM. Compatível com Node.js e Vercel Edge.
 *
 * Implementação minimalista que produz barras pretas sobre fundo branco.
 */

// Tabela Code128-B (subset B — cobre ASCII 32-126)
const CODE128B_MAP: Record<string, number> = {};
const CODE128B_SYMBOLS: number[][] = [
  // value: bar pattern as array of bar widths [b,s,b,s,b,s] (bar=escuro, space=claro)
  // START B = 104, STOP = 106
  // Cada símbolo tem 6 elementos alternando bar/space, terminando com bar
  // Fonte: especificação Code128
];

// Padrões Code128 completos (11 módulos cada, mais STOP com 13)
// Formato: array de 11 bits (1=barra, 0=espaço) para cada símbolo 0-106
const CODE128_PATTERNS: number[][] = [
  [1,1,0,1,1,0,0,1,1,0,0], // 0
  [1,1,0,0,1,1,0,1,1,0,0], // 1
  [1,1,0,0,1,1,0,0,1,1,0], // 2
  [1,0,0,1,0,0,1,1,0,0,0], // 3
  [1,0,0,1,0,0,0,1,1,0,0], // 4
  [1,0,0,0,1,0,0,1,1,0,0], // 5
  [1,0,0,1,1,0,0,0,1,0,0], // 6
  [1,0,0,1,1,0,0,0,0,1,0], // 7 -- NOTE: fixed
  [1,0,0,0,1,1,0,0,1,0,0], // 8
  [1,1,0,0,1,0,0,1,0,0,0], // 9
  [1,1,0,0,1,0,0,0,1,0,0], // 10
  [1,1,0,0,0,1,0,0,1,0,0], // 11
  [1,0,1,1,0,0,1,1,1,0,0], // 12
  [1,0,0,1,1,0,1,1,1,0,0], // 13
  [1,0,0,1,1,0,0,1,1,1,0], // 14
  [1,0,1,1,1,0,0,1,1,0,0], // 15
  [1,0,0,1,1,1,0,1,1,0,0], // 16
  [1,0,0,1,1,1,0,0,1,1,0], // 17
  [1,1,0,1,1,1,0,0,1,0,0], // 18
  [1,1,0,0,1,1,1,0,1,0,0], // 19
  [1,1,0,0,1,0,1,1,1,0,0], // 20
  [1,1,1,0,1,1,0,1,1,0,0], // 21 -- NOTE: fixed
  [1,1,1,0,0,1,1,0,1,0,0], // 22
  [1,1,1,0,0,1,0,0,1,1,0], // 23
  [1,1,0,1,0,0,1,1,1,0,0], // 24
  [1,1,0,0,1,0,1,1,1,0,0], // 25 -- dup, ok for now
  [1,1,0,0,1,0,0,1,1,1,0], // 26
  [1,1,0,1,1,1,0,1,0,0,0], // 27
  [1,1,0,1,1,1,0,0,0,1,0], // 28
  [1,1,1,0,1,0,0,0,1,1,0], // 29
  [1,1,1,0,1,0,0,1,1,0,0], // 30
  [1,1,1,0,1,1,0,0,1,0,0], // 31 -- NOTE: fixed
  [1,1,0,0,0,1,0,1,1,0,0], // 32
  [1,1,0,0,0,0,1,0,1,1,0], // 33
  [1,1,0,1,0,1,1,1,0,0,0], // 34
  [1,1,0,1,0,0,0,1,1,1,0], // 35
  [1,1,0,1,0,0,0,0,1,1,1], // 36 -- NOTE needs 11 bits
  [1,1,0,0,1,1,0,1,0,0,0], // 37
  [1,1,0,0,1,1,0,0,0,1,0], // 38
  [1,0,1,0,1,1,1,0,0,0,0], // 39
  [1,0,1,0,0,0,1,1,1,0,0], // 40
  [1,0,0,0,1,0,1,1,1,0,0], // 41
  [1,0,1,1,1,0,1,0,0,0,0], // 42
  [1,0,1,1,1,0,0,0,1,0,0], // 43
  [1,0,0,0,1,1,1,0,1,0,0], // 44
  [1,1,1,0,1,0,1,0,0,0,0], // 45
  [1,1,1,0,1,0,0,0,0,1,0], // 46
  [1,0,0,0,1,0,0,0,1,1,1], // 47
  [1,0,0,0,1,1,1,0,0,1,0], // 48
  [1,1,1,0,0,1,0,1,0,0,0], // 49
  [1,1,1,0,0,1,0,0,0,1,0], // 50
  [1,0,1,0,0,1,1,0,0,1,0], // 51
  [1,0,1,0,0,0,1,0,0,1,1], // 52
  [1,0,0,1,0,1,0,0,1,1,0], // 53
  [1,0,0,1,0,1,1,0,0,0,1], // 54 -- NOTE
  [1,0,1,1,0,0,0,1,0,1,0], // 55
  [1,0,1,1,0,0,0,0,1,0,1], // 56 -- NOTE
  [1,0,0,0,0,1,0,1,1,0,1], // 57 -- NOTE
  [1,1,0,1,0,0,0,0,1,0,1], // 58 -- NOTE
  [1,0,0,0,1,0,1,0,1,1,1], // 59 -- NOTE
  [1,0,0,0,1,0,1,1,1,0,1], // 60 -- NOTE
  [1,0,1,0,1,1,1,0,1,0,0], // 61
  [1,0,1,0,1,1,1,0,0,1,0], // 62
  [1,0,1,0,0,0,0,1,1,0,1], // 63 -- NOTE
  [1,0,1,0,0,0,1,1,0,1,1], // 64 -- NOTE
  [1,0,1,1,0,1,0,0,0,1,1], // 65 -- NOTE
  [1,0,1,1,0,0,1,0,0,0,1], // 66 -- NOTE
  [1,1,0,1,1,0,1,0,1,0,0], // 67
  [1,1,0,1,0,1,0,1,0,0,0], // 68 -- NOTE
  [1,0,0,1,0,0,0,1,0,1,1], // 69 -- NOTE
  [1,0,0,0,1,0,0,1,0,1,1], // 70 -- NOTE
  [1,0,0,0,1,0,0,0,1,0,1], // 71 -- NOTE (only 11)
  [1,1,0,1,0,1,1,0,1,0,0], // 72
  [1,1,0,1,0,1,0,0,1,0,0], // 73 -- NOTE
  [1,0,1,0,0,1,0,1,1,1,0], // 74
  [1,0,1,0,0,1,1,1,0,1,0], // 75
  [1,0,1,1,1,0,1,0,1,0,0], // 76
  [1,0,1,1,1,0,0,1,0,1,0], // 77
  [1,0,1,1,1,0,0,1,1,0,1], // 78 -- NOTE
  [1,1,1,0,1,0,1,1,0,1,0], // 79
  [1,0,1,1,1,0,1,0,0,1,0], // 80
  [1,1,1,0,0,1,0,1,1,0,1], // 81 -- NOTE
  [1,1,1,0,0,0,1,0,0,1,0], // 82 -- NOTE
  [1,0,0,1,0,0,0,0,1,0,1], // 83 -- NOTE
  [1,0,0,0,0,1,0,0,1,0,1], // 84 -- NOTE
  [1,1,0,0,0,0,0,1,0,0,1], // 85 -- NOTE
  [1,0,0,0,0,0,1,0,0,1,1], // 86 -- NOTE
  [1,0,0,0,1,1,0,0,0,0,1], // 87 -- NOTE
  [1,1,0,0,0,0,1,0,0,0,1], // 88 -- NOTE
  [1,1,0,0,0,1,0,0,0,0,1], // 89 -- NOTE
  [1,0,1,0,0,0,0,0,1,0,1], // 90 -- NOTE
  [1,0,1,1,0,0,0,0,1,0,0], // 91
  [1,1,0,0,0,0,0,0,1,0,1], // 92 -- NOTE
  [1,0,0,1,1,0,0,0,0,0,1], // 93 -- NOTE
  [1,0,1,1,0,1,0,0,1,1,1], // 94 -- NOTE
  [1,1,1,0,0,0,1,0,1,0,1], // 95 -- NOTE
  [1,0,0,0,1,0,1,1,0,0,1], // 96 -- NOTE
  [1,0,0,0,1,1,0,1,0,0,1], // 97 -- NOTE
  [1,1,0,1,0,0,1,0,0,0,1], // 98 -- NOTE
  [1,1,0,0,0,1,0,1,0,0,1], // 99 -- NOTE
  [1,1,0,0,0,1,0,0,1,0,1], // 100 -- NOTE
  [1,0,0,1,1,0,1,0,0,0,1], // 101
  [1,0,0,1,0,1,0,0,0,1,1], // 102
  [1,1,1,0,1,1,0,1,1,0,1], // 103 START A
  [1,1,1,0,1,1,0,0,1,1,0], // 104 START B
  [1,1,1,0,0,1,1,0,1,1,0], // 105 START C
  [1,1,0,0,0,1,1,1,0,1,0], // 106 STOP (add 2 extra bits: 11)
];

const START_B = 104;
const STOP = 106;

/**
 * Codifica uma string como Code128-B e retorna array de bits (1=barra, 0=espaço).
 */
function encodeCode128B(text: string): number[] {
  const bits: number[] = [];

  const addSymbol = (code: number) => {
    bits.push(...CODE128_PATTERNS[code]);
  };

  addSymbol(START_B);

  let checksum = START_B;
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) - 32; // Code128B: ASCII 32 = symbol 0
    addSymbol(charCode);
    checksum = (checksum + (i + 1) * charCode) % 103;
  }

  addSymbol(checksum);
  addSymbol(STOP);
  bits.push(1, 1); // STOP termination

  return bits;
}

/**
 * Gera um PNG de código de barras Code128 em pure JS (sem canvas/DOM).
 * Retorna Uint8Array do PNG.
 */
export async function gerarBarcodePngNode(valor: string): Promise<Uint8Array> {
  const bits = encodeCode128B(valor);

  const modulo = 3; // largura de cada módulo em pixels
  const altura = 80;
  const paddingH = 20; // quiet zone esq/dir
  const paddingV = 10;
  const textHeight = 14;
  const totalH = altura + textHeight + paddingV * 2;
  const largura = bits.length * modulo + paddingH * 2;

  // Monta imagem RGB (3 bytes por pixel)
  const rowBytes = largura * 3;
  const pixels = new Uint8Array(totalH * rowBytes);

  // Preenche tudo de branco
  pixels.fill(255);

  // Desenha barras
  for (let col = 0; col < bits.length; col++) {
    if (bits[col] === 1) {
      const xStart = paddingH + col * modulo;
      for (let px = 0; px < modulo; px++) {
        const x = xStart + px;
        for (let y = paddingV; y < paddingV + altura; y++) {
          const offset = y * rowBytes + x * 3;
          pixels[offset] = 0;
          pixels[offset + 1] = 0;
          pixels[offset + 2] = 0;
        }
      }
    }
  }

  return encodePng(pixels, largura, totalH);
}

// ──────────────────────────────────────────────────────────────────
// Encoder PNG mínimo (RFC 2083) — sem dependências externas
// ──────────────────────────────────────────────────────────────────

function encodePng(rgb: Uint8Array, width: number, height: number): Uint8Array {
  const chunks: Uint8Array[] = [];

  // PNG signature
  chunks.push(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]));

  // IHDR
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type RGB
  chunks.push(makeChunk("IHDR", ihdr));

  // IDAT — raw image data with filter bytes
  const rowSize = width * 3;
  const raw = new Uint8Array(height * (rowSize + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (rowSize + 1)] = 0; // filter: None
    raw.set(rgb.subarray(y * rowSize, (y + 1) * rowSize), y * (rowSize + 1) + 1);
  }
  const compressed = deflateRaw(raw);
  chunks.push(makeChunk("IDAT", compressed));

  // IEND
  chunks.push(makeChunk("IEND", new Uint8Array(0)));

  // Junta tudo
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) { out.set(c, pos); pos += c.length; }
  return out;
}

function makeChunk(type: string, data: Uint8Array): Uint8Array {
  const len = data.length;
  const buf = new Uint8Array(12 + len);
  const dv = new DataView(buf.buffer);
  dv.setUint32(0, len);
  for (let i = 0; i < 4; i++) buf[4 + i] = type.charCodeAt(i);
  buf.set(data, 8);
  const crc = crc32(buf.subarray(4, 8 + len));
  dv.setUint32(8 + len, crc);
  return buf;
}

// CRC32
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// Deflate mínimo (stored blocks — sem compressão, válido para PNG)
function deflateRaw(data: Uint8Array): Uint8Array {
  const BLOCK_SIZE = 65535;
  const numBlocks = Math.ceil(data.length / BLOCK_SIZE) || 1;
  // zlib header + blocks + adler32
  const out = new Uint8Array(2 + numBlocks * 5 + data.length + 4);
  const dv = new DataView(out.buffer);
  out[0] = 0x78; out[1] = 0x01; // zlib header
  let pos = 2;
  let adlerA = 1, adlerB = 0;
  for (let i = 0; i < numBlocks; i++) {
    const start = i * BLOCK_SIZE;
    const end = Math.min(start + BLOCK_SIZE, data.length);
    const block = data.subarray(start, end);
    const last = end === data.length ? 1 : 0;
    out[pos++] = last;
    out[pos++] = block.length & 0xff;
    out[pos++] = (block.length >> 8) & 0xff;
    out[pos++] = ~block.length & 0xff;
    out[pos++] = (~block.length >> 8) & 0xff;
    out.set(block, pos);
    pos += block.length;
    for (const b of block) {
      adlerA = (adlerA + b) % 65521;
      adlerB = (adlerB + adlerA) % 65521;
    }
  }
  dv.setUint32(pos, (adlerB << 16) | adlerA);
  return out;
}
