import { z } from "zod";

const localizedNameSchema = z.union([
  z.string(),
  z.record(z.string()),
]);

export const tiendanubeProductVariantSchema = z.object({
  id: z.union([z.string(), z.number()]),
  sku: z.string().nullable().optional(),
  price: z.union([z.string(), z.number()]).optional(),
  promotional_price: z.union([z.string(), z.number()]).nullable().optional(),
});

export const tiendanubeCategoryRefSchema = z.union([
  z.string(),
  z.number(),
  z
    .object({
      id: z.union([z.string(), z.number()]),
      name: localizedNameSchema.optional(),
    })
    .passthrough(),
]);

export const tiendanubeCatalogProductSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: localizedNameSchema,
  categories: z.array(tiendanubeCategoryRefSchema).optional(),
  published: z.boolean().optional(),
  variants: z.array(tiendanubeProductVariantSchema).optional(),
});

export const tiendanubeCategorySchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: localizedNameSchema,
});

export const tiendanubeCategoriesSchema = z.array(tiendanubeCategorySchema);

export const tiendanubeCatalogProductsSchema = z.array(tiendanubeCatalogProductSchema);

export type TiendanubeCatalogProduct = z.infer<typeof tiendanubeCatalogProductSchema>;
export type TiendanubeProductVariant = z.infer<typeof tiendanubeProductVariantSchema>;
export type TiendanubeCategoryRef = z.infer<typeof tiendanubeCategoryRefSchema>;

export function resolveProductName(name: z.infer<typeof localizedNameSchema>): string {
  if (typeof name === "string") {
    return name;
  }

  return name.es ?? name.pt ?? name.en ?? Object.values(name)[0] ?? "Sin nombre";
}

export function resolveVariantSalePrice(variant: TiendanubeProductVariant): string | null {
  const promotional = variant.promotional_price;
  if (promotional !== null && promotional !== undefined && promotional !== "") {
    return String(promotional);
  }

  if (variant.price !== undefined && variant.price !== "") {
    return String(variant.price);
  }

  return null;
}

export function resolveCategoryLabel(
  categories: TiendanubeCategoryRef[] | undefined,
  categoryMap: Map<string, string>
): string | null {
  if (!categories?.length) {
    return null;
  }

  const names = categories
    .map((category) => {
      if (typeof category === "object" && category !== null && "id" in category) {
        if (category.name) {
          return resolveProductName(category.name);
        }
        return categoryMap.get(String(category.id)) ?? null;
      }

      return categoryMap.get(String(category)) ?? null;
    })
    .filter((name): name is string => !!name);

  return names.length > 0 ? names.join(" / ") : null;
}
