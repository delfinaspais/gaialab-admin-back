import { createTiendanubeClient } from "./api.service";
import {
  resolveProductName,
  tiendanubeCategoriesSchema,
} from "../../types/tiendanubeProduct";

const CATEGORIES_PER_PAGE = 50;

export async function fetchCategoryMap(
  storeId: string,
  accessToken: string
): Promise<Map<string, string>> {
  const client = createTiendanubeClient(storeId, accessToken);
  const categoryMap = new Map<string, string>();
  let page = 1;

  while (true) {
    const response = await client.get("/categories", {
      params: {
        page,
        per_page: CATEGORIES_PER_PAGE,
      },
    });

    const categories = tiendanubeCategoriesSchema.parse(response.data);

    for (const category of categories) {
      categoryMap.set(String(category.id), resolveProductName(category.name));
    }

    if (categories.length < CATEGORIES_PER_PAGE) {
      break;
    }

    page += 1;
  }

  return categoryMap;
}
