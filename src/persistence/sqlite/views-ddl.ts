/**
 * SQLite Analytical Calculation Views DDL
 * Pre-compiled views for receiving items, summaries, and buku besar flat projection
 */
export const SQLITE_VIEWS_DDL = `
  DROP VIEW IF EXISTS v_buku_besar_flat;
  DROP VIEW IF EXISTS v_receiving_manifest_summaries;
  DROP VIEW IF EXISTS v_receiving_item_financials;

  CREATE VIEW IF NOT EXISTS v_receiving_item_financials AS
  SELECT
    i.id AS item_id,
    i.manifest_id,
    i.tenant_id,
    i.item_sequence,
    i.species_id,
    s.common_name AS species_name,
    i.lot_id,
    l.lot_code AS kavling_number,
    y.name AS storage_yard,
    i.payment_form_id,
    i.wood_length_m,
    i.delivered_pieces,
    i.delivered_volume_m3,
    i.tally_pieces,
    i.tally_volume_m3,
    (i.tally_pieces - i.delivered_pieces) AS piece_discrepancy,
    ROUND(i.tally_volume_m3 - i.delivered_volume_m3, 4) AS volume_discrepancy_m3,
    i.timber_price_per_m3,
    CASE WHEN i.timber_price_per_m3 IS NULL THEN NULL
         ELSE ROUND(i.tally_volume_m3 * i.timber_price_per_m3, 2) END AS timber_gross_total,
    i.timber_pph_rate,
    CASE WHEN i.timber_price_per_m3 IS NULL THEN NULL
         ELSE ROUND((i.tally_volume_m3 * i.timber_price_per_m3) * (i.timber_pph_rate / 100.0), 2) END AS timber_pph_amount,
    CASE WHEN i.timber_price_per_m3 IS NULL THEN NULL
         ELSE ROUND((i.tally_volume_m3 * i.timber_price_per_m3) - ((i.tally_volume_m3 * i.timber_price_per_m3) * (i.timber_pph_rate / 100.0)), 2) END AS timber_net_payable
  FROM receiving_items i
  JOIN wood_species s ON i.species_id = s.id
  LEFT JOIN storage_lots l ON i.lot_id = l.id
  LEFT JOIN storage_yards y ON l.yard_id = y.id;

  CREATE VIEW IF NOT EXISTS v_receiving_manifest_summaries AS
  SELECT
    m.id AS manifest_id,
    m.tenant_id,
    m.manifest_number,
    m.receipt_date,
    m.doc_date,
    m.truck_plate_number,
    m.forestry_doc_number,
    m.receipt_number,
    m.contract_number,
    m.contract_id,
    m.supplier_id,
    m.broker_id,
    sup.name AS supplier_name,
    COUNT(i.id) AS total_line_items,
    COALESCE(SUM(i.delivered_pieces), 0) AS total_delivered_pieces,
    COALESCE(ROUND(SUM(i.delivered_volume_m3), 4), 0.0) AS total_delivered_volume_m3,
    COALESCE(SUM(i.tally_pieces), 0) AS total_tally_pieces,
    COALESCE(ROUND(SUM(i.tally_volume_m3), 4), 0.0) AS total_tally_volume_m3,
    CASE WHEN COUNT(CASE WHEN i.timber_price_per_m3 IS NULL THEN 1 END) > 0 THEN NULL
         ELSE COALESCE(SUM(f.timber_gross_total), 0.0) END AS total_timber_gross,
    CASE WHEN COUNT(CASE WHEN i.timber_price_per_m3 IS NULL THEN 1 END) > 0 THEN NULL
         ELSE COALESCE(SUM(f.timber_pph_amount), 0.0) END AS total_timber_pph,
    CASE WHEN COUNT(CASE WHEN i.timber_price_per_m3 IS NULL THEN 1 END) > 0 THEN NULL
         ELSE COALESCE(SUM(f.timber_net_payable), 0.0) END AS total_timber_net,
    m.freight_rate_per_m3,
    ROUND(COALESCE(SUM(i.tally_volume_m3), 0.0) * m.freight_rate_per_m3, 2) AS freight_gross_total,
    m.freight_pph_rate,
    ROUND((COALESCE(SUM(i.tally_volume_m3), 0.0) * m.freight_rate_per_m3) * (m.freight_pph_rate / 100.0), 2) AS freight_pph_amount,
    ROUND((COALESCE(SUM(i.tally_volume_m3), 0.0) * m.freight_rate_per_m3) - ((COALESCE(SUM(i.tally_volume_m3), 0.0) * m.freight_rate_per_m3) * (m.freight_pph_rate / 100.0)), 2) AS freight_net_payable,
    m.broker_fee,
    CASE WHEN COUNT(CASE WHEN i.timber_price_per_m3 IS NULL THEN 1 END) > 0 THEN NULL
         ELSE ROUND(COALESCE(SUM(f.timber_net_payable), 0.0) + ((COALESCE(SUM(i.tally_volume_m3), 0.0) * m.freight_rate_per_m3) - ((COALESCE(SUM(i.tally_volume_m3), 0.0) * m.freight_rate_per_m3) * (m.freight_pph_rate / 100.0))) + m.broker_fee, 2) END AS grand_net_payable,
    m.payment_status,
    m.invoice_number,
    m.payment_date,
    m.payment_notes,
    m.created_at,
    m.updated_at
  FROM receiving_manifests m
  JOIN suppliers sup ON m.supplier_id = sup.id
  LEFT JOIN receiving_items i ON m.id = i.manifest_id
  LEFT JOIN v_receiving_item_financials f ON i.id = f.item_id
  GROUP BY m.id;

  CREATE VIEW IF NOT EXISTS v_buku_besar_flat AS
  SELECT
    CASE 
      WHEN (SELECT COUNT(*) FROM receiving_items ri WHERE ri.manifest_id = m.id) = 1 
      THEN m.id 
      ELSE m.id || '_' || i.id 
    END AS id,
    m.id AS manifest_id,
    i.id AS item_id,
    m.tenant_id,
    m.receipt_date AS receiptDate,
    m.doc_date AS docDate,
    m.truck_plate_number AS truckPlateNumber,
    m.forestry_doc_number AS forestryDocNumber,
    m.receipt_number AS receiptNumber,
    m.contract_number AS contractNumber,
    m.contract_id AS contractId,
    sup.name AS supplierName,
    m.broker_id AS brokerId,
    f.species_name AS woodSpecies,
    i.species_id AS speciesId,
    i.wood_length_m AS woodLengthM,
    COALESCE(f.kavling_number, '') AS kavlingNumber,
    COALESCE(f.storage_yard, '') AS storageYard,
    i.delivered_pieces AS deliveredPieces,
    i.delivered_volume_m3 AS deliveredVolumeM3,
    i.tally_pieces AS tallyPieces,
    i.tally_volume_m3 AS tallyVolumeM3,
    i.timber_price_per_m3 AS timberPricePerM3,
    f.timber_gross_total AS timberGrossTotal,
    i.timber_pph_rate AS timberPphRate,
    f.timber_pph_amount AS timberPphAmount,
    f.timber_net_payable AS timberNetPayable,
    m.freight_rate_per_m3 AS freightRatePerM3,
    ROUND(i.tally_volume_m3 * m.freight_rate_per_m3, 2) AS freightGrossTotal,
    ROUND((i.tally_volume_m3 * m.freight_rate_per_m3) * (m.freight_pph_rate / 100.0), 2) AS freightPphAmount,
    ROUND((i.tally_volume_m3 * m.freight_rate_per_m3) - ((i.tally_volume_m3 * m.freight_rate_per_m3) * (m.freight_pph_rate / 100.0)), 2) AS freightNetPayable,
    CASE 
      WHEN COALESCE((SELECT SUM(ri.tally_volume_m3) FROM receiving_items ri WHERE ri.manifest_id = m.id), 0) > 0 
      THEN ROUND(m.broker_fee * (i.tally_volume_m3 / (SELECT SUM(ri.tally_volume_m3) FROM receiving_items ri WHERE ri.manifest_id = m.id)), 2)
      WHEN i.item_sequence = 1 THEN m.broker_fee
      ELSE 0.0
    END AS brokerFee,
    CASE
      WHEN f.timber_net_payable IS NULL THEN NULL
      ELSE ROUND(f.timber_net_payable + ((i.tally_volume_m3 * m.freight_rate_per_m3) - ((i.tally_volume_m3 * m.freight_rate_per_m3) * (m.freight_pph_rate / 100.0))) + CASE 
        WHEN COALESCE((SELECT SUM(ri.tally_volume_m3) FROM receiving_items ri WHERE ri.manifest_id = m.id), 0) > 0 
        THEN ROUND(m.broker_fee * (i.tally_volume_m3 / (SELECT SUM(ri.tally_volume_m3) FROM receiving_items ri WHERE ri.manifest_id = m.id)), 2)
        WHEN i.item_sequence = 1 THEN m.broker_fee
        ELSE 0.0
      END, 2)
    END AS grandNetPayable,
    m.payment_status AS paymentStatus,
    COALESCE(i.payment_form_id, m.payment_form_id) AS paymentFormId,
    i.report_period_id AS reportPeriodId,
    i.price_entry_id AS priceEntryId,
    (CASE WHEN i.is_locked = 1 THEN 1 ELSE 0 END) AS isLocked,
    m.invoice_number AS invoiceNumber,
    m.payment_date AS paymentDate,
    m.payment_notes AS paymentNotes,
    m.created_at AS createdAt,
    m.updated_at AS updatedAt
  FROM receiving_manifests m
  JOIN suppliers sup ON m.supplier_id = sup.id
  JOIN receiving_items i ON m.id = i.manifest_id
  JOIN v_receiving_item_financials f ON i.id = f.item_id;
`;
