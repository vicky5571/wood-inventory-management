import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NAV_SECTIONS,
  NAV_ITEMS,
  filterNavSections,
  isNavItemActive,
  type NavSectionConfig,
  type NavItemConfig,
} from '../src/components/layout/nav-config.ts';

test('Nav Configuration & Semantic Grouping Suite', async (t) => {
  await t.test('NAV_SECTIONS exports exactly 5 semantic sections in designated workflow order', () => {
    assert.equal(NAV_SECTIONS.length, 5);
    const sectionIds = NAV_SECTIONS.map((s) => s.id);
    assert.deepEqual(sectionIds, [
      'dashboard',
      'operations',
      'stock-billing',
      'master-data',
      'admin',
    ]);

    // Section 1: Dashboard
    assert.equal(NAV_SECTIONS[0].id, 'dashboard');
    assert.equal(NAV_SECTIONS[0].labelId, 'Dashboard');
    assert.equal(NAV_SECTIONS[0].labelZh, '概览');
    assert.deepEqual(
      NAV_SECTIONS[0].items.map((i) => i.id),
      ['analytics']
    );

    // Section 2: Operasi Harian
    assert.equal(NAV_SECTIONS[1].id, 'operations');
    assert.equal(NAV_SECTIONS[1].labelId, 'Operasi Harian');
    assert.equal(NAV_SECTIONS[1].labelZh, '日常操作');
    assert.deepEqual(
      NAV_SECTIONS[1].items.map((i) => i.id),
      ['ledger', 'tally', 'sales', 'production', 'sorting']
    );

    // Section 3: Stok & Tagihan
    assert.equal(NAV_SECTIONS[2].id, 'stock-billing');
    assert.equal(NAV_SECTIONS[2].labelId, 'Stok & Tagihan');
    assert.equal(NAV_SECTIONS[2].labelZh, '库存与账单');
    assert.deepEqual(
      NAV_SECTIONS[2].items.map((i) => i.id),
      ['inventory', 'prices', 'pending-pricing', 'report-periods', 'payment-forms']
    );

    // Section 4: Data Master
    assert.equal(NAV_SECTIONS[3].id, 'master-data');
    assert.equal(NAV_SECTIONS[3].labelId, 'Data Master');
    assert.equal(NAV_SECTIONS[3].labelZh, '主数据');
    assert.deepEqual(
      NAV_SECTIONS[3].items.map((i) => i.id),
      ['contracts', 'suppliers', 'brokers']
    );

    // Section 5: Admin
    assert.equal(NAV_SECTIONS[4].id, 'admin');
    assert.equal(NAV_SECTIONS[4].labelId, 'Admin');
    assert.equal(NAV_SECTIONS[4].labelZh, '系统管理');
    assert.deepEqual(
      NAV_SECTIONS[4].items.map((i) => i.id),
      ['activity', 'users', 'settings']
    );
  });

  await t.test('NAV_ITEMS backward-compatibility export contains all 17 items derived from NAV_SECTIONS', () => {
    assert.equal(NAV_ITEMS.length, 17);
    const expectedIds = [
      'analytics',
      'ledger',
      'tally',
      'sales',
      'production',
      'sorting',
      'inventory',
      'prices',
      'pending-pricing',
      'report-periods',
      'payment-forms',
      'contracts',
      'suppliers',
      'brokers',
      'activity',
      'users',
      'settings',
    ];
    assert.deepEqual(
      NAV_ITEMS.map((item) => item.id),
      expectedIds
    );

    const usersItem = NAV_ITEMS.find((item) => item.id === 'users');
    assert.ok(usersItem, 'Users item must exist');
    assert.equal(usersItem.minRoleLevel, 1, 'Users must restrict to minRoleLevel 1');

    const settingsItem = NAV_ITEMS.find((item) => item.id === 'settings');
    assert.ok(settingsItem, 'Settings item must exist');
    assert.equal(settingsItem.minRoleLevel, 1, 'Settings must restrict to minRoleLevel 1');
  });

  await t.test('filterNavSections returns all sections unchanged when roleLevel is null or undefined', () => {
    const withNull = filterNavSections(NAV_SECTIONS, null);
    assert.equal(withNull.length, 5);
    const totalItemsNull = withNull.reduce((sum, s) => sum + s.items.length, 0);
    assert.equal(totalItemsNull, 17);

    const withUndefined = filterNavSections(NAV_SECTIONS, undefined);
    assert.equal(withUndefined.length, 5);
    const totalItemsUndefined = withUndefined.reduce((sum, s) => sum + s.items.length, 0);
    assert.equal(totalItemsUndefined, 17);
  });

  await t.test('filterNavSections preserves all 5 sections and 17 items for Level 1 (Owner)', () => {
    const ownerSections = filterNavSections(NAV_SECTIONS, 1);
    assert.equal(ownerSections.length, 5);
    const totalItems = ownerSections.reduce((sum, s) => sum + s.items.length, 0);
    assert.equal(totalItems, 17);

    const adminSection = ownerSections.find((s) => s.id === 'admin');
    assert.ok(adminSection);
    assert.deepEqual(
      adminSection.items.map((i) => i.id),
      ['activity', 'users', 'settings']
    );
  });

  await t.test('filterNavSections hides Users and Settings from Admin section for Level 2 (Staff)', () => {
    const staffSections = filterNavSections(NAV_SECTIONS, 2);
    assert.equal(staffSections.length, 5);
    const totalItems = staffSections.reduce((sum, s) => sum + s.items.length, 0);
    assert.equal(totalItems, 15);

    const adminSection = staffSections.find((s) => s.id === 'admin');
    assert.ok(adminSection);
    assert.deepEqual(
      adminSection.items.map((i) => i.id),
      ['activity']
    );
    assert.equal(adminSection.items.some((i) => i.id === 'users'), false);
    assert.equal(adminSection.items.some((i) => i.id === 'settings'), false);
  });

  await t.test('filterNavSections hides Users and Settings from Admin section for Level 3 (Monitor)', () => {
    const monitorSections = filterNavSections(NAV_SECTIONS, 3);
    assert.equal(monitorSections.length, 5);
    const totalItems = monitorSections.reduce((sum, s) => sum + s.items.length, 0);
    assert.equal(totalItems, 15);

    const adminSection = monitorSections.find((s) => s.id === 'admin');
    assert.ok(adminSection);
    assert.deepEqual(
      adminSection.items.map((i) => i.id),
      ['activity']
    );
    assert.equal(adminSection.items.some((i) => i.id === 'users'), false);
    assert.equal(adminSection.items.some((i) => i.id === 'settings'), false);
  });

  await t.test('filterNavSections prunes sections when all constituent items are filtered out', () => {
    const customSections: NavSectionConfig[] = [
      {
        id: 'public-sec',
        labelId: 'Public',
        labelZh: '公开',
        items: [{ id: 'pub-1', labelId: 'P1', labelZh: 'P1', href: '/p1' }],
      },
      {
        id: 'owner-only-sec',
        labelId: 'Secret',
        labelZh: '私密',
        items: [
          { id: 'sec-1', labelId: 'S1', labelZh: 'S1', href: '/s1', minRoleLevel: 1 },
          { id: 'sec-2', labelId: 'S2', labelZh: 'S2', href: '/s2', minRoleLevel: 1 },
        ],
      },
    ];

    const resultForStaff = filterNavSections(customSections, 2);
    assert.equal(resultForStaff.length, 1);
    assert.equal(resultForStaff[0].id, 'public-sec');
  });

  await t.test('filterNavSections respects maxRoleLevel constraints (visible to Level 1 & 2, hidden from Level 3)', () => {
    const testSections: NavSectionConfig[] = [
      {
        id: 'custom-sec',
        labelId: 'Custom',
        labelZh: '自定义',
        items: [
          { id: 'all-role', labelId: 'All', labelZh: '全部', href: '/all' },
          { id: 'restricted-max-2', labelId: 'Max2', labelZh: '限制2', href: '/max-2', maxRoleLevel: 2 },
        ],
      },
    ];

    const level1 = filterNavSections(testSections, 1);
    assert.deepEqual(level1[0].items.map((i) => i.id), ['all-role', 'restricted-max-2']);

    const level2 = filterNavSections(testSections, 2);
    assert.deepEqual(level2[0].items.map((i) => i.id), ['all-role', 'restricted-max-2']);

    const level3 = filterNavSections(testSections, 3);
    assert.deepEqual(level3[0].items.map((i) => i.id), ['all-role']);
  });
});
