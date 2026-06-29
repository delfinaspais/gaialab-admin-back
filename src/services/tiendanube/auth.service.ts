import axios from "axios";
import { env } from "../../config/env";
import { tiendanubeTokenResponseSchema } from "../../types/tiendanube";

const AUTH_BASE_URL = "https://www.tiendanube.com";

export function getInstallUrl(state?: string): string {
  const params = new URLSearchParams();
  if (state) {
    params.set("state", state);
  }

  const query = params.toString();
  const suffix = query ? `?${query}` : "";

  return `${AUTH_BASE_URL}/apps/${env.TIENDANUBE_CLIENT_ID}/authorize${suffix}`;
}

export async function exchangeCodeForToken(code: string) {
  const response = await axios.post(
    `${AUTH_BASE_URL}/apps/authorize/token`,
    {
      client_id: env.TIENDANUBE_CLIENT_ID,
      client_secret: env.TIENDANUBE_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return tiendanubeTokenResponseSchema.parse(response.data);
}
