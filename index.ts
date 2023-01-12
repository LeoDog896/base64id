/*!
 * base64id v0.1.0
 */

import * as crypto from "https://deno.land/std@0.170.0/node/crypto.ts";
import { Buffer } from "https://deno.land/std@0.170.0/node/buffer.ts";

/**
 * Get random bytes
 *
 * Uses a buffer if available, falls back to crypto.randomBytes
 */

let bytesBufferIndex: number | null = null;
let bytesBuffer: Buffer | undefined;
let isGeneratingBytes = false;
let sequenceNumber = 0;

const getRandomBytes = function (bytes: number) {
  const BUFFER_SIZE = 4096;

  bytes = bytes || 12;

  if (bytes > BUFFER_SIZE) {
    return crypto.randomBytes(bytes);
  }

  const bytesInBuffer = parseInt((BUFFER_SIZE / bytes).toString());
  const threshold = parseInt((bytesInBuffer * 0.85).toString());

  if (!threshold) {
    return crypto.randomBytes(bytes);
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
      crypto.randomBytes(BUFFER_SIZE, (_, bytes) => {
        bytesBuffer = bytes;
        bytesBufferIndex = 0;
        isGeneratingBytes = false;
      });
    }

    // Fall back to sync call when no buffered bytes are available
    if (bytesBufferIndex == -1) {
      return crypto.randomBytes(bytes);
    }
  }

  const result = bytesBuffer!.slice(
    bytes * bytesBufferIndex,
    bytes * (bytesBufferIndex + 1),
  );
  bytesBufferIndex++;

  return result;
};

/**
 * Generates a base64 id
 *
 * (Original version from socket.io <http://socket.io>)
 */
export const generateId = function () {
  const rand = Buffer.alloc(15); // multiple of 3 for base64
  if (!rand.writeInt32BE) {
    return Math.abs(Math.random() * Math.random() * Date.now() | 0).toString() +
      Math.abs(Math.random() * Math.random() * Date.now() | 0).toString();
  }
  sequenceNumber = (sequenceNumber + 1) | 0;
  rand.writeInt32BE(sequenceNumber, 11);
  getRandomBytes(12).copy(rand);
  return rand.toString("base64").replace(/\//g, "_").replace(/\+/g, "-");
};
