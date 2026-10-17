const { test } = require('node:test');
const assert = require('node:assert/strict');
const { harness, token } = require('./helpers.cjs');
const importer = require('../js/catalog-import.js');
const XLSX = require('../assets/vendor/sheetjs/xlsx.full.min.js');

test('CSV keeps Arabic, escaped quotes, apostrophes, leading zeros and multiline cells', () => {
  const parsed = importer.parseCSV('\uFEFFname;sku;price\r\n"حليب ""طازج""\nO\'Brien";001234;١٢٫٥\r\n');
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0][0], 'حليب "طازج"\nO\'Brien');
  assert.equal(parsed.rows[0][1], '001234');
  assert.equal(importer.number(parsed.rows[0][2]), 12.5);
  assert.ok(Number.isNaN(importer.number('12abc')));
  assert.throws(() => importer.parseCSV('a,b\n"unclosed,1'), /اقتباس/);
});

test('real XLSX binary roundtrip retains formatted barcode values', () => {
  const sheet = XLSX.utils.aoa_to_sheet([['اسم المنتج', 'SKU', 'السعر'], ['منتج', '0012345678901', 12.5]]);
  const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, 'Products');
  const binary = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
  const read = XLSX.read(binary, { type: 'buffer' });
  const rows = XLSX.utils.sheet_to_json(read.Sheets.Products, { header: 1, raw: false });
  assert.equal(rows[1][1], '0012345678901');
  assert.equal(rows[1][2], '12.5');
});

test('Excel currency formats are numeric prices and zero-padded numeric SKUs remain text', () => {
  const sheet = XLSX.utils.aoa_to_sheet([['name', 'sku', 'price'], ['منتج', 123, 12.5]]);
  sheet.B2.z = '000000'; sheet.C2.z = '"₪"0.00';
  const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, 'Products');
  const buffer = XLSX.write(book, { type: 'array', bookType: 'xlsx' });
  const parsed = importer.readWorkbook(buffer, XLSX);
  assert.equal(parsed.rows[0][1], '000123');
  assert.equal(parsed.rows[0][2], '12.5');
});

test('import serializes the actual FastAPI field names and location', () => {
  const csv = importer.toCSV([{ name: 'حليب, طازج', sku: 'AB-01', price: 12.5, quantity: 0, location: { zone: 'أ', aisle: '01', shelf: '02' } }]);
  const { headers, rows } = importer.parseCSV(csv);
  assert.ok(headers.includes('store_sku'));
  assert.ok(headers.includes('map_target'));
  assert.equal(rows[0][0], 'حليب, طازج');
  assert.equal(rows[0][headers.indexOf('quantity')], '0');
});

test('failed login does not fabricate a session or promote an admin email', async () => {
  const { api, auth, context, load, run, elements } = harness();
  for (const id of ['email-input', 'password-input', 'error-message', 'submit-btn']) elements[id] = { value: '', classList: { add() {}, remove() {} } };
  elements['email-input'].value = 'admin@dawwer.com'; elements['password-input'].value = 'wrong';
  load('login'); api.auth.login = async () => { throw new Error('Invalid credentials'); };
  await run('handleLogin({ preventDefault() {} })');
  assert.equal(auth.isAuthenticated(), false);
  assert.equal(context.localStorage.getItem('role'), null);
  assert.equal(elements['error-message'].textContent, 'Invalid credentials');
  assert.equal(elements['submit-btn'].disabled, false);
});

test('successful login stores only the server session and uses the server role', async () => {
  const { api, context, load, run, elements } = harness();
  for (const id of ['email-input', 'password-input', 'error-message', 'submit-btn']) elements[id] = { value: '', classList: { add() {}, remove() {} } };
  elements['email-input'].value = 'admin@dawwer.com'; elements['password-input'].value = 'ValidPassword!1';
  load('login'); const access = token();
  api.auth.login = async () => ({ accessToken: access, refreshToken: 'server-refresh', role: 'Merchant', userId: 'real-user' });
  await run('handleLogin({ preventDefault() {} })');
  assert.equal(context.localStorage.getItem('accessToken'), access);
  assert.equal(context.redirect, 'select-store.html');
  assert.equal(context.localStorage.getItem('activeStoreId'), null);
});

test('login requiring verification continues to OTP without saving access credentials', async () => {
  const { api, context, load, run, elements } = harness();
  for (const id of ['email-input', 'password-input', 'error-message', 'submit-btn']) elements[id] = { value: 'merchant@example.com', classList: { add() {}, remove() {} } };
  load('login'); api.auth.login = async () => ({ requiresVerification: true });
  await run('handleLogin({ preventDefault() {} })');
  assert.match(context.redirect, /^verify-account.html\?email=/);
  assert.equal(context.localStorage.getItem('accessToken'), null);
});

test('password reset submits required confirmPassword and never claims success on rejection', async () => {
  const { api, load, run, elements } = harness();
  for (const id of ['email-input', 'token-input', 'new-pass-input', 'confirm-pass-input', 'alert-message', 'submit-btn']) elements[id] = { value: 'NewPassword!1', classList: { add() {} } };
  elements['email-input'].value = 'merchant@example.com';
  load('reset-password'); let payload;
  api.post = async (_, body) => { payload = body; throw new Error('Invalid reset token'); };
  await run('handleResetPassword({ preventDefault() {} })');
  assert.equal(payload.confirmPassword, 'NewPassword!1');
  assert.equal(elements['alert-message'].textContent, 'Invalid reset token');
  assert.equal(elements['submit-btn'].disabled, false);
});

test('review loads cached jobs and partial approval preserves failed and unselected drafts', async () => {
  const { api, context, load, run } = harness(); load('review-drafts');
  run(`renderBoundingBoxes = renderDraftCards = updateSelectionSummary = () => {};
    showToast = (...args) => { window.lastToast = args; };
    activeJob = { id: 'job', extractedItems: [
      { id: 'a', name: 'A', price: 1, status: 'Draft' },
      { id: 'b', name: 'B', price: 2, status: 'Draft' },
      { id: 'c', name: 'C', price: 3, status: 'Draft' }
    ] };
    allJobs = [activeJob]; draftItems = activeJob.extractedItems.map(d => ({ ...d, serverId: d.id }));
    selectedDraftIds = new Set(['a', 'b']);`);
  const updates = []; const creates = [];
  api.draftProducts.update = async (_, id, body) => { updates.push(body); return body; };
  api.draftProducts.approve = async (_, id) => { if (id === 'b') throw new Error('Server failed'); return { status: 'APPROVED' }; };
  api.products.create = async (...args) => { creates.push(args); };
  await run('approveAllDrafts()');
  assert.equal(run('draftItems[0].status'), 'Approved');
  assert.equal(run('draftItems[1].status'), 'Draft');
  assert.equal(run('draftItems[2].status'), 'Draft');
  assert.equal(creates.length, 0);
  assert.equal(updates[0].proposed_name, 'A');
  assert.equal(updates[0].estimated_price, 1);
  assert.equal(run('activeJob.status'), 'Review Required');
  assert.match(context.lastToast[0], /Server failed/);
  run('saveJobsData(); allJobs = []; loadJobsData();');
  assert.equal(run('allJobs.length'), 1);
});

test('store selection consumes actual accessToken and effectivePermissions fields', async () => {
  const { api, auth, context } = harness();
  context.localStorage.setItem('accessToken', token());
  const scoped = token({ storeId: 'aaaaaaaa-0000-0000-0000-000000000001' });
  api.post = async () => ({ success: true, data: { accessToken: scoped, storeId: 'aaaaaaaa-0000-0000-0000-000000000001', effectivePermissions: ['Products.Manage'], accessScope: 'Zones', zoneIds: ['zone-a'] } });
  await auth.selectStore('aaaaaaaa-0000-0000-0000-000000000001');
  assert.equal(context.localStorage.getItem('storeToken'), scoped);
  assert.equal(auth.getActiveStore().permissions[0], 'Products.Manage');
  assert.equal(auth.getActiveStore().accessScope, 'Zones');
  assert.equal(auth.getActiveStore().zoneIds[0], 'zone-a');
});

test('shelf upload images resolve against FastAPI while merchant documents use the platform host', () => {
  const { run } = harness();
  assert.equal(run("CONFIG.resolveImageUrl('/uploads/shelf_jobs/store/image.jpg', 'fastapi')"), 'https://dawwer-backend-fastapi.onrender.com/uploads/shelf_jobs/store/image.jpg');
  assert.equal(run("CONFIG.resolveImageUrl('/uploads/documents/license.pdf')"), 'https://dawwer.runasp.net/uploads/documents/license.pdf');
});
