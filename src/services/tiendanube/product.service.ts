import { createTiendanubeClient } from "./api.service";
import {
  tiendanubeCatalogProductSchema,
  tiendanubeCatalogProductsSchema,
} from "../../types/tiendanubeProduct";
import type { TiendanubeCatalogProduct } from "../../types/tiendanubeProduct";

const PRODUCTS_PER_PAGE = 50;

export async function fetchCatalogProductsPage(
  storeId: string,
  accessToken: string,
  page: number
) {
  const client = createTiendanubeClient(storeId, accessToken);
  const response = await client.get("/products", {
    params: {
      page,
      per_page: PRODUCTS_PER_PAGE,
    },
  });

  return tiendanubeCatalogProductsSchema.parse(response.data);
}

export async function fetchCatalogProduct(
  storeId: string,
  accessToken: string,
  productId: string
): Promise<TiendanubeCatalogProduct | null> {
  const client = createTiendanubeClient(storeId, accessToken);

  try {
    const response = await client.get(`/products/${productId}`);
    return tiendanubeCatalogProductSchema.parse(response.data);
  } catch {
    return null;
  }
}

export async function fetchAllCatalogProducts(storeId: string, accessToken: string) {
  const products = [];
  let page = 1;

  while (true) {
    const pageProducts = await fetchCatalogProductsPage(storeId, accessToken, page);
    products.push(...pageProducts);

    if (pageProducts.length < PRODUCTS_PER_PAGE) {
      break;
    }

    page += 1;
  }

  return products;
}

export { PRODUCTS_PER_PAGE };
