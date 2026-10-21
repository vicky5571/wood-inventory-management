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
  ('SPL-001', 'default-tenant', 'SPL-001', 'Perum Perhutani KPH Randublatung', 'Bambang Sudibyo', '0812-2834-9101', 'Jl. Raya Randublatung Km 2, Blora, Jawa Tengah', '01.000.123.4-511.000', TRUE, 'Pemasok resmi kayu Jati Perhutani KPH Randublatung jalur lelang/kontrak.'),
  ('SPL-002', 'default-tenant', 'SPL-002', 'Perum Perhutani KPH Mantingan', 'Suryo Pranoto', '0813-2945-8822', 'Jl. Diponegoro No. 45, Rembang, Jawa Tengah', '01.000.456.7-512.000', TRUE, 'Pemasok kayu jati dan sonokeling bersertifikat FSC & SVLK.'),
  ('SPL-003', 'default-tenant', 'SPL-003', 'CV Jati Makmur Sentosa', 'Hendra Tanujaya', '0811-2789-3344', 'Kawasan Industri Jepara Blok B-12, Jepara', '02.345.678.9-513.000', TRUE, 'Spesialis log jati alam dan olahan lokal Jawa Timur/Jawa Tengah.'),
  ('SPL-004', 'default-tenant', 'SPL-004', 'PT Hutan Lestari Nusantara', 'Raden Santoso', '0815-6789-0123', 'Jl. Pelabuhan Tanjung Emas No. 88, Semarang', '01.888.999.1-514.000', TRUE, 'Konsesi kayu keras Merbau dan Meranti luar pulau (Papua / Kalimantan).'),
  ('SPL-005', 'default-tenant', 'SPL-005', 'CV Rimba Kayu Jaya', 'Agus Salim', '0821-3456-7890', 'Jl. Trans Jawa Km 82, Kudus, Jawa Tengah', '03.111.222.3-515.000', TRUE, 'Pemasok kayu Mahoni dan Pinus dari perkebunan rakyat.'),
  ('SPL-006', 'default-tenant', 'SPL-006', 'Koperasi Tani Hutan Rakyat Blora', 'Warsito', '0852-9012-3456', 'Desa Nglobo, Kec. Jiken, Blora, Jawa Tengah', '04.555.666.7-516.000', TRUE, 'Koperasi petani hutan rakyat mandiri komoditas kayu Sengon dan Jabon.'),
  ('SPL-007', 'default-tenant', 'SPL-007', 'PT Wana Mitra Abadi', 'Gunawan Prasetyo', '0818-0987-6543', 'Jl. Basuki Rahmat No. 102, Surabaya', '01.777.444.2-517.000', TRUE, 'Pemasok kayu Keruing dan Meranti bersertifikasi untuk decking.')
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
  ('rec-2026-10-01', 'default-tenant', 'MAN-rec-2026-10-01', '2026-07-26', '2026-07-25', 'K 9283 TDA', 'SKSHHK-2026-001', 'KW-2026-001', 'PHT/RBL/2026/001', 'SPL-001', 250000, 2.0, 500000, 'PAID', NULL, NULL, NULL),
  ('rec-2026-10-02', 'default-tenant', 'MAN-rec-2026-10-02', '2026-08-02', '2026-08-01', 'K 8172 UX', 'SKSHHK-2026-002', 'KW-2026-002', 'PHT/MNT/2026/002', 'SPL-002', 280000, 2.0, 600000, 'PAID', NULL, NULL, NULL),
  ('rec-2026-10-03', 'default-tenant', 'MAN-rec-2026-10-03', '2026-08-11', '2026-08-09', 'H 8832 PK', 'SKSHHK-2026-003', 'KW-2026-003', 'CTR-HLN-MRB-01', 'SPL-003', 350000, 2.0, 750000, 'PAID', NULL, NULL, NULL),
  ('rec-2026-10-04', 'default-tenant', 'MAN-rec-2026-10-04', '2026-08-18', '2026-08-17', 'K 9102 HC', 'SKSHHK-2026-004', 'KW-2026-004', 'PHT/CPU/2026/003', 'SPL-001', 260000, 2.0, 500000, 'UNPAID', NULL, NULL, NULL),
  ('rec-2026-10-05', 'default-tenant', 'MAN-rec-2026-10-05', '2026-08-25', '2026-08-24', 'AD 1459 CF', 'DKP-KDS-005', 'KW-2026-005', 'CTR-RKJ-MHN-01', 'SPL-005', 180000, 2.0, 300000, 'UNPAID', NULL, NULL, NULL),
  ('rec-2026-10-06', 'default-tenant', 'MAN-rec-2026-10-06', '2026-09-08', '2026-09-07', 'K 7712 BD', 'DKP-BLR-006', 'KW-2026-006', 'CTR-KOP-SGN-02', 'SPL-006', 130000, 2.0, 200000, 'UNPAID', NULL, NULL, NULL),
  ('rec-2026-10-07', 'default-tenant', 'MAN-rec-2026-10-07', '2026-09-22', '2026-09-21', 'K 9283 TDA', 'SKSHHK-2026-007', 'KW-2026-007', 'PHT/RBL/2026/001', 'SPL-001', 250000, 2.0, 500000, 'PAID', NULL, NULL, NULL),
  ('rec-2026-10-08', 'default-tenant', 'MAN-rec-2026-10-08', '2026-09-28', '2026-09-27', 'K 4421 GA', 'SKSHHK-2026-008', 'KW-2026-008', 'CTR-JMS-2026-01', 'SPL-007', 200000, 2.0, 0, 'UNPAID', NULL, NULL, NULL),
  ('rec-2026-10-09', 'default-tenant', 'MAN-rec-2026-10-09', '2026-10-06', '2026-10-05', 'L 9021 UT', 'SKSHHK-2026-009', 'KW-2026-009', 'CTR-WMA-KRG-01', 'SPL-004', 310000, 2.0, 400000, 'UNPAID', NULL, NULL, NULL),
  ('rec-2026-10-10', 'default-tenant', 'MAN-rec-2026-10-10', '2026-10-14', '2026-10-13', 'K 8331 HE', 'DKP-BLR-010', 'KW-2026-010', 'CTR-KOP-SGN-03', 'SPL-006', 125000, 2.0, 150000, 'UNPAID', NULL, NULL, NULL)
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
  ('item-rec-2026-10-01-1', 'rec-2026-10-01', 'default-tenant', 1, 'sp-teak', 'lot-kav-01', 3.5, 60, 30.3, 60, 30.3, 5988448, 0.5, NULL),
  ('item-rec-2026-10-02-1', 'rec-2026-10-02', 'default-tenant', 1, 'sp-teak', 'lot-utara-kav-02', 3.3, 50, 26, 50, 26, 6200000, 0.5, NULL),
  ('item-rec-2026-10-03-1', 'rec-2026-10-03', 'default-tenant', 1, 'sp-merbau', 'lot-barat-kav-03', 4.5, 28, 17.5, 28, 17.5, 7200000, 0.5, NULL),
  ('item-rec-2026-10-04-1', 'rec-2026-10-04', 'default-tenant', 1, 'sp-teak', 'lot-kav-01', 2.8, 60, 26.5, 60, 26.5, 6500000, 0.5, NULL),
  ('item-rec-2026-10-05-1', 'rec-2026-10-05', 'default-tenant', 1, 'sp-mahoni', 'lot-barat-kav-03', 3.5, 45, 13.5, 45, 13.5, 3800000, 0.5, NULL),
  ('item-rec-2026-10-06-1', 'rec-2026-10-06', 'default-tenant', 1, 'sp-sengon', 'lot-utara-kav-02', 2.6, 80, 10.5, 80, 10.5, 1750000, 0.5, NULL),
  ('item-rec-2026-10-07-1', 'rec-2026-10-07', 'default-tenant', 1, 'sp-teak', 'lot-kav-01', 3.4, 40, 18.7, 40, 18.7, 5938502, 0.5, NULL),
  ('item-rec-2026-10-08-1', 'rec-2026-10-08', 'default-tenant', 1, 'sp-teak', 'lot-kav-01', 2.8, 50, 19.5, 50, 19.5, NULL, 0.5, NULL),
  ('item-rec-2026-10-09-1', 'rec-2026-10-09', 'default-tenant', 1, 'sp-keruing', 'lot-barat-kav-03', 3.8, 55, 25.5, 55, 25.5, NULL, 0.5, NULL),
  ('item-rec-2026-10-10-1', 'rec-2026-10-10', 'default-tenant', 1, 'sp-sengon', 'lot-utara-kav-02', 2.6, 75, 9.8, 75, 9.8, NULL, 0.5, NULL)
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
  ('SLS-2026-01', '2026-07-29', 'DO-2026-001', 'H 1928 KL', 'Supriadi', 'PT Mebel Antik Solo', 'TPK-Timur', 'KAV-01', 'Jati', 15, 6.8, 8500000, 57800000, 'PAID', 'INV-OUT-001', 'Pengiriman pesanan meja jati ekspor'),
  ('SLS-2026-02', '2026-08-05', 'DO-2026-002', 'K 8812 DA', 'Joko Susilo', 'CV Jepara Indah Furniture', 'TPK-Utara', 'KAV-06', 'Jati', 12, 5.5, 8800000, 48400000, 'PAID', 'INV-OUT-002', 'Log jati A2 untuk ukiran khas Jepara'),
  ('SLS-2026-03', '2026-08-14', 'DO-2026-003', 'AD 9123 FC', 'Bambang Sugiarto', 'PT Kreasi Kayu Indonesia', 'TPK-Barat', 'KAV-11', 'Merbau', 10, 6.2, 9800000, 60760000, 'PAID', 'INV-OUT-003', 'Merbau siap potong decking outdoor'),
  ('SLS-2026-04', '2026-08-21', 'DO-2026-004', 'K 1209 EA', 'Wahyu Triyono', 'UD Sumber Rejeki Semarang', 'TPK-Timur', 'KAV-02', 'Jati', 8, 4.2, 8200000, 34440000, 'PARTIAL', 'INV-OUT-004', 'DP 50% diterima, sisa jatuh tempo 14 hari'),
  ('SLS-2026-05', '2026-08-28', 'DO-2026-005', 'H 9021 UT', 'Dani Saputra', 'CV Jati Luhur Perkasa', 'TPK-Barat', 'KAV-12', 'Mahoni', 25, 7.5, 5200000, 39000000, 'PAID', 'INV-OUT-005', 'Bahan gitar akustik dan kerajinan'),
  ('SLS-2026-06', '2026-09-04', 'DO-2026-006', 'K 3341 FA', 'Agung Prasetyo', 'PT Surya Mandiri Furniture', 'TPK-Timur', 'KAV-03', 'Jati', 14, 5.8, 8600000, 49880000, 'PARTIAL', 'INV-OUT-006', 'Termin pembayaran 30 hari'),
  ('SLS-2026-07', '2026-09-12', 'DO-2026-007', 'K 7829 GA', 'Rudi Hartono', 'CV Kayu Mas Kudus', 'TPK-Utara', 'KAV-09', 'Sengon', 50, 6.5, 2400000, 15600000, 'PAID', 'INV-OUT-007', 'Pengiriman untuk peti kemas ekspor tembakau'),
  ('SLS-2026-08', '2026-09-25', 'DO-2026-008', 'AD 8219 DF', 'Teguh Wibowo', 'PT Aneka Kayu Sejahtera', 'TPK-Timur', 'KAV-01', 'Jati', 10, 4.5, 8700000, 39150000, 'UNPAID', NULL, 'Menunggu konfirmasi penerimaan barang di gudang Solo'),
  ('SLS-2026-09', '2026-10-02', 'DO-2026-009', 'H 4412 BA', 'Hendro Siswanto', 'UD Berkah Kayu Boyolali', 'TPK-Barat', 'KAV-13', 'Pinus', 30, 6, 3800000, 22800000, 'UNPAID', NULL, 'Kayu pinus bahan pallet industri'),
  ('SLS-2026-10', '2026-10-15', 'DO-2026-010', 'K 9102 HC', 'Joko Susilo', 'PT Megah Abadi Perkasa', 'TPK-Barat', 'KAV-11', 'Merbau', 8, 5, 9900000, 49500000, 'UNPAID', NULL, 'Pengiriman akhir kuartal, faktur menyusul')
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
