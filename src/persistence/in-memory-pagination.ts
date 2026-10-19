import type {
  WoodReceivingRecord,
  RecordQueryParams,
  PaginatedResult,
  PaginationMeta,
} from '../types/index.ts';

const ALLOWED_SORT_COLUMNS = new Set<string>([
  'receiptDate',
  'truckPlateNumber',
  'supplierName',
  'tallyVolumeM3',
  'grandNetPayable',
  'createdAt',
]);

export function paginateInMemoryRecords(
  records: WoodReceivingRecord[],
  params: RecordQueryParams = {}
): PaginatedResult<WoodReceivingRecord> {
  const page = Math.max(1, Number(params.page) || 1);
  const rawPageSize = params.pageSize !== undefined ? Number(params.pageSize) : 50;
  const pageSize = rawPageSize === -1 ? -1 : Math.max(1, rawPageSize || 50);

  const filtered = records.filter((r) => {
    if (params.species && r.woodSpecies !== params.species) return false;
    if (params.kavling && r.kavlingNumber !== params.kavling) return false;
    if (params.yard && r.storageYard !== params.yard) return false;
    if (params.startDate && r.receiptDate < params.startDate) return false;
    if (params.endDate && r.receiptDate > params.endDate) return false;
    if (params.paymentStatus && params.paymentStatus !== 'ALL') {
      const status = r.paymentStatus || 'UNPAID';
      if (params.paymentStatus !== status) return false;
    }
    if (params.searchQuery && params.searchQuery.trim().length > 0) {
      const q = params.searchQuery.trim().toLowerCase();
      const match =
        Boolean(r.truckPlateNumber?.toLowerCase().includes(q)) ||
        Boolean(r.forestryDocNumber?.toLowerCase().includes(q)) ||
        Boolean(r.receiptNumber?.toLowerCase().includes(q)) ||
        Boolean(r.contractNumber?.toLowerCase().includes(q)) ||
        Boolean(r.supplierName?.toLowerCase().includes(q)) ||
        Boolean(r.invoiceNumber?.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const validSortBy = params.sortBy && ALLOWED_SORT_COLUMNS.has(params.sortBy)
    ? params.sortBy
    : 'receiptDate';
  const sortMultiplier = params.sortOrder === 'ASC' ? 1 : -1;

  filtered.sort((a, b) => {
    const valA = (a as unknown as Record<string, unknown>)[validSortBy] ?? '';
    const valB = (b as unknown as Record<string, unknown>)[validSortBy] ?? '';
    if (valA < valB) return -1 * sortMultiplier;
    if (valA > valB) return 1 * sortMultiplier;
    return a.id < b.id ? -1 : 1;
  });

  const totalRecords = filtered.length;
  const totalPages = totalRecords === 0
    ? 0
    : pageSize > 0
    ? Math.ceil(totalRecords / pageSize)
    : 1;
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1 && totalPages > 0;

  const data = pageSize > 0
    ? filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)
    : filtered;

  const pagination: PaginationMeta = {
    page,
    pageSize,
    totalRecords,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  };

  return {
    data,
    pagination,
  };
}
