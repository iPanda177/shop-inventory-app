import type { LoaderFunctionArgs } from "@remix-run/node";
import {
  Page,
  IndexTable,
  Thumbnail,
  Layout,
  Card,
  Text,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { useLoaderData, Link } from "@remix-run/react";
import { ImageMajor } from "@shopify/polaris-icons";
import { json } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);

  const store = await prisma.store.findFirst({
    where: {
      store: session.shop,
    },
  });

  if (!store && session.accessToken) {
    await prisma.store.create({
      data: {
        store: session.shop,
        access_token: session.accessToken,
        createdAt: new Date(),
      },
    });

    const limit = 250;
    const productCount = await admin.rest.resources.Product.count({ session });

    let lastId: number | null = null;
    for (let i = 0; i < Math.ceil(productCount.count / limit); i++) {
      if (i >= 40) {
        await new Promise((r) => setTimeout(r, 2000));
      }

      const products = await admin.rest.resources.Product.all({
        session: session,
        limit,
        ...(lastId && { since_id: lastId }),
      });

      if (!products?.data?.length) {
        break;
      }
      lastId = products.data[products.data.length - 1].id;

      for (const product of products.data) {
        if (!Array.isArray(product.variants)) continue;

        for (const variant of product.variants) {
          const productInDb = await prisma.productList.findFirst({
            where: {
              product_id: String(product.id),
              variant_id: String(variant.id),
            },
          });
          if (productInDb) {
            continue;
          }

          await prisma.productList.create({
            data: {
              store: session.shop,
              product_image: product.image ? product.image.src : "",
              title: product.title || "No Title",
              product_id: String(product.id),
              variant_title: variant.title,
              variant_id: String(variant.id),
              inventory_item_id: String(variant.inventory_item_id),
              quantity: variant.inventory_quantity,
              createdAt: new Date(),
              isActive: product.status === "active",
            },
          });

          await prisma.product.create({
            data: {
              store: session.shop,
              product_id: String(product.id),
              product_image: product.image ? product.image.src : "",
              title: product.title || "No Title",
              isActive: product.isActive,
              variant_id: String(variant.id),
              variant_title: variant.title,
              inventory: variant.inventory_quantity,
              createdAt: new Date(),
              updatedAt: new Date(),
              is_out_stock: variant.inventory_quantity <= 0,
            },
          });
        }
      }
    }

    // await prisma.productList.createMany({})
    // await prisma.product.createMany({})

    const allProducts = await prisma.productList.findMany({
      where: {
        store: session.shop,
      },
    });

    return json({ allProducts }, { status: 200 });
  }

  const allProducts = await prisma.productList.findMany({
    where: {
      store: session.shop,
    },
  });

  return json({ allProducts }, { status: 200 });
};

export default function Index() {
  const { allProducts }: any = useLoaderData();

  function truncate(str: string) {
    const n = 25;
    return str.length > n ? str.substr(0, n - 1) + "…" : str;
  }

  const allproducts = allProducts.length ? (
    <IndexTable
      resourceName={{
        singular: "Product",
        plural: "Products",
      }}
      itemCount={allProducts.length}
      headings={[
        { title: "Thumbnail", hidden: true },
        { title: "Title" },
        { title: "Variant" },
        { title: "Quantity" },
        { title: "Date" },
        { title: "Active" },
      ]}
      selectable={false}
    >
      {allProducts.map(
        ({
          id,
          title,
          product_image,
          variant_title,
          updatedAt,
          isActive,
          quantity,
          variant_id,
        }) => {
          return (
            <IndexTable.Row id={id} key={id} position={id}>
              <IndexTable.Cell>
                <Thumbnail
                  source={product_image || ImageMajor}
                  alt={"product image or placeholder"}
                  size="small"
                />
              </IndexTable.Cell>
              <IndexTable.Cell>
                <Link to={`./product/${variant_id}`}>{truncate(title)}</Link>
              </IndexTable.Cell>
              <IndexTable.Cell>{variant_title}</IndexTable.Cell>
              <IndexTable.Cell>{quantity}</IndexTable.Cell>
              <IndexTable.Cell>
                {new Date(updatedAt).toDateString()}
              </IndexTable.Cell>
              <IndexTable.Cell>{isActive ? "true" : "false"}</IndexTable.Cell>
            </IndexTable.Row>
          );
        }
      )}
    </IndexTable>
  ) : (
    <Card>
      <Text as="p">No Data Found</Text>
    </Card>
  );
  return (
    <Page>
      <ui-title-bar title="All Products" />
      <Layout>
        <Layout.Section>
          <Card padding={"0"}>{allproducts}</Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
