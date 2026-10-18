/**
 * src/persistence/sqlite/record-queries.ts
 *
 * Parameterized pagination, multi-criteria filtering, and dynamic sorting
 * over relational view v_buku_besar_flat using Node.js native node:sqlite.
 */

import type { DatabaseSync } from 'node:sqlite';
import type {
  WoodReceivingRecord,
  RecordQueryParams,
  PaginatedResult,
  PaginationMeta,
} from '../../types/index.ts';

const ALLOWED_SORT_COLUMNS = new Set<string>([
  'receiptDate',
  'truckPlateNumber',
  'supplierName',
  'tallyVolumeM3',
  'grandNetPayable',
  'createdAt',
]);

/**
 * Executes a parameterized paginated query against v_buku_besar_flat.
 */
export function queryPaginatedRecords(
  db: DatabaseSync,
  params: RecordQueryParams = {}
): PaginatedResult<WoodReceivingRecord> {
  const page = Math.max(1, Number(params.page) || 1);
  const rawPageSize = params.pageSize !== undefined ? Number(params.pageSize) : 50;
  const pageSize = rawPageSize === -1 ? -1 : Math.max(1, rawPageSize || 50);

  const conditions: string[] = [];
  const queryParams: (string | number)[] = [];

  if (params.searchQuery && params.searchQuery.trim().length > 0) {
    const term = `%${params.searchQuery.trim()}%`;
    conditions.push(
      '(truckPlateNumber LIKE ? OR forestryDocNumber LIKE ? OR receiptNumber LIKE ? OR contractNumber LIKE ? OR supplierName LIKE ? OR invoiceNumber LIKE ?)'
    );
    queryParams.push(term, term, term, term, term, term);
  }

  if (params.species && params.species.trim().length > 0) {
    conditions.push('woodSpecies = ?');
    queryParams.push(params.species.trim());
  }

  if (params.kavling && params.kavling.trim().length > 0) {
    conditions.push('kavlingNumber = ?');
    queryParams.push(params.kavling.trim());
  }

  if (params.yard && params.yard.trim().length > 0) {
    conditions.push('storageYard = ?');
    queryParams.push(params.yard.trim());
  }

  if (params.startDate && params.startDate.trim().length > 0) {
    conditions.push('receiptDate >= ?');
    queryParams.push(params.startDate.trim());
  }

  if (params.endDate && params.endDate.trim().length > 0) {
    conditions.push('receiptDate <= ?');
    queryParams.push(params.endDate.trim());
  }

  if (params.paymentStatus && params.paymentStatus !== 'ALL') {
    conditions.push('paymentStatus = ?');
    queryParams.push(params.paymentStatus);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Sort validation with strict whitelist
  const validSortBy = params.sortBy && ALLOWED_SORT_COLUMNS.has(params.sortBy)
    ? params.sortBy
    : 'receiptDate';
  const validSortOrder = params.sortOrder === 'ASC' ? 'ASC' : 'DESC';

  // Count query
  const countSql = `SELECT COUNT(*) AS total FROM v_buku_besar_flat ${whereClause};`;
  const countRow = db.prepare(countSql).get(...queryParams) as { total: number } | undefined;
  const totalRecords = countRow ? Number(countRow.total) : 0;

  const totalPages = totalRecords === 0
    ? 0
    : pageSize > 0
    ? Math.ceil(totalRecords / pageSize)
    : 1;
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1 && totalPages > 0;

  const pagination: PaginationMeta = {
    page,
    pageSize,
    totalRecords,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  };

  if (totalRecords === 0) {
    return { data: [], pagination };
  }

  let dataSql = `SELECT * FROM v_buku_besar_flat ${whereClause} ORDER BY ${validSortBy} ${validSortOrder}, id ASC`;
  const dataParams = [...queryParams];

  if (pageSize > 0) {
    const limit = pageSize;
    const offset = Math.max(0, (page - 1) * pageSize);
    dataSql += ' LIMIT ? OFFSET ?;';
    dataParams.push(limit, offset);
  } else {
    dataSql += ';';
  }

  const rows = db.prepare(dataSql).all(...dataParams) as unknown as WoodReceivingRecord[];

  return {
    data: rows,
    pagination,
  };
}
