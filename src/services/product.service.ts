import { prisma } from "../lib/prisma";

export async function listProducts() {
  return prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });
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
