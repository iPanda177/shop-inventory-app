import {json} from "@remix-run/node";
import {readFile} from "node:fs/promises";
export async function loader() {
  const filePath = __dirname.split('/').slice(0, -1).join('/') + '/public/xls_analytic.xlsx';
  console.log(filePath)
  const fileData = await readFile(filePath);
  const result = fileData.toString('base64url');

  return json({
    name: 'xls_analytic.xlsx',
    data: result
  }, {
    headers: {
      'Content-Disposition': `attachment; filename="xls_analytic.xlsx"`,
      'Content-Type': 'application/octet-stream',
    },
  })
}
