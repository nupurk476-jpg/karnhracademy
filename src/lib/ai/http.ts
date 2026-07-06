import { AIProviderError } from "./types";

/** POST JSON with timeout + retry on transient failures (429/5xx/network). */
export async function postJSON<T>(
  provider: string,
  url: string,
  headers: Record<string, string>,
  body: unknown,
  { retries = 2, timeoutMs = 120_000 }: { retries?: number; timeoutMs?: number } = {},
): Promise<T> {
  let lastError: AIProviderError | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (res.ok) {
        return (await res.json()) as T;
      }

      const text = await res.text().catch(() => "");
      lastError = new AIProviderError(provider, truncate(text, 500) || res.statusText, res.status);
      if (!lastError.retryable) throw lastError;
    } catch (err) {
      if (err instanceof AIProviderError) {
        if (!err.retryable) throw err;
        lastError = err;
      } else {
        lastError = new AIProviderError(
          provider,
          err instanceof Error ? err.message : "network error",
        );
      }
    } finally {
      clearTimeout(timer);
    }

    if (attempt < retries) {
      await sleep(1000 * 2 ** attempt + Math.random() * 250);
    }
  }

  throw lastError ?? new AIProviderError(provider, "request failed");
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
