/* Shared, testable transformations for the catalog import wizard. */
const CatalogImport = {
  readWorkbook(buffer, XLSX) {
    const book = XLSX.read(buffer, { type: 'array' });
    for (const name of book.SheetNames) {
      const sheet = book.Sheets[name];
      if (!sheet['!ref']) continue;
      const start = XLSX.utils.decode_range(sheet['!ref']).s;
      const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true, blankrows: true });
      const rows = matrix.map((row, r) => row.map((value, c) => {
        const cell = sheet[XLSX.utils.encode_cell({ r: start.r + r, c: start.c + c })];
        // Keep formatted identifier zeros, but use numeric prices rather than currency display strings.
        if (typeof value === 'number' && /^0\d+$/.test(cell?.w || '')) return cell.w;
        return String(value ?? '');
      })).filter(row => row.some(value => value.trim() !== ''));
      if (rows.length > 1) return { headers: rows.shift(), rows };
    }
    throw new Error('لا توجد ورقة تحتوي على صفوف منتجات في ملف Excel.');
  },

  parseCSV(text) {
    text = String(text).replace(/^\uFEFF/, '');
    if (text.startsWith('sep=')) text = text.slice(text.indexOf('\n') + 1);
    const firstLine = text.split(/\r?\n/, 1)[0];
    const delimiter = [',', ';', '\t'].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
    const rows = [];
    let row = [], cell = '', quoted = false;
    const pushRow = () => {
      row.push(cell.trim());
      if (row.some(value => value !== '')) rows.push(row);
      row = []; cell = '';
    };
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
        else if (quoted || cell.trim() === '') quoted = !quoted;
        else cell += ch;
      } else if (!quoted && ch === delimiter) { row.push(cell.trim()); cell = ''; }
      else if (!quoted && (ch === '\n' || ch === '\r')) {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        pushRow();
      } else cell += ch;
    }
    if (quoted) throw new Error('يوجد حقل نصي بعلامات اقتباس غير مكتملة في الملف.');
    pushRow();
    return { headers: rows.shift() || [], rows };
  },

  number(value) {
    const normalized = String(value ?? '').trim()
      .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x660))
      .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x6f0))
      .replace(/٬/g, '').replace(/٫/g, '.');
    return normalized === '' ? NaN : Number(normalized);
  },

  csvCell(value) { return `"${String(value ?? '').replace(/"/g, '""')}"`; },

  productPayload(product) {
    const location = product.location || {};
    return {
      product_name: product.name, store_sku: product.sku, barcode: /^\d+$/.test(product.sku) ? product.sku : null,
      price: product.price, category: product.category || 'عام', quantity: product.quantity ?? 0,
      stock_status: product.quantity > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
      zone: location.zone || '', aisle: location.aisle || '', rack: location.rack || null, shelf: location.shelf || null,
      map_target: `${location.zone || ''} - ${location.aisle || ''} - ${location.shelf || ''}`
    };
  },

  toCSV(products) {
    const headers = ['product_name', 'store_sku', 'barcode', 'price', 'category', 'zone', 'aisle', 'rack', 'shelf', 'quantity', 'map_target'];
    const rows = products.map(p => [p.name, p.sku, p.barcode || '', p.price, p.category,
      p.location?.zone, p.location?.aisle, p.location?.rack, p.location?.shelf,
      p.quantity ?? 0, `${p.location?.zone || ''} - ${p.location?.aisle || ''} - ${p.location?.shelf || ''}`]);
    return '\uFEFF' + [headers, ...rows].map(row => row.map(this.csvCell).join(',')).join('\r\n');
  }
};
if (typeof module !== 'undefined') module.exports = CatalogImport;
