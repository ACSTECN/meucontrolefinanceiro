/* dashboard.js - carrega filtros, KPIs e gráficos */
(function () {
  'use strict';

  var charts = { series: null, incCat: null, expCat: null, pag: null };

  function fillMonthYear(f) {
    var mes = document.getElementById('f_mes');
    var ano = document.getElementById('f_ano');
    MCF.MONTHS.forEach(function (n, i) {
      var opt = document.createElement('option');
      opt.value = String(i + 1);
      opt.textContent = n;
      mes.appendChild(opt);
    });
    var currentYear = new Date().getFullYear();
    for (var y = currentYear - 5; y <= currentYear + 1; y++) {
      var o = document.createElement('option');
      o.value = String(y);
      o.textContent = String(y);
      ano.appendChild(o);
    }
    mes.value = f.month;
    ano.value = f.year;
  }

  function fillCategoryOptions(cats, f) {
    var el = document.getElementById('f_cat');
    if (!el) return;
    el.innerHTML = '<option value="">Todas</option>';
    [['RECEITA', 'Receitas'], ['DESPESA', 'Despesas']].forEach(function (grp) {
      var group = document.createElement('optgroup');
      group.label = grp[1];
      (cats[grp[0]] || []).forEach(function (c) {
        var o = document.createElement('option');
        o.value = c.id;
        o.textContent = c.nome;
        group.appendChild(o);
      });
      el.appendChild(group);
    });
    if (f.category) el.value = f.category;
  }

  function getFormFilters() {
    var month = document.getElementById('f_mes').value;
    var year = document.getElementById('f_ano').value;
    var start = document.getElementById('f_start').value;
    var end = document.getElementById('f_end').value;
    // Se usuário não mexeu manualmente em start/end, recalcula por mes/ano
    if (!start && !end && month && year) {
      var m = parseInt(month, 10) - 1;
      var y = parseInt(year, 10);
      var first = new Date(y, m, 1);
      var last = new Date(y, m + 1, 0);
      start = MCF.dateToISO ? '' : '';
      // calcular via MCF.dateToISO
      if (!window.__tmpIso) {
        window.__tmpIso = function (d, m, y) {
          var mm = String(m).padStart(2, '0');
          var dd = String(d).padStart(2, '0');
          return y + '-' + mm + '-' + dd;
        };
      }
      start = window.__tmpIso(1, m + 1, y);
      end = window.__tmpIso(last.getDate(), m + 1, y);
    }
    return {
      month: month, year: year, start_date: start, end_date: end,
      type: document.getElementById('f_type').value,
      category: document.getElementById('f_cat').value,
      payment_method: document.getElementById('f_pag').value,
    };
  }

  function applyFiltersToForm(f) {
    ['f_mes', 'f_ano', 'f_start', 'f_end', 'f_type', 'f_cat', 'f_pag'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var map = { f_mes: 'month', f_ano: 'year', f_start: 'start_date', f_end: 'end_date', f_type: 'type', f_cat: 'category', f_pag: 'payment_method' };
      var v = f[map[id]] || '';
      el.value = v;
    });
  }

  function renderKPIs(data) {
    var wrap = document.getElementById('kpis');
    if (!wrap) return;
    var balanceClass = (data.balance >= 0) ? 'kpi-balance-pos' : 'kpi-balance-neg';
    var kpis = [
      { cls: 'kpi-income', label: 'Receitas', value: MCF.formatBRL(data.income), sub: 'Entradas no período' },
      { cls: 'kpi-expense', label: 'Despesas', value: MCF.formatBRL(data.expenses), sub: 'Saídas no período' },
      { cls: balanceClass, label: 'Saldo', value: MCF.formatBRL(data.balance), sub: 'Receitas - Despesas' },
      { cls: '', label: 'Qtde lançamentos', value: String(data.transaction_count), sub: 'Registros no período' },
      { cls: '', label: 'Maior receita', value: MCF.formatBRL(data.maior_receita), sub: data.maior_receita_descricao || '—' },
      { cls: '', label: 'Maior despesa', value: MCF.formatBRL(data.maior_despesa), sub: data.maior_despesa_descricao || '—' },
    ];
    wrap.innerHTML = kpis.map(function (k) {
      return (
        '<div class="kpi ' + (k.cls || '') + '">' +
          '<div class="label">' + k.label + '</div>' +
          '<div class="value">' + k.value + '</div>' +
          '<div class="sub">' + k.sub + '</div>' +
        '</div>'
      );
    }).join('');
  }

  function ensureColors(n) {
    var base = ['#0ea5e9', '#16a34a', '#dc2626', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#3b82f6', '#84cc16', '#a855f7', '#64748b'];
    var out = [];
    for (var i = 0; i < n; i++) out.push(base[i % base.length]);
    return out;
  }

  function renderCharts(data) {
    var labels = data.series.map(function (p) { return MCF.formatDateBR(p.label); });
    var incomes = data.series.map(function (p) { return Number(p.income); });
    var expenses = data.series.map(function (p) { return Number(p.expenses); });

    function destroy(ref) { if (charts[ref]) { try { charts[ref].destroy(); } catch (e) {} charts[ref] = null; } }

    destroy('series');
    var ctx1 = document.getElementById('chartSeries');
    if (ctx1) {
      charts.series = new Chart(ctx1.getContext('2d'), {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            { label: 'Receitas', data: incomes, backgroundColor: '#16a34a', borderRadius: 6, maxBarThickness: 28 },
            { label: 'Despesas', data: expenses, backgroundColor: '#dc2626', borderRadius: 6, maxBarThickness: 28 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: function (c) { return c.dataset.label + ': ' + MCF.formatBRL(c.parsed.y); } } } },
          scales: {
            x: { grid: { display: false } },
            y: { ticks: { callback: function (v) { return MCF.formatBRL(v); } } },
          },
        },
      });
    }

    function doughnut(ctxId, arr, emptyLabel) {
      var ctx = document.getElementById(ctxId);
      if (!ctx) return null;
      var labels2 = arr.map(function (a) { return a.name; });
      var values = arr.map(function (a) { return Number(a.total); });
      if (!values.length) {
        labels2 = [emptyLabel || 'Sem dados'];
        values = [0.01];
      }
      return new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: labels2,
          datasets: [{ data: values, backgroundColor: ensureColors(labels2.length), borderWidth: 0 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } },
            tooltip: { callbacks: { label: function (c) { return c.label + ': ' + MCF.formatBRL(c.parsed); } } } },
          cutout: '62%',
        },
      });
    }

    destroy('incCat'); destroy('expCat'); destroy('pag');
    charts.incCat = doughnut('chartIncCat', data.income_by_category, 'Sem receitas');
    charts.expCat = doughnut('chartExpCat', data.expenses_by_category, 'Sem despesas');

    var ctxP = document.getElementById('chartPag');
    if (ctxP) {
      var labelsP = data.expenses_by_payment_method.map(function (a) { return a.name; });
      var valuesP = data.expenses_by_payment_method.map(function (a) { return Number(a.total); });
      if (!valuesP.length) { labelsP = ['Sem dados']; valuesP = [0.01]; }
      charts.pag = new Chart(ctxP.getContext('2d'), {
        type: 'bar',
        data: {
          labels: labelsP,
          datasets: [{ label: 'Despesas', data: valuesP, backgroundColor: ensureColors(labelsP.length), borderRadius: 6, maxBarThickness: 36 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return MCF.formatBRL(c.parsed.x); } } } },
          scales: { x: { ticks: { callback: function (v) { return MCF.formatBRL(v); } } }, y: { grid: { display: false } } },
        },
      });
    }
  }

  function renderUltimas(arr) {
    var ol = document.getElementById('ultimasList');
    if (!ol) return;
    if (!arr || !arr.length) {
      ol.innerHTML = '<li class="text-slate-400">Sem movimentações no período.</li>';
      return;
    }
    ol.innerHTML = arr.slice(0, 10).map(function (t) {
      var badge = t.tipo === 'RECEITA'
        ? '<span class="badge badge-income">Rec</span>'
        : '<span class="badge badge-expense">Des</span>';
      var valClass = t.tipo === 'RECEITA' ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold';
      return (
        '<li class="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">' +
          '<div class="min-w-0 flex-1">' +
            '<p class="truncate text-slate-800 font-medium">' + (t.descricao || '') + '</p>' +
            '<p class="mt-0.5 text-xs text-slate-500 truncate">' +
              MCF.formatDateBR(t.data) + ' · ' + (t.categoria_nome || '') + ' · ' + badge +
            '</p>' +
          '</div>' +
          '<div class="' + valClass + ' text-sm">' + MCF.formatBRL(t.valor) + '</div>' +
        '</li>'
      );
    }).join('');
  }

  async function loadDashboard() {
    var f = getFormFilters();
    MCF.setQuery(f);
    document.getElementById('periodLabel').textContent = MCF.formatDateBR(f.start_date) + ' a ' + MCF.formatDateBR(f.end_date);
    try {
      var url = MCF.buildDashboardQuery(f);
      var data = await MCF.api(url);
      renderKPIs(data);
      renderCharts(data);
      renderUltimas(data.ultimas_movimentacoes);
    } catch (e) {
      MCF.toast(e.message || 'Erro ao carregar dashboard.', 'error');
    }
  }

  async function loadCategories() {
    try {
      var cats = await MCF.api('/api/categories');
      fillCategoryOptions(cats, MCF.currentFilters());
    } catch (e) {
      MCF.toast('Erro ao carregar categorias.', 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', async function () {
    var f = MCF.currentFilters();
    fillMonthYear(f);
    applyFiltersToForm(f);
    document.getElementById('f_start').value = f.start_date;
    document.getElementById('f_end').value = f.end_date;

    await loadCategories();

    document.getElementById('filterForm').addEventListener('submit', function (e) {
      e.preventDefault();
      loadDashboard();
    });
    document.getElementById('btnReset').addEventListener('click', function () {
      MCF.setQuery({ month: '', year: '', start_date: '', end_date: '', type: '', category: '', payment_method: '' });
      setTimeout(function () { location.reload(); }, 0);
    });
    document.getElementById('btnMesAtual').addEventListener('click', function () {
      var q = { start_date: MCF.monthStartISO(0), end_date: MCF.monthEndISO(0) };
      var d = new Date();
      q.month = String(d.getMonth() + 1);
      q.year = String(d.getFullYear());
      MCF.setQuery(q);
      setTimeout(function () { location.reload(); }, 0);
    });

    // Se o usuário mudar mês/ano e não tiver start/end personalizados preenchidos, preenche automaticamente
    var mes = document.getElementById('f_mes');
    var ano = document.getElementById('f_ano');
    function syncStartEndFromMonthYear() {
      var f2 = getFormFilters();
      document.getElementById('f_start').value = f2.start_date;
      document.getElementById('f_end').value = f2.end_date;
    }
    mes.addEventListener('change', syncStartEndFromMonthYear);
    ano.addEventListener('change', syncStartEndFromMonthYear);

    loadDashboard();
  });
})();
