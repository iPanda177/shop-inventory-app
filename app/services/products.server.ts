import {json} from "@remix-run/node";
import {unauthenticated} from "~/shopify.server";
import type {InventoryItem, OrderProduct, Product} from "~/types";

export async function getProducts(store: string, product_ids: string[]) {
    try {
      const ids = product_ids.join(',')
      const { session, admin } = await unauthenticated.admin(store);

      const products = await admin.rest.resources.Product.all({
        session,
        ids,
      });

      return json({products}, {status: 200});
    } catch (error) {
      console.log(error)
      return json({error: error}, {status: 500});
    }
}

export async function saveProduct(product: Product) {
    try {
        let date_start = new Date();
        date_start = new Date(date_start.setHours(0, 0, 0, 0));
        let date_end = new Date();
        date_end = new Date(date_end.setHours(24, 0, 0, 0));

        let product_list = await prisma.productList.findFirst({
            where: {
                product_id: product.product_id,
                variant_id: product.variant_id
            }
        })

        if (!product_list) {
            product_list = await prisma.productList.create({
                data: {
                    store: product.store,
                    product_id: product.product_id,
                    product_image: product.product_image,
                    title: product.title,
                    isActive: product.isActive,
                    variant_id: product.variant_id,
                    variant_title: product.variant_title,
                    quantity: product.inventory,
                    inventory_item_id: product.inventory_item_id,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
            })
        } else {
            await prisma.productList.update({
                where: {
                    id: product_list.id
                },
                data: {
                    store: product.store,
                    product_id: product.product_id,
                    product_image: product.product_image,
                    title: product.title,
                    isActive: product.isActive,
                    variant_id: product.variant_id,
                    variant_title: product.variant_title,
                    quantity: product.inventory,
                    inventory_item_id: product.inventory_item_id,
                    updatedAt: new Date(),
                },
            });
        }

        const productData = await prisma.product.findFirst({
            where: {
                product_id: product.product_id,
                variant_id: product.variant_id,
                updatedAt: {
                    gte: date_start,
                    lte: date_end
                }
            }
        })

        if (!productData) {
            await prisma.product.create({
                data: {
                    store: product.store,
                    product_id: product.product_id,
                    product_image: product.product_image,
                    title: product.title,
                    isActive: product.isActive,
                    variant_id: product.variant_id,
                    variant_title: product.variant_title,
                    inventory: product.inventory,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    is_out_stock: product.inventory <= 0 && product_list.tracked,
                }
            })
        }
    } catch (error) {
        console.log("error", error)
    }
}

export async function updateInventory(inventory_item: InventoryItem) {
    try {
        const inventory_product = await prisma.productList.findFirst({
           where: {
                inventory_item_id: inventory_item.id.toString()
           }
        });

        if (inventory_product) {
            await prisma.productList.update({
                where: {
                    id: inventory_product.id
                },
                data: {
                    tracked: inventory_item.tracked,
                    updatedAt: new Date(),
                }
            });

            const product_variant = await prisma.product.findFirst({
                where: {
                    variant_id: inventory_product.variant_id,
                },
                orderBy: {
                    updatedAt: 'desc'
                }
            });

            if (!product_variant || product_variant.inventory === null) {
                return;
            }

            await prisma.product.update({
                where: {
                    id: product_variant.id
                },
                data: {
                    is_out_stock: product_variant.inventory <= 0 && inventory_item.tracked,
                }
            })
        }
    } catch (error) {
        console.log(error)
    }
}

export async function handleOrder(product: OrderProduct) {
    try {
        let date_start = new Date()
        date_start = new Date(date_start.setHours(0, 0, 0, 0))
        let date_end = new Date()
        date_end = new Date(date_end.setHours(24, 0, 0, 0))

        const product_list = await prisma.productList.findFirst({
            where: {
                product_id: product.product_id,
                variant_id: product.variant_id
            }
        });

        if (!product_list) {
            await prisma.productList.create({
                data: {
                    store: product.store,
                    product_id: product.product_id,
                    title: product.title,
                    isActive: true,
                    variant_id: product.variant_id,
                    variant_title: product.variant_title,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
            })
        }

        const productData = await prisma.product.findFirst({
            where: {
                product_id: product.product_id,
                variant_id: product.variant_id,
                updatedAt: { gte: date_start, lte: date_end }
            }
        })

        if (!productData) {
            await prisma.product.create({
                data: {
                    store: product.store,
                    product_id: product.product_id,
                    title: product.title,
                    variant_id: product.variant_id,
                    variant_title: product.variant_title,
                    buy: product.buy,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
            });
        } else {
            await prisma.product.update({
                where: {
                    id: productData.id
                },
                data: {
                    buy: productData.buy ? productData.buy + product.buy : product.buy,
                    updatedAt: new Date(),
                }
            });
        }
    } catch (error) {
        console.log("error", error)
    }
}
