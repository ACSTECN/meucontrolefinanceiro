/* ==========================================================
   utils.js - utilitários gerais do Meu Controle Financeiro
   Não dependem de bibliotecas externas
   ========================================================== */

(function () {
  'use strict';

  // ----------- formatação -----------
  function formatBRL(raw) {
    if (raw === null || raw === undefined || raw === '') return 'R$ 0,00';
    const n = (function parse() {
      if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
      if (typeof raw === 'string') {
        const s = raw.replace(/\./g, '').replace(',', '.');
        const v = parseFloat(s);
        return Number.isFinite(v) ? v : 0;
      }
      return 0;
    })();
    return n.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    });
  }

  function formatDateBR(iso) {
    if (!iso) return '-';
    const s = String(iso).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return String(iso);
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  }

  function dateToISO(day, month, year) {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  function todayISO() {
    const d = new Date();
    return dateToISO(d.getDate(), d.getMonth() + 1, d.getFullYear());
  }

  function monthStartISO(offsetMonthsBack(offset) {
    const d = new Date();
    if (offset) d.setMonth(d.getMonth() + offset);
    return dateToISO(1, d.getMonth() + 1, d.getFullYear());
  }
  function monthEndISO(offsetMonthsBack) {
    const d = new Date();
    if (offsetMonthsBack) d.setMonth(d.getMonth() + offsetMonthsBack);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return dateToISO(last.getDate(), last.getMonth() + 1, last.getFullYear());
  }

  const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  // ----------- query string helpers -----------
  function qs(key, def) {
    const p = new URLSearchParams(window.location.search);
    const v = p.get(key);
    return v === null ? def : v;
  }

  function setQuery(params) {
    const p = new URLSearchParams(window.location.search);
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') p.delete(k);
      else p.set(k, v);
    });
    const s = p.toString();
    const url = window.location.pathname + (s ? `?${s}` : '');
    window.history.replaceState({}, '', url);
  }

  // ----------- toast -----------
  function toast(message, type) {
    const stack = document.getElementById('toastStack');
    if (!stack) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type || 'info'}`;
    el.style.minWidth = '220px';
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .3s ease, transform .3s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      setTimeout(() => el.remove(), 320);
    }, 3200);
  }

  // ----------- API helpers -----------
  async function api(url, opts) {
    const options = Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts || {});
    const res = await fetch(url, options);
    let data = null;
    const text = await res.text();
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
    if (!res.ok) {
      const msg = (data && (data.detail || data.message)) || (`Erro ${res.status}`;
      throw Object.assign(new Error(msg), { status: res.status, data });
    }
    return data;
  }

  // ----------- filters helpers -----------
  const DEFAULT_FILTERS = {
    month: String(new Date().getMonth() + 1), // 1..12
    year: String(new Date().getFullYear()),
    start_date: monthStartISO(0),
    end_date: monthEndISO(0),
    type: '',
    category: '',
    payment_method: '',
  };

  function currentFilters() {
    return {
      month: qs('month', DEFAULT_FILTERS.month),
      year: qs('year', DEFAULT_FILTERS.year),
      start_date: qs('start_date', DEFAULT_FILTERS.start_date),
      end_date: qs('end_date', DEFAULT_FILTERS.end_date),
      type: qs('type', ''),
      category: qs('category', ''),
      payment_method: qs('payment_method', ''),
    };
  }

  function buildDashboardQuery(f) {
    const p = new URLSearchParams();
    if (f.start_date) p.set('start_date', f.start_date);
    if (f.end_date)   p.set('end_date',   f.end_date);
    if (f.type)         p.set('type',         f.type);
    if (f.category)     p.set('category',     f.category);
    if (f.payment_method) p.set('payment_method', f.payment_method);
    const q = p.toString();
    return '/api/dashboard' + (q ? `?${q}` : '');
  }

  function buildTransactionsQuery(f) {
    const p = new URLSearchParams();
    if (f.start_date) p.set('start_date', f.start_date);
    if (f.end_date)   p.set('end_date',   f.end_date);
    if (f.type)         p.set('type',         f.type);
    if (f.category)     p.set('category',     f.category);
    if (f.payment_method) p.set('payment_method', f.payment_method);
    const q = p.toString();
    return '/api/transactions' + (q ? `?${q}` : '');
  }

  // ----------- money input mask -----------
  function maskMoney(input) {
    if (!input) return;
    const handler = () => {
      const digits = input.value.replace(/\D/g, '');
      const n = (parseInt(digits || '0', 10) / 100);
      input.value = n.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      input.setAttribute('data-value', n.toFixed(2));
    };
    input.addEventListener('input', handler);
    if (input.value) handler();
  }

  function moneyToDecimal(input) {
    const raw = input && input.hasAttribute('data-value')
      ? input.getAttribute('data-value')
      : (input ? input.value : '0');
    const n = Number(String(raw).replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n.toFixed(2) : '0.00';
  }

  // ----------- env note -----------
  function applyEnvNote() {
    const note = document.getElementById('envNote');
    if (!note) return;
    const txt = window.__ENV_NOTE__ || '';
    if (!txt) return;
    note.textContent = 'Atenção' + txt + ' — Os dados serão salvos em memória e perdidos ao reiniciar.';
    note.classList.remove('hidden');
  }

  // ----------- drawer -----------
  function setupDrawer() {
    const toggle = document.getElementById('menuToggle');
    const closeBtn = document.getElementById('drawerClose');
    const back = document.getElementById('drawerBackdrop');
    const panel = document.getElementById('drawerPanel');
    if (!toggle || !back || !panel) return;
    const open = () => { back.classList.remove('hidden'); panel.classList.remove('hidden'); document.body.style.overflow = 'hidden'; };
    const shut = () => { back.classList.add('hidden'); panel.classList.add('hidden'); document.body.style.overflow = ''; };
    toggle.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', shut);
    back.addEventListener('click', shut);
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyEnvNote();
    setupDrawer();
  });

  // Expõe globals
  window.MCF = {
    formatBRL,
    formatDateBR,
    todayISO,
    monthStartISO,
    monthEndISO,
    MONTHS,
    qs,
    setQuery,
    toast,
    api,
    DEFAULT_FILTERS,
    currentFilters,
    buildDashboardQuery,
    buildTransactionsQuery,
    maskMoney,
    moneyToDecimal,
  };
})();
