/** Safe in-app path after login/register (query `redirect=`), default /home. */
export function getPostAuthPath(): string {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("redirect");
  if (!raw) return "/home";
  try {
    const path = decodeURIComponent(raw);
    if (path.startsWith("/") && !path.startsWith("//")) return path;
  } catch {
    /* ignore malformed */
  }
  return "/home";
}
