// IEEE 802.3 CRC-32 implementation
const crcTable: Uint32Array = new Uint32Array(256);

// Precompute CRC32 lookup table
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[i] = c >>> 0;
}

export function computeCrc32(data: Uint8Array | string): string {
  let crc = 0xffffffff;
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;

  for (let i = 0; i < bytes.length; i++) {
    crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }

  const result = (crc ^ 0xffffffff) >>> 0;
  return result.toString(16).toUpperCase().padStart(8, '0');
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 bytes';
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString();
}
