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

  function monthStartISO(offsetMonthsBack) {
    const d = new Date();
    if (offsetMonthsBack) d.setMonth(d.getMonth() + offsetMonthsBack);
    return dateToISO(1, d.getMonth() + 1, d.getFullYear());
  }
  function monthEndISO(offsetMonthsBack) {
    const d = new Date();
    if (offsetMonthsBack) d.setMonth(d.getMonth() + offsetMonthsBack);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return dateToISO(last.getDate(), last.getMonth() + 1, d.getFullYear());
  }

  const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  const WEEKDAYS = [
    'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
    'Quinta-feira', 'Sexta-feira', 'Sábado',
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
    el.style.minWidth = '240px';
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .3s ease, transform .3s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      setTimeout(() => el.remove(), 320);
    }, 3200);
  }

  // ----------- Promise timeout helper -----------
  function withTimeout(promise, ms, message) {
    let cancelId = null;
    const timeout = new Promise((_, reject) => {
      cancelId = setTimeout(() => {
        const err = new Error(message || `Timeout de ${ms}ms excedido.`);
        err.name = 'TimeoutError';
        reject(err);
      }, ms);
    });
    const race = Promise.race([promise, timeout]).finally(() => {
      if (cancelId) clearTimeout(cancelId);
    });
    return race;
  }

  // ----------- API helpers -----------
  const API_TIMEOUT_MS = 7000; // 7s hard limit para QUALQUER chamada de API (nunca mais pendurada)

  async function api(url, opts) {
    const options = Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts || {});
    // AbortController nativo p/ matar a conexão real no timeout (não é só o Promise)
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const abortId = controller ? setTimeout(() => controller.abort(), API_TIMEOUT_MS) : null;
    const fetchOpts = Object.assign({}, options);
    if (controller) fetchOpts.signal = controller.signal;

    try {
      const res = await withTimeout(
        fetch(url, fetchOpts),
        API_TIMEOUT_MS,
        `Tempo máximo de ${(API_TIMEOUT_MS / 1000).toFixed(0)}s excedido ao carregar ${url}`,
      );
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
      if (!res.ok) {
        let msg = `Erro ${res.status}`;
        if (data && typeof data === 'object') {
          if (typeof data.detail === 'string') msg = data.detail;
          else if (typeof data.detail === 'object' && data.detail.message) msg = data.detail.message;
          else if (typeof data.message === 'string') msg = data.message;
          else if (typeof data.error === 'string') msg = data.error;
        } else if (typeof data === 'string') {
          msg = data;
        }
        throw Object.assign(new Error(msg), { status: res.status, data });
      }
      return data;
    } catch (err) {
      if (err && err.name === 'AbortError') {
        const e = new Error(`Tempo máximo excedido (${(API_TIMEOUT_MS / 1000).toFixed(0)}s) em ${url}. Tente recarregar a página.`);
        e.name = 'TimeoutError';
        throw e;
      }
      throw err;
    } finally {
      if (abortId) clearTimeout(abortId);
    }
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
  function maskMoney(input, initialDecimal) {
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
    if (initialDecimal !== undefined && initialDecimal !== null && initialDecimal !== '') {
      input.value = String(Number(initialDecimal).toFixed(2));
      handler();
    } else if (input.value) {
      handler();
    }
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
    note.innerHTML = '<strong>Atenção</strong>' + txt + ' — Os dados serão salvos em memória e perdidos ao reiniciar. <strong class="font-bold">Use os atalhos para testar rapidamente.</strong>';
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
    window.MCF._drawerOpen = () => back && !back.classList.contains('hidden');
    window.MCF._drawerClose = shut;
    toggle.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', shut);
    back.addEventListener('click', shut);
  }

  // ----------- top bar data -----------
  function setupTopBar() {
    const label = document.getElementById('todayTopBarLabel');
    const title = document.getElementById('todayTopBarTitle');
    if (label) {
      const d = new Date();
      label.textContent = `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`;
    }
    if (title) {
      const d = new Date();
      title.textContent = `Controle de ${MONTHS[d.getMonth()].toLowerCase()}`;
    }
    const search = document.getElementById('globalSearch');
    if (search) {
      const cur = qs('search', '');
      if (cur) search.value = cur;
      let t;
      search.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          const path = (location.pathname === '/lancamentos') ? '' : '/lancamentos';
          const p = new URLSearchParams(window.location.search);
          const v = search.value.trim();
          if (v) p.set('search', v); else p.delete('search');
          const q = p.toString();
          const target = (location.pathname || '/') === '/lancamentos'
            ? ('/lancamentos' + (q ? `?${q}` : ''))
            : ('/lancamentos' + (q ? `?${q}` : ''));
          // Apenas atualiza query se já em /lancamentos, senão navega
          if ((location.pathname || '/') === '/lancamentos') {
            window.history.replaceState({}, '', target);
            window.dispatchEvent(new CustomEvent('mcf:search-change', { detail: { q: v } }));
          } else {
            // só navega após Enter ou 600ms
          }
        }, 350);
      });
      search.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (location.pathname || '/') !== '/lancamentos') {
          const p = new URLSearchParams();
          const v = search.value.trim();
          if (v) p.set('search', v);
          window.location.assign('/lancamentos' + (p.toString() ? `?${p.toString()}` : ''));
        }
      });
    }
  }

  // ----------- atalhos de teclado -----------
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target && e.target.isContentEditable);
      const k = (e.key || '').toLowerCase();
      if (k === 'escape') {
        if (window.MCF._drawerOpen && window.MCF._drawerOpen()) {
          window.MCF._drawerClose && window.MCF._drawerClose();
          return;
        }
      }
      if (typing) return;
      if (k === 'n') { e.preventDefault(); window.location.assign('/novo'); return; }
      if (k === 'r') { e.preventDefault(); window.location.assign('/novo?tipo=RECEITA'); return; }
      if (k === 'e') { e.preventDefault(); window.location.assign('/novo?tipo=DESPESA'); return; }
      if (k === 'd') { e.preventDefault(); window.location.assign('/'); return; }
      if (k === 'l') { e.preventDefault(); window.location.assign('/lancamentos'); return; }
      if (k === '1') { e.preventDefault(); window.location.assign('/'); return; }
      if (k === '2') { e.preventDefault(); window.location.assign('/lancamentos'); return; }
      if (k === '3') { e.preventDefault(); window.location.assign('/novo'); return; }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyEnvNote();
    setupDrawer();
    setupTopBar();
    setupKeyboardShortcuts();
  });

  // Expõe globals
  window.MCF = {
    formatBRL,
    formatDateBR,
    todayISO,
    monthStartISO,
    monthEndISO,
    MONTHS,
    WEEKDAYS,
    qs,
    setQuery,
    toast,
    withTimeout,
    api,
    DEFAULT_FILTERS,
    currentFilters,
    buildDashboardQuery,
    buildTransactionsQuery,
    maskMoney,
    moneyToDecimal,
  };
})();
