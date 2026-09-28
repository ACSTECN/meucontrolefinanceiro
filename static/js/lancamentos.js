/* lancamentos.js - tabela e cards de lançamentos */
(function () {
  'use strict';

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
    if (!start && !end && month && year) {
      var m = parseInt(month, 10) - 1;
      var y = parseInt(year, 10);
      var last = new Date(y, m + 1, 0);
      var iso = function (d, m, y) {
        return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      };
      start = iso(1, m + 1, y);
      end = iso(last.getDate(), m + 1, y);
    }
    return {
      month: month, year: year, start_date: start, end_date: end,
      type: document.getElementById('f_type').value,
      category: document.getElementById('f_cat').value,
      payment_method: document.getElementById('f_pag').value,
    };
  }

  function applyFiltersToForm(f) {
    var map = { f_mes: 'month', f_ano: 'year', f_start: 'start_date', f_end: 'end_date', f_type: 'type', f_cat: 'category', f_pag: 'payment_method' };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = f[map[id]] || '';
    });
  }

  function formatSummary(rows) {
    var rec = 0, des = 0;
    rows.forEach(function (t) {
      var v = Number(String(t.valor).replace(',', '.')) || 0;
      if (t.tipo === 'RECEITA') rec += v;
      else des += v;
    });
    var bar = document.getElementById('summaryBar');
    bar.innerHTML =
      '<div class="kpi kpi-income"><div class="label">Receitas filtradas</div><div class="value">' + MCF.formatBRL(rec) + '</div></div>' +
      '<div class="kpi kpi-expense"><div class="label">Despesas filtradas</div><div class="value">' + MCF.formatBRL(des) + '</div></div>' +
      '<div class="kpi ' + ((rec - des) >= 0 ? 'kpi-balance-pos' : 'kpi-balance-neg') + '"><div class="label">Saldo filtrado</div><div class="value">' + MCF.formatBRL(rec - des) + '</div></div>';
  }

  function renderRows(rows) {
    var tbody = document.getElementById('txTbody');
    var cards = document.getElementById('txCards');
    tbody.innerHTML = '';
    cards.innerHTML = '';

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-10 text-center text-slate-500">Nenhum lançamento encontrado. <a class="text-brand-600 underline" href="/novo">Cadastre um agora</a>.</td></tr>';
      cards.innerHTML = '<div class="tx-card text-center text-slate-500">Nenhum lançamento encontrado.</div>';
      return;
    }

    rows.forEach(function (t) {
      var isRec = t.tipo === 'RECEITA';
      var rowCls = isRec ? 'row-income' : 'row-expense';
      var badge = isRec
        ? '<span class="badge badge-income">Receita</span>'
        : '<span class="badge badge-expense">Despesa</span>';
      var valorClass = isRec ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold';
      var txId = String(t.id);
      var editUrl = '/editar?id=' + encodeURIComponent(txId);
      var actions =
        '<div class="flex justify-end gap-1 no-print">' +
          '<a href="' + editUrl + '" class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>' +
            ' Editar' +
          '</a>' +
          '<button class="btn-delete inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50" data-id="' + txId + '">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>' +
            ' Excluir' +
          '</button>' +
        '</div>';

      // Table row (md+)
      var tr = document.createElement('tr');
      tr.className = rowCls + ' hover:bg-white/50 transition';
      tr.innerHTML =
        '<td class="whitespace-nowrap px-4 py-3">' + MCF.formatDateBR(t.data) + '</td>' +
        '<td class="px-4 py-3 max-w-[260px] truncate" title="' + (t.descricao || '') + '">' + (t.descricao || '') + '</td>' +
        '<td class="px-4 py-3">' + (t.categoria_nome || '') + '</td>' +
        '<td class="px-4 py-3">' + badge + '</td>' +
        '<td class="px-4 py-3">' + (t.forma_pagamento || '') + '</td>' +
        '<td class="whitespace-nowrap px-4 py-3 text-right ' + valorClass + '">' + MCF.formatBRL(t.valor) + '</td>' +
        '<td class="whitespace-nowrap px-4 py-3 text-right">' + actions + '</td>';
      tbody.appendChild(tr);

      // Cards (mobile)
      var card = document.createElement('div');
      card.className = 'tx-card ' + rowCls;
      card.innerHTML =
        '<div class="flex items-start justify-between gap-3">' +
          '<div class="min-w-0 flex-1">' +
            '<div class="flex items-center gap-2 mb-1">' + badge +
              '<span class="text-xs text-slate-500">' + MCF.formatDateBR(t.data) + '</span>' +
            '</div>' +
            '<p class="font-semibold text-slate-900 truncate">' + (t.descricao || '') + '</p>' +
            '<p class="mt-1 text-xs text-slate-500">' + (t.categoria_nome || '') + ' · ' + (t.forma_pagamento || '') + '</p>' +
          '</div>' +
          '<div class="' + valorClass + ' text-right whitespace-nowrap">' + MCF.formatBRL(t.valor) + '</div>' +
        '</div>' +
        '<div class="mt-3 pt-3 border-t border-slate-200 flex justify-end gap-2">' +
          '<a href="' + editUrl + '" class="btn btn-ghost text-xs">Editar</a>' +
          '<button class="btn-delete btn btn-danger text-xs" data-id="' + txId + '">Excluir</button>' +
        '</div>';
      cards.appendChild(card);
    });

    cards.querySelectorAll('.btn-delete, tbody').forEach(function (el) {
      // handled at root level via delegation
    });
  }

  function attachDelete() {
    document.addEventListener('click', async function (e) {
      var btn = e.target.closest('.btn-delete');
      if (!btn) return;
      var id = btn.getAttribute('data-id');
      if (!id) return;
      var ok = window.confirm('Tem certeza que deseja EXCLUIR este lançamento? Esta ação não pode ser desfeita.');
      if (!ok) return;
      btn.disabled = true;
      try {
        await MCF.api('/api/transactions/' + encodeURIComponent(id), { method: 'DELETE' });
        MCF.toast('Lançamento excluído com sucesso.', 'success');
        load();
      } catch (err) {
        MCF.toast(err.message || 'Erro ao excluir.', 'error');
        btn.disabled = false;
      }
    });
  }

  async function load() {
    var f = getFormFilters();
    MCF.setQuery(f);
    try {
      var url = MCF.buildTransactionsQuery(f);
      var rows = await MCF.api(url);
      formatSummary(rows);
      renderRows(rows);
    } catch (e) {
      MCF.toast(e.message || 'Erro ao carregar lançamentos.', 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', async function () {
    var f = MCF.currentFilters();
    fillMonthYear(f);
    applyFiltersToForm(f);
    document.getElementById('f_start').value = f.start_date;
    document.getElementById('f_end').value = f.end_date;
    try {
      var cats = await MCF.api('/api/categories');
      fillCategoryOptions(cats, f);
    } catch (e) { MCF.toast('Erro ao carregar categorias.', 'error'); }

    document.getElementById('filterForm').addEventListener('submit', function (e) {
      e.preventDefault();
      load();
    });
    document.getElementById('btnReset').addEventListener('click', function () {
      MCF.setQuery({});
      setTimeout(function () { location.reload(); }, 0);
    });
    var mes = document.getElementById('f_mes');
    var ano = document.getElementById('f_ano');
    function sync() {
      var f2 = getFormFilters();
      document.getElementById('f_start').value = f2.start_date;
      document.getElementById('f_end').value = f2.end_date;
    }
    mes.addEventListener('change', sync);
    ano.addEventListener('change', sync);

    attachDelete();
    load();
  });
})();
