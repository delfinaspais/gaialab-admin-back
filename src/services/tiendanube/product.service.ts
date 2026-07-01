import { createTiendanubeClient } from "./api.service";
import { tiendanubeCatalogProductsSchema } from "../../types/tiendanubeProduct";

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
