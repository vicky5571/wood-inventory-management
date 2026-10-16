import type { ActivityActionType, ActivityLogEntry } from '../types/index.ts';

export function createActivityLog(params: {
  action: ActivityActionType;
  entityId?: string;
  entitySummary: string;
  operatorName: string;
  operatorRole: string;
  metadata?: Record<string, unknown>;
}): ActivityLogEntry {
  return {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action: params.action,
    entityId: params.entityId,
    entitySummary: params.entitySummary,
    operatorName: params.operatorName || 'System',
    operatorRole: params.operatorRole || 'Operator',
    timestamp: new Date().toISOString(),
    metadata: params.metadata,
  };
}

export function formatActivityDescription(action: ActivityActionType, summary: string): string {
  switch (action) {
    case 'RECORD_CREATED':
      return `Penerimaan baru dicatat: ${summary} (新增入库)`;
    case 'RECORD_UPDATED':
      return `Penerimaan diperbarui: ${summary} (更新入库)`;
    case 'RECORD_DELETED':
      return `Penerimaan dihapus: ${summary} (删除入库)`;
    case 'RECORD_RESTORED':
      return `Penerimaan dipulihkan: ${summary} (撤销恢复)`;
    case 'DEMO_RESET':
      return `Database di-reset ke data demonstrasi standar (重置示例数据)`;
    case 'SETTINGS_UPDATED':
      return `Pengaturan sistem diperbarui: ${summary} (更新设置)`;
    case 'SUPPLIER_CREATED':
      return `Pemasok baru didaftarkan: ${summary} (新增供应商)`;
    case 'SUPPLIER_UPDATED':
      return `Data pemasok diperbarui: ${summary} (更新供应商)`;
    case 'SUPPLIER_DELETED':
      return `Pemasok dihapus: ${summary} (删除供应商)`;
    case 'SUPPLIER_RESTORED':
      return `Pemasok dipulihkan: ${summary} (撤销恢复供应商)`;
    default:
      return summary;
  }
}

