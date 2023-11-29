# Shop Inventory app using Remix and Prisma

## Create a .env file in the root directory with the following content:
```
DATABASE_URL=your mongodb url (only for prod)
SHOPIFY_API_KEY=app api key
SHOPIFY_API_SECRET=app api secret
SCOPES=read_products,write_products,read_orders,write_orders,read_inventory,write_inventory
SHOPIFY_APP_URL=your app url (only for prod)
```

## For local development:

Switch prisma schema for local development by uncommenting the dev sqlite datasource and commenting mongodb `prisma/schema.prisma`:
```
// datasource db {
//   provider = "mongodb"
//   url      = env("DATABASE_URL")
// }

datasource db {
  provider = "sqlite"
  url      = "file:./dev.sqlite"
}
```

Switch id field types in all models from mongodb style to sqlite:
```
model Session {
  // session_id  String    @id @default(auto()) @map("_id") @db.ObjectId  --- uncomment for prod
  id          String    @unique   --- uncomment for local
}
```

use next command for start:
```
npm run dev
```

## For production:

Switch prisma schema for production by uncommenting the mongodb datasource and commenting sqlite `prisma/schema.prisma`:
```
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

// datasource db {
//   provider = "sqlite"
//   url      = "file:./dev.sqlite"
// }
```

Switch id field types in all models from sqlite style to mongodb:
```
model Session {
  session_id  String    @id @default(auto()) @map("_id") @db.ObjectId  --- uncomment for prod
  // id          String    @unique   --- uncomment for local
}
```

use next commands for start:
```
npm run build
npm run start
```

