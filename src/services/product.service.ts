import { prisma } from "../lib/prisma";
import {
  resolveCategoryLabel,
  resolveProductName,
  resolveVariantSalePrice,
} from "../types/tiendanubeProduct";
import { fetchCategoryMap } from "./tiendanube/category.service";
import { fetchAllCatalogProducts } from "./tiendanube/product.service";

const PERSONAL_LEGACY_STORE_ID = "personal";

export async function listProducts() {
  const [storeProducts, personalProducts] = await Promise.all([
    prisma.product.findMany({
      where: { storeId: { not: PERSONAL_LEGACY_STORE_ID } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.personalProduct.findMany({
      where: { activo: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const legacyPersonalProducts = await prisma.product.findMany({
    where: { storeId: PERSONAL_LEGACY_STORE_ID },
    orderBy: { createdAt: "desc" },
  });

  const mappedPersonalProducts = personalProducts.map((product) => ({
    id: product.id,
    storeId: PERSONAL_LEGACY_STORE_ID,
    productId: "personal",
    variantId: `personal-${product.id}`,
    sku: null,
    name: product.name,
    categoria: product.categoria,
    costoUnitario: product.costoUnitario,
    precioVenta: product.precioVenta,
    activo: product.activo,
    status: product.costoUnitario ? "active" : "pending_cost",
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }));

  return [...storeProducts, ...mappedPersonalProducts, ...legacyPersonalProducts];
}

export async function listProductCategories(): Promise<string[]> {
  const [tnCategories, personalCategories] = await Promise.all([
    prisma.product.findMany({
      where: {
        categoria: { not: null },
        storeId: { not: PERSONAL_LEGACY_STORE_ID },
      },
      distinct: ["categoria"],
      select: { categoria: true },
    }),
    prisma.personalProduct.findMany({
      where: { categoria: { not: null }, activo: true },
      distinct: ["categoria"],
      select: { categoria: true },
    }),
  ]);

  const categories = new Set<string>();
  for (const row of tnCategories) {
    if (row.categoria) {
      categories.add(row.categoria);
    }
  }
  for (const row of personalCategories) {
    if (row.categoria) {
      categories.add(row.categoria);
    }
  }

  return Array.from(categories).sort((a, b) => a.localeCompare(b, "es"));
}

export async function updateProductCost(id: string, costoUnitario: number) {
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    return null;
  }

  return prisma.product.update({
    where: { id },
    data: {
      costoUnitario,
      status: "active",
    },
  });
}

export interface SyncProductPricesResult {
  storeId: string;
  updated: number;
  created: number;
  skipped: number;
  failed: number;
  message: string;
}

export async function syncProductPrices(options?: {
  storeId?: string;
}): Promise<SyncProductPricesResult[]> {
  const credentials = options?.storeId
    ? await prisma.storeCredential.findMany({ where: { storeId: options.storeId } })
    : await prisma.storeCredential.findMany();

  if (credentials.length === 0) {
    throw new Error("No store credentials found. Run OAuth install first.");
  }

  const summaries: SyncProductPricesResult[] = [];

  for (const credential of credentials) {
    const [catalogProducts, categoryMap] = await Promise.all([
      fetchAllCatalogProducts(credential.storeId, credential.accessToken),
      fetchCategoryMap(credential.storeId, credential.accessToken),
    ]);

    let updated = 0;
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const catalogProduct of catalogProducts) {
      const productId = String(catalogProduct.id);
      const productName = resolveProductName(catalogProduct.name);
      const categoria = resolveCategoryLabel(catalogProduct.categories, categoryMap);
      const activo = catalogProduct.published ?? true;
      const variants = catalogProduct.variants ?? [];

      for (const variant of variants) {
        try {
          const variantId = String(variant.id);
          const precioVenta = resolveVariantSalePrice(variant);

          const sku =
            typeof variant.sku === "string" && variant.sku.length > 0 ? variant.sku : null;

          const existing = await prisma.product.findUnique({
            where: {
              storeId_variantId: {
                storeId: credential.storeId,
                variantId,
              },
            },
          });

          await prisma.product.upsert({
            where: {
              storeId_variantId: {
                storeId: credential.storeId,
                variantId,
              },
            },
            create: {
              storeId: credential.storeId,
              productId,
              variantId,
              name: productName,
              categoria,
              sku,
              precioVenta,
              activo,
              costoUnitario: null,
              status: "pending_cost",
            },
            update: {
              productId,
              name: productName,
              categoria,
              sku,
              precioVenta,
              activo,
            },
          });

          if (existing) {
            updated += 1;
          } else {
            created += 1;
          }
        } catch {
          failed += 1;
        }
      }
    }

    summaries.push({
      storeId: credential.storeId,
      updated,
      created,
      skipped,
      failed,
      message: "Precios sincronizados desde Tienda Nube",
    });
  }

  return summaries;
}
