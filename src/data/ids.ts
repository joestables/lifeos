import { v7 } from 'uuid'

/** A new ID, made on the device: UUIDv7, so IDs sort by creation time (ADR-0007). */
export function newId(): string {
  return v7()
}
