import {json} from "@remix-run/node";
import {readFile} from "node:fs/promises";
export async function loader() {
  const filePath = __dirname.split('/').slice(0, -1).join('/') + '/public/csv_analytic.csv';
  console.log(filePath)
  const fileData = await readFile(filePath);
  const result = fileData.toString('base64url');

  return json({
    name: 'csv_analytic.csv',
    data: result
  }, {
    headers: {
          'Content-Disposition': `attachment; filename="csv_analytic.csv"`,
          'Content-Type': 'application/octet-stream',
        },
  })
}
