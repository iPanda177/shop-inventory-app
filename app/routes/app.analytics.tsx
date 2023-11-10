// @ts-nocheck
import {useState, useEffect} from "react";
import { json } from "@remix-run/node";
import {useLoaderData, Link, useSubmit, useActionData} from "@remix-run/react";
import {
  Card,
  Layout,
  Page,
  IndexFilters,
  IndexTable,
  Button,
  Text,
  Icon,
  HorizontalStack,
  Tooltip,
  Pagination,
  TextField,
  EmptySearchResult,
  Select,
  useSetIndexFiltersMode,
} from "@shopify/polaris";
import { DynamicSourceMajor, CalendarMajor, PageMajor } from '@shopify/polaris-icons';
import { authenticate } from "../shopify.server";
import {getAnalytics} from "~/services/analytics.server";

export async function loader({ request }) {
  try {
    const {session} = await authenticate.admin(request);
    const {shop} = session;

    const analytics = await getAnalytics(shop);

    return json({
      sale_data: analytics,
      store: shop,
    });
  } catch (error) {
    console.log(error);
    return json({ status: false, error: error }, { status: 500 });
  }
}

export async function action({ request }) {
  const { store, start, endDate, skip, limitValue, sort, resetPage } = {
    ...Object.fromEntries(await request.formData()),
  }

  const result = await getAnalytics(store, start, endDate, skip, limitValue, sort, resetPage)

  return json({ sale_data: result, store }, { status: 200} );
}

export default function Analytics() {
  const { sale_data, store } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const [sales, setSale] = useState(sale_data.sale);
  const [total, setTotal] = useState(sale_data.total);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState('10');

  useEffect(() => {
    if (actionData && actionData.sale_data) {
      const { sale, total, day, reset } = actionData.sale_data;

      if (reset === 'true') {
        setPage(1)
      }
      setSale(sale)
      setTotal(total)
      setDaterange(day)

      document.getElementById("loading_data").style.display = "none";
      document.getElementById("show_data").style.display = "block";
    }
  }, [actionData]);

  const options = [
    { label: '10', value: '10' },
    { label: '25', value: '25' },
    { label: '50', value: '50' },
    { label: '100', value: '100' },
    { label: '200', value: '200' },
  ];
  const sortOptions = [
    { label: 'Overall Sale', value: 'buy asc', directionLabel: 'Ascending' },
    { label: 'Overall Sale', value: 'buy desc', directionLabel: 'Descending' },
    { label: 'Average Sale', value: 'average_sale asc', directionLabel: 'Ascending' },
    { label: 'Average Sale', value: 'average_sale desc', directionLabel: 'Descending' },
    { label: 'Out of Stock Days', value: 'out_stock asc', directionLabel: 'Ascending' },
    { label: 'Out of Stock Days', value: 'out_stock desc', directionLabel: 'Descending' },
    { label: 'In Stock Days', value: 'available_stock asc', directionLabel: 'Ascending' },
    { label: 'In Stock Days', value: 'available_stock desc', directionLabel: 'Descending' },
  ];

  const [sortSelected, setSortSelected] = useState(['buy asc']);
  const [selected, setSelected] = useState(1);
  const { mode, setMode } = useSetIndexFiltersMode();

  function truncate(str) {
    const n = 25;
    return str.length > n ? str.substr(0, n - 1) + "…" : str;
  }
  let sr_no = 1;
  let inputDate = new Date().toISOString().split('T')[0];
  const today = new Date()
  const [date_start, setDatestart] = useState(new Date(new Date(today.setMonth(today.getMonth() - 1))).toISOString().split('T')[0]);
  const [date_to, setDateto] = useState(inputDate);
  const [date_range, setDaterange] = useState(sale_data.day);
  const [error_html_msg, setError_html_msg] = useState('');

  async function takeAnalytics(limitValue, skip, sort, resetPage = true) {
    document.getElementById("loading_data").style.display = "block";
    document.getElementById("show_data").style.display = "none";
    setError_html_msg()
    try {
      const start = document.getElementById("date_start").value
      const endDate = document.getElementById("date_to").value
      const data = {
        store,
        start,
        endDate,
        skip: Number(skip),
        limitValue: Number(limitValue),
        sort: sort[0],
        resetPage
      };

      submit(data, { method: "post" });
    } catch (error) {
      console.log("getAnalytics error", error)
    }
  }

  async function dateRange(e) {
    takeAnalytics(limit, 0, sortSelected)
  }

  const paging = async (i) => {
    if (i <= 0) {
      setPage(1)
      return
    }

    if (i === 0) {
      setPage(1)
      i = 1
    }

    const skip = limit * (i - 1);
    const allpage = total ? Math.ceil(total / limit) : 0

    if (skip > total) {
      setPage(allpage)
      return
    }

    if (!allpage) {
      return
    }

    document.getElementById("loading_data").style.display = "block";
    document.getElementById("show_data").style.display = "none";

    takeAnalytics(Number(limit), Number(skip), sortSelected, false)
  }

  async function csv_download() {
    try {
      const getDoc = await fetch('/app/doc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store,
          date_start,
          date_to,
          skip: Number(0),
          limit: Number(limit),
          sort: sortSelected[0],
          fileType: 'csv'
        }),
      })

      const { csv_file } = await getDoc.json();
      console.log(csv_file)

      if (!getDoc.status) {
        alert(getDoc.error)
        return
      }

      const base64doc = await fetch(csv_file.csvUrl).then(res => res.json())
      console.log(base64doc);

      const { name, data } = base64doc;
      let mime = 'octet-stream';
      let bstr = atob(data);
      let n = bstr.length;
      let u8arr = new Uint8Array(n);

      while(--n) {
        u8arr[n] = bstr.charCodeAt(n);
      }

      const file = new File([u8arr], name,{type:mime});

      const href = URL.createObjectURL(file);

      const a = document.createElement('a')
      a.href = href;
      a.download = name;
      a.click()

    } catch (error) {
      console.log("download", error)
    }
  }

  async function excel_download() {
    try {
      const getDoc = await fetch('/app/doc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store,
          date_start,
          date_to,
          skip: Number(0),
          limit: Number(limit),
          sort: sortSelected[0],
          fileType: 'xlsx'
        }),
      })

      const { csv_file } = await getDoc.json();
      console.log(csv_file)

      if (!getDoc.status) {
        alert(getDoc.error)
        return
      }

      const base64doc = await fetch(csv_file.csvUrl).then(res => res.json())
      console.log(base64doc);

      const { name, data } = base64doc;
      let mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      // let bstr = atob(data);
      // let n = bstr.length;
      // let u8arr = new Uint8Array(n);
      //
      // while(--n) {
      //   u8arr[n] = bstr.charCodeAt(n);
      // }

      const file = new File([base64doc], name,{type:mime});

      const href = URL.createObjectURL(file);

      const a = document.createElement('a')
      a.href = href;
      a.download = name;
      a.click()

    } catch (error) {
      console.log("download", error)
    }
  }

  const handleSelectChange = async (value) => {
    setLimit(value)
    const sort = document.getElementById("sortInventory").value
    takeAnalytics(value, 0, [sort])
    const newItemsStrings = tabs.map((item, idx) => {
      if (idx === 0) {
        return (<Select
          options={options}
          onChange={handleSelectChange}
          value={value}
        />);
      }
      return item.content;
    });
    setItemStrings(newItemsStrings)
  }

  const onHandleCancel = () => { };

  let limithtml = (<Select
    options={options}
    onChange={handleSelectChange}
    value={limit}
  />)

  const [itemStrings, setItemStrings] = useState([
    limithtml,
  ]);

  const tabs = itemStrings.map((item, index) => ({
    content: item,
    index,
    onAction: () => {
      setSelected(1)
    }
  }));

  const primaryAction = {
    type: 'save',
    onAction: onHandleCancel,
    disabled: false,
    loading: false,
  };

  const sorting = (value) => {
    setSortSelected(value)
    takeAnalytics(limit, 0, value)
    document.querySelector('.Polaris-IndexFilters-FilterButton').click();
  }

  const all_product_sales = sales && sales.length ? (
    <>
      <IndexFilters
        sortOptions={sortOptions}
        sortSelected={sortSelected}
        onSort={sorting}
        primaryAction={primaryAction}
        cancelAction={{
          onAction: onHandleCancel,
          disabled: false,
          loading: false,
        }}
        canCreateNewView={false}
        tabs={tabs}
        selected={selected}
        onSelect={setSelected}
        filters={[]}
        appliedFilters={[]}
        onClearAll={() => { }}
        mode={mode}
        setMode={{}}
        hideFilters
        hideQueryField
      />
      <IndexTable
        resourceName={{
          singular: "sale",
          plural: "sales",
        }}
        itemCount={sales.length}
        headings={[
          { title: "Sr No." },
          { title: "Product name" },
          { title: "Variant" },
          { title: "Unit Sold" },
          { title: "Unit Sold per Day" },
          { title: "Out of Stock Days" },
          { title: "In Stock Days" },
          { title: "Lead Time" },
          { title: "Days of Stock" },
          { title: "Inventory Countdown" },
          { title: "Inventory Level" },
          { title: "Incoming Inventory" },
          { title: "Reorder Qty" },
        ]}
        selectable={false}
      >
        {sales.map(
          ({
             _id,
             title,
             product_id,
             variant_id,
             variant_title,
             updatedAt,
             buy,
             inventory,
             average_sale,
             out_stock,
             available_stock
           }, index) => {
            return (
              <IndexTable.Row
                id={_id}
                key={_id}
                position={index}>
                <IndexTable.Cell>
                  {(limit * page - limit) + sr_no++}
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Tooltip content={title}>
                    <Link to={`../product/${variant_id}`}>{truncate(title)}</Link>
                  </Tooltip>
                </IndexTable.Cell>
                <IndexTable.Cell>{variant_title || 'Default'}</IndexTable.Cell>
                <IndexTable.Cell>{truncate(buy)}</IndexTable.Cell>
                <IndexTable.Cell>{parseFloat(average_sale).toFixed(2)}</IndexTable.Cell>
                <IndexTable.Cell>{out_stock}</IndexTable.Cell>
                <IndexTable.Cell>{0}</IndexTable.Cell>
                <IndexTable.Cell>{0}</IndexTable.Cell>
                <IndexTable.Cell>{0}</IndexTable.Cell>
                <IndexTable.Cell>{0}</IndexTable.Cell>
                <IndexTable.Cell>{0}</IndexTable.Cell>
                <IndexTable.Cell>{0}</IndexTable.Cell>
                <IndexTable.Cell>{0}</IndexTable.Cell>
              </IndexTable.Row>
            );
          }
        )}
      </IndexTable>
      <Card>
        <Button size="slim" primary onClick={csv_download}> Export Csv</Button>
        &nbsp;
        <Button size="slim" primary onClick={excel_download}> Export Excel</Button>
      </Card>
    </>
  ) : <Card><EmptySearchResult
    title={'No Data Found'}
    description={'Try changing the filters or search term'}
    withIllustration
  />
  </Card>;

  return (
    <Page>
      <ui-title-bar title="Analytics" />
      <Layout>
        <Layout.Section>
          <Card>
            <HorizontalStack align="start" blockAlign="center" gap={"10"}>
              <HorizontalStack blockAlign="center" gap={"2"}>
                <TextField type="date" id="date_start" value={date_start} onChange={setDatestart} max={inputDate}></TextField>
                <TextField type="date" id="date_to" value={date_to} onChange={setDateto} max={inputDate}></TextField>
                <Button size="slim" primary onClick={dateRange}>
                  Go
                </Button>
              </HorizontalStack>
              <HorizontalStack blockAlign="center" ><Icon source={CalendarMajor} />{date_range} days</HorizontalStack>
              <HorizontalStack blockAlign="center" ><Icon source={DynamicSourceMajor} />Total: {total}</HorizontalStack>
              <HorizontalStack blockAlign="center"><Icon source={PageMajor} />  Current Page: {page}</HorizontalStack>
              <HorizontalStack blockAlign="center">
                <input type="text" id="sortInventory" value={sortSelected} hidden />
              </HorizontalStack>
              <HorizontalStack >
                <Pagination
                  hasPrevious
                  onPrevious={() => {
                    setPage(page - 1)
                    paging(page - 1)
                  }}
                  hasNext
                  onNext={() => {
                    setPage(page + 1)
                    paging(page + 1)
                  }}
                />
              </HorizontalStack>

            </HorizontalStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Text as="span" style={{
            padding: '10px'
          }}>
            {error_html_msg}
          </Text>
          <div id="loading_data" style={{ display: 'none' }}>
            <HorizontalStack align="center">
              <img src="https://i.gifer.com/ZKZg.gif" width="100" />
            </HorizontalStack>
          </div>
          <div id="show_data">
            <Card padding={"0"}>
              {all_product_sales}
            </Card>
          </div>
        </Layout.Section>
      </Layout>
    </Page >
  )
}
