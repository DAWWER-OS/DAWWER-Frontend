const { test, expect } = require('@playwright/test');
const { token } = require('../helpers.cjs');
const XLSX = require('../../assets/vendor/sheetjs/xlsx.full.min.js');
const store = 'aaaaaaaa-0000-0000-0000-000000000001';
const access = token();
async function setup(page, { authenticated = true, products = [], drafts = [] } = {}) {
  if (authenticated) await page.addInitScript(({ access, store }) => {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('activeStoreId', store);
    localStorage.setItem('userData', JSON.stringify({ userId: 'u', role: 'Merchant', fullName: 'تاجر الاختبار', email: 'merchant@example.com' }));
    localStorage.setItem('dawwer_active_store', JSON.stringify({ storeId: store, storeName: 'متجر الاختبار', permissions: ['Products.Manage', 'Inventory.Manage'] }));
  }, { access, store });
  await page.route(/^https:\/\/(?!dawwer\.runasp\.net|dawwer-backend-fastapi\.onrender\.com)/, route => route.abort());
  await page.route('https://dawwer.runasp.net/api/**', route => {
    const url = new URL(route.request().url());
    let data = [];
    if (/\/merchant\/stores$/.test(url.pathname)) data = [{ id: store, name: 'متجر الاختبار', verificationStatus: 5 }];
    if (/\/Auth\/select-store$/.test(url.pathname)) data = { accessToken: access, storeId: store, storeName: 'متجر الاختبار', effectivePermissions: ['Products.Manage'] };
    if (/\/Profile$|\/Auth\/me$/.test(url.pathname)) data = { role: 'Merchant', fullName: 'تاجر الاختبار', email: 'merchant@example.com' };
    return route.fulfill({ json: { success: true, data } });
  });
  await page.route('https://dawwer-backend-fastapi.onrender.com/**', route => {
    const url = new URL(route.request().url());
    const skip = Number(url.searchParams.get('skip') || 0), limit = Number(url.searchParams.get('limit') || 50);
    let body = [];
    if (url.pathname.endsWith('/products')) body = products.slice(skip, skip + limit);
    else if (url.pathname.endsWith('/draft-products')) body = drafts.slice(skip, skip + limit);
    else if (/\/shelf-jobs\/[^/]+$/.test(url.pathname)) body = { id: 'job', status: 'REVIEW_REQUIRED', zone: 'أ', aisle: '01' };
    else if (url.pathname === `/api/v1/stores/${store}`) body = { id: store, name: 'متجر الاختبار' };
    return route.fulfill({ json: body });
  });
}

test('all application pages initialize without JavaScript exceptions', async ({ page }) => {
  await setup(page);
  const errors = [];
  page.on('pageerror', error => errors.push(`${page.url()}: ${error.stack}`));
  for (const file of ['dashboard', 'catalog', 'ai-capture', 'review-drafts', 'inventory-audit', 'merchant-application', 'profile', 'orders', 'store-staff', 'shelves', 'delivery-settings', 'payment-review', 'select-store', 'register', 'reset-password', 'forgot-password', 'verify-account']) {
    await page.goto(`/${file}.html`);
    await page.waitForLoadState('networkidle');
  }
  expect(errors).toEqual([]);
});

test('bad credentials keep the login form and show the server error', async ({ page }) => {
  await setup(page, { authenticated: false });
  await page.route('**/api/Auth/login', route => route.fulfill({ status: 401, json: { success: false, message: 'بيانات الدخول غير صحيحة' } }));
  await page.goto('/login.html');
  await page.locator('#email-input').fill('admin@dawwer.com');
  await page.locator('#password-input').fill('wrong');
  await page.locator('#submit-btn').click();
  await expect(page.locator('#error-message')).toContainText('بيانات الدخول غير صحيحة');
  expect(await page.evaluate(() => localStorage.getItem('accessToken'))).toBeNull();
  await expect(page).toHaveURL(/login\.html$/);
});

test('real XLSX upload reaches mapping and a failed import remains reviewable', async ({ page }) => {
  await setup(page);
  await page.route('**/catalog/bulk-import', route => route.fulfill({ status: 422, json: { detail: 'خطأ استيراد من الخادم' } }));
  const sheet = XLSX.utils.aoa_to_sheet([['Product Name', 'SKU', 'Price', 'Category'], ['حليب طازج', 'MILK-01', 12.5, 'ألبان']]);
  const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, 'Products');
  await page.goto('/catalog.html');
  await page.locator('#btn-import-catalog').click();
  await page.locator('#csv-file-input').setInputFiles({ name: 'products.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(XLSX.write(book, { type: 'buffer', bookType: 'xlsx' })) });
  await expect(page.locator('#map-name')).toHaveValue('Product Name');
  await expect(page.locator('#map-sku')).toHaveValue('SKU');
  await page.locator('#btn-wizard-next').click();
  await page.locator('#btn-wizard-next').click();
  await page.locator('#btn-wizard-commit').click();
  await expect(page.locator('#btn-wizard-commit')).toBeEnabled();
  await expect(page.locator('#wizard-step-4')).toBeVisible();
  await expect(page.locator('body')).toContainText('خطأ استيراد من الخادم');
});

test('AI review loads all 125 drafts and a failure does not mark them approved', async ({ page }) => {
  const drafts = Array.from({ length: 125 }, (_, index) => ({ id: `draft-${index}`, proposed_name: `منتج ${index}`, estimated_price: 2, status: 'PENDING_REVIEW' }));
  await setup(page, { drafts });
  await page.route('**/draft-products/*/approve', route => route.fulfill({ status: 500, json: { detail: 'فشل الاعتماد' } }));
  await page.goto('/review-drafts.html?job_id=job');
  await expect(page.locator('[data-action="approve-single"], [data-action="approve-draft"]')).toHaveCount(125);
  await page.locator('[data-action="approve-single"], [data-action="approve-draft"]').first().click();
  await expect(page.locator('body')).toContainText('فشل الاعتماد');
  await expect(page.locator('[data-action="approve-single"], [data-action="approve-draft"]')).toHaveCount(125);
});

test('manual product creation keeps the form open after server rejection', async ({ page }) => {
  await setup(page);
  let payload;
  await page.route('**/products', route => {
    if (route.request().method() !== 'POST') return route.fallback();
    payload = route.request().postDataJSON();
    return route.fulfill({ status: 500, json: { detail: 'تعذر حفظ المنتج' } });
  });
  await page.goto('/catalog.html');
  await page.locator('#btn-add-product').click();
  await page.locator('#form-name').fill('صنف جديد');
  await page.locator('#form-price').fill('2.5');
  await page.locator('#form-quantity').fill('0');
  await page.locator('#product-form button[type="submit"]').click();
  await expect(page.locator('body')).toContainText('تعذر حفظ المنتج');
  await expect(page.locator('#product-modal')).toBeVisible();
  expect(payload.store_sku).toEqual(expect.any(String));
  expect(payload.quantity).toBe(0);
  expect(payload.stock_status).toBe('OUT_OF_STOCK');
});

test('all selected shelf images are uploaded once and receive separate jobs', async ({ page }) => {
  await setup(page);
  let uploads = 0;
  await page.route('**/shelf-jobs', route => {
    if (route.request().method() !== 'POST') return route.fallback();
    uploads++;
    return route.fulfill({ json: { id: `job-${uploads}`, status: 'REVIEW_REQUIRED' } });
  });
  await page.goto('/ai-capture.html');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jHvsAAAAASUVORK5CYII=', 'base64');
  await page.locator('#file-input').setInputFiles([1, 2].map(id => ({ name: `shelf-${id}.png`, mimeType: 'image/png', buffer: png })));
  await expect(page.locator('#btn-start-extraction')).toBeEnabled();
  await page.locator('#btn-start-extraction').click();
  await expect(page).toHaveURL(/review-drafts\.html\?job_id=job-1/);
  expect(uploads).toBe(2);
});

test('admin dashboard initializes with a server-issued admin role', async ({ page }) => {
  await setup(page);
  await page.addInitScript(() => localStorage.setItem('userData', JSON.stringify({ userId: 'a', role: 'Admin', fullName: 'المسؤول' })));
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack));
  await page.goto('/admin-dashboard.html');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/admin-dashboard\.html$/);
  expect(errors).toEqual([]);
});

test('numeric Excel identifiers retain leading zeros through the saved JSON payload', async ({ page }) => {
  await setup(page);
  let payload;
  await page.route('**/products', route => {
    if (route.request().method() !== 'POST') return route.fallback();
    payload = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: { ...payload, id: 'saved-product' } });
  });
  await page.goto('/catalog.html');
  await page.locator('#btn-import-catalog').click();
  await page.locator('#csv-file-input').setInputFiles({ name: 'products.csv', mimeType: 'text/csv', buffer: Buffer.from('Product Name,SKU,Price,Quantity\nمنتج,0012345678901,0,0') });
  await expect(page.locator('#map-sku')).toHaveValue('SKU');
  await expect(page.locator('#map-quantity')).toHaveValue('Quantity');
  await page.locator('#btn-wizard-next').click();
  await page.locator('#btn-wizard-next').click();
  await page.locator('#btn-wizard-commit').click();
  await expect(page.locator('#wizard-step-4')).toBeHidden();
  expect(payload.store_sku).toBe('0012345678901');
  expect(payload.barcode).toBe('0012345678901');
  expect(payload.price).toBe(0);
  expect(payload.quantity).toBe(0);
});

test('files without SKU can use a generated identifier without mapping the price as SKU', async ({ page }) => {
  await setup(page);
  let upload;
  await page.route('**/catalog/bulk-import', route => {
    upload = route.request().postData();
    return route.fulfill({ json: { valid_count: 1, error_count: 0, errors: [] } });
  });
  await page.goto('/catalog.html');
  await page.locator('#btn-import-catalog').click();
  await page.locator('#csv-file-input').setInputFiles({ name: 'products.csv', mimeType: 'text/csv', buffer: Buffer.from('Product Name,Price\nحليب طازج,12.5') });
  await expect(page.locator('#map-sku')).toHaveValue('');
  await page.locator('#btn-wizard-next').click();
  await page.locator('#btn-wizard-next').click();
  await page.locator('#btn-wizard-commit').click();
  await expect(page.locator('#wizard-step-4')).toBeHidden();
  expect(upload).toContain('IMP-');
});
