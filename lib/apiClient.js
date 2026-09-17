/**
 * Fetch wrapper with automatic retry capability for handling transient cold-start / connection errors.
 * @param {string} url - The URL to fetch.
 * @param {RequestInit} [options] - Standard fetch options.
 * @param {number} [retries=2] - Number of retry attempts.
 * @param {number} [delayMs=300] - Delay between retries in milliseconds.
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, options = {}, retries = 2, delayMs = 300) {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      const res = await fetch(url, options);
      if (res.ok || (res.status >= 400 && res.status < 500) || attempt === retries) {
        return res;
      }
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }
    }
    attempt++;
    await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
  }
  return fetch(url, options);
}
