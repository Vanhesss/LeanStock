const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Deterministic UUIDs
const LOC_MEGA      = '10000000-0000-0000-0000-000000000001';
const LOC_DOSTYK    = '10000000-0000-0000-0000-000000000002';
const LOC_KERUEN    = '10000000-0000-0000-0000-000000000003';
const LOC_ESENTAI   = '10000000-0000-0000-0000-000000000005';
const LOC_WAREHOUSE = '10000000-0000-0000-0000-000000000004';

const BRAND_NIKE   = '20000000-0000-0000-0000-000000000001';
const BRAND_ADIDAS = '20000000-0000-0000-0000-000000000002';
const BRAND_NB     = '20000000-0000-0000-0000-000000000003';
const BRAND_PUMA   = '20000000-0000-0000-0000-000000000004';
const BRAND_REEBOK = '20000000-0000-0000-0000-000000000005';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('Seeding database...');

  // Skip if already seeded
  const existingLocations = await prisma.location.findMany({ where: { tenantId: TENANT_ID } });
  if (existingLocations.length > 0) {
    console.log('Database already seeded, skipping.');
    return;
  }

  // --- Locations ---
  const locations = await Promise.all([
    prisma.location.create({
      data: { id: LOC_MEGA, tenantId: TENANT_ID, name: 'Mega Alma-Ata', type: 'STORE', address: 'Rozybakiev St 247A', city: 'Almaty' },
    }),
    prisma.location.create({
      data: { id: LOC_DOSTYK, tenantId: TENANT_ID, name: 'Dostyk Plaza', type: 'STORE', address: 'Samal-2 111', city: 'Almaty' },
    }),
    prisma.location.create({
      data: { id: LOC_ESENTAI, tenantId: TENANT_ID, name: 'Esentai Mall', type: 'STORE', address: 'Al-Farabi Ave 77/7', city: 'Almaty' },
    }),
    prisma.location.create({
      data: { id: LOC_KERUEN, tenantId: TENANT_ID, name: 'Keruen City', type: 'STORE', address: 'Bukhar Zhyrau 53', city: 'Astana' },
    }),
    prisma.location.create({
      data: { id: LOC_WAREHOUSE, tenantId: TENANT_ID, name: 'Central Warehouse', type: 'WAREHOUSE', address: 'Industrial Zone 5, Kargaly', city: 'Almaty' },
    }),
  ]);
  const storeLocations = locations.filter(l => l.type === 'STORE');

  // --- Users ---
  const hashedPass = await bcrypt.hash('Password123!', 12);

  const [adminUser, managerMega, managerDostyk, managerKeruen, staffMega, staffDostyk, staffKeruen, testUser] = await Promise.all([
    prisma.user.create({
      data: { tenantId: TENANT_ID, email: 'admin@leanstock.kz', password: hashedPass, firstName: 'Arman', lastName: 'Bekturov', role: 'ADMIN', isEmailVerified: true },
    }),
    prisma.user.create({
      data: { tenantId: TENANT_ID, email: 'manager@leanstock.kz', password: hashedPass, firstName: 'Dana', lastName: 'Omarova', role: 'MANAGER', locationId: LOC_MEGA, isEmailVerified: true },
    }),
    prisma.user.create({
      data: { tenantId: TENANT_ID, email: 'manager.dostyk@leanstock.kz', password: hashedPass, firstName: 'Asel', lastName: 'Nurbekova', role: 'MANAGER', locationId: LOC_DOSTYK, isEmailVerified: true },
    }),
    prisma.user.create({
      data: { tenantId: TENANT_ID, email: 'manager.keruen@leanstock.kz', password: hashedPass, firstName: 'Ruslan', lastName: 'Akhmetov', role: 'MANAGER', locationId: LOC_KERUEN, isEmailVerified: true },
    }),
    prisma.user.create({
      data: { tenantId: TENANT_ID, email: 'staff@leanstock.kz', password: hashedPass, firstName: 'Baurzhan', lastName: 'Kasymov', role: 'STAFF', locationId: LOC_MEGA, isEmailVerified: true },
    }),
    prisma.user.create({
      data: { tenantId: TENANT_ID, email: 'staff.dostyk@leanstock.kz', password: hashedPass, firstName: 'Madina', lastName: 'Serikova', role: 'STAFF', locationId: LOC_DOSTYK, isEmailVerified: true },
    }),
    prisma.user.create({
      data: { tenantId: TENANT_ID, email: 'staff.keruen@leanstock.kz', password: hashedPass, firstName: 'Timur', lastName: 'Zhanbolatov', role: 'STAFF', locationId: LOC_KERUEN, isEmailVerified: true },
    }),
    prisma.user.create({
      data: { tenantId: TENANT_ID, email: 'abbror2006@gmail.com', password: hashedPass, firstName: 'Abbror', lastName: 'Test', role: 'ADMIN', isEmailVerified: false },
    }),
    prisma.user.create({
      data: { tenantId: TENANT_ID, email: 'kanevskiy00@gmail.com', password: hashedPass, firstName: 'Ivan', lastName: 'Kanevskiy', role: 'ADMIN', isEmailVerified: false },
    }),
    prisma.user.create({
      data: { tenantId: TENANT_ID, email: 'ivan.kanevskii@narxoz.kz', password: hashedPass, firstName: 'Ivan', lastName: 'Kanevskiy', role: 'MANAGER', locationId: LOC_MEGA, isEmailVerified: false },
    }),
    prisma.user.create({
      data: { tenantId: TENANT_ID, email: 'kanevskiy.work@mail.ru', password: hashedPass, firstName: 'Ivan', lastName: 'Kanevskiy', role: 'STAFF', locationId: LOC_DOSTYK, isEmailVerified: false },
    }),
  ]);

  const managers = [managerMega, managerDostyk, managerKeruen];
  const staffUsers = [staffMega, staffDostyk, staffKeruen];

  // --- Brands ---
  await Promise.all([
    prisma.brand.create({ data: { id: BRAND_NIKE, tenantId: TENANT_ID, name: 'Nike' } }),
    prisma.brand.create({ data: { id: BRAND_ADIDAS, tenantId: TENANT_ID, name: 'Adidas' } }),
    prisma.brand.create({ data: { id: BRAND_NB, tenantId: TENANT_ID, name: 'New Balance' } }),
    prisma.brand.create({ data: { id: BRAND_PUMA, tenantId: TENANT_ID, name: 'Puma' } }),
    prisma.brand.create({ data: { id: BRAND_REEBOK, tenantId: TENANT_ID, name: 'Reebok' } }),
  ]);

  // --- Products & Variants ---
  // Realistic KZT prices (1 USD ~ 470 KZT)
  const productsData = [
    // Nike
    { brandId: BRAND_NIKE, model: 'Air Max 90',        colorway: 'White/Black',          msrpPrice: 72900, sizes: [38, 39, 40, 41, 42, 43, 44, 45] },
    { brandId: BRAND_NIKE, model: 'Air Force 1 Low',   colorway: 'Triple White',         msrpPrice: 59900, sizes: [38, 39, 40, 41, 42, 43, 44, 45] },
    { brandId: BRAND_NIKE, model: 'Dunk Low',          colorway: 'Panda Black/White',    msrpPrice: 64900, sizes: [36, 37, 38, 39, 40, 41, 42, 43, 44] },
    { brandId: BRAND_NIKE, model: 'Air Jordan 1 Mid',  colorway: 'Chicago Black Toe',    msrpPrice: 89900, sizes: [39, 40, 41, 42, 43, 44, 45] },
    { brandId: BRAND_NIKE, model: 'Air Max 97',        colorway: 'Silver Bullet',        msrpPrice: 94900, sizes: [40, 41, 42, 43, 44, 45] },
    // Adidas
    { brandId: BRAND_ADIDAS, model: 'Samba OG',        colorway: 'Core Black/Gum',       msrpPrice: 54900, sizes: [38, 39, 40, 41, 42, 43, 44] },
    { brandId: BRAND_ADIDAS, model: 'Gazelle',         colorway: 'Collegiate Navy',      msrpPrice: 49900, sizes: [37, 38, 39, 40, 41, 42, 43] },
    { brandId: BRAND_ADIDAS, model: 'Forum Low',       colorway: 'Cloud White',          msrpPrice: 52900, sizes: [39, 40, 41, 42, 43, 44] },
    { brandId: BRAND_ADIDAS, model: 'Ultraboost 5',    colorway: 'Core Black',           msrpPrice: 99900, sizes: [40, 41, 42, 43, 44, 45] },
    // New Balance
    { brandId: BRAND_NB, model: '550',                 colorway: 'White/Green',          msrpPrice: 62900, sizes: [39, 40, 41, 42, 43, 44] },
    { brandId: BRAND_NB, model: '2002R',               colorway: 'Rain Cloud',          msrpPrice: 79900, sizes: [40, 41, 42, 43, 44, 45] },
    { brandId: BRAND_NB, model: '574 Classic',         colorway: 'Grey/Navy',            msrpPrice: 44900, sizes: [38, 39, 40, 41, 42, 43, 44] },
    { brandId: BRAND_NB, model: '530',                 colorway: 'White/Silver',         msrpPrice: 54900, sizes: [38, 39, 40, 41, 42, 43] },
    // Puma
    { brandId: BRAND_PUMA, model: 'Suede Classic',     colorway: 'Black/White',          msrpPrice: 39900, sizes: [39, 40, 41, 42, 43, 44] },
    { brandId: BRAND_PUMA, model: 'RS-X',              colorway: 'Puma White/Blue',      msrpPrice: 52900, sizes: [40, 41, 42, 43, 44] },
    // Reebok
    { brandId: BRAND_REEBOK, model: 'Club C 85',       colorway: 'Vintage White/Green',  msrpPrice: 42900, sizes: [38, 39, 40, 41, 42, 43, 44] },
    { brandId: BRAND_REEBOK, model: 'Classic Leather',  colorway: 'White/Gum',           msrpPrice: 47900, sizes: [39, 40, 41, 42, 43, 44] },
  ];

  const allInventory = []; // { variant, product, inventory, locationId, sku, size, msrpPrice }

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

    const brandName = p.brandId === BRAND_NIKE ? 'NIK' : p.brandId === BRAND_ADIDAS ? 'ADI' : p.brandId === BRAND_NB ? 'NEB' : p.brandId === BRAND_PUMA ? 'PUM' : 'RBK';
    const modelCode = p.model.replace(/\s+/g, '').substring(0, 4).toUpperCase();
    const colorCode = p.colorway.substring(0, 3).toUpperCase();

    for (const size of p.sizes) {
      const sku = `${brandName}-${modelCode}-${colorCode}-${size}`;
      const variant = await prisma.productVariant.create({
        data: { productId: product.id, sku, size },
      });

      for (const loc of locations) {
        // Warehouse has more stock, stores have varying amounts
        let qty;
        if (loc.type === 'WAREHOUSE') {
          qty = randomBetween(15, 40);
        } else {
          qty = randomBetween(1, 12);
        }

        const inventory = await prisma.inventory.create({
          data: {
            tenantId: TENANT_ID,
            variantId: variant.id,
            locationId: loc.id,
            onHand: qty,
            currentPrice: p.msrpPrice,
          },
        });

        allInventory.push({ variant, product, inventory, locationId: loc.id, sku, size, msrpPrice: p.msrpPrice });
      }
    }
  }
  console.log(`Products: ${productsData.length}, Variants: ${allInventory.length / locations.length}`);

  // --- Sample Sales (spread over 30 days, realistic volume) ---
  const storeInventory = allInventory.filter(v => v.locationId !== LOC_WAREHOUSE);
  let salesCount = 0;

  for (let day = 30; day >= 0; day--) {
    // 4-12 sales per day, fewer on older days
    const dailySales = randomBetween(4, 12);
    for (let s = 0; s < dailySales; s++) {
      const inv = storeInventory[randomBetween(0, storeInventory.length - 1)];
      const qty = Math.random() > 0.85 ? 2 : 1; // 15% chance of 2-pair sale
      const soldAt = daysAgo(day);
      soldAt.setHours(randomBetween(10, 21), randomBetween(0, 59), randomBetween(0, 59));

      // Pick a staff user for this location
      const locIdx = storeLocations.findIndex(l => l.id === inv.locationId);
      const seller = locIdx >= 0 && locIdx < staffUsers.length ? staffUsers[locIdx] : staffUsers[0];

      // Some sales at discounted prices (10-20% off)
      const discount = Math.random() > 0.7 ? randomBetween(5, 20) : 0;
      const unitPrice = Math.round(inv.msrpPrice * (1 - discount / 100));

      try {
        await prisma.sale.create({
          data: {
            tenantId: TENANT_ID,
            variantId: inv.variant.id,
            locationId: inv.locationId,
            soldBy: seller.id,
            quantity: qty,
            unitPrice,
            totalPrice: unitPrice * qty,
            soldAt,
          },
        });

        await prisma.inventory.update({
          where: { id: inv.inventory.id },
          data: {
            onHand: { decrement: qty },
            lastSoldAt: soldAt,
          },
        });

        salesCount++;
      } catch {
        // Skip if stock goes negative
      }
    }
  }
  console.log(`Sales: ${salesCount} over 30 days`);

  // --- Sample Reservations ---
  const reservationCustomers = [
    { name: 'Alibek Nurlan', phone: '+77001234567' },
    { name: 'Aisha Tulegenova', phone: '+77019876543' },
    { name: 'Dastan Serikbayev', phone: '+77055551234' },
    { name: 'Zhanna Ospanova', phone: '+77087776655' },
    { name: 'Erlan Moldabekov', phone: '+77023334455' },
  ];

  // Active reservations
  for (let i = 0; i < 4; i++) {
    const inv = storeInventory[randomBetween(0, storeInventory.length - 1)];
    const cust = reservationCustomers[i % reservationCustomers.length];
    const locIdx = storeLocations.findIndex(l => l.id === inv.locationId);
    const staff = locIdx >= 0 && locIdx < staffUsers.length ? staffUsers[locIdx] : staffUsers[0];

    try {
      await prisma.reservation.create({
        data: {
          tenantId: TENANT_ID,
          variantId: inv.variant.id,
          locationId: inv.locationId,
          reservedBy: staff.id,
          quantity: 1,
          customerName: cust.name,
          customerPhone: cust.phone,
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() + randomBetween(4, 22) * 60 * 60 * 1000),
        },
      });
      await prisma.inventory.update({
        where: { id: inv.inventory.id },
        data: { reservedQuantity: { increment: 1 } },
      });
    } catch { /* skip */ }
  }

  // Cancelled reservation
  const cancelInv = storeInventory[randomBetween(0, storeInventory.length - 1)];
  await prisma.reservation.create({
    data: {
      tenantId: TENANT_ID,
      variantId: cancelInv.variant.id,
      locationId: cancelInv.locationId,
      reservedBy: staffUsers[0].id,
      quantity: 1,
      customerName: reservationCustomers[4].name,
      customerPhone: reservationCustomers[4].phone,
      status: 'CANCELLED',
      expiresAt: daysAgo(1),
      createdAt: daysAgo(3),
    },
  });
  console.log('Reservations: 4 active, 1 cancelled');

  // --- Sample Transfers ---
  const warehouseInv = allInventory.filter(v => v.locationId === LOC_WAREHOUSE);

  // Completed transfer
  const t1Variant = warehouseInv[randomBetween(0, warehouseInv.length - 1)];
  const transfer1 = await prisma.transfer.create({
    data: {
      tenantId: TENANT_ID,
      sourceLocId: LOC_WAREHOUSE,
      destLocId: LOC_MEGA,
      requestedBy: managerMega.id,
      reviewedBy: managerMega.id,
      status: 'COMPLETED',
      note: 'Restocking bestsellers for weekend rush',
      createdAt: daysAgo(5),
      items: { create: [{ variantId: t1Variant.variant.id, quantity: 6 }] },
    },
  });

  // Pending transfer
  const t2Variant = storeInventory.find(v => v.locationId === LOC_MEGA) || storeInventory[0];
  await prisma.transfer.create({
    data: {
      tenantId: TENANT_ID,
      sourceLocId: LOC_MEGA,
      destLocId: LOC_KERUEN,
      requestedBy: managerKeruen.id,
      status: 'PENDING',
      note: 'Keruen running low on Samba OG sizes 41-43',
      items: { create: [{ variantId: t2Variant.variant.id, quantity: 3 }] },
    },
  });

  // In-transit transfer
  const t3Variant = warehouseInv.find(v => v.sku.includes('ADI')) || warehouseInv[0];
  await prisma.transfer.create({
    data: {
      tenantId: TENANT_ID,
      sourceLocId: LOC_WAREHOUSE,
      destLocId: LOC_DOSTYK,
      requestedBy: managerDostyk.id,
      reviewedBy: managerMega.id,
      status: 'IN_TRANSIT',
      note: 'Adidas restock for Dostyk Plaza',
      items: { create: [{ variantId: t3Variant.variant.id, quantity: 5 }] },
    },
  });

  // Approved transfer waiting to ship
  const t4Variant = warehouseInv[randomBetween(0, warehouseInv.length - 1)];
  await prisma.transfer.create({
    data: {
      tenantId: TENANT_ID,
      sourceLocId: LOC_WAREHOUSE,
      destLocId: LOC_ESENTAI,
      requestedBy: managerMega.id,
      reviewedBy: managerMega.id,
      status: 'APPROVED',
      note: 'Initial stock for Esentai Mall opening push',
      items: { create: [{ variantId: t4Variant.variant.id, quantity: 8 }] },
    },
  });

  console.log('Transfers: 1 completed, 1 pending, 1 in-transit, 1 approved');

  // --- Audit Logs ---
  const auditActions = [
    { action: 'CREATE_SALE', entity: 'sale', userId: staffMega.id, newValue: { quantity: 1, totalPrice: 72900 } },
    { action: 'CREATE_SALE', entity: 'sale', userId: staffDostyk.id, newValue: { quantity: 2, totalPrice: 129800 } },
    { action: 'CREATE_SALE', entity: 'sale', userId: staffMega.id, newValue: { quantity: 1, totalPrice: 54900 } },
    { action: 'RECEIVE_STOCK', entity: 'inventory', userId: managerMega.id, newValue: { quantity: 20, locationId: LOC_MEGA } },
    { action: 'RECEIVE_STOCK', entity: 'inventory', userId: managerDostyk.id, newValue: { quantity: 15, locationId: LOC_DOSTYK } },
    { action: 'ADJUST_STOCK', entity: 'inventory', userId: managerMega.id, oldValue: { onHand: 8 }, newValue: { onHand: 6, reason: 'DAMAGE', adjustment: -2 } },
    { action: 'ADJUST_STOCK', entity: 'inventory', userId: managerKeruen.id, oldValue: { onHand: 5 }, newValue: { onHand: 7, reason: 'CORRECTION', adjustment: 2 } },
    { action: 'CREATE_RESERVATION', entity: 'reservation', userId: staffMega.id, newValue: { customerName: 'Alibek Nurlan', quantity: 1 } },
    { action: 'CANCEL_RESERVATION', entity: 'reservation', userId: staffDostyk.id, oldValue: { status: 'ACTIVE' }, newValue: { status: 'CANCELLED' } },
    { action: 'CREATE_TRANSFER', entity: 'transfer', userId: managerMega.id, newValue: { from: 'Warehouse', to: 'Mega', items: 1 } },
    { action: 'APPROVE_TRANSFER', entity: 'transfer', userId: managerMega.id, newValue: { status: 'APPROVED' } },
    { action: 'CREATE_SALE', entity: 'sale', userId: staffKeruen.id, newValue: { quantity: 1, totalPrice: 89900 } },
  ];

  for (let i = 0; i < auditActions.length; i++) {
    const a = auditActions[i];
    await prisma.auditLog.create({
      data: {
        tenantId: TENANT_ID,
        userId: a.userId,
        action: a.action,
        entity: a.entity,
        entityId: transfer1.id,
        oldValue: a.oldValue || undefined,
        newValue: a.newValue,
        createdAt: new Date(Date.now() - i * 2.5 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`Audit logs: ${auditActions.length}`);

  // --- Price History (dead stock decay simulation) ---
  // Pick some slow-moving variants and simulate progressive markdowns
  const slowMovers = storeInventory
    .filter(v => v.locationId === LOC_MEGA)
    .slice(-6);

  for (const slow of slowMovers) {
    let currentPrice = slow.msrpPrice;
    const steps = randomBetween(2, 4);
    for (let i = 0; i < steps; i++) {
      const oldPrice = currentPrice;
      const markdownPct = randomBetween(8, 15);
      const newPrice = Math.round(oldPrice * (1 - markdownPct / 100));

      await prisma.priceHistory.create({
        data: {
          tenantId: TENANT_ID,
          variantId: slow.variant.id,
          locationId: LOC_MEGA,
          oldPrice,
          newPrice,
          reason: 'DEAD_STOCK_DECAY',
          appliedAt: daysAgo(20 - i * 5),
        },
      });

      currentPrice = newPrice;
    }

    // Update current price on this inventory record
    await prisma.inventory.update({
      where: { id: slow.inventory.id },
      data: { currentPrice },
    });
  }
  console.log('Price history: dead stock decay for 6 slow movers');

  console.log('\nSeed complete!');
  console.log('Admin:           admin@leanstock.kz / Password123!');
  console.log('Manager (Mega):  manager@leanstock.kz / Password123!');
  console.log('Staff (Mega):    staff@leanstock.kz / Password123!');
  console.log('Test (unverified): abbror2006@gmail.com / Password123!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
