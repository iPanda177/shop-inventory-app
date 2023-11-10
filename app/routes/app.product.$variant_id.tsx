import { useState } from "react";
import {json, LoaderFunctionArgs} from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";

import {
  Card,
  HorizontalStack,
  Layout,
  Page,
  Text,
  Thumbnail,
  VerticalStack,
} from "@shopify/polaris";
import { ImageMajor } from "@shopify/polaris-icons";

import { authenticate } from "~/shopify.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    const { session } = await authenticate.admin(request);
    const { variant_id } = params;

    const products = await prisma.product.findMany({
      where: {
        store: session.shop,
        variant_id: variant_id,
      },
    });

    const sortedProducts = products.sort((a, b) => b.createdAt - a.createdAt);

    const groupedProducts = sortedProducts
      .reduce((result: any, product, currentIndex) => {
        const updatedResult = result;

        if (currentIndex === 0) {
          updatedResult.id = product.id;
          updatedResult.title = product.title;
          updatedResult.product_id = product.product_id;
          updatedResult.product_image = product.product_image;
          updatedResult.variant_id = product.variant_id;
          updatedResult.variant_title = product.variant_title;
          updatedResult.updatedAt = product.updatedAt;
          updatedResult.isActive = product.isActive;
          updatedResult.inventory = product.inventory;
          updatedResult.out_stock = 0;
          updatedResult.buy = 0;
          updatedResult.total = 0;
        }
        updatedResult.buy += product.buy;
        updatedResult.out_stock += product.is_out_stock ? 1 : 0;
        updatedResult.total++;

        return updatedResult;
      }, {});

    return json({ product_data: groupedProducts }, { status: 200 })
  } catch (error) {
    console.log(error)
    return json({ status: false, error: error }, { status: 500 });
  }
}

export default function ProductData() {
  const { product_data }: any = useLoaderData();
  console.log(product_data)
  const [product, setProduct] = useState(product_data);
  const navigate = useNavigate();

  return <Page>
    <ui-title-bar title="Product Matrix">
      <button variant="breadcrumb" onClick={() => navigate("/app")}>
        Products
      </button>
    </ui-title-bar>
    <Layout>
      <Layout.Section>
        <VerticalStack gap="5">
          <Card padding={"5"}>
            <HorizontalStack blockAlign="center" gap={"5"}>
              <Thumbnail
                source={product.product_image || ImageMajor}
                alt={product.title}
              />
              <Card>
                <Text as={"h2"} variant="headingLg">
                  {product.title}
                </Text>
                <Text as={"h6"}>
                  {product.variant_title}
                </Text>
              </Card>
              <Text as={"p"} >
                {product.total}&nbsp;{product.total > 1 ? 'days data' : 'day data'}
              </Text>
            </HorizontalStack>
          </Card>
          <HorizontalStack blockAlign="center" gap={"5"}>
            <Card padding={"5"} >
              <Text as={"h2"} variant="headingLg">
                Inventory
              </Text>
              <br />
              <Text as={"h6"} >
                Out of stock days: {product.out_stock}
              </Text>
              <Text as={"h6"} >
                Available In Stock Days: {product.total - product.out_stock}
              </Text>
              <Text as={"h6"} >
                Remaining stocks: {product.inventory || 0}
              </Text>
            </Card>
            <Card padding={"5"} >
              <Text as={"h2"} variant="headingLg">
                Sale
              </Text>
              <br />
              <Text as={"h6"} >
                Average sale: {parseFloat(
                // @ts-ignore
                (product.buy / product.total) * 100).toFixed(2)} %
              </Text>
              <Text as={"h6"} >
                Total sale: {product.buy || 0}
              </Text>
              <Text as={"h6"} >
                &nbsp;
              </Text>
            </Card>
          </HorizontalStack>
        </VerticalStack>
      </Layout.Section>
    </Layout>
  </Page>
}
