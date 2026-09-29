/* dashboard.js - carrega filtros, KPIs e gráficos */
(function () {
  'use strict';

  var charts = { series: null, incCat: null, expCat: null, pag: null };
  var ICONS = {
    income:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>',
    outcome:  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M19 12l-7-7-7 7"/></svg>',
    balance:  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>',
    count:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    maxinc:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>',
    maxexp:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l6 6 4-4 8 8"/><path d="M21 17v-7h-7"/></svg>',
  };

  function isoToDate(s) {
    if (!s) return null;
    var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }

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
    var mm = f.month || f.mes;
    var yy = f.year || f.ano;
    if (mm) mes.value = String(mm);
    if (yy) ano.value = String(yy);
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
    if (!start && !end && month && year) {
      var m = parseInt(month, 10) - 1;
      var y = parseInt(year, 10);
      var first = new Date(y, m, 1);
      var last = new Date(y, m + 1, 0);
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
      var alias = map[id];
      var v = f[alias] || f[(alias === 'month' ? 'mes' : (alias === 'year' ? 'ano' : alias))] || '';
      el.value = v;
    });
  }

  function periodText(s, e) {
    var ds = isoToDate(s);
    var de = isoToDate(e);
    if (!ds || !de) return MCF.formatDateBR(s) + ' a ' + MCF.formatDateBR(e);
    var sameMonth = ds.getFullYear() === de.getFullYear() && ds.getMonth() === de.getMonth();
    var lastDayOfMonth = new Date(de.getFullYear(), de.getMonth() + 1, 0).getDate();
    var wholeMonth = sameMonth && ds.getDate() === 1 && de.getDate() === lastDayOfMonth;
    if (wholeMonth) return MCF.MONTHS[ds.getMonth()] + ' / ' + ds.getFullYear();
    return MCF.formatDateBR(s) + ' · até ' + MCF.formatDateBR(e);
  }

  function kpiCard(cls, icon, label, value, sub) {
    return (
      '<div class="kpi ' + cls + '">' +
        '<div class="flex items-start justify-between gap-3">' +
          '<div class="min-w-0 flex-1">' +
            '<div class="label">' + label + '</div>' +
            '<div class="value">' + value + '</div>' +
            '<div class="sub line-clamp-1">' + sub + '</div>' +
          '</div>' +
          '<div class="icon">' + icon + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderKPIs(data) {
    var incomeV = MCF._parseMoneyValue(data.income);
    var expV = MCF._parseMoneyValue(data.expenses);
    var balV = MCF._parseMoneyValue(data.balance);
    var maiV = MCF._parseMoneyValue(data.maior_receita);
    var madV = MCF._parseMoneyValue(data.maior_despesa);
    var cnt  = Number(data.transaction_count) || 0;
    var balanceClass = (balV >= 0) ? 'kpi-balance-pos' : 'kpi-balance-neg';
    document.getElementById('kpis').innerHTML =
      kpiCard('kpi-income', ICONS.income, 'Receitas', MCF.formatBRL(incomeV), 'Dinheiro que entrou no período') +
      kpiCard('kpi-expense', ICONS.outcome, 'Despesas', MCF.formatBRL(expV), 'Dinheiro que saiu no período') +
      kpiCard(balanceClass, ICONS.balance, 'Saldo', MCF.formatBRL(balV), (balV >= 0 ? 'Saldo positivo 🎉' : 'Saldo negativo — atenção')) +
      kpiCard('kpi-count', ICONS.count, 'Lançamentos', cnt.toLocaleString('pt-BR'), 'Total de registros no período') +
      kpiCard('kpi-maxinc', ICONS.maxinc, 'Maior receita', MCF.formatBRL(maiV || 0), (data.maior_receita_descricao && maiV > 0) ? data.maior_receita_descricao : 'Sem receitas ainda') +
      kpiCard('kpi-maxexp', ICONS.maxexp, 'Maior despesa', MCF.formatBRL(madV || 0), (data.maior_despesa_descricao && madV > 0) ? data.maior_despesa_descricao : 'Sem despesas ainda');
  }

  function ensureColors(n) {
    var base = ['#10b981', '#ef4444', '#4f46e5', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#3b82f6', '#84cc16', '#a855f7', '#64748b'];
    var out = [];
    for (var i = 0; i < n; i++) out.push(base[i % base.length]);
    return out;
  }

  var NAVY = {
    bg:      '#0a1628',
    cardBg:  'rgba(14, 29, 54, 0.75)',
    text:    '#e5eefc',
    soft:    '#b5c6e0',
    mute:    '#7a8eaf',
    grid:    'rgba(96, 165, 250, 0.12)',
    ring:    'rgba(59, 130, 246, 0.3)',
    doughnutBorder: '#0e1d36',
    tooltipBg: 'linear-gradient(140deg, #172f57, #0a1628)',
  };

  function navyLegendLabels() {
    return {
      color: NAVY.soft,
      boxWidth: 10,
      padding: 12,
      usePointStyle: false,
      boxHeight: 10,
      font: { family: 'Inter', size: 11, weight: '600' },
    };
  }
  function navyTooltip() {
    return {
      backgroundColor: '#172f57',
      borderColor: NAVY.ring,
      borderWidth: 1,
      titleColor: '#fff',
      bodyColor: NAVY.soft,
      padding: 12,
      cornerRadius: 10,
      titleFont: { family: 'Inter', weight: '800' },
      bodyFont: { family: 'Inter', weight: '600' },
      boxPadding: 4,
    };
  }

  function renderCharts(data) {
    var labels = (data.series || []).map(function (p) { return MCF.formatDateBR(p.label); });
    var incomes = (data.series || []).map(function (p) { return MCF._parseMoneyValue(p.income); });
    var expenses = (data.series || []).map(function (p) { return MCF._parseMoneyValue(p.expenses); });

    function destroy(ref) { if (charts[ref]) { try { charts[ref].destroy(); } catch (e) {} charts[ref] = null; } }

    destroy('series');
    var ctx1 = document.getElementById('chartSeries');
    if (ctx1) {
      charts.series = new Chart(ctx1.getContext('2d'), {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            { label: 'Receitas', data: incomes, backgroundColor: 'rgba(16,185,129,0.92)', borderRadius: 10, borderSkipped: false, maxBarThickness: 24, hoverBackgroundColor: '#34d399' },
            { label: 'Despesas', data: expenses, backgroundColor: 'rgba(244,63,94,0.92)', borderRadius: 10, borderSkipped: false, maxBarThickness: 24, hoverBackgroundColor: '#fb7185' },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: Object.assign(navyLegendLabels(), { filter: function(item) { return !!item.text; } }) },
            tooltip: Object.assign(navyTooltip(), { callbacks: { label: function (c) { return c.dataset.label + ': ' + MCF.formatBRL(c.parsed.y); } } }),
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: NAVY.mute, font: { family: 'Inter', size: 10, weight: '600' } },
              border: { color: 'rgba(59,130,246,0.15)' },
            },
            y: {
              ticks: {
                color: NAVY.mute,
                font: { family: 'Inter', size: 10, weight: '600' },
                callback: function (v) { return MCF.formatBRL(v); },
              },
              grid: { color: NAVY.grid, drawBorder: false },
              border: { display: false },
            },
          },
        },
      });
    }

    function doughnut(ctxId, arr, emptyLabel, accent) {
      var ctx = document.getElementById(ctxId);
      if (!ctx) return null;
      var labels2 = arr.map(function (a) { return a.name; });
      var values = arr.map(function (a) { return MCF._parseMoneyValue(a.total); });
      var empty = !values.length;
      if (empty) {
        labels2 = [emptyLabel || 'Sem dados'];
        values = [0.01];
      }
      var palette = empty
        ? ['rgba(59, 130, 246, 0.18)']
        : (accent || ensureColors(labels2.length));
      return new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: labels2,
          datasets: [{
            data: values,
            backgroundColor: palette,
            borderWidth: 3,
            borderColor: NAVY.doughnutBorder,
            hoverOffset: 8,
            hoverBorderColor: '#60a5fa',
            hoverBorderWidth: 2,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: navyLegendLabels() },
            tooltip: Object.assign(navyTooltip(), { callbacks: { label: function (c) { return c.label + ': ' + MCF.formatBRL(c.parsed); } } }),
          },
          cutout: '68%',
          animation: { animateScale: true, animateRotate: true },
        },
      });
    }

    destroy('incCat'); destroy('expCat'); destroy('pag');
    charts.incCat = doughnut('chartIncCat', data.income_by_category || [], 'Sem receitas',
      ['#10b981','#34d399','#059669','#047857','#6ee7b7','#065f46','#14b8a6']);
    charts.expCat = doughnut('chartExpCat', data.expenses_by_category || [], 'Sem despesas',
      ['#f43f5e','#f97316','#fb7185','#be123c','#fbbf24','#f87171','#ea580c']);

    var ctxP = document.getElementById('chartPag');
    if (ctxP) {
      var labelsP = (data.expenses_by_payment_method || []).map(function (a) { return a.name; });
      var valuesP = (data.expenses_by_payment_method || []).map(function (a) { return Number(a.total); });
      var emptyP = !valuesP.length;
      if (emptyP) { labelsP = ['Sem dados']; valuesP = [0.01]; }
      var paletteP = emptyP
        ? ['rgba(59, 130, 246, 0.22)']
        : ['#3b82f6','#6366f1','#0ea5e9','#f59e0b','#10b981','#8b5cf6','#94a3b8'];
      charts.pag = new Chart(ctxP.getContext('2d'), {
        type: 'bar',
        data: {
          labels: labelsP,
          datasets: [{
            label: 'Despesas',
            data: valuesP,
            backgroundColor: paletteP,
            borderRadius: 10,
            borderSkipped: false,
            maxBarThickness: 22,
            hoverBackgroundColor: '#60a5fa',
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            tooltip: Object.assign(navyTooltip(), { callbacks: { label: function (c) { return MCF.formatBRL(c.parsed.x); } } }),
          },
          scales: {
            x: {
              ticks: {
                color: NAVY.mute,
                font: { family: 'Inter', size: 10, weight: '600' },
                callback: function (v) { return MCF.formatBRL(v); },
              },
              grid: { color: NAVY.grid, drawBorder: false },
              border: { display: false },
            },
            y: {
              grid: { display: false },
              ticks: { color: NAVY.soft, font: { family: 'Inter', weight: '700', size: 11 } },
              border: { color: 'rgba(59,130,246,0.15)' },
            },
          },
        },
      });
    }
  }

  function renderUltimas(arr) {
    var ol = document.getElementById('ultimasList');
    if (!ol) return;
    if (!arr || !arr.length) {
      ol.innerHTML = '<li class="ult-item"><div class="pill income">' + ICONS.income + '</div><div class="flex-1 min-w-0"><p class="desc">Sem movimentações</p><p class="meta">Cadastre sua primeira receita/despesa acima.</p></div></li>';
      return;
    }
    ol.innerHTML = arr.slice(0, 10).map(function (t) {
      var tipo = (t.tipo === 'RECEITA') ? 'income' : 'expense';
      var sinal = (t.tipo === 'RECEITA') ? '+' : '−';
      return (
        '<li class="ult-item">' +
          '<div class="pill ' + tipo + '">' + (t.tipo === 'RECEITA' ? ICONS.income : ICONS.outcome) + '</div>' +
          '<div class="min-w-0 flex-1">' +
            '<p class="desc">' + (t.descricao || '') + '</p>' +
            '<p class="meta truncate">' + MCF.formatDateBR(t.data) + ' · ' + (t.categoria_nome || '') + ' · ' + (t.forma_pagamento || '') + '</p>' +
          '</div>' +
          '<div class="val ' + tipo + ' text-right whitespace-nowrap">' + sinal + MCF.formatBRL(t.valor) + '</div>' +
        '</li>'
      );
    }).join('');
  }

  // Timer DEFENSIVO p/ nunca ficar com skeleton preso.
  var MAX_DASH_MS = 7000;
  var dashLoadResolved = false;
  var dashTimerId = null;
  function _forceDashFinish(silentTimeout) {
    if (dashLoadResolved) return;
    dashLoadResolved = true;
    if (dashTimerId) { clearTimeout(dashTimerId); dashTimerId = null; }
    // Esconde skeleton se existir
    var sk = document.querySelectorAll('.skeleton, [data-skeleton="true"]');
    (sk || []).forEach(function (e) { e.style.display = 'none'; });
    var empty = document.getElementById('emptyState');
    if (empty) empty.classList.remove('hidden');
    if (silentTimeout) MCF.toast('Tempo excedido: recarregue para tentar novamente.', 'warn');
  }

  async function loadDashboard() {
    dashLoadResolved = false;
    if (dashTimerId) { clearTimeout(dashTimerId); dashTimerId = null; }
    var f = getFormFilters();
    MCF.setQuery(f);
    var pLabel = document.getElementById('periodLabel');
    if (pLabel) pLabel.textContent = periodText(f.start_date, f.end_date);
    dashTimerId = setTimeout(function () { _forceDashFinish(true); }, MAX_DASH_MS);
    try {
      var url = MCF.buildDashboardQuery(f);
      var data = await MCF.withTimeout(
        MCF.api(url),
        MAX_DASH_MS,
        'Tempo máximo de carregamento do dashboard excedido.',
      );
      renderKPIs(data);
      renderCharts(data);
      renderUltimas(data.ultimas_movimentacoes);
      var empty = document.getElementById('emptyState');
      if (empty) {
        if ((data.transaction_count || 0) === 0) empty.classList.remove('hidden');
        else empty.classList.add('hidden');
      }
    } catch (e) {
      MCF.toast(e.message || 'Erro ao carregar dashboard.', 'error');
    } finally {
      _forceDashFinish(false);
    }
  }

  async function loadCategories() {
    try {
      var f = MCF.currentFilters();
      // compat with mes/ano keys
      var f2 = Object.assign({}, f);
      if (!f2.month) f2.month = MCF.qs('mes', '');
      if (!f2.year)  f2.year  = MCF.qs('ano', '');
      var cats = await MCF.withTimeout(MCF.api('/api/categories'), 6000);
      fillCategoryOptions(cats, f2);
    } catch (e) {
      MCF.toast('Erro ao carregar categorias (usando padrão).', 'warn');
      fillCategoryOptions({}, MCF.currentFilters());
    }
  }

  document.addEventListener('DOMContentLoaded', async function () {
    var f = MCF.currentFilters();
    // compat: /lancamentos?mes=09&ano=2026
    var mes = MCF.qs('mes', '');
    var ano = MCF.qs('ano', '');
    if (!f.month && mes) f.month = mes;
    if (!f.year  && ano) f.year  = ano;

    fillMonthYear(f);
    applyFiltersToForm(f);
    var st = document.getElementById('f_start');
    var en = document.getElementById('f_end');
    if (st && !st.value && f.start_date) st.value = f.start_date;
    if (en && !en.value && f.end_date) en.value = f.end_date;

    // Se mes/ano vierem por qs e não tiverem datas, recalcular
    if (mes && ano && !st.value && !en.value) {
      var m = parseInt(String(mes), 10) - 1;
      var y = parseInt(String(ano), 10);
      var startD = new Date(y, m, 1);
      var endD = new Date(y, m + 1, 0);
      st.value = window.__tmpIso
        ? window.__tmpIso(1, m + 1, y)
        : (y + '-' + String(m+1).padStart(2,'0') + '-' + '01');
      en.value = (y + '-' + String(m+1).padStart(2,'0') + '-' + String(endD.getDate()).padStart(2,'0'));
    }
    var pLabel = document.getElementById('periodLabel');
    if (pLabel) pLabel.textContent = periodText(st ? st.value : '', en ? en.value : '');

    await loadCategories();

    document.getElementById('filterForm').addEventListener('submit', function (e) {
      e.preventDefault();
      loadDashboard();
    });
    document.getElementById('btnReset').addEventListener('click', function () {
      MCF.setQuery({ month: '', year: '', mes: '', ano: '', start_date: '', end_date: '', type: '', category: '', payment_method: '' });
      setTimeout(function () { location.reload(); }, 0);
    });
    document.getElementById('btnMesAtual').addEventListener('click', function () {
      var q = { start_date: MCF.monthStartISO(0), end_date: MCF.monthEndISO(0) };
      var d = new Date();
      q.month = String(d.getMonth() + 1);
      q.year = String(d.getFullYear());
      q.mes = q.month; q.ano = q.year;
      MCF.setQuery(q);
      setTimeout(function () { location.reload(); }, 0);
    });

    var fm = document.getElementById('f_mes');
    var fa = document.getElementById('f_ano');
    function syncStartEndFromMonthYear() {
      if (!fm || !fa) return;
      var mv = fm.value, av = fa.value;
      if (!mv || !av) return;
      var st2 = document.getElementById('f_start'), en2 = document.getElementById('f_end');
      var m2 = parseInt(mv, 10) - 1, y2 = parseInt(av, 10);
      var lastD = new Date(y2, m2 + 1, 0).getDate();
      if (st2) st2.value = (y2 + '-' + String(m2+1).padStart(2,'0') + '-01');
      if (en2) en2.value = (y2 + '-' + String(m2+1).padStart(2,'0') + '-' + String(lastD).padStart(2,'0'));
      if (pLabel) pLabel.textContent = periodText(st2 ? st2.value : '', en2 ? en2.value : '');
    }
    fm && fm.addEventListener('change', syncStartEndFromMonthYear);
    fa && fa.addEventListener('change', syncStartEndFromMonthYear);

    loadDashboard();
  });
})();
