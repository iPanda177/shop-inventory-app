import cron from "node-cron";

import { getProducts } from "~/services/products.server";

export default function startUpdateProducts() {
  cron.schedule("0 * * * *", () => updateProducts(250));
}

async function updateProducts(limit: number) {
  try {
    const stores = await prisma.store.findMany();

    for (const store of stores) {
      let date_start = new Date();
      date_start.setHours(0, 0, 0, 0);
      let date_end = new Date();
      date_end.setHours(24, 0, 0, 0);

      let products = await prisma.productList.findMany({
        where: {
          store: store.store,
          isActive: true,
          NOT: {
            updatedAt: {
              gte: date_start,
              lte: date_end,
            },
          },
        },
        take: limit,
      });

      if (!products.length) {
        return;
      }

      const product_ids: string[] = [];
      const variant_ids: string[] = [];

      await Promise.all(
        products.map(async (product) => {
          let products_analytics = await prisma.product.findFirst({
            where: {
              store: store.store,
              updatedAt: {
                gte: date_start,
                lte: date_end,
              },
              variant_id: product.variant_id,
            },
          });

          if (!products_analytics) {
            product_ids.push(product.product_id);

            if (product.variant_id) {
              variant_ids.push(product.variant_id);
            }
          }
        })
      );

      if (!product_ids.length) {
        return;
      }

      const products_details = await getProducts(store.store, product_ids);
      const productsDetailsJson = await products_details.json();

      if (
        "error" in productsDetailsJson ||
        !productsDetailsJson?.products?.data
      ) {
        return;
      }

      for (const product of productsDetailsJson.products.data) {
        if (!Array.isArray(product.variants)) {
          continue;
        }

        for (const variant of product.variants) {
          if (!variant_ids.includes(`${variant.id}`)) {
            continue;
          }

          await prisma.productList.updateMany({
            where: {
              variant_id: variant.id?.toString(),
            },
            data: {
              isActive: product.status === "active",
              product_image: product.image && product.image.src,
              updatedAt: new Date(),
              quantity: variant.inventory_quantity,
              variant_title: variant.title,
              title: product.title || "",
              inventory_item_id: variant.inventory_item_id?.toString(),
            },
          });

          await prisma.product.create({
            data: {
              createdAt: new Date(),
              store: store.store,
              product_id: product.id?.toString() || "",
              title: product.title || "",
              product_image: product.image && product.image.src,
              isActive: product.status === "active",
              variant_id: variant.id?.toString(),
              variant_title: variant.title,
              inventory: variant.inventory_quantity,
              updatedAt: new Date(),
              is_out_stock: variant.inventory_quantity <= 0,
            },
          });
        }
      }
    }
  } catch (error) {
    console.log("Cron error", error);
  }
}
