import type { Response } from "express";

export function parseBigIntParam(value: string | undefined, res: Response, label = "id") {
  if (!value || !/^\d+$/.test(value)) {
    res.status(400).json({ error: `Invalid ${label}` });
    return null;
  }
  return BigInt(value);
}

export function boundedString(value: unknown, max = 500) {
  return String(value || "").trim().slice(0, max);
}
