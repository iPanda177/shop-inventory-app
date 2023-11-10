import * as path from "path";
// @ts-ignore
import xl from "excel4node";
import {createObjectCsvWriter} from "csv-writer";

export function dateDifference(date1: any, date2: any) {
  return Math.ceil((date2.getTime() - date1.getTime()) / (1000 * 3600 * 24));
}

export function sortData(data: any, sortCriteria: any) {
  switch (sortCriteria) {
    case "buy asc":
      return data.sort((a: any, b: any) => a.buy - b.buy);
    case "buy desc":
      return data.sort((a: any, b: any) => b.buy - a.buy);
    case "average_sale asc":
      return data.sort((a: any, b: any) => a.average_sale - b.average_sale);
    case "average_sale desc":
      return data.sort((a: any, b: any) => b.average_sale - a.average_sale);
    case "out_stock asc":
      return data.sort((a: any, b: any) => a.out_stock - b.out_stock);
    case "out_stock desc":
      return data.sort((a: any, b: any) => b.out_stock - a.out_stock);
    case "available_stock asc":
      return data.sort((a: any, b: any) => a.available_stock - b.available_stock);
    case "available_stock desc":
      return data.sort((a: any, b: any) => b.available_stock - a.available_stock);
    default:
      return data;
  }
}

export async function csvGenerate(jsonArray: any, header: any) {
  const data = jsonArray;

  const filePath = path.join(__dirname, `../public`)
  let csv_file = `${filePath}/csv_analytic.csv`

  const csvWriter = createObjectCsvWriter({
    path: csv_file,
    header,
  });

  try {
    await csvWriter.writeRecords(data)
    console.log('Export file successfully written.');

    return { status: true, csvUrl: `${process.env.SHOPIFY_APP_URL}/csv` };

  } catch (error) {
    console.log(error)
    return { status: false, error: 'Error writing CSV file' }
  }
}

export async function excelGenerate(jsonArray: any, headingColumnNames: any) {
  const wb = new xl.Workbook();
  const ws = wb.addWorksheet('Worksheet Name');

  let headingColumnIndex = 1;
  headingColumnNames.forEach((heading: any) => {
    ws.cell(1, headingColumnIndex++)
      .string(heading)
  });

  let rowIndex = 2;
  jsonArray.forEach((record: any) => {
    Object.keys(record).forEach(columnName => {
      let data = record[columnName].toString();
      if(columnName === 'product_title'){
        ws.cell(rowIndex, 1).string(data)
      }else if(columnName === 'variant_title'){
        ws.cell(rowIndex, 2).string(data)
      }else if(columnName === 'buy'){
        ws.cell(rowIndex, 3).string(data)
      }else if(columnName === 'average_sale'){
        ws.cell(rowIndex, 4).string(data)
      }else if(columnName === 'out_stock'){
        ws.cell(rowIndex, 5).string(data)
      }else if(columnName === 'avialable_stock'){
        ws.cell(rowIndex, 6).string(data)
      }

    });
    rowIndex++;
  });
  const filePath = path.join(__dirname, `../public`)
  await wb.write(`${filePath}/xls_analytic.xlsx`);
  return { status: true, csvUrl: `${process.env.SHOPIFY_APP_URL}/xlsx` };
}

export async function getAnalytics(shop: string, date_start: any, date_to: any, skip: any, limit: any, sort: any, reset: boolean) {
  try {
    console.log(skip, limit)
    const today = new Date();
    const skip_data = Number(skip || 0);
    const show_data = Number(limit || 10);
    date_start = date_start ? new Date(date_start) :
      new Date(new Date(new Date(today.setMonth(today.getMonth() - 1)).setHours(0, 0, 0, 0)).toISOString().split('T')[0])
    date_start = new Date(date_start.setHours(0, 0, 0, 0))

    let date_end = date_to ? new Date(date_to) : new Date();
    date_end = new Date(date_end.setHours(24, 0, 0, 0))

    let total_days = dateDifference(date_start, date_end);

    if (dateDifference(date_start, date_end) < 0) {
      return false;
    }

    const analytics = await prisma.product.findMany({
      where: {
        store: shop,
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
    const sliced = sorting.slice(skip_data, skip_data + show_data);

    return {
      sale: sliced,
      day: total_days > 0 ? total_days : 0,
      total: analytics.length,
      reset: reset
    }
  } catch (err: any) {
    return {
      status: false,
      message: err.message,
    };
  }
}

// export async function createDoc(
//   store: string,
//   date_start: any,
//   date_to: any,
//   limit: any,
//   skip: any,
//   sort: any,
//   fileType: any
// ) {
//   try {
//     if (!store) {
//       return false;
//     }
//
//     const today = new Date()
//     const skip_data = skip || 0;
//     const show_data = limit || 10;
//     date_start = date_start ? new Date(date_start) :
//       new Date(new Date(today.setMonth(today.getMonth() - 1)).setHours(0, 0, 0, 0))
//     date_start = new Date(date_start.setHours(0, 0, 0, 0))
//
//     let date_end = date_to ? new Date(date_to) : new Date();
//     date_end = new Date(date_end.setHours(24, 0, 0, 0));
//     let total_days = dateDifference(date_start, date_end);
//
//     if (dateDifference(date_start, date_end) < 0) {
//       return false;
//     }
//
//
//     const analytics = await prisma.product.findMany({
//       where: {
//         store: store,
//         updatedAt: {
//           gte: date_start,
//           lte: date_end
//         },
//       },
//     });
//
//
//     const sortedAnalytics = analytics
//       .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
//
//     const groupedAnalytics = sortedAnalytics
//       .reduce((result: any, product, currentIndex) => {
//         const updatedResult = result;
//
//         if (currentIndex === 0) {
//           updatedResult.id = product.id;
//           updatedResult.title = product.title;
//           updatedResult.product_id = product.product_id;
//           updatedResult.product_image = product.product_image;
//           updatedResult.variant_id = product.variant_id;
//           updatedResult.variant_title = product.variant_title;
//           updatedResult.updatedAt = product.updatedAt;
//           updatedResult.isActive = product.isActive;
//           updatedResult.inventory = product.inventory;
//           updatedResult.out_stock = 0;
//           updatedResult.buy = 0;
//         }
//         updatedResult.buy += product.buy;
//         updatedResult.out_stock += product.is_out_stock ? 1 : 0;
//
//         if (currentIndex === sortedAnalytics.length - 1) {
//           updatedResult.avialable_stock = total_days - updatedResult.out_stock;
//           updatedResult.average_sale_data = updatedResult.avialable_stock ? updatedResult.buy / updatedResult.avialable_stock : 0;
//           updatedResult.average_sale = updatedResult.average_sale_data.toFixed(2);
//         }
//
//         return updatedResult;
//       }, {});
//
//     const sorting = sortData(groupedAnalytics, sort);
//
//     const objectToFilter = {
//       _id: 0,
//       product_title: 1,
//       variant_title: 1,
//       buy: 1,
//       average_sale: 1,
//       out_stock: 1,
//       avialable_stock: 1
//     };
//
//     for (const key in sorting) {
//       // @ts-ignore
//       if (objectToFilter[key] !== 1) {
//         delete sorting[key];
//       }
//     }
//     const final_result = sorting.slice(skip_data, skip_data + show_data);
//
//     if (fileType === 'csv') {
//       const csvHead = [
//         { id: 'product_title', title: 'Product name' },
//         { id: 'variant_title', title: 'Variant' },
//         { id: 'buy', title: 'Overall Sale' },
//         { id: 'average_sale', title: 'Average Sale' },
//         { id: 'out_stock', title: 'Out of Stock Days' },
//         { id: 'available_stock', title: 'Available In Stock Days' },
//       ]
//
//       const csv_file = await csvGenerate(final_result, csvHead)
//       return csv_file;
//     } else {
//       const csvHead = [
//         'Product name',
//         'Variant',
//         'Overall Sale',
//         'Average Sale',
//         'Out of Stock Days',
//         'Available In Stock Days',
//       ]
//
//       const csv_file = await excelGenerate(final_result, csvHead)
//       return csv_file;
//     }
//   } catch (error) {
//     console.error('Error writing CSV file:', error);
//     return false;
//  }
// }
