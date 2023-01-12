function checkInt(
  buf: Uint8Array,
  value: number,
  offset: number,
  ext: number,
  max: number,
  min: number,
) {
  if (value > max || value < min) {
    throw new RangeError('"value" argument is out of bounds');
  }
  if (offset + ext > buf.length) throw new RangeError("Index out of range");
}

function writeInt32BE(array: Uint8Array, value: number, offset: number) {
  offset = offset >>> 0;
  checkInt(array, value, offset, 4, 0x7fffffff, -0x80000000);
  if (value < 0) value = 0xffffffff + value + 1;
  array[offset] = value >>> 24;
  array[offset + 1] = value >>> 16;
  array[offset + 2] = value >>> 8;
  array[offset + 3] = value & 0xff;
  return offset + 4;
}

let bytesBufferIndex: number | null = null;
let bytesBuffer: Uint8Array | undefined;
let isGeneratingBytes = false;
let sequenceNumber = 0;

function getRandomUint8Array(length: number): Uint8Array {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return array;
}

/**
 * Get random bytes
 *
 * Uses a buffer if available, falls back to crypto.randomBytes
 */
export function getRandomBytes(bytes: number) {
  const BUFFER_SIZE = 4096;

  bytes = bytes || 12;

  if (bytes > BUFFER_SIZE) {
    return getRandomUint8Array(bytes);
  }

  const bytesInBuffer = parseInt((BUFFER_SIZE / bytes).toString());
  const threshold = parseInt((bytesInBuffer * 0.85).toString());

  if (!threshold) {
    return getRandomUint8Array(bytes);
  }

  if (bytesBufferIndex == null) {
    bytesBufferIndex = -1;
  }

  if (bytesBufferIndex == bytesInBuffer) {
    bytesBuffer = undefined;
    bytesBufferIndex = -1;
  }

  // No buffered bytes available or index above threshold
  if (bytesBufferIndex == -1 || bytesBufferIndex > threshold) {
    if (!isGeneratingBytes) {
      isGeneratingBytes = true;
      const bytes = getRandomUint8Array(BUFFER_SIZE);
      bytesBuffer = bytes;
      bytesBufferIndex = 0;
      isGeneratingBytes = false;
    }

    // Fall back to sync call when no buffered bytes are available
    if (bytesBufferIndex == -1) {
      return getRandomUint8Array(bytes);
    }
  }

  const result = bytesBuffer!.slice(
    bytes * bytesBufferIndex,
    bytes * (bytesBufferIndex + 1),
  );
  bytesBufferIndex++;

  return result;
}

/**
 * Generates a base64 id
 *
 * (Original version from socket.io <http://socket.io>)
 */
export function generateId() {
  const rand = new Uint8Array(15); // multiple of 3 for base64
  sequenceNumber = (sequenceNumber + 1) | 0;
  writeInt32BE(rand, sequenceNumber, 11);
  rand.set(getRandomBytes(12));
  return btoa(String.fromCharCode(...rand)).replace(/\//g, "_").replace(/\+/g, "-");
}
