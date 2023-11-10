export interface OrderProduct {
    store: string,
    product_id: string,
    title: string,
    buy: number,
    variant_id: string,
    variant_title: string,
    updatedAt: Date;
}

export interface Product {
    id?: string;
    store: string;
    product_id: string;
    title: string;
    product_image: string;
    isActive: boolean
    variant_id: string;
    variant_title: string;
    inventory: number;
    inventory_item_id: string | null;
    createdAt?: Date;
    updatedAt: Date;
    tracked?: boolean;
    buy?: number;
}

export interface Variant {
    "id": string,
    "title": string,
    "inventory_item_id": string | null,
    "inventory_quantity": number,
}

export interface InventoryItem {
    id: number;
    sku: string;
    created_at: string;
    updated_at: string;
    requires_shipping: boolean;
    cost: string;
    country_code_of_origin: string | null;
    province_code_of_origin: string | null;
    harmonized_system_code: string | null;
    tracked: boolean;
    country_harmonized_system_codes: string[];
    admin_graphql_api_id: string;
}

export interface ShopifyProductVariant {
    admin_graphql_api_id: string;
    barcode: string | null;
    compare_at_price: string;
    created_at: string | null;
    fulfillment_service: string;
    id: number;
    inventory_management: string;
    inventory_policy: string;
    position: number;
    price: string;
    product_id: number;
    sku: string;
    taxable: boolean;
    title: string;
    updated_at: string | null;
    option1: string;
    option2: string | null;
    option3: string | null;
    grams: number;
    image_id: number | null;
    weight: number;
    weight_unit: string;
    inventory_item_id: number | null;
    inventory_quantity: number;
    old_inventory_quantity: number;
    requires_shipping: boolean;
}

export interface ShopifyProduct {
    admin_graphql_api_id: string;
    body_html: string;
    created_at: string | null;
    handle: string;
    id: number;
    product_type: string;
    published_at: string;
    template_suffix: string | null;
    title: string;
    updated_at: string;
    vendor: string;
    status: string;
    published_scope: string;
    tags: string;
    variants: ShopifyProductVariant[];
    options: any[];
    images: any[];
    image: any;
}

export interface StaffMember {
    id: string;
    quantity: number;
}

export interface Money {
    amount: string;
    currency_code: string;
}

export interface PriceSet {
    shop_money: Money;
    presentment_money: Money;
}

export interface LineItem {
    id: number;
    admin_graphql_api_id: string;
    attributed_staffs: StaffMember[];
    fulfillable_quantity: number;
    fulfillment_service: string;
    fulfillment_status: string | null;
    gift_card: boolean;
    grams: number;
    name: string;
    price: string;
    price_set: PriceSet;
    product_exists: boolean;
    product_id: number;
    properties: any[];
    quantity: number;
    requires_shipping: boolean;
    sku: string;
    taxable: boolean;
    title: string;
    total_discount: string;
    total_discount_set: PriceSet;
    variant_id: number;
    variant_inventory_management: string;
    variant_title: string | null;
    vendor: string | null;
    tax_lines: any[];
    duties: any[];
    discount_allocations: any[];
}
export interface Order {
    line_items: LineItem[];
}

export type Payload = ShopifyProduct | InventoryItem | Order;
