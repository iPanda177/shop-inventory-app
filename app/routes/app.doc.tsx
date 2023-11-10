import {json, LoaderFunctionArgs} from "@remix-run/node";
import {csvGenerate, dateDifference, excelGenerate, sortData} from "~/services/analytics.server";

export async function action({ request }: LoaderFunctionArgs) {
  let { store, date_start, date_to, skip, limit, sort, fileType } = await request.json();

  try {
    if (!store) {
      return false;
    }

    const today = new Date()
    const skip_data = skip || 0;
    const show_data = limit || 10;
    date_start = date_start ? new Date(date_start) :
      new Date(new Date(today.setMonth(today.getMonth() - 1)).setHours(0, 0, 0, 0))
    date_start = new Date(date_start.setHours(0, 0, 0, 0))

    let date_end = date_to ? new Date(date_to) : new Date();
    date_end = new Date(date_end.setHours(24, 0, 0, 0));
    let total_days = dateDifference(date_start, date_end);

    if (dateDifference(date_start, date_end) < 0) {
      return false;
    }

    const analytics = await prisma.product.findMany({
      where: {
        store: store,
        updatedAt: {
          gte: date_start,
          lte: date_end
        },
      },
    });

    const productsMap: any = {};

    analytics.forEach((product) => {
      const key = product.variant_id

      if (productsMap[key]) {
        productsMap[key].buy += product.buy;
        productsMap[key].out_stock += product.is_out_stock ? 1 : 0;
        productsMap[key].available_stock = total_days - productsMap[key].out_stock;
        productsMap[key].average_sale = productsMap[key].available_stock ? productsMap[key].buy / productsMap[key].available_stock : 0;
      } else {
        productsMap[key] = {
          id: product.id,
          title: product.title,
          product_id: product.product_id,
          product_image: product.product_image,
          variant_id: product.variant_id,
          variant_title: product.variant_title,
          updatedAt: product.updatedAt,
          isActive: product.isActive,
          inventory: product.inventory,
          out_stock: product.is_out_stock ? 1 : 0,
          buy: product.buy,
        }

        productsMap[key].available_stock = total_days - productsMap[key].out_stock;
        productsMap[key].average_sale = productsMap[key].available_stock ? productsMap[key].buy / productsMap[key].available_stock : 0;
      }
    });

    const groupedAnalytics = Object.values(productsMap);
    const sorting = sortData(groupedAnalytics, sort);
    const objectToFilter = {
      id: 0,
      title: 1,
      variant_title: 1,
      buy: 1,
      average_sale: 1,
      out_stock: 1,
      available_stock: 1
    };

    for (const product of sorting) {
      for (const key in product) {
        // @ts-ignore
        if (objectToFilter[key] !== 1) {
          delete product[key];
        }
      }
    }
    const final_result = sorting.slice(skip_data, skip_data + show_data);
    console.log(final_result)

    if (fileType === 'csv') {
      const csvHead = [
        { id: 'title', title: 'Product name' },
        { id: 'variant_title', title: 'Variant' },
        { id: 'buy', title: 'Overall Sale' },
        { id: 'average_sale', title: 'Average Sale' },
        { id: 'out_stock', title: 'Out of Stock Days' },
        { id: 'available_stock', title: 'Available In Stock Days' },
      ]

      const csv_file = await csvGenerate(final_result, csvHead)
      return json({ csv_file });
    } else {
      const csvHead = [
        'Product name',
        'Variant',
        'Overall Sale',
        'Average Sale',
        'Out of Stock Days',
        'Available In Stock Days',
      ]

      const csv_file = await excelGenerate(final_result, csvHead)
      return json({ csv_file });
    }
  } catch (error) {
    console.error('Error writing CSV file:', error);
    return json({ error, status: 500 });
  }
}
