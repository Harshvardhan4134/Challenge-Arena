export function normalizeWhatsappInput(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10 ? raw.trim() : null;
}
