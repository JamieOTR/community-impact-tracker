// src/utils/uuid.ts
import { v4 as uuidv4 } from "uuid";

export function getUUID(): string {
  // Prefer native implementation when available
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof (c as any).randomUUID === "function") {
    return (c as any).randomUUID();
  }
  // Fallback (works everywhere)
  return uuidv4();
}
