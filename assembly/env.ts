@external("archethic/env", "log")
export declare function log(offset: u64, len: u64): void;

@external("archethic/env", "store_u8")
export declare function store_u8(offset: u64, value: u8): void;

@external("archethic/env", "load_u8")
export declare function load_u8(a: u64): u8;

@external("archethic/env", "input_size")
export declare function input_size(): u64;

@external("archethic/env", "alloc")
export declare function alloc(size: u64): u64;

@external("archethic/env", "set_output")
export declare function set_output(offset: u64, length: u64): void;

@external("archethic/env", "set_error")
export declare function set_error(offset: u64, length: u64): void

@external("archethic/env", "jsonrpc")
export declare function jsonrpc(offset: u64, length: u64): u64