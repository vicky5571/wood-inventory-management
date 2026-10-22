/**
 * src/persistence/user-repository-audited.ts
 *
 * AuditedUserRepository decorator wrapping Spec A UserRepository DAO.
 * Emits structured audit log entries on admin mutations.
 *
 * For admin mutations only. Auth lookup uses raw getUserRepository().
 * Seeder (ensureSeedUsers) uses raw UserRepository intentionally.
 *
 * Spec: docs/superpowers/specs/2026-10-22-user-audit-log-extension-design.md
 * Plan: docs/superpowers/plans/2026-10-22-user-audit-log-extension.md
 * ADR: docs/adr/0013-user-management-architecture.md
 */

import type {
  AuthUser,
  AuditLogger,
  UserCreatedMetadata,
  UserUpdatedMetadata,
  UserRoleChangedMetadata,
  UserPermissionChangedMetadata,
  UserDeactivatedMetadata,
  UserReactivatedMetadata,
  UserPasswordChangedMetadata,
} from '../types/index.ts';
import {
  UserRepository,
  type UserRecordRow,
  UserNotFoundError,
  getUserRepository,
} from './user-repository.ts';
import { serverRecordStore } from './server-record-store.ts';
import { diffPermissions } from '../utils/user-permission-diff.ts';

export class AuditedUserRepository extends UserRepository {
  private readonly inner: UserRepository;
  private readonly logger: AuditLogger;
  private readonly actor: AuthUser;

  constructor(inner: UserRepository, logger: AuditLogger, actor: AuthUser) {
    super();
    this.inner = inner;
    this.logger = logger;
    this.actor = actor;
  }

  findByEmail(email: string): Promise<UserRecordRow | null> {
    return this.inner.findByEmail(email);
  }

  findById(id: string): Promise<UserRecordRow | null> {
    return this.inner.findById(id);
  }

  listAll(opts?: { includeInactive?: boolean }): Promise<UserRecordRow[]> {
    return this.inner.listAll(opts);
  }

  async create(input: Omit<UserRecordRow, 'createdAt' | 'updatedAt'>): Promise<UserRecordRow> {
    const created = await this.inner.create(input);
    await this.logger({
      action: 'USER_CREATED',
      entityId: created.id,
      entitySummary: `Created user ${created.email} (${created.title})`,
      operatorName: this.actor.name,
      operatorRole: this.actor.title,
      metadata: {
        targetUserId: created.id,
        targetEmail: created.email,
        targetName: created.name,
        initialRoleLevel: created.roleLevel,
        initialPermissions: created.permissions,
      } satisfies UserCreatedMetadata,
    });
    return created;
  }

  async update(id: string, patch: Partial<Omit<UserRecordRow, 'id' | 'createdAt'>>): Promise<UserRecordRow> {
    let existing = await this.inner.findById(id);
    if (!existing) {
      const all = await this.inner.listAll({ includeInactive: true });
      existing = all.find((u) => u.id === id) ?? null;
    }
    if (!existing) throw new UserNotFoundError(id);

    const updated = await this.inner.update(id, patch);
    await this.emitUpdateLogs(existing, updated, patch);
    return updated;
  }

  async deactivate(id: string): Promise<void> {
    let existing = await this.inner.findById(id);
    if (!existing) {
      const all = await this.inner.listAll({ includeInactive: true });
      existing = all.find((u) => u.id === id) ?? null;
    }
    if (!existing) throw new UserNotFoundError(id);

    await this.inner.deactivate(id);
    await this.logger({
      action: 'USER_DEACTIVATED',
      entityId: id,
      entitySummary: `Deactivated user ${existing.email}`,
      operatorName: this.actor.name,
      operatorRole: this.actor.title,
      metadata: {
        targetUserId: id,
        targetEmail: existing.email,
        previousRoleLevel: existing.roleLevel,
      } satisfies UserDeactivatedMetadata,
    });
  }

  async upsertSeed(_input: Omit<UserRecordRow, 'createdAt' | 'updatedAt'>): Promise<void> {
    throw new Error('upsertSeed is not permitted on AuditedUserRepository. Use raw UserRepository for seeding.');
  }

  private async emitUpdateLogs(
    existing: UserRecordRow,
    updated: UserRecordRow,
    patch: Partial<Omit<UserRecordRow, 'id' | 'createdAt'>>
  ): Promise<void> {
    const reason = (patch as Record<string, unknown>).reason as string | undefined;

    // 1. Reactivation
    if (!existing.isActive && patch.isActive === true) {
      await this.logger({
        action: 'USER_REACTIVATED',
        entityId: updated.id,
        entitySummary: `Reactivated user ${updated.email}`,
        operatorName: this.actor.name,
        operatorRole: this.actor.title,
        metadata: {
          targetUserId: updated.id,
          targetEmail: updated.email,
          roleLevel: updated.roleLevel,
          reason,
        } satisfies UserReactivatedMetadata,
      });
    }

    // 2. Role change
    if (patch.roleLevel !== undefined && patch.roleLevel !== existing.roleLevel) {
      await this.logger({
        action: 'USER_ROLE_CHANGED',
        entityId: updated.id,
        entitySummary: `Changed role for ${updated.email} from Level ${existing.roleLevel} to Level ${updated.roleLevel}`,
        operatorName: this.actor.name,
        operatorRole: this.actor.title,
        metadata: {
          targetUserId: updated.id,
          targetEmail: updated.email,
          before: existing.roleLevel,
          after: updated.roleLevel,
          reason,
        } satisfies UserRoleChangedMetadata,
      });
    }

    // 3. Permission change
    if (patch.permissions !== undefined) {
      const changes = diffPermissions(existing.permissions, updated.permissions);
      if (changes.length > 0) {
        await this.logger({
          action: 'USER_PERMISSION_CHANGED',
          entityId: updated.id,
          entitySummary: `Changed permissions for ${updated.email}: ${changes.join(', ')}`,
          operatorName: this.actor.name,
          operatorRole: this.actor.title,
          metadata: {
            targetUserId: updated.id,
            targetEmail: updated.email,
            before: existing.permissions,
            after: updated.permissions,
            changes,
            reason,
          } satisfies UserPermissionChangedMetadata,
        });
      }
    }

    // 4. Password change (no password or hash values logged)
    if (patch.passwordHash !== undefined && patch.passwordHash !== existing.passwordHash) {
      await this.logger({
        action: 'USER_PASSWORD_CHANGED',
        entityId: updated.id,
        entitySummary: `Changed password for ${updated.email}`,
        operatorName: this.actor.name,
        operatorRole: this.actor.title,
        metadata: {
          targetUserId: updated.id,
          targetEmail: updated.email,
          reason,
        } satisfies UserPasswordChangedMetadata,
      });
    }

    // 5. Profile fields (name, email, title)
    const changedFields: Array<{ field: 'name' | 'email' | 'title'; before: string; after: string }> = [];
    if (patch.name !== undefined && patch.name !== existing.name) {
      changedFields.push({ field: 'name', before: existing.name, after: updated.name });
    }
    if (patch.email !== undefined && patch.email.toLowerCase().trim() !== existing.email.toLowerCase().trim()) {
      changedFields.push({ field: 'email', before: existing.email, after: updated.email });
    }
    if (patch.title !== undefined && patch.title !== existing.title) {
      changedFields.push({ field: 'title', before: existing.title, after: updated.title });
    }

    if (changedFields.length > 0) {
      await this.logger({
        action: 'USER_UPDATED',
        entityId: updated.id,
        entitySummary: `Updated profile for ${updated.email} (${changedFields.map((f) => f.field).join(', ')})`,
        operatorName: this.actor.name,
        operatorRole: this.actor.title,
        metadata: {
          targetUserId: updated.id,
          targetEmail: updated.email,
          changedFields,
        } satisfies UserUpdatedMetadata,
      });
    }
  }
}

export function createAuditedUserRepository(actor: AuthUser): UserRepository {
  const inner = getUserRepository();
  const logger: AuditLogger = async (entry) => {
    await serverRecordStore.appendActivityLog(entry);
  };
  return new AuditedUserRepository(inner, logger, actor);
}

