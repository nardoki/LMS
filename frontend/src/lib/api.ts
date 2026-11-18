import { createClient } from "./supabase/client";

const DEFAULT_GATEWAY_URL = "https://masterylms-api-production.up.railway.app";

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  process.env.GATEWAY_URL ||
  DEFAULT_GATEWAY_URL;

export async function gatewayFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  const response = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      (errorBody as { message?: string }).message ??
      `Gateway request failed (${response.status})`;
    throw new Error(Array.isArray(message) ? message.join(", ") : message);
  }

  return response.json() as Promise<T>;
}
