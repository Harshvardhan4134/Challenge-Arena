/** Matches API normalizeWhatsappInput: at least 10 digits. */
export function hasEnoughWhatsappDigits(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10;
}
