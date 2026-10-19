import type { RecordQueryParams, PaymentStatus } from '../types/index.ts';

export const PAGINATION_PARAM_KEYS = [
  'page', 'pageSize', 'searchQuery', 'query', 'species',
  'kavling', 'yard', 'startDate', 'endDate', 'paymentStatus', 'sortBy', 'sortOrder',
] as const;

export const VALID_SORT_COLUMNS = new Set<string>([
  'receiptDate', 'truckPlateNumber', 'supplierName',
  'tallyVolumeM3', 'grandNetPayable', 'createdAt',
]);

export function parseRecordQueryParams(searchParams: URLSearchParams): RecordQueryParams | null {
  const hasPaginationParams = PAGINATION_PARAM_KEYS.some((key) => searchParams.has(key));
  if (!hasPaginationParams) {
    return null;
  }

  const rawPayment = searchParams.get('paymentStatus')?.trim().toUpperCase();
  const rawSortBy = searchParams.get('sortBy')?.trim();
  const rawSortOrder = searchParams.get('sortOrder')?.trim().toUpperCase();

  return {
    page: Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1),
    pageSize: searchParams.get('pageSize') !== null ? (parseInt(searchParams.get('pageSize')!, 10) || 50) : 50,
    searchQuery: (searchParams.get('searchQuery') || searchParams.get('query') || '').trim() || undefined,
    species: searchParams.get('species')?.trim() || undefined,
    kavling: searchParams.get('kavling')?.trim() || undefined,
    yard: searchParams.get('yard')?.trim() || undefined,
    startDate: searchParams.get('startDate')?.trim() || undefined,
    endDate: searchParams.get('endDate')?.trim() || undefined,
    paymentStatus: (rawPayment === 'UNPAID' || rawPayment === 'PARTIAL' || rawPayment === 'PAID' || rawPayment === 'ALL')
      ? (rawPayment as PaymentStatus | 'ALL')
      : undefined,
    sortBy: rawSortBy && VALID_SORT_COLUMNS.has(rawSortBy) ? (rawSortBy as RecordQueryParams['sortBy']) : undefined,
    sortOrder: rawSortOrder === 'ASC' ? 'ASC' : (rawSortOrder === 'DESC' ? 'DESC' : undefined),
  };
}
