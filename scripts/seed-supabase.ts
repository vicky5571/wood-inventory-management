/**
 * scripts/seed-supabase.ts
 *
 * Automated Database Seeding Engine for Supabase Cloud Database.
 * Populates tenant, wood species catalogue, storage yards, storage lots,
 * registered suppliers, inbound manifests & line items, and outbound wood sales.
 */

import { isSupabaseConfigured, supabaseFetch } from '../src/persistence/supabase/supabase-client.ts';
import { SEED_SUPPLIERS, SEED_WOOD_SALES } from '../src/persistence/seed-data.ts';

export const SEED_SPECIES = [
  { id: 'sp-teak', tenant_id: 'default-tenant', code: 'TEAK', common_name: 'Teak / Jati (柚木)', botanical_name: 'Tectona grandis', density_kg_m3: 650.0, is_hardwood: true, notes: 'Premium tropical hardwood with exceptional weather and decay resistance.' },
  { id: 'sp-merbau', tenant_id: 'default-tenant', code: 'MRB', common_name: 'Merbau (菠萝格)', botanical_name: 'Intsia bijuga', density_kg_m3: 830.0, is_hardwood: true, notes: 'High structural durability, commonly used in flooring and heavy construction.' },
  { id: 'sp-bengkirai', tenant_id: 'default-tenant', code: 'BGK', common_name: 'Bengkirai / Balau (黄梢木)', botanical_name: 'Shorea laevis', density_kg_m3: 910.0, is_hardwood: true, notes: 'Dense outdoor decking timber with superior hardness.' },
  { id: 'sp-kamper', tenant_id: 'default-tenant', code: 'KMP', common_name: 'Kamper (樟木)', botanical_name: 'Dryobalanops aromatica', density_kg_m3: 750.0, is_hardwood: true, notes: 'Aromatic timber prized for window and door framing.' },
  { id: 'sp-mahoni', tenant_id: 'default-tenant', code: 'MHN', common_name: 'Mahoni (桃花心木)', botanical_name: 'Swietenia macrophylla', density_kg_m3: 560.0, is_hardwood: true, notes: 'Fine reddish-brown grain favored in furniture manufacturing.' },
  { id: 'sp-sengon', tenant_id: 'default-tenant', code: 'SGN', common_name: 'Sengon / Albasia (南洋楹)', botanical_name: 'Falcataria moluccana', density_kg_m3: 350.0, is_hardwood: false, notes: 'Fast-growing lightweight timber ideal for core blockboard and packing crates.' },
  { id: 'sp-sonokeling', tenant_id: 'default-tenant', code: 'SNK', common_name: 'Sonokeling / Rosewood (紫檀)', botanical_name: 'Dalbergia latifolia', density_kg_m3: 850.0, is_hardwood: true, notes: 'Exotic dark purplish wood for high-end musical instruments and veneers.' },
  { id: 'sp-ulin', tenant_id: 'default-tenant', code: 'ULN', common_name: 'Ulin / Ironwood (铁木)', botanical_name: 'Eusideroxylon zwageri', density_kg_m3: 1040.0, is_hardwood: true, notes: 'Extremely dense water-resistant timber used in marine piles and roof shingles.' },
  { id: 'sp-pinus', tenant_id: 'default-tenant', code: 'PNS', common_name: 'Pinus / Pine (松木)', botanical_name: 'Pinus merkusii', density_kg_m3: 500.0, is_hardwood: false, notes: 'Softwood lumber for indoor joinery and secondary applications.' },
  { id: 'sp-meranti', tenant_id: 'default-tenant', code: 'MRT', common_name: 'Meranti (柳安木)', botanical_name: 'Shorea leprosula', density_kg_m3: 580.0, is_hardwood: true, notes: 'Widely traded utility commercial hardwood for moulding and ply.' },
  { id: 'sp-keruing', tenant_id: 'default-tenant', code: 'KRG', common_name: 'Keruing (克隆木)', botanical_name: 'Dipterocarpus', density_kg_m3: 720.0, is_hardwood: true, notes: 'Heavy structural framing and commercial vehicle decking.' },
  { id: 'sp-kapur', tenant_id: 'default-tenant', code: 'KPR', common_name: 'Kapur (卡普木)', botanical_name: 'Dryobalanops beccarii', density_kg_m3: 760.0, is_hardwood: true, notes: 'Sturdy timber for structural external joinery.' },
  { id: 'sp-karet', tenant_id: 'default-tenant', code: 'KRT', common_name: 'Kayu Karet (橡胶木)', botanical_name: 'Hevea brasiliensis', density_kg_m3: 600.0, is_hardwood: true, notes: 'Plantation timber widely converted for solid wood panels.' },
];

export const SEED_YARDS = [
  { id: 'yard-timur', tenant_id: 'default-tenant', yard_code: 'TPK-T', name: 'TPK-Timur', description: 'Log yard facing eastern logistics dock' },
  { id: 'yard-utara', tenant_id: 'default-tenant', yard_code: 'TPK-U', name: 'TPK-Utara', description: 'Northern kiln-dry staging yard' },
  { id: 'yard-barat', tenant_id: 'default-tenant', yard_code: 'TPK-B', name: 'TPK-Barat', description: 'Western heavy hardwood depot' },
  { id: 'yard-selatan', tenant_id: 'default-tenant', yard_code: 'TPK-S', name: 'TPK-Selatan', description: 'Southern incoming inspection yard' },
];

export const SEED_LOTS = [
  { id: 'lot-kav-01', tenant_id: 'default-tenant', yard_id: 'yard-timur', lot_code: 'KAV-01', status: 'ACTIVE' },
  { id: 'lot-kav-02', tenant_id: 'default-tenant', yard_id: 'yard-timur', lot_code: 'KAV-02', status: 'ACTIVE' },
  { id: 'lot-kav-03', tenant_id: 'default-tenant', yard_id: 'yard-utara', lot_code: 'KAV-03', status: 'ACTIVE' },
  { id: 'lot-kav-04', tenant_id: 'default-tenant', yard_id: 'yard-utara', lot_code: 'KAV-04', status: 'FULL' },
  { id: 'lot-kav-05', tenant_id: 'default-tenant', yard_id: 'yard-barat', lot_code: 'KAV-05', status: 'ACTIVE' },
  { id: 'lot-kav-06', tenant_id: 'default-tenant', yard_id: 'yard-barat', lot_code: 'KAV-06', status: 'MAINTENANCE' },
  { id: 'lot-kav-07', tenant_id: 'default-tenant', yard_id: 'yard-selatan', lot_code: 'KAV-07', status: 'ACTIVE' },
  { id: 'lot-kav-08', tenant_id: 'default-tenant', yard_id: 'yard-selatan', lot_code: 'KAV-08', status: 'ACTIVE' },
];

export const SEED_MANIFESTS = [
  {
    id: 'rec-2026-10-01',
    tenant_id: 'default-tenant',
    manifest_number: 'MAN-rec-2026-10-01',
    receipt_date: '2026-10-01',
    doc_date: '2026-09-29',
    truck_plate_number: 'B 9283 TDA',
    forestry_doc_number: 'SKSHHK-2026-001',
    receipt_number: 'KW-2026-101',
    contract_number: 'CTR-JATI-01',
    supplier_id: 'spl-001',
    freight_rate_per_m3: 250000.0,
    freight_pph_rate: 2.0,
    broker_fee: 500000.0,
    payment_status: 'UNPAID',
    invoice_number: null,
    payment_date: null,
    payment_notes: null,
  },
  {
    id: 'rec-2026-10-02',
    tenant_id: 'default-tenant',
    manifest_number: 'MAN-rec-2026-10-02',
    receipt_date: '2026-10-03',
    doc_date: '2026-10-01',
    truck_plate_number: 'L 8172 UX',
    forestry_doc_number: 'SKSHHK-2026-002',
    receipt_number: 'KW-2026-102',
    contract_number: 'CTR-MRB-04',
    supplier_id: 'spl-002',
    freight_rate_per_m3: 320000.0,
    freight_pph_rate: 2.0,
    broker_fee: 750000.0,
    payment_status: 'UNPAID',
    invoice_number: null,
    payment_date: null,
    payment_notes: null,
  },
  {
    id: 'rec-2026-10-03',
    tenant_id: 'default-tenant',
    manifest_number: 'MAN-rec-2026-10-03',
    receipt_date: '2026-10-05',
    doc_date: '2026-10-04',
    truck_plate_number: 'AD 1459 CF',
    forestry_doc_number: 'DKP-SLK-8821',
    receipt_number: 'KW-2026-103',
    contract_number: 'CTR-MHN-02',
    supplier_id: 'spl-003',
    freight_rate_per_m3: 180000.0,
    freight_pph_rate: 2.0,
    broker_fee: 300000.0,
    payment_status: 'UNPAID',
    invoice_number: null,
    payment_date: null,
    payment_notes: null,
  },
  {
    id: 'rec-2026-10-04',
    tenant_id: 'default-tenant',
    manifest_number: 'MAN-rec-2026-10-04',
    receipt_date: '2026-10-08',
    doc_date: '2026-10-07',
    truck_plate_number: 'K 9102 HC',
    forestry_doc_number: 'DKP-SLK-9011',
    receipt_number: 'KW-2026-104',
    contract_number: 'CTR-SGN-09',
    supplier_id: 'spl-004',
    freight_rate_per_m3: 120000.0,
    freight_pph_rate: 2.0,
    broker_fee: 200000.0,
    payment_status: 'UNPAID',
    invoice_number: null,
    payment_date: null,
    payment_notes: null,
  },
];

export const SEED_ITEMS = [
  {
    id: 'itm-001',
    manifest_id: 'rec-2026-10-01',
    tenant_id: 'default-tenant',
    item_sequence: 1,
    species_id: 'sp-teak',
    lot_id: 'lot-kav-01',
    wood_length_m: 4.0,
    delivered_pieces: 88,
    delivered_volume_m3: 15.2000,
    tally_pieces: 85,
    tally_volume_m3: 14.6500,
    timber_price_per_m3: 4200000.0,
    timber_pph_rate: 0.5,
    notes: 'Kayu log utuh, diameter rata-rata 32cm, tanpa cacat belah.',
  },
  {
    id: 'itm-002',
    manifest_id: 'rec-2026-10-02',
    tenant_id: 'default-tenant',
    item_sequence: 1,
    species_id: 'sp-merbau',
    lot_id: 'lot-kav-03',
    wood_length_m: 5.0,
    delivered_pieces: 60,
    delivered_volume_m3: 21.0000,
    tally_pieces: 58,
    tally_volume_m3: 20.4500,
    timber_price_per_m3: 5800000.0,
    timber_pph_rate: 0.5,
    notes: 'Kualitas A-Grade, kandungan getah normal, siap masuk sawmill.',
  },
  {
    id: 'itm-003',
    manifest_id: 'rec-2026-10-03',
    tenant_id: 'default-tenant',
    item_sequence: 1,
    species_id: 'sp-mahoni',
    lot_id: 'lot-kav-05',
    wood_length_m: 3.5,
    delivered_pieces: 110,
    delivered_volume_m3: 18.5000,
    tally_pieces: 108,
    tally_volume_m3: 18.1200,
    timber_price_per_m3: 2900000.0,
    timber_pph_rate: 0.5,
    notes: 'Kayu bundar mulus, 2 batang terindikasi lubang jarum ringan.',
  },
  {
    id: 'itm-004',
    manifest_id: 'rec-2026-10-04',
    tenant_id: 'default-tenant',
    item_sequence: 1,
    species_id: 'sp-sengon',
    lot_id: 'lot-kav-07',
    wood_length_m: 2.6,
    delivered_pieces: 145,
    delivered_volume_m3: 22.8000,
    tally_pieces: 142,
    tally_volume_m3: 22.3000,
    timber_price_per_m3: 1350000.0,
    timber_pph_rate: 0.5,
    notes: 'Kayu rakyat lokal, kadar air tinggi, langsung diarahkan ke kiln-dry.',
  },
];

export async function seedSupabaseDatabase(): Promise<{
  tenants: number;
  species: number;
  yards: number;
  lots: number;
  suppliers: number;
  manifests: number;
  items: number;
  sales: number;
}> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase environment variables are missing.');
  }

  // 1. Seed Tenant
  await supabaseFetch('/tenants', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: JSON.stringify({
      id: 'default-tenant',
      name: 'Factory Workspace Tenant',
      slug: 'default',
    }),
  });

  // 2. Seed Species
  await supabaseFetch('/wood_species', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: JSON.stringify(SEED_SPECIES),
  });

  // 3. Seed Yards
  await supabaseFetch('/storage_yards', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: JSON.stringify(SEED_YARDS),
  });

  // 4. Seed Lots
  await supabaseFetch('/storage_lots', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: JSON.stringify(SEED_LOTS),
  });

  // 5. Seed Suppliers
  const suppliersPayload = SEED_SUPPLIERS.map((s) => ({
    id: s.id,
    tenant_id: 'default-tenant',
    code: s.code,
    name: s.name,
    contact_person: s.contactPerson || null,
    phone: s.phone || null,
    address: s.address || null,
    tax_id_npwp: s.taxId || null,
    is_active: true,
    notes: s.notes || null,
  }));
  await supabaseFetch('/suppliers', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: JSON.stringify(suppliersPayload),
  });

  // 6. Seed Inbound Manifests
  await supabaseFetch('/receiving_manifests', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: JSON.stringify(SEED_MANIFESTS),
  });

  // 7. Seed Inbound Items
  await supabaseFetch('/receiving_items', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: JSON.stringify(SEED_ITEMS),
  });

  // 8. Seed Outbound Sales Records
  const salesPayload = SEED_WOOD_SALES.map((sale) => ({
    id: sale.id,
    sale_date: sale.saleDate,
    delivery_order_number: sale.deliveryOrderNumber,
    truck_plate_number: sale.truckPlateNumber,
    driver_name: sale.driverName || null,
    customer_name: sale.customerName,
    storage_yard: sale.storageYard,
    kavling_number: sale.kavlingNumber,
    wood_species: sale.woodSpecies,
    pieces: Number(sale.pieces),
    volume_m3: Number(sale.volumeM3),
    price_per_m3: Number(sale.pricePerM3),
    total_price: Number(sale.totalPrice),
    payment_status: sale.paymentStatus || 'UNPAID',
    invoice_number: sale.invoiceNumber || null,
    notes: sale.notes || null,
  }));
  await supabaseFetch('/sales_records', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: JSON.stringify(salesPayload),
  });

  return {
    tenants: 1,
    species: SEED_SPECIES.length,
    yards: SEED_YARDS.length,
    lots: SEED_LOTS.length,
    suppliers: suppliersPayload.length,
    manifests: SEED_MANIFESTS.length,
    items: SEED_ITEMS.length,
    sales: salesPayload.length,
  };
}

// Auto-run if executed directly via node scripts/seed-supabase.ts
if (process.argv[1]?.endsWith('seed-supabase.ts')) {
  // Load .env.local if present
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [k, ...v] = trimmed.split('=');
          process.env[k.trim()] = v.join('=').trim();
        }
      }
    }
  } catch {}

  console.log('Seeding Supabase project at:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  seedSupabaseDatabase()
    .then((stats) => {
      console.log('Successfully seeded Supabase database:');
      console.table(stats);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Failed to seed Supabase database:', err);
      process.exit(1);
    });
}
