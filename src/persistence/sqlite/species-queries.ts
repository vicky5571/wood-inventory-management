import type { DatabaseSync } from 'node:sqlite';
import type { WoodSpecies } from '../../types/index.ts';
import { TIMBER_SPECIES_CATALOGUE } from '../../utils/timber-species.ts';

export interface SqliteSpeciesRow {
  id: string;
  tenant_id: string | null;
  code: string;
  common_name: string;
  botanical_name: string | null;
  density_kg_m3: number;
  is_hardwood: number;
  created_at: string;
  updated_at: string;
}

export function mapSpeciesRow(row: SqliteSpeciesRow): WoodSpecies {
  return {
    id: row.id,
    code: row.code,
    commonName: row.common_name,
    botanicalName: row.botanical_name ?? undefined,
    densityKgM3: Number(row.density_kg_m3),
    isHardwood: row.is_hardwood === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function seedSpeciesIfEmpty(db: DatabaseSync): void {
  const specCount = db.prepare('SELECT COUNT(*) AS c FROM wood_species;').get() as { c: number } | undefined;
  if (!specCount || specCount.c === 0) {
    const insertSpec = db.prepare(`
      INSERT OR IGNORE INTO wood_species (
        id, tenant_id, code, common_name, botanical_name, density_kg_m3, is_hardwood, created_at, updated_at
      ) VALUES (?, 'default-tenant', ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const sp of TIMBER_SPECIES_CATALOGUE) {
      insertSpec.run(
        sp.id,
        sp.code,
        sp.commonName,
        sp.botanicalName ?? null,
        sp.densityKgM3,
        sp.isHardwood ? 1 : 0,
        sp.createdAt || new Date().toISOString(),
        sp.updatedAt || new Date().toISOString()
      );
    }
  }
}

export function getSpeciesFromDb(db: DatabaseSync): WoodSpecies[] {
  seedSpeciesIfEmpty(db);
  const rows = db.prepare(`
    SELECT * FROM wood_species ORDER BY common_name ASC;
  `).all() as unknown as SqliteSpeciesRow[];
  return rows.map(mapSpeciesRow);
}

export function saveSpeciesToDb(
  db: DatabaseSync,
  species: Partial<WoodSpecies> & { code: string; commonName: string }
): WoodSpecies {
  seedSpeciesIfEmpty(db);
  const now = new Date().toISOString();
  const existing = db.prepare(`
    SELECT * FROM wood_species WHERE (id = ? AND id IS NOT NULL) OR code = ? LIMIT 1;
  `).get(species.id ?? null, species.code) as unknown as SqliteSpeciesRow | undefined;

  if (existing) {
    db.prepare(`
      UPDATE wood_species SET
        code = ?,
        common_name = ?,
        botanical_name = ?,
        density_kg_m3 = ?,
        is_hardwood = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      species.code,
      species.commonName.trim(),
      species.botanicalName ?? existing.botanical_name,
      species.densityKgM3 ?? existing.density_kg_m3,
      species.isHardwood !== undefined ? (species.isHardwood ? 1 : 0) : existing.is_hardwood,
      now,
      existing.id
    );
    return getSpeciesFromDb(db).find((s) => s.id === existing.id)!;
  }

  const id = species.id || `spc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  db.prepare(`
    INSERT INTO wood_species (
      id, tenant_id, code, common_name, botanical_name, density_kg_m3, is_hardwood, created_at, updated_at
    ) VALUES (?, 'default-tenant', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    species.code,
    species.commonName.trim(),
    species.botanicalName ?? null,
    species.densityKgM3 ?? 650.0,
    species.isHardwood ? 1 : 0,
    species.createdAt || now,
    now
  );

  return {
    id,
    code: species.code,
    commonName: species.commonName.trim(),
    botanicalName: species.botanicalName,
    densityKgM3: species.densityKgM3 ?? 650.0,
    isHardwood: species.isHardwood ?? true,
    createdAt: species.createdAt || now,
    updatedAt: now,
  };
}
