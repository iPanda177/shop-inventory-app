import type { ActionFunctionArgs } from '@remix-run/node'
import { authenticate } from '../shopify.server'
import { json } from '@remix-run/node'
import type {
  OrderProduct,
  Order,
  Product,
  ShopifyProduct,
  LineItem,
} from '~/types'
import type { InventoryItem } from 'node_modules/@shopify/shopify-api/rest/admin/2023-10/inventory_item'
import {
  handleOrder,
  saveProduct,
  updateInventory,
} from '~/services/products.server'

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(
    request,
  )

  if (!admin) {
    throw new Response()
  }

  switch (topic) {
    case 'PRODUCTS_CREATE':
      try {
        const { id, title, status, image, variants } =
          payload as unknown as ShopifyProduct
        const inventory_id: string[] = []

        await Promise.all(
          variants.map(async variant => {
            const product: Product = {
              store: shop,
              product_id: String(id),
              title: title,
              product_image: image && image.src,
              isActive: status === 'active',
              variant_id: String(variant.id),
              variant_title: variant.title,
              inventory: variant.inventory_quantity,
              inventory_item_id: String(variant.inventory_item_id),
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            if (variant.inventory_item_id) {
              inventory_id.push(String(variant.inventory_item_id))
            }

            await saveProduct(product)
          }),
        )

        const inventory = await admin.rest.InventoryItem.all({
          session: session,
          ids: inventory_id.toString(),
        })

        await Promise.all(
          inventory.data.map(async inventory_data => {
            await updateInventory(inventory_data)
            return true
          }),
        )

        return json({ message: 'OK' }, { status: 200 })
      } catch (error) {
        console.log('error PRODUCTS_CREATE', error)
        return json({ message: error }, { status: 500 })
      }

    case 'PRODUCTS_UPDATE':
      try {
        const { id, title, status, image, variants } =
          payload as unknown as ShopifyProduct
        let inventory_id: string[] = []

        await Promise.all(
          variants.map(async variant => {
            const product: Product = {
              store: shop,
              product_id: String(id),
              title: title,
              product_image: image && image.src,
              isActive: status === 'active',
              variant_id: String(variant.id),
              variant_title: variant.title,
              inventory: variant.inventory_quantity,
              inventory_item_id: String(variant.inventory_item_id),
              updatedAt: new Date(),
            }

            inventory_id.push(String(variant.inventory_item_id))

            await saveProduct(product)
          }),
        )

        const inventory = await admin.rest.InventoryItem.all({
          session: session,
          ids: inventory_id.toString(),
        })

        await Promise.all(
          inventory.data.map(async inventory_data => {
            await updateInventory(inventory_data)
            return true
          }),
        )

        return json({ message: 'OK' }, { status: 200 })
      } catch (error) {
        console.log('error PRODUCTS_UPDATE', error)
        return json({ error: error }, { status: 500 })
      }

    case 'PRODUCTS_DELETE':
      try {
        const { id } = payload as unknown as ShopifyProduct
        const product = await prisma.productList.findFirst({
          where: {
            product_id: String(id),
          },
        })

        if (!product) {
          return json({ message: 'OK' }, { status: 200 })
        }

        await prisma.productList.update({
          where: {
            id: product.id,
          },
          data: {
            isActive: false,
            updatedAt: new Date(),
          },
        })
        return json({ message: 'OK' }, { status: 200 })
      } catch (error) {
        console.log('error PRODUCTS_DELETE', error)
        return json({ message: error }, { status: 500 })
      }

    case 'ORDERS_CREATE':
      try {
        const { line_items } = payload as unknown as Order

        await Promise.all(
          line_items.map(async (item: LineItem) => {
            const product: OrderProduct = {
              store: shop,
              product_id: String(item.product_id),
              title: item.title,
              buy: item.quantity,
              variant_id: String(item.variant_id),
              variant_title: String(item.variant_title),
              updatedAt: new Date(),
            }

            await handleOrder(product)
          }),
        )
        return json({ message: 'OK' }, { status: 200 })
      } catch (error) {
        console.log('error ORDERS_CREATE', error)
        return json({ message: error }, { status: 500 })
      }

    case 'INVENTORY_ITEMS_UPDATE':
      try {
        await updateInventory(payload as unknown as InventoryItem)
        return json({ message: 'OK' }, { status: 200 })
      } catch (error) {
        console.log('error INVENTORY_ITEMS_UPDATE', error)
        return json({ message: error }, { status: 500 })
      }

    case 'APP_UNINSTALLED':
    case 'CUSTOMERS_DATA_REQUEST':
    case 'CUSTOMERS_REDACT':
    case 'SHOP_REDACT':
      return json({ message: 'OK' }, { status: 200 })

    default:
      throw new Response('Unhandled webhook topic', { status: 404 })
  }
}
