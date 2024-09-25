import { load_u8 } from "./env";

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
