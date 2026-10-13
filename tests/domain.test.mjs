import test from 'node:test';
import assert from 'node:assert/strict';
import {businessDay, paymentMonth, validMileage, normalizePlate, validPhoto, relationRows} from '../lib/domain.ts';
import {allRows} from '../lib/data.ts';

test('business date stays in Sao Paulo at UTC midnight', () => {
  assert.equal(businessDay(new Date('2026-10-01T01:00:00Z')), '2026-09-30');
  assert.equal(businessDay(new Date('2026-10-01T03:00:00Z')), '2026-10-01');
});
test('revenue follows actual payment date, excluding undated payments', () => {
  assert.equal(paymentMonth('2026-10-01T01:00:00Z'), '2026-09');
  assert.equal(paymentMonth(null), null);
  assert.equal(paymentMonth('invalid'), null);
});
test('mileage accepts zero but rejects empty, negative and fractional values', () => {
  assert.equal(validMileage('0'), true);
  for (const value of ['', ' ', '-1', '2.5', 'NaN', 'Infinity']) assert.equal(validMileage(value), false);
});
test('plate normalization preserves old and Mercosul formats', () => {
  assert.equal(normalizePlate('abc-1234'), 'ABC1234');
  assert.equal(normalizePlate('abc 1d23'), 'ABC1D23');
});
test('photo validation rejects nonimages, empty and oversized uploads', () => {
  assert.equal(validPhoto({size: 1024, type: 'image/jpeg'}), true);
  assert.equal(validPhoto({size: 1024, type: 'text/html'}), false);
  assert.equal(validPhoto({size: 0, type: 'image/png'}), false);
  assert.equal(validPhoto({size: 11 * 1024 * 1024, type: 'image/webp'}), false);
});
test('dashboard pagination retrieves rows beyond API limits', async () => {
  const rows = Array.from({length: 1001}, (_, id) => ({id}));
  const result = await allRows(async (from, to) => ({data: rows.slice(from, to + 1), error: null}));
  assert.equal(result.data.length, 1001);
});
test('pagination fails instead of displaying incomplete financial totals', async () => {
  const result = await allRows(async from => from === 0
    ? {data: Array(500).fill({id: 1}), error: null}
    : {data: null, error: {message: 'Connection failed'}});
  assert.equal(result.data, null);
  assert.equal(result.error.message, 'Connection failed');
});
test('one-to-one attendance embedding preserves inspection and delivery state', () => {
  const attendance = {id: 'fixture', inspection_completed_at: '2026-10-13T12:00:00Z'};
  assert.deepEqual(relationRows(attendance), [attendance]);
  assert.deepEqual(relationRows([attendance]), [attendance]);
  assert.deepEqual(relationRows(null), []);
});
