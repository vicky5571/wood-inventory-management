import type { RecordQueryParams } from '../types/index.ts';

export function buildRecordsApiUrl(params: RecordQueryParams = {}): string {
  const query = new URLSearchParams();

  if (params.page !== undefined && params.page !== null) {
    query.set('page', String(params.page));
  }

  if (params.pageSize !== undefined && params.pageSize !== null) {
    query.set('pageSize', String(params.pageSize));
  }

  if (params.searchQuery && params.searchQuery.trim() !== '') {
    query.set('searchQuery', params.searchQuery.trim());
  }

  if (params.species && params.species.trim() !== '') {
    query.set('species', params.species.trim());
  }

  if (params.kavling && params.kavling.trim() !== '') {
    query.set('kavling', params.kavling.trim());
  }

  if (params.yard && params.yard.trim() !== '') {
    query.set('yard', params.yard.trim());
  }

  if (params.startDate && params.startDate.trim() !== '') {
    query.set('startDate', params.startDate.trim());
  }

  if (params.endDate && params.endDate.trim() !== '') {
    query.set('endDate', params.endDate.trim());
  }

  if (params.paymentStatus && params.paymentStatus !== 'ALL') {
    query.set('paymentStatus', params.paymentStatus);
  }

  if (params.sortBy && params.sortBy.trim() !== '') {
    query.set('sortBy', params.sortBy.trim());
  }

  if (params.sortOrder && params.sortOrder.trim() !== '') {
    query.set('sortOrder', params.sortOrder.trim());
  }

  const qs = query.toString();
  return qs ? `/api/records?${qs}` : '/api/records';
}
