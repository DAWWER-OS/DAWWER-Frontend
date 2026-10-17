const fs = require('node:fs');
const vm = require('node:vm');
class Storage {
  constructor() { this.values = new Map(); }
  getItem(k) { return this.values.get(k) ?? null; }
  setItem(k, v) { this.values.set(k, String(v)); }
  removeItem(k) { this.values.delete(k); }
  clear() { this.values.clear(); }
}
function token(claims = {}) {
  return `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ exp: Date.now() / 1000 + 3600, role: 'Merchant', ...claims })).toString('base64url')}.signature`;
}
function json(body, status = 200) {
  return new Response(body == null ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
function harness() {
  const elements = {};
  const location = new URL('http://localhost:4173/login.html');
  location.replace = url => { context.redirect = url; };
  const context = vm.createContext({
    console: { log() {}, info() {}, warn() {}, error() {} },
    localStorage: new Storage(), sessionStorage: new Storage(), Storage,
    URL, URLSearchParams, AbortController, FormData, Blob, File, Response, Headers,
    atob, btoa, TextEncoder, setTimeout, clearTimeout, setInterval: () => 1, clearInterval() {},
    navigator: {}, location, addEventListener() {}, dispatchEvent() {}, CustomEvent: class {},
    document: { readyState: 'loading', addEventListener() {}, querySelectorAll: () => [], querySelector: () => null,
      getElementById: id => elements[id] || null, createElement: () => ({ textContent: '', innerHTML: '' }) },
    fetch: () => { throw new Error('Unexpected network request'); }
  });
  context.window = context;
  function run(code) { return vm.runInContext(code, context); }
  function load(name) { run(fs.readFileSync(`js/${name}.js`, 'utf8')); }
  load('config'); load('api'); load('auth');
  return { context, run, load, elements, api: run('ApiClient'), auth: run('Auth') };
}
module.exports = { harness, json, token };
