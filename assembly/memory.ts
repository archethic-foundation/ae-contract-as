// export function write(s: Uint8Array): u64 {
//   const ptr = heap.alloc(s.byteLength);
//   const length = writeFromPointer(s, ptr);
//   return (u64(ptr) << 32) | length;
// }

import { load_u8 } from "./env";

// export function writeFromPointer(s: Uint8Array, ptr: usize): usize {
//   const length = s.byteLength;
//   for (let i = 0; i < length; i++) {
//     store<u8>(ptr + i, s[i]);
//   }
//   return length;
// }

export function readCombinedPointer(combinedPointer: u64): Uint8Array {
  const pos = u32(combinedPointer >> 32);
  const u32_mask: u64 = 2 ** 32 - 1;
  const size = i32(combinedPointer & u32_mask);
  return readFromPointer(pos, size);
}

export function readFromPointer(pos: u32, size: i32): Uint8Array {
  let value = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    value[i] = load_u8(pos + i);
  }
  return value;
}
