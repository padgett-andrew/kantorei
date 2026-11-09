/**
 * Helper to execute client-side fetch requests with an explicit timeout.
 * Prevents browsers from hanging for 60+ seconds on dead or high-packet-loss Wi-Fi connections.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = 4000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException(`Request timed out after ${timeoutMs}ms`, 'TimeoutError'));
  }, timeoutMs);

  try {
    let signal = controller.signal;
    if (init?.signal) {
      if (typeof AbortSignal !== 'undefined' && 'any' in AbortSignal) {
        signal = AbortSignal.any([controller.signal, init.signal]);
      } else {
        init.signal.addEventListener('abort', () => controller.abort());
      }
    }

    const response = await fetch(input, {
      ...init,
      signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}
