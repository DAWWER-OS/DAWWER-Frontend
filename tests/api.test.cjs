const { test } = require('node:test');
const assert = require('node:assert/strict');
const { harness, json, token } = require('./helpers.cjs');
const store = 'aaaaaaaa-0000-0000-0000-000000000001';

test('core and FastAPI throw on HTTP errors, including 500 and validation details', async () => {
  const { api, context } = harness();
  context.localStorage.setItem('accessToken', token());
  context.fetch = async () => json({ detail: { message: 'Invalid file structure' } }, 400);
  await assert.rejects(api.fastapi('/products'), /Invalid file structure/);
  context.fetch = async () => json({ detail: [{ loc: ['body', 'store_sku'], msg: 'Field required' }] }, 422);
  await assert.rejects(api.products.create(store, {}), /body.store_sku: Field required/);
  context.fetch = async () => json({ message: 'Unavailable' }, 500);
  await assert.rejects(api.core('/merchant/stores'), /Unavailable/);
  await assert.rejects(api.products.create(store, {}), /Unavailable/);
  const result = await api.fastapi('/products', { throwOnError: false });
  assert.equal(result.success, false);
  assert.equal(result.status, 500);
});

test('concurrent expired requests share one refresh and use the selected store accessToken', async () => {
  const { api, context } = harness();
  const fresh = token({ sub: 'fresh' }), scoped = token({ storeId: store });
  context.localStorage.setItem('accessToken', token({ exp: 1 }));
  context.localStorage.setItem('storeToken', token({ exp: 1 }));
  context.localStorage.setItem('refreshToken', 'refresh-1');
  api.setActiveStoreId(store);
  let refreshes = 0;
  context.fetch = async (url, options) => {
    if (url.endsWith('/refresh-token')) {
      refreshes++;
      await new Promise(r => setTimeout(r, 5));
      return json({ success: true, data: { accessToken: fresh, refreshToken: 'refresh-2' } });
    }
    if (url.endsWith('/select-store')) {
      assert.equal(options.headers.Authorization, `Bearer ${fresh}`);
      return json({ success: true, data: { accessToken: scoped, effectivePermissions: ['Products.Manage'] } });
    }
    assert.equal(options.headers.Authorization, `Bearer ${scoped}`);
    return json([]);
  };
  await Promise.all([api.products.list(store), api.draftProducts.list(store)]);
  assert.equal(refreshes, 1);
  assert.equal(context.localStorage.getItem('storeToken'), scoped);
  assert.equal(context.localStorage.getItem('refreshToken'), 'refresh-2');
});

test('401 retries multipart once, retains file and lets browser supply Content-Type', async () => {
  const { api, context } = harness();
  const old = token({ sub: 'old' }), fresh = token({ sub: 'fresh' });
  context.localStorage.setItem('accessToken', old);
  context.localStorage.setItem('refreshToken', 'refresh');
  let uploads = 0;
  const form = new FormData(); form.append('file', new File(['image'], 'shelf.png'));
  context.fetch = async (url, options) => {
    if (url.endsWith('/refresh-token')) return json({ data: { accessToken: fresh } });
    uploads++;
    assert.equal(options.body, form);
    assert.equal(Object.keys(options.headers).some(k => k.toLowerCase() === 'content-type'), false);
    return uploads === 1 ? json({}, 401) : json({ id: 'job' });
  };
  assert.equal((await api.shelfJobs.create(store, form, { headers: { 'Content-Type': 'bad' } })).id, 'job');
  assert.equal(uploads, 2);
});

test('secondary 401 and refresh service outage preserve the primary session', async () => {
  const { api, context } = harness();
  const access = token(); context.localStorage.setItem('accessToken', access);
  context.fetch = async () => json({}, 401);
  await assert.rejects(api.products.list(store));
  assert.equal(context.localStorage.getItem('accessToken'), access);
  context.localStorage.setItem('accessToken', token({ exp: 1 }));
  context.localStorage.setItem('refreshToken', 'refresh');
  context.fetch = async () => json({ message: 'maintenance' }, 503);
  await assert.rejects(api.products.list(store), /maintenance/);
  assert.equal(context.localStorage.getItem('refreshToken'), 'refresh');
});

test('listAll loads beyond 100, accepts empty lists and detects repeated pages', async () => {
  const { api, context } = harness();
  context.localStorage.setItem('accessToken', token());
  const all = Array.from({ length: 125 }, (_, id) => ({ id }));
  context.fetch = async url => {
    const params = new URL(url).searchParams;
    const skip = Number(params.get('skip'));
    // A server may cap pages below the requested limit.
    return json(all.slice(skip, skip + 50));
  };
  assert.equal((await api.listAll(`/stores/${store}/draft-products`)).length, 125);
  context.fetch = async () => json([]);
  assert.equal((await api.listAll(`/stores/${store}/products`)).length, 0);
  context.fetch = async () => json([{ id: 'same' }]);
  await assert.rejects(api.listAll(`/stores/${store}/products`), /نفس الصفحة/);
});

test('polling waits for terminal status even when intermediate items are present', async () => {
  const { api } = harness();
  let polls = 0;
  api.shelfJobs.get = async () => ({ id: 'job', status: ++polls < 2 ? 'PROCESSING' : 'REVIEW_REQUIRED', items: [{ id: 'early' }] });
  api.listAll = async () => Array.from({ length: 120 }, (_, id) => ({ id }));
  const result = await api.shelfJobs.waitForReview(store, { id: 'job', status: 'PROCESSING', items: [{ id: 'early' }] }, { pollInterval: 1 });
  assert.equal(polls, 2); assert.equal(result.extractedItems.length, 120);
});

test('logout during refresh does not resurrect session credentials', async () => {
  const { api, auth, context } = harness();
  context.localStorage.setItem('accessToken', token({ exp: 1 }));
  context.localStorage.setItem('refreshToken', 'refresh');
  let finish;
  context.fetch = () => new Promise(resolve => { finish = resolve; });
  const operation = api.refreshAuthToken();
  auth.clearLocalSession();
  finish(json({ data: { accessToken: token(), refreshToken: 'rotated' } }));
  assert.equal(await operation, null);
  assert.equal(api.getRawAccessToken(), null);
});

test('switching stores clears stale products, orders and scoped credentials', () => {
  const { api, context } = harness(); api.setActiveStoreId(store);
  for (const key of ['storeToken', 'dawwer_merchant_catalog_products', 'dawwer_merchant_orders_queue_sprint3']) context.localStorage.setItem(key, 'stale');
  api.setActiveStoreId('bbbbbbbb-0000-0000-0000-000000000002');
  assert.equal(context.localStorage.getItem('storeToken'), null);
  assert.equal(context.localStorage.getItem('dawwer_merchant_catalog_products'), null);
  assert.equal(context.localStorage.getItem('dawwer_merchant_orders_queue_sprint3'), null);
});
