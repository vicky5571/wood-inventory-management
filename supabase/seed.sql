-- ============================================================================
-- Supabase Database Seeder: Wood & Timber Inventory Management System
-- File: supabase/seed.sql
-- Description: Canonical master catalog, storage infrastructure, suppliers,
--              inbound manifests, line items, and outbound sales records.
--              Fully idempotent via ON CONFLICT clauses.
-- ============================================================================

-- 1. Default Workspace Tenant
INSERT INTO tenants (id, name, slug)
VALUES ('default-tenant', 'Factory Workspace Tenant', 'default')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  updated_at = timezone('utc'::text, now());

-- 2. Master Wood Species Catalog
INSERT INTO wood_species (id, tenant_id, code, common_name, botanical_name, density_kg_m3, is_hardwood, notes)
VALUES
  ('sp-teak', 'default-tenant', 'TEAK', 'Teak / Jati (柚木)', 'Tectona grandis', 650.0, TRUE, 'Premium tropical hardwood with exceptional weather and decay resistance.'),
  ('sp-merbau', 'default-tenant', 'MRB', 'Merbau (菠萝格)', 'Intsia bijuga', 830.0, TRUE, 'High structural durability, commonly used in flooring and heavy construction.'),
  ('sp-bengkirai', 'default-tenant', 'BGK', 'Bengkirai / Balau (黄梢木)', 'Shorea laevis', 910.0, TRUE, 'Dense outdoor decking timber with superior hardness.'),
  ('sp-kamper', 'default-tenant', 'KMP', 'Kamper (樟木)', 'Dryobalanops aromatica', 750.0, TRUE, 'Aromatic timber prized for window and door framing.'),
  ('sp-mahoni', 'default-tenant', 'MHN', 'Mahoni (桃花心木)', 'Swietenia macrophylla', 560.0, TRUE, 'Fine reddish-brown grain favored in furniture manufacturing.'),
  ('sp-sengon', 'default-tenant', 'SGN', 'Sengon / Albasia (南洋楹)', 'Falcataria moluccana', 350.0, FALSE, 'Fast-growing lightweight timber ideal for core blockboard and packing crates.'),
  ('sp-sonokeling', 'default-tenant', 'SNK', 'Sonokeling / Rosewood (紫檀)', 'Dalbergia latifolia', 850.0, TRUE, 'Exotic dark purplish wood for high-end musical instruments and veneers.'),
  ('sp-ulin', 'default-tenant', 'ULN', 'Ulin / Ironwood (铁木)', 'Eusideroxylon zwageri', 1040.0, TRUE, 'Extremely dense water-resistant timber used in marine piles and roof shingles.'),
  ('sp-pinus', 'default-tenant', 'PNS', 'Pinus / Pine (松木)', 'Pinus merkusii', 500.0, FALSE, 'Softwood lumber for indoor joinery and secondary applications.'),
  ('sp-meranti', 'default-tenant', 'MRT', 'Meranti (柳安木)', 'Shorea leprosula', 580.0, TRUE, 'Widely traded utility commercial hardwood for moulding and ply.'),
  ('sp-keruing', 'default-tenant', 'KRG', 'Keruing (克隆木)', 'Dipterocarpus', 720.0, TRUE, 'Heavy structural framing and commercial vehicle decking.'),
  ('sp-kapur', 'default-tenant', 'KPR', 'Kapur (卡普木)', 'Dryobalanops beccarii', 760.0, TRUE, 'Sturdy timber for structural external joinery.'),
  ('sp-karet', 'default-tenant', 'KRT', 'Kayu Karet (橡胶木)', 'Hevea brasiliensis', 600.0, TRUE, 'Plantation timber widely converted for solid wood panels.')
ON CONFLICT (code) DO UPDATE SET
  common_name = EXCLUDED.common_name,
  botanical_name = EXCLUDED.botanical_name,
  density_kg_m3 = EXCLUDED.density_kg_m3,
  is_hardwood = EXCLUDED.is_hardwood,
  notes = EXCLUDED.notes,
  updated_at = timezone('utc'::text, now());

-- 3. Storage Yards (TPK)
INSERT INTO storage_yards (id, tenant_id, yard_code, name, description)
VALUES
  ('yard-timur', 'default-tenant', 'TPK-T', 'TPK-Timur', 'Log yard facing eastern logistics dock'),
  ('yard-utara', 'default-tenant', 'TPK-U', 'TPK-Utara', 'Northern kiln-dry staging yard'),
  ('yard-barat', 'default-tenant', 'TPK-B', 'TPK-Barat', 'Western heavy hardwood depot'),
  ('yard-selatan', 'default-tenant', 'TPK-S', 'TPK-Selatan', 'Southern incoming inspection yard')
ON CONFLICT (tenant_id, yard_code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = timezone('utc'::text, now());

-- 4. Storage Lots (Kavling)
INSERT INTO storage_lots (id, tenant_id, yard_id, lot_code, status)
VALUES
  ('lot-kav-01', 'default-tenant', 'yard-timur', 'KAV-01', 'ACTIVE'),
  ('lot-kav-02', 'default-tenant', 'yard-timur', 'KAV-02', 'ACTIVE'),
  ('lot-kav-03', 'default-tenant', 'yard-utara', 'KAV-03', 'ACTIVE'),
  ('lot-kav-04', 'default-tenant', 'yard-utara', 'KAV-04', 'FULL'),
  ('lot-kav-05', 'default-tenant', 'yard-barat', 'KAV-05', 'ACTIVE'),
  ('lot-kav-06', 'default-tenant', 'yard-barat', 'KAV-06', 'MAINTENANCE'),
  ('lot-kav-07', 'default-tenant', 'yard-selatan', 'KAV-07', 'ACTIVE'),
  ('lot-kav-08', 'default-tenant', 'yard-selatan', 'KAV-08', 'ACTIVE'),
  ('lot-utara-kav-02', 'default-tenant', 'yard-utara', 'KAV-02', 'ACTIVE'),
  ('lot-barat-kav-03', 'default-tenant', 'yard-barat', 'KAV-03', 'ACTIVE'),
  ('lot-selatan-kav-04', 'default-tenant', 'yard-selatan', 'KAV-04', 'ACTIVE')
ON CONFLICT (tenant_id, yard_id, lot_code) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = timezone('utc'::text, now());

-- 5. Registered Suppliers
INSERT INTO suppliers (id, tenant_id, code, name, contact_person, phone, address, tax_id_npwp, is_active, notes)
VALUES
  ('spl-001', 'default-tenant', 'SPL-001', 'PT Wana Lestari Abadi', 'Hendra Wijaya', '0812-8821-4401', 'Jl. Trans Nabire Km 18, Nabire, Papua', '01.345.678.9-951.000', TRUE, 'Konsesi HPH resmi Nabire, spesialisasi Merbau dan Meranti Merah.'),
  ('spl-002', 'default-tenant', 'SPL-002', 'CV Papua Rimba Sejahtera', 'Suryanto Tan', '0813-9012-3342', 'Kawasan Industri Arso, Keerom, Jayapura', '02.456.789.1-952.000', TRUE, 'Pemasok kayu log bulat alam, kuota stabil 200m³/bulan.'),
  ('spl-003', 'default-tenant', 'SPL-003', 'PT Kayu Makmur Nusantara', 'Bambang Irawan', '0811-2345-6789', 'Jl. Pelabuhan Jayapura No. 45, Jayapura', '03.567.890.2-953.000', TRUE, 'Rekanan Teak/Jati dan Kamper bersertifikat SVLK.'),
  ('spl-004', 'default-tenant', 'SPL-004', 'Koperasi Hutan Lestari', 'Markus Waromi', '0821-4455-6677', 'Distrik Sentani Timur, Jayapura', '04.678.901.3-954.000', TRUE, 'Koperasi hutan kemasyarakatan lokal, kayu Sengon dan Mahoni.')
ON CONFLICT (tenant_id, code) DO UPDATE SET
  name = EXCLUDED.name,
  contact_person = EXCLUDED.contact_person,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  tax_id_npwp = EXCLUDED.tax_id_npwp,
  notes = EXCLUDED.notes,
  updated_at = timezone('utc'::text, now());

-- 6. Inbound Receiving Manifests
INSERT INTO receiving_manifests (
  id, tenant_id, manifest_number, receipt_date, doc_date, truck_plate_number,
  forestry_doc_number, receipt_number, contract_number, supplier_id,
  freight_rate_per_m3, freight_pph_rate, broker_fee, payment_status,
  invoice_number, payment_date, payment_notes
) VALUES
  ('rec-2026-10-01', 'default-tenant', 'MAN-rec-2026-10-01', '2026-10-01', '2026-09-29', 'B 9283 TDA', 'SKSHHK-2026-001', 'KW-2026-101', 'CTR-JATI-01', 'spl-001', 250000.0, 2.0, 500000.0, 'UNPAID', NULL, NULL, NULL),
  ('rec-2026-10-02', 'default-tenant', 'MAN-rec-2026-10-02', '2026-10-03', '2026-10-01', 'L 8172 UX', 'SKSHHK-2026-002', 'KW-2026-102', 'CTR-MRB-04', 'spl-002', 320000.0, 2.0, 750000.0, 'UNPAID', NULL, NULL, NULL),
  ('rec-2026-10-03', 'default-tenant', 'MAN-rec-2026-10-03', '2026-10-05', '2026-10-04', 'AD 1459 CF', 'DKP-SLK-8821', 'KW-2026-103', 'CTR-MHN-02', 'spl-003', 180000.0, 2.0, 300000.0, 'UNPAID', NULL, NULL, NULL),
  ('rec-2026-10-04', 'default-tenant', 'MAN-rec-2026-10-04', '2026-10-08', '2026-10-07', 'K 9102 HC', 'DKP-SLK-9011', 'KW-2026-104', 'CTR-SGN-09', 'spl-004', 120000.0, 2.0, 200000.0, 'UNPAID', NULL, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  manifest_number = EXCLUDED.manifest_number,
  receipt_date = EXCLUDED.receipt_date,
  doc_date = EXCLUDED.doc_date,
  truck_plate_number = EXCLUDED.truck_plate_number,
  forestry_doc_number = EXCLUDED.forestry_doc_number,
  receipt_number = EXCLUDED.receipt_number,
  contract_number = EXCLUDED.contract_number,
  supplier_id = EXCLUDED.supplier_id,
  freight_rate_per_m3 = EXCLUDED.freight_rate_per_m3,
  freight_pph_rate = EXCLUDED.freight_pph_rate,
  broker_fee = EXCLUDED.broker_fee,
  payment_status = EXCLUDED.payment_status,
  updated_at = timezone('utc'::text, now());

-- 7. Receiving Line Items (Tally breakdown)
INSERT INTO receiving_items (
  id, manifest_id, tenant_id, item_sequence, species_id, lot_id,
  wood_length_m, delivered_pieces, delivered_volume_m3, tally_pieces,
  tally_volume_m3, timber_price_per_m3, timber_pph_rate, notes
) VALUES
  ('item-rec-2026-10-01-1', 'rec-2026-10-01', 'default-tenant', 1, 'sp-teak', 'lot-kav-01', 4.20, 85, 14.5000, 85, 14.6500, 4200000.0, 0.5, NULL),
  ('item-rec-2026-10-02-1', 'rec-2026-10-02', 'default-tenant', 1, 'sp-merbau', 'lot-utara-kav-02', 5.00, 60, 18.2000, 58, 17.8500, 5500000.0, 0.5, NULL),
  ('item-rec-2026-10-03-1', 'rec-2026-10-03', 'default-tenant', 1, 'sp-mahoni', 'lot-barat-kav-03', 3.50, 110, 12.8000, 110, 12.8000, 2800000.0, 0.5, NULL),
  ('item-rec-2026-10-04-1', 'rec-2026-10-04', 'default-tenant', 1, 'sp-sengon', 'lot-selatan-kav-04', 2.60, 150, 9.6000, 152, 9.8000, 1350000.0, 0.5, NULL)
ON CONFLICT (id) DO UPDATE SET
  species_id = EXCLUDED.species_id,
  lot_id = EXCLUDED.lot_id,
  wood_length_m = EXCLUDED.wood_length_m,
  delivered_pieces = EXCLUDED.delivered_pieces,
  delivered_volume_m3 = EXCLUDED.delivered_volume_m3,
  tally_pieces = EXCLUDED.tally_pieces,
  tally_volume_m3 = EXCLUDED.tally_volume_m3,
  timber_price_per_m3 = EXCLUDED.timber_price_per_m3,
  timber_pph_rate = EXCLUDED.timber_pph_rate,
  updated_at = timezone('utc'::text, now());

-- 8. Outbound Wood Sales Records
INSERT INTO sales_records (
  id, sale_date, delivery_order_number, truck_plate_number, driver_name,
  customer_name, storage_yard, kavling_number, wood_species, pieces,
  volume_m3, price_per_m3, total_price, payment_status, invoice_number, notes
) VALUES
  ('sls-2026-10-04', '2026-10-04', 'DO-2026-001', 'B 9102 TGA', 'Agus Prasetyo', 'PT Mebel Nusantara Abadi', 'TPK-Timur', 'KAV-01', 'Teak / Jati (柚木)', 25, 4.30, 5800000.0, 24940000.0, 'PAID', 'INV-SLS-2601', 'Pengiriman tahap 1 ekspor furnitur jati ke Surabaya'),
  ('sls-2026-10-07', '2026-10-07', 'DO-2026-002', 'L 9871 BX', 'Sugeng Supriyadi', 'CV Furnitur Sejahtera', 'TPK-Utara', 'KAV-02', 'Merbau (菠萝格)', 18, 5.50, 7200000.0, 39600000.0, 'PAID', 'INV-SLS-2602', 'Pesanan kusen & decking merbau project resort Bali'),
  ('sls-2026-10-10', '2026-10-10', 'DO-2026-003', 'AD 8112 HK', 'Wawan Kurniawan', 'PT Kreasi Kayu Pratama', 'TPK-Barat', 'KAV-03', 'Mahoni (桃花心木)', 35, 4.10, 3900000.0, 15990000.0, 'PARTIAL', 'INV-SLS-2603', 'DP 50% diterima, pelunasan tempo 14 hari'),
  ('sls-2026-10-12', '2026-10-12', 'DO-2026-004', 'K 8221 DC', 'Eko Purnomo', 'PT Pabrik Pallet Perkasa', 'TPK-Selatan', 'KAV-04', 'Sengon / Albasia (南洋楹)', 60, 3.85, 1850000.0, 7122500.0, 'PAID', 'INV-SLS-2604', 'Bahan baku pallet standar ekspor industri farmasi'),
  ('sls-2026-10-15', '2026-10-15', 'DO-2026-005', 'B 9441 UY', 'Agus Prasetyo', 'PT Mebel Nusantara Abadi', 'TPK-Timur', 'KAV-01', 'Teak / Jati (柚木)', 20, 3.45, 5900000.0, 20355000.0, 'UNPAID', 'INV-SLS-2605', 'Pengiriman batch 2, invoice terbit tempo 30 hari')
ON CONFLICT (id) DO UPDATE SET
  sale_date = EXCLUDED.sale_date,
  delivery_order_number = EXCLUDED.delivery_order_number,
  truck_plate_number = EXCLUDED.truck_plate_number,
  driver_name = EXCLUDED.driver_name,
  customer_name = EXCLUDED.customer_name,
  storage_yard = EXCLUDED.storage_yard,
  kavling_number = EXCLUDED.kavling_number,
  wood_species = EXCLUDED.wood_species,
  pieces = EXCLUDED.pieces,
  volume_m3 = EXCLUDED.volume_m3,
  price_per_m3 = EXCLUDED.price_per_m3,
  total_price = EXCLUDED.total_price,
  payment_status = EXCLUDED.payment_status,
  invoice_number = EXCLUDED.invoice_number,
  notes = EXCLUDED.notes,
  updated_at = timezone('utc'::text, now());
