import axios, { AxiosInstance } from "axios";
import { env } from "../../config/env";

const API_BASE_URL = "https://api.tiendanube.com";

export function createTiendanubeClient(storeId: string, accessToken: string): AxiosInstance {
  return axios.create({
    baseURL: `${API_BASE_URL}/${env.TIENDANUBE_API_VERSION}/${storeId}`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": "Gaia Lab Admin (gaialab@internal.local)",
    },
    timeout: 15000,
  });
}
