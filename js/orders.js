document.addEventListener('DOMContentLoaded', () => {
  if (typeof Auth !== 'undefined' && Auth.requireAuth) {
    Auth.requireAuth();
  }

  const ordersTableBody = document.getElementById('orders-table-body');
  if (ordersTableBody) {
    ordersTableBody.addEventListener('click', (e) => {
      const target = e.target;
      const btn = target.closest('.complete-order-btn');
      if (btn) {
        const orderId = btn.getAttribute('data-id');
        if (orderId) {
          completeOrder(orderId);
        }
      }
    });
  }

  renderOrders();
});

let ordersList = [
  { id: 'ORD-1092', customer: 'أحمد محمود', items: 5, total: 145.0, status: 'preparing' },
  { id: 'ORD-1091', customer: 'سارة خليل', items: 3, total: 82.5, status: 'preparing' },
  { id: 'ORD-1090', customer: 'خالد عبد الله', items: 8, total: 310.0, status: 'preparing' },
  { id: 'ORD-1089', customer: 'منى يوسف', items: 2, total: 45.0, status: 'preparing' },
  { id: 'ORD-1088', customer: 'طارق زياد', items: 6, total: 215.0, status: 'completed' },
  { id: 'ORD-1087', customer: 'ريم ناصر', items: 4, total: 130.0, status: 'completed' }
];

function renderOrders() {
  const tbody = document.getElementById('orders-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  for (let i = 0; i < ordersList.length; i++) {
    const o = ordersList[i];
    const isPrep = (o.status === 'preparing');

    const badge = isPrep
      ? "<span class='bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-bold'>قيد التحضير</span>"
      : "<span class='bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold'>مكتمل</span>";

    const actionBtn = isPrep
      ? `<button type="button" data-id="${o.id}" class="complete-order-btn bg-[#1c5335] text-white text-xs px-3 py-1.5 rounded-lg font-bold hover:bg-[#143e27] transition cursor-pointer">إتمام التحضير</button>`
      : "<span class='text-emerald-700 font-bold text-xs'>جاهز للتسليم ✓</span>";

    const row = document.createElement('tr');
    row.className = 'hover:bg-slate-50 transition';
    row.innerHTML =
      `<td class='p-4 font-bold text-slate-900'>${o.id}</td>` +
      `<td class='p-4 text-slate-700'>${o.customer}</td>` +
      `<td class='p-4 text-slate-600'>${o.items} عناصر</td>` +
      `<td class='p-4 font-bold text-slate-900'>₪${o.total}</td>` +
      `<td class='p-4'>${badge}</td>` +
      `<td class='p-4'>${actionBtn}</td>`;

    tbody.appendChild(row);
  }
}

function completeOrder(id) {
  for (let i = 0; i < ordersList.length; i++) {
    if (ordersList[i].id === id) {
      ordersList[i].status = 'completed';
      break;
    }
  }
  renderOrders();
  if (window.showToast) {
    window.showToast({
      title: 'تم تحديث حالة الطلب',
      message: `تم إتمام تحضير الطلب ${id} بنجاح وهو الآن جاهز للتسليم.`,
      type: 'success'
    });
  }
}
