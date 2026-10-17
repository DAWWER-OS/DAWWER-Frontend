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

test('dashboard reveals details on demand and retains both charts', async ({ page }) => {
  await setup(page, { products: [{ id: 'low', product_name: 'حليب', quantity: 2, price: 5 }] });
  await page.goto('/dashboard.html');
  await expect(page.locator('#recent-shelf-jobs-tbody')).toHaveCount(0);
  await expect(page.locator('#sales-orders-chart')).toBeVisible();
  await expect(page.locator('#categories-donut-chart')).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(Chart.getChart('sales-orders-chart') && Chart.getChart('categories-donut-chart')))).toBe(true);
  await expect(page.locator('#kpi-shelf-mapping-pct')).toBeHidden();
  await page.locator('#kpi-metrics-grid summary').first().click();
  await expect(page.locator('#kpi-shelf-mapping-pct')).toBeVisible();
  await expect(page.locator('#low-stock-items-container')).toBeHidden();
  await page.getByText('أصناف تحتاج تعبئة', { exact: false }).click();
  await expect(page.locator('#low-stock-items-container')).toBeVisible();
  await page.evaluate(() => scrollTo(0,0));
  await page.screenshot({ path: 'test-results/dashboard-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/dashboard-mobile.png', fullPage: true });
});

test('Excel success submits mapped products and location with no lost barcode digits', async ({ page }) => {
  await setup(page);
  const saved = [];
  await page.route('**/products', route => {
    if (route.request().method() !== 'POST') return route.fallback();
    const payload = route.request().postDataJSON(); saved.push(payload);
    return route.fulfill({ status: 201, json: { ...payload, id: `saved-${saved.length}` } });
  });
  const sheet = XLSX.utils.aoa_to_sheet([['Product Name','SKU','Price','Quantity','Zone'], ['حليب','0012345678901',12.5,4,'أ'], ['ماء','0098765432100',0,0,'ب']]);
  const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, 'Products');
  await page.goto('/catalog.html');
  await expect(page.locator('.product-entry-card')).toHaveCount(3);
  await page.locator('#btn-import-catalog').click();
  await page.locator('#csv-file-input').setInputFiles({ name: 'products.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(XLSX.write(book, { type: 'buffer', bookType: 'xlsx' })) });
  await expect(page.locator('#map-name')).toHaveValue('Product Name');
  await expect(page.locator('#map-price')).toHaveValue('Price');
  await page.locator('#btn-wizard-next').click(); await page.locator('#btn-wizard-next').click();
  await page.locator('#btn-wizard-commit').click();
  await expect(page.locator('#wizard-step-4')).toBeHidden();
  expect(saved.map(p => p.store_sku)).toEqual(['0012345678901','0098765432100']);
  expect(saved[0]).toMatchObject({ product_name:'حليب', price:12.5, quantity:4, zone:'أ' });
  expect(saved[1]).toMatchObject({ price:0, quantity:0, stock_status:'OUT_OF_STOCK' });
  await page.setViewportSize({ width:390, height:844 });
  await expect(page.locator('#main-sidebar')).toHaveClass(/drawer-closed/);
  await expect(page.locator('#main-sidebar')).toHaveCSS('opacity', '0');
  await page.evaluate(() => scrollTo(0,0));
  await page.screenshot({ path:'test-results/catalog-mobile.png', fullPage:true });
});

test('staff uses server roles and permissions, creates employees and keeps rejected role edits open', async ({ page }) => {
  await setup(page);
  const role = { id:'bbbbbbbb-0000-0000-0000-000000000001', name:'مسؤول المخزون', permissions:[{ code:'Inventory.Manage', name:'إدارة المخزون' }] };
  await page.route('**/roles', route => route.fulfill({ json:{ success:true, data:[role] } }));
  let employee;
  await page.route('**/staff', route => {
    if (route.request().method() === 'POST') { employee = route.request().postDataJSON(); return route.fulfill({ json:{ success:true, data:{...employee,id:'employee-1'} } }); }
    return route.fulfill({ json:{ success:true, data:employee ? [{...employee,id:'employee-1',roleName:role.name,status:'Suspended'}] : [] } });
  });
  await page.goto('/store-staff.html');
  await expect(page.locator('#roles-matrix-container')).toContainText('إدارة المخزون');
  await expect(page.locator('#roles-matrix-container')).not.toContainText('[object Object]');
  await page.locator('#open-staff-modal-btn').click();
  await page.locator('#staff-name').fill('سالم منصور'); await page.locator('#staff-email').fill('staff@example.com');
  await page.locator('#staff-role-select').selectOption(role.id); await page.locator('#staff-temp-pass').fill('TempPassword!1');
  await page.locator('#save-staff-btn').click();
  await expect(page.locator('#staff-modal')).toBeHidden();
  expect(employee.storeRoleId).toBe(role.id);
  await expect(page.locator('#staff-table-body')).toContainText('موقوف');
  await page.route('**/roles/*', route => route.fulfill({ status:403, json:{ success:false, message:'لا يمكن تعديل الدور' } }));
  await page.locator('[data-edit-role]').click();
  await expect(page.locator('input[name="role-perms"][value="Inventory.Manage"]')).toBeChecked();
  await page.locator('#save-role-btn').click();
  await expect(page.locator('#role-form-error')).toContainText('لا يمكن تعديل الدور');
  await expect(page.locator('#role-modal')).toBeVisible();
});

test('forgot password handles nested delivery failure and only continues after server acceptance', async ({ page }) => {
  await setup(page, { authenticated:false });
  let payload, fail = true;
  await page.route('**/Auth/forgot-password', route => {
    payload = route.request().postDataJSON();
    return route.fulfill({ json:{ success:true, data:{ success:!fail, message:fail ? 'تعذر إرسال البريد' : 'تم قبول طلب الاستعادة' } } });
  });
  await page.goto('/forgot-password.html');
  await page.locator('#email-input').fill('merchant@example.com'); await page.locator('#submit-btn').click();
  await expect(page.locator('#alert-message')).toContainText('تعذر إرسال البريد');
  await expect(page.locator('#submit-btn')).toBeEnabled();
  expect(payload).toEqual({ email:'merchant@example.com' });
  fail = false; await page.locator('#submit-btn').click();
  await expect(page).toHaveURL(/reset-password.html\?email=merchant%40example.com/);
});

test('merchant map loads the full live catalog and isolates saved maps by store', async ({ page }) => {
  const products = Array.from({length:65}, (_, i) => ({id:`p-${i}`,product_name:`منتج ${i}`,store_sku:`sku-${i}`}));
  await setup(page, { products });
  const errors=[]; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/store-map.html');
  const map = page.frameLocator('#store-map-frame');
  await expect(map.locator('#appShell')).toBeVisible();
  await expect(map.locator('#productCount')).toHaveText('65');
  await expect(map.locator('#loadDemoButton')).toBeHidden();
  await map.locator('#saveButton').click();
  const key = `dawwer-map:${store}:layout`;
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  expect(saved.id).toBe(store); expect(saved.products).toHaveLength(65);
  expect(saved.locations).toEqual([]);
  await page.screenshot({path:'test-results/store-map-desktop.png',fullPage:true});
  await page.reload(); await expect(map.locator('#appShell')).toBeVisible();
  const otherStore='aaaaaaaa-0000-0000-0000-000000000002';
  await page.evaluate(otherStore => { localStorage.setItem('activeStoreId',otherStore); localStorage.setItem('dawwer_active_store',JSON.stringify({storeId:otherStore})); }, otherStore);
  await page.reload(); await expect(map.locator('#appShell')).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key),`dawwer-map:${otherStore}:layout`)).toBeNull();
  expect(errors).toEqual([]);
});

async function setupScopedStaff(page, supported = true) {
  await setup(page);
  const role={id:'bbbbbbbb-0000-0000-0000-000000000001',name:'مسؤول مخزون',permissionCodes:['Inventory.View','Inventory.Manage']};
  const zones=[{id:'zone-a',name:'الألبان',isActive:true},{id:'zone-b',name:'المشروبات',isActive:true}];
  await page.route('**/roles', route => route.fulfill({json:{success:true,data:[role]}}));
  await page.route('**/staff/scope-options', route => supported
    ? route.fulfill({json:{success:true,data:{contractVersion:1,supportsZoneScope:true,zones}}})
    : route.fulfill({status:404,json:{success:false,message:'Not supported'}}));
  return {role,zones};
}

test('zone employee creation and editing send exact scope and show only confirmed assignments',async({page})=>{
  const {role}=await setupScopedStaff(page);
  let employee,creates=0,updates=0,lastUpdate;
  await page.route('**/staff',route=>{
    if(route.request().method()==='POST'){
      creates++;employee={...route.request().postDataJSON(),id:'employee-1',roleName:role.name,status:'Active'};
      return route.fulfill({json:{success:true,data:employee}});
    }
    return route.fulfill({json:{success:true,data:employee?[employee]:[]}});
  });
  await page.route('**/staff/employee-1',route=>{
    updates++;lastUpdate=route.request().postDataJSON();employee={...employee,...lastUpdate};
    return route.fulfill({json:{success:true,data:employee}});
  });
  await page.goto('/store-staff.html');await page.locator('#open-staff-modal-btn').click();
  await page.locator('#staff-name').fill('سالم');await page.locator('#staff-email').fill('zone@example.com');
  await page.locator('#staff-role-select').selectOption(role.id);await page.locator('#staff-temp-pass').fill('TempPassword!1');
  await page.locator('#staff-access-scope').selectOption('Zones');
  await expect(page.locator('input[name="staff-zone"]')).toHaveCount(2);
  await page.locator('#save-staff-btn').click();
  await expect(page.locator('#staff-form-error')).toContainText('اختر زونًا');expect(creates).toBe(0);
  await page.locator('input[name="staff-zone"][value="zone-a"]').check();await page.locator('#save-staff-btn').click();
  await expect(page.locator('#staff-modal')).toBeHidden();
  expect(creates).toBe(1);expect(employee).toMatchObject({accessScope:'Zones',zoneIds:['zone-a']});
  await expect(page.locator('#staff-table-body')).toContainText('الألبان');
  await page.locator('[data-edit-staff]').click();
  await expect(page.locator('input[name="edit-staff-zone"][value="zone-a"]')).toBeChecked();
  await page.locator('input[name="edit-staff-zone"][value="zone-a"]').uncheck();
  await page.locator('input[name="edit-staff-zone"][value="zone-b"]').check();await page.locator('#save-staff-access-btn').click();
  await expect(page.locator('#staff-access-modal')).toBeHidden();
  expect(lastUpdate).toEqual({storeRoleId:role.id,accessScope:'Zones',zoneIds:['zone-b']});expect(updates).toBe(1);
  await expect(page.locator('#staff-table-body')).toContainText('المشروبات');
  await page.locator('[data-edit-staff]').click();await page.locator('#edit-staff-access-scope').selectOption('Store');await page.locator('#save-staff-access-btn').click();
  await expect(page.locator('#staff-access-modal')).toBeHidden();
  expect(lastUpdate).toEqual({storeRoleId:role.id,accessScope:'Store',zoneIds:[]});
});

test('unsupported zone API blocks restricted creation without silently creating store-wide staff',async({page})=>{
  const {role}=await setupScopedStaff(page,false);let creates=0;
  await page.route('**/staff',route=>{if(route.request().method()==='POST')creates++;return route.fulfill({json:{success:true,data:[]}});});
  await page.goto('/store-staff.html');await page.locator('#open-staff-modal-btn').click();
  await page.locator('#staff-name').fill('سالم');await page.locator('#staff-email').fill('zone@example.com');await page.locator('#staff-role-select').selectOption(role.id);await page.locator('#staff-temp-pass').fill('TempPassword!1');
  await page.locator('#staff-access-scope').selectOption('Zones');
  await expect(page.locator('#staff-scope-status')).toContainText('غير متاح');
  await page.locator('#save-staff-btn').click();await expect(page.locator('#staff-form-error')).toContainText('تعذر تأكيد');expect(creates).toBe(0);
  await expect(page.locator('#staff-modal')).toBeVisible();
});

test('scope edits stay open on missing server confirmation and on forbidden updates',async({page})=>{
  const {role}=await setupScopedStaff(page);
  const employee={id:'employee-1',fullName:'سالم',storeRoleId:role.id,accessScope:'Zones',zoneIds:['zone-a']};
  await page.route('**/staff',route=>route.fulfill({json:{success:true,data:[employee]}}));
  let forbidden=false;
  await page.route('**/staff/employee-1',route=>forbidden
    ?route.fulfill({status:403,json:{success:false,message:'لا يمكنك منح نطاق أوسع'}})
    :route.fulfill({json:{success:true,data:{id:'employee-1'}}}));
  await page.goto('/store-staff.html');await page.locator('[data-edit-staff]').click();
  await page.locator('input[name="edit-staff-zone"][value="zone-b"]').check();await page.locator('#save-staff-access-btn').click();
  await expect(page.locator('#staff-access-error')).toContainText('لم يؤكد الخادم');
  await expect(page.locator('#staff-access-modal')).toBeVisible();
  forbidden=true;await page.locator('#save-staff-access-btn').click();await expect(page.locator('#staff-access-error')).toContainText('لا يمكنك منح نطاق أوسع');
  await expect(page.locator('#save-staff-access-btn')).toBeEnabled();
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'test-results/staff-scope-mobile.png',fullPage:true});
});

test('map editor and shopper follow the site theme without reloading or losing the layout', async ({page})=>{
  await setup(page,{products:[{id:'theme-product',product_name:'حليب',store_sku:'MILK'}]});
  await page.addInitScript(store=>{
    localStorage.setItem('theme','light');
    localStorage.setItem(`dawwer-map:${store}:layout`,JSON.stringify({id:store,name:'متجر الاختبار',floors:[{id:'floor-1',width:1200,height:720}],entrance:{x:600,y:585},products:[],locations:[],elements:[
      {id:'theme-wall',type:'wall',x:100,y:100,w:1000,h:9,rotation:0},
      {id:'theme-shelf',type:'shelf',shelfId:'S-01',aisle:'01',x:400,y:200,w:42,h:180,rotation:0,sections:4,levels:5,label:'الرف S-01'},
      {id:'theme-entrance',type:'entrance',x:550,y:593,w:100,h:27,rotation:0,label:'المدخل'}
    ]}));
  },store);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/store-map.html');
  const map=page.frameLocator('#store-map-frame');
  await expect(map.locator('#appShell')).toBeVisible();
  await expect(map.locator('html')).not.toHaveClass(/dark/);
  await expect(map.locator('.left-panel')).toHaveCSS('background-color','rgb(255, 255, 255)');
  await expect(map.locator('.map-object.shelf')).toHaveCSS('background-color','rgb(34, 85, 61)');
  const frame=page.frames().find(frame=>frame.url().includes('/assets/store-map/index.html'));
  await frame.evaluate(()=>window.themeTestMarker='preserved');
  await page.screenshot({path:'test-results/map-theme-light.png',fullPage:true});
  await page.locator('#theme-toggle-btn').click();
  await expect(map.locator('html')).toHaveClass(/dark/);
  await expect(map.locator('.left-panel')).toHaveCSS('background-color','rgb(15, 23, 42)');
  await expect(map.locator('.map-surface')).toHaveCSS('background-color','rgb(17, 28, 46)');
  expect(await frame.evaluate(()=>window.themeTestMarker)).toBe('preserved');
  expect(await frame.evaluate(()=>window.DawerEditor.getStore().elements.find(el=>el.id==='theme-shelf').shelfId)).toBe('S-01');
  await page.screenshot({path:'test-results/map-theme-dark.png',fullPage:true});
  await map.locator('.map-object.shelf').focus();
  await map.locator('.map-object.shelf').press('Enter');
  await expect(map.locator('#shelfWorkspace')).toBeVisible();
  await expect(map.locator('.position-slot').first()).toHaveCSS('background-color','rgb(15, 23, 42)');
  await map.locator('#backToPlanButton').click();
  await map.locator('#customerPreview').click();
  await expect(map.locator('#shopper')).toBeVisible();
  await expect(map.locator('#shopper')).toHaveCSS('background-color','rgb(2, 6, 23)');
  await expect(map.locator('#shopMap > rect').first()).toHaveCSS('fill','rgb(17, 28, 46)');
  await page.screenshot({path:'test-results/map-shopper-dark.png',fullPage:true});
  await page.locator('#theme-toggle-btn').click();
  await expect(map.locator('html')).not.toHaveClass(/dark/);
  await expect(map.locator('#shopMap > rect').first()).toHaveCSS('fill','rgb(255, 255, 255)');
  await page.screenshot({path:'test-results/map-shopper-light.png',fullPage:true});
});
