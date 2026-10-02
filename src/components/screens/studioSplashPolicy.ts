/**
 * Should the studio splash play on this page load? Automated browsers
 * (navigator.webdriver, as in Playwright) and ?nosplash skip it. ?splash forces it.
 */
export function shouldShowStudioSplash(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
  webdriver: boolean = typeof navigator !== 'undefined' && navigator.webdriver === true,
): boolean {
  try {
    const q = new URLSearchParams(search);
    if (q.has('splash')) return true;
    if (webdriver) return false;
    if (q.has('nosplash')) return false;
  } catch {
    // Ignore malformed addresses
  }
  return true;
}
