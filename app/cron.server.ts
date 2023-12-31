import cron from 'node-cron';

import {getProducts} from "~/services/products.server";

export default async function updateProducts() {
  cron.schedule("0 3 * * *", async () => {
    try {
      const stores = await prisma.store.findMany();

      if (!stores.length) {
        return
      }

      for (const store of stores) {
        let date_start = new Date()
        date_start = new Date(date_start.setHours(0, 0, 0, 0))
        let date_end = new Date();
        date_end = new Date(date_end.setHours(24, 0, 0, 0))

        let products = await prisma.productList.findMany({
          where: {
            store: store.store,
            NOT: {
              updatedAt: {
                gte: date_start,
                lte: date_end
              }
            }
          }
        });

        if (!products.length) {
          return
        }

        const product_ids: string[] = []
        const variant_ids: string[] = []

        await Promise.all(products.map(async (product) => {
          let products_analytics = await prisma.product.findFirst({
            where: {
              store: store.store,
              updatedAt: {
                gte: date_start,
                lte: date_end
              },
              variant_id: product.variant_id
            }
          });

          if (!products_analytics) {
            product_ids.push(product.product_id)

            if (product.variant_id) {
              variant_ids.push(product.variant_id)
            }
          }
        }));

        if (!product_ids.length) {
          return
        }

        const products_details = await getProducts(store.store, product_ids);

        if ('error' in products_details) {
          return;
        }

        for (const product of products_details) {
          for (const variant of product.variants) {
            if (!variant_ids.includes(`${variant.id}`)) {
              continue;
            }

            await prisma.productList.update({
              where: {
                variant_id: variant.id
              },
              data: {
                isActive: product.status === 'active',
                product_image: product.image && product.image.src,
                updatedAt: new Date(),
                quantity: variant.inventory_quantity,
                variant_title: variant.title,
                title: product.title,
                inventory_item_id : variant.inventory_item_id
              },
            })

            await prisma.product.create({
              data: {
                createdAt: new Date(),
                store: store.store,
                product_id: product.id,
                title: product.title,
                product_image: product.image && product.image.src,
                isActive: product.status === 'active',
                variant_id: variant.id,
                variant_title: variant.title,
                inventory: variant.inventory_quantity,
                updatedAt: new Date(),
                is_out_stock: variant.inventory_quantity <= 0,
              }
            })
          }
        }
      }
    } catch (error) {
      console.log("Cron error", error);
    }
  });
}
