/**
 * src/utils/user-permission-diff.ts
 *
 * Computes human-readable change descriptions between two UserPermissions snapshots.
 * Spec: docs/superpowers/specs/2026-10-22-user-audit-log-extension-design.md
 */

import type { UserPermissions } from '../types/index.ts';

export function diffPermissions(
  before: UserPermissions | undefined,
  after: UserPermissions | undefined
): string[] {
  const changes: string[] = [];
  const bObj = before ?? {};
  const aObj = after ?? {};

  const allKeys = Array.from(
    new Set([...Object.keys(bObj), ...Object.keys(aObj)])
  );

  for (const key of allKeys) {
    const hasBefore = key in bObj && bObj[key as keyof UserPermissions] !== undefined;
    const hasAfter = key in aObj && aObj[key as keyof UserPermissions] !== undefined;

    if (!hasBefore && !hasAfter) continue;

    const b = bObj[key as keyof UserPermissions];
    const a = aObj[key as keyof UserPermissions];

    if (b === a) continue;

    if (!hasBefore && hasAfter) {
      if (a === true) {
        changes.push(`granted: ${key}`);
      } else {
        changes.push(`${key}: undefined → ${a}`);
      }
    } else if (hasBefore && !hasAfter) {
      changes.push(`revoked: ${key}`);
    } else {
      changes.push(`${key}: ${b} → ${a}`);
    }
  }

  return changes;
}

