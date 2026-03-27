import { Buffer } from 'buffer';

if (typeof globalThis !== 'undefined' && typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer;
}

