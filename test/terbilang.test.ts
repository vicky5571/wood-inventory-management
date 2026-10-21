import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { terbilang } from '../src/utils/terbilang.ts';

describe('Terbilang (Amount in Words) Suite', () => {
  it('converts 0 correctly to NOL RUPIAH', () => {
    assert.equal(terbilang(0), 'NOL RUPIAH');
  });

  it('converts single digit 1 correctly to SATU RUPIAH', () => {
    assert.equal(terbilang(1), 'SATU RUPIAH');
  });

  it('converts teens correctly: 10, 11, 12, 19', () => {
    assert.equal(terbilang(10), 'SEPULUH RUPIAH');
    assert.equal(terbilang(11), 'SEBELAS RUPIAH');
    assert.equal(terbilang(12), 'DUA BELAS RUPIAH');
    assert.equal(terbilang(19), 'SEMBILAN BELAS RUPIAH');
  });

  it('converts tens correctly: 20, 21, 99', () => {
    assert.equal(terbilang(20), 'DUA PULUH RUPIAH');
    assert.equal(terbilang(21), 'DUA PULUH SATU RUPIAH');
    assert.equal(terbilang(99), 'SEMBILAN PULUH SEMBILAN RUPIAH');
  });

  it('converts hundreds correctly: 100, 105, 111, 200, 250', () => {
    assert.equal(terbilang(100), 'SERATUS RUPIAH');
    assert.equal(terbilang(105), 'SERATUS LIMA RUPIAH');
    assert.equal(terbilang(111), 'SERATUS SEBELAS RUPIAH');
    assert.equal(terbilang(200), 'DUA RATUS RUPIAH');
    assert.equal(terbilang(250), 'DUA RATUS LIMA PULUH RUPIAH');
  });

  it('converts thousands correctly: 1000, 1001, 1010, 1999, 2000, 15000', () => {
    assert.equal(terbilang(1000), 'SERIBU RUPIAH');
    assert.equal(terbilang(1001), 'SERIBU SATU RUPIAH');
    assert.equal(terbilang(1010), 'SERIBU SEPULUH RUPIAH');
    assert.equal(terbilang(1999), 'SERIBU SEMBILAN RATUS SEMBILAN PULUH SEMBILAN RUPIAH');
    assert.equal(terbilang(2000), 'DUA RIBU RUPIAH');
    assert.equal(terbilang(15000), 'LIMA BELAS RIBU RUPIAH');
  });

  it('converts millions correctly: 1_234_567 and 50_000_000', () => {
    assert.equal(
      terbilang(1_234_567),
      'SATU JUTA DUA RATUS TIGA PULUH EMPAT RIBU LIMA RATUS ENAM PULUH TUJUH RUPIAH'
    );
    assert.equal(terbilang(50_000_000), 'LIMA PULUH JUTA RUPIAH');
  });

  it('converts billions (miliar) correctly: 1_000_000_000', () => {
    assert.equal(terbilang(1_000_000_000), 'SATU MILIAR RUPIAH');
  });

  it('converts trillions (triliun) correctly: 1_000_000_000_000', () => {
    assert.equal(terbilang(1_000_000_000_000), 'SATU TRILIUN RUPIAH');
  });

  it('handles decimal values: 50_000_000.75 and 0.5', () => {
    assert.equal(
      terbilang(50_000_000.75),
      'LIMA PULUH JUTA KOMA TUJUH PULUH LIMA RUPIAH'
    );
    assert.equal(terbilang(0.5), 'NOL KOMA LIMA RUPIAH');
  });

  it('handles negative values by prefixing MINUS', () => {
    assert.equal(terbilang(-100), 'MINUS SERATUS RUPIAH');
  });
});
