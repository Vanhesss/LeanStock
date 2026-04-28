const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Deterministic UUIDs for seed data
const LOC_MEGA     = '10000000-0000-0000-0000-000000000001';
const LOC_DOSTYK   = '10000000-0000-0000-0000-000000000002';
const LOC_KERUEN   = '10000000-0000-0000-0000-000000000003';
const LOC_WAREHOUSE = '10000000-0000-0000-0000-000000000004';
const BRAND_NIKE   = '20000000-0000-0000-0000-000000000001';
const BRAND_ADIDAS = '20000000-0000-0000-0000-000000000002';
const BRAND_NB     = '20000000-0000-0000-0000-000000000003';

async function main() {
  console.log('🌱 Seeding database...');

  // --- Locations ---
  const locations = await Promise.all([
    prisma.location.create({
      data: { id: LOC_MEGA, tenantId: TENANT_ID, name: 'Mega Alma-Ata Store', type: 'STORE', address: 'Rozybakiev St 247', city: 'Almaty' },
    }),
    prisma.location.create({
      data: { id: LOC_DOSTYK, tenantId: TENANT_ID, name: 'Dostyk Plaza Store', type: 'STORE', address: 'Samal-2 111', city: 'Almaty' },
    }),
    prisma.location.create({
      data: { id: LOC_KERUEN, tenantId: TENANT_ID, name: 'Keruen Store', type: 'STORE', address: 'Bukhar Zhyrau 53', city: 'Astana' },
    }),
    prisma.location.create({
      data: { id: LOC_WAREHOUSE, tenantId: TENANT_ID, name: 'Central Warehouse', type: 'WAREHOUSE', address: 'Industrial Zone 5', city: 'Almaty' },
    }),
  ]);

  // --- Users ---
  const hashedPass = await bcrypt.hash('Password123!', 12);

  await Promise.all([
    prisma.user.create({
      data: { tenantId: TENANT_ID, email: 'admin@leanstock.kz', password: hashedPass, firstName: 'Arman', lastName: 'Bekturov', role: 'ADMIN' },
    }),
    prisma.user.create({
      data: { tenantId: TENANT_ID, email: 'manager@leanstock.kz', password: hashedPass, firstName: 'Dana', lastName: 'Omarova', role: 'MANAGER', locationId: LOC_MEGA },
    }),
    prisma.user.create({
      data: { tenantId: TENANT_ID, email: 'staff@leanstock.kz', password: hashedPass, firstName: 'Baurzhan', lastName: 'Kasymov', role: 'STAFF', locationId: LOC_MEGA },
    }),
  ]);

  // --- Brands ---
  await Promise.all([
    prisma.brand.create({ data: { id: BRAND_NIKE, tenantId: TENANT_ID, name: 'Nike' } }),
    prisma.brand.create({ data: { id: BRAND_ADIDAS, tenantId: TENANT_ID, name: 'Adidas' } }),
    prisma.brand.create({ data: { id: BRAND_NB, tenantId: TENANT_ID, name: 'New Balance' } }),
  ]);

  // --- Products & Variants ---
  const productsData = [
    { brandId: BRAND_NIKE, model: 'Air Max 90', colorway: 'White/Black', msrpPrice: 65000, sizes: [38, 39, 40, 41, 42, 43, 44] },
    { brandId: BRAND_NIKE, model: 'Air Force 1', colorway: 'Triple White', msrpPrice: 55000, sizes: [39, 40, 41, 42, 43, 44, 45] },
    { brandId: BRAND_ADIDAS, model: 'Samba OG', colorway: 'Core Black', msrpPrice: 48000, sizes: [38, 39, 40, 41, 42, 43] },
    { brandId: BRAND_NB, model: '550', colorway: 'White/Green', msrpPrice: 52000, sizes: [39, 40, 41, 42, 43, 44] },
  ];

  for (const p of productsData) {
    const product = await prisma.product.create({
      data: {
        tenantId: TENANT_ID,
        brandId: p.brandId,
        model: p.model,
        colorway: p.colorway,
        msrpPrice: p.msrpPrice,
      },
    });

    const brandPrefix = p.brandId === BRAND_NIKE ? 'NIK' : p.brandId === BRAND_ADIDAS ? 'ADI' : 'NEW';
    const modelCode = p.model.replace(/\s+/g, '').substring(0, 4).toUpperCase();
    const colorCode = p.colorway.substring(0, 3).toUpperCase();

    for (const size of p.sizes) {
      const sku = `${brandPrefix}-${modelCode}-${colorCode}-${size}`;
      const variant = await prisma.productVariant.create({
        data: { productId: product.id, sku, size },
      });

      // Add inventory at each store location
      for (const loc of locations) {
        const qty = loc.type === 'WAREHOUSE' ? Math.floor(Math.random() * 20) + 10 : Math.floor(Math.random() * 8) + 2;
        await prisma.inventory.create({
          data: {
            tenantId: TENANT_ID,
            variantId: variant.id,
            locationId: loc.id,
            onHand: qty,
            currentPrice: p.msrpPrice,
          },
        });
      }
    }
  }

  console.log('✅ Seed complete!');
  console.log('📧 Admin:   admin@leanstock.kz / Password123!');
  console.log('📧 Manager: manager@leanstock.kz / Password123!');
  console.log('📧 Staff:   staff@leanstock.kz / Password123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
