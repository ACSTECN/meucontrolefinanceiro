/* lancamentos.js - tela de lançamentos (filtros, tabela, delete) */
(function () {
  'use strict';

  var loaded = []; // array de transactions brutas
  var localSearch = '';
  var quickType = '';
  var quickPag = '';

  function isoToDate(s) {
    if (!s) return null;
    var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }
  function periodText(s, e) {
    var ds = isoToDate(s), de = isoToDate(e);
    if (!ds || !de) return MCF.formatDateBR(s) + ' a ' + MCF.formatDateBR(e);
    var sameMonth = ds.getFullYear() === de.getFullYear() && ds.getMonth() === de.getMonth();
    var lastDayOfMonth = new Date(de.getFullYear(), de.getMonth() + 1, 0).getDate();
    var wholeMonth = sameMonth && ds.getDate() === 1 && de.getDate() === lastDayOfMonth;
    if (wholeMonth) return MCF.MONTHS[ds.getMonth()] + ' / ' + ds.getFullYear();
    return MCF.formatDateBR(s) + ' · até ' + MCF.formatDateBR(e);
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
    var yy = f.year  || f.ano;
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
    function val(id, def) {
      var el = document.getElementById(id);
      return el ? (el.value || '') : (def || '');
    }
    var month = val('f_mes');
    var year  = val('f_ano');
    var start = val('f_start');
    var end   = val('f_end');
    if (!start && !end && month && year) {
      var m = parseInt(month, 10) - 1, y = parseInt(year, 10);
      var last = new Date(y, m + 1, 0);
      if (!window.__tmpIso) {
        window.__tmpIso = function (d, m, y) {
          var mm = String(m).padStart(2, '0');
          var dd = String(d).padStart(2, '0');
          return y + '-' + mm + '-' + dd;
        };
      }
      start = window.__tmpIso(1, m + 1, y);
      end   = window.__tmpIso(last.getDate(), m + 1, y);
    }
    return {
      month: month, year: year, start_date: start, end_date: end,
      type: val('f_type'),
      category: val('f_cat'),
      payment_method: val('f_pag'),
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

  function computeSummary(list) {
    var inc = 0, exp = 0;
    list.forEach(function (t) {
      var v = Number(t.valor);
      if (t.tipo === 'RECEITA') inc += v; else exp += v;
    });
    return { income: inc, expenses: exp, balance: inc - exp, count: list.length };
  }

  function renderSummary(list) {
    var s = computeSummary(list);
    var wrap = document.getElementById('summaryBar');
    if (!wrap) return;
    var balClass = s.balance >= 0 ? 'kpi-balance-pos' : 'kpi-balance-neg';
    wrap.innerHTML =
      kpiCard('kpi-income',
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>',
        'Receitas', MCF.formatBRL(s.income), s.count + ' lançamento' + (s.count === 1 ? '' : 's') + ' de receita') +
      kpiCard('kpi-expense',
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M19 12l-7-7-7 7"/></svg>',
        'Despesas', MCF.formatBRL(s.expenses), 'Total de saídas no período') +
      kpiCard(balClass,
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>',
        'Saldo', MCF.formatBRL(s.balance), (s.balance >= 0 ? 'Saldo positivo 🎉' : 'Saldo negativo — atenção'));
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

  function applyLocalFilters(list) {
    try {
      var q = (localSearch || '').toLowerCase().trim();
      return (list || []).filter(function (t) {
        try {
          if (quickType && t.tipo !== quickType) return false;
          if (quickPag && t.forma_pagamento !== quickPag) return false;
          if (!q) return true;
          var catNome = t.categoria_nome || (t.category && t.category.nome) || '';
          var hay = [t.descricao || '', catNome, t.observacao || '', t.forma_pagamento || ''].join(' ').toLowerCase();
          return hay.indexOf(q) !== -1;
        } catch (e) { return true; }
      });
    } catch (e) { return (list || []); }
  }

  function badgeTipo(t) {
    try {
      return t.tipo === 'RECEITA'
        ? '<span class="badge badge-income">Receita</span>'
        : '<span class="badge badge-expense">Despesa</span>';
    } catch (e) { return '<span class="badge badge-default">—</span>'; }
  }
  function badgePgto(pg) {
    if (!pg) return '<span class="badge badge-default">—</span>';
    var cls = 'badge-default';
    if (pg === 'PIX') cls = 'badge-pg-pix';
    else if (pg === 'Cartão de crédito') cls = 'badge-pg-card';
    else if (pg === 'Débito') cls = 'badge-pg-deb';
    else if (pg === 'Dinheiro') cls = 'badge-pg-dinheiro';
    else if (pg === 'Transferência') cls = 'badge-pg-transf';
    else if (pg === 'Boleto') cls = 'badge-pg-boleto';
    else if (pg === 'Empréstimo') cls = 'badge-pg-emprestimo';
    else if (pg === 'Outro') cls = 'badge-pg-outro';
    var extraStyle = (pg === 'Empréstimo') ? ' style="background:linear-gradient(160deg, rgba(124,58,237,0.25), rgba(30,27,75,0.85));border-color:rgba(167,139,250,0.5);color:#e9d5ff;"' : '';
    return '<span class="badge ' + cls + '"' + extraStyle + '>' + pg + '</span>';
  }

  function formatValor(t) {
    var sinal = t.tipo === 'RECEITA' ? '+' : '−';
    var color = t.tipo === 'RECEITA' ? 'color:#6ee7b7;text-shadow:0 0 18px rgba(16,185,129,.25)' : 'color:#fda4af;text-shadow:0 0 18px rgba(244,63,94,.25)';
    return '<div class="text-right whitespace-nowrap"><div class="text-sm font-black" style="' + color + '">' + sinal + MCF.formatBRL(t.valor) + '</div></div>';
  }

  function renderRows(list) {
    var tbody = document.getElementById('txTbody');
    var cards = document.getElementById('txCards');
    if (!list.length) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="px-5 py-16 text-center">' +
          '<div class="mx-auto h-14 w-14 rounded-3xl grid place-items-center mb-3" style="background: linear-gradient(180deg, rgba(30,58,107,.5), rgba(5,12,26,.9)); border:1px solid rgba(59,130,246,.2); color:#93c5fd;">' +
            '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-list"/></svg>' +
          '</div>' +
          '<p class="font-bold text-white/90">Nenhum lançamento encontrado.</p>' +
          '<p class="text-sm mt-1.5 text-royal-300/70" style="color:#7a8eaf;">Tente ajustar os filtros ou crie um lançamento clicando em "+ Novo Lançamento".</p>' +
        '</td></tr>';
      cards.innerHTML =
        '<div class="rounded-3xl p-6 text-center text-sm" style="background: linear-gradient(160deg, rgba(30,58,107,.45), rgba(5,12,26,.9)); border:1px dashed rgba(59,130,246,.35); color:#b5c6e0;">Nenhum lançamento no período.</div>';
      return;
    }
    tbody.innerHTML = list.map(function (t) {
      return (
        '<tr class="' + (t.tipo === 'RECEITA' ? 'row-income' : 'row-expense') + '" style="border-bottom:1px solid rgba(59,130,246,0.08);">' +
          '<td class="px-5 py-3.5 whitespace-nowrap">' +
            '<div class="font-black text-[#e5eefc]">' + MCF.formatDateBR(t.data) + '</div>' +
          '</td>' +
          '<td class="px-5 py-3.5 min-w-[220px]">' +
            '<div class="font-bold text-white truncate max-w-md">' + (t.descricao || '') + '</div>' +
            (t.observacao ? '<div class="text-xs truncate max-w-md" style="color:#7a8eaf;">' + t.observacao + '</div>' : '') +
          '</td>' +
          '<td class="px-5 py-3.5"><span class="badge badge-default">' + (t.categoria_nome || '') + '</span></td>' +
          '<td class="px-5 py-3.5">' + badgeTipo(t) + '</td>' +
          '<td class="px-5 py-3.5">' + badgePgto(t.forma_pagamento) + '</td>' +
          '<td class="px-5 py-3.5 text-right">' + formatValor(t) + '</td>' +
          '<td class="px-5 py-3.5 text-right no-print whitespace-nowrap">' +
            '<div class="inline-flex items-center gap-2">' +
              '<a href="/editar?id=' + encodeURIComponent(t.id) + '" class="btn-ghost !px-3 !py-2 gap-1" title="Editar">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-edit"/></svg>' +
                '<span class="hidden lg:inline text-xs">Editar</span>' +
              '</a>' +
              '<button type="button" data-del="' + t.id + '" class="btn-danger !px-3 !py-2 gap-1 btn-delete" title="Excluir">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trash"/></svg>' +
                '<span class="hidden lg:inline text-xs">Excluir</span>' +
              '</button>' +
            '</div>' +
          '</td>' +
        '</tr>'
      );
    }).join('');

    cards.innerHTML = list.map(function (t) {
      var valColor = t.tipo === 'RECEITA' ? 'color:#6ee7b7;text-shadow:0 0 18px rgba(16,185,129,.25)' : 'color:#fda4af;text-shadow:0 0 18px rgba(244,63,94,.25)';
      var sinal = t.tipo === 'RECEITA' ? '+' : '−';
      return (
        '<div class="tx-card !rounded-3xl">' +
          '<div class="flex items-start justify-between gap-3">' +
            '<div class="min-w-0 flex-1">' +
              '<div class="flex flex-wrap items-center gap-2 mb-1.5">' +
                badgeTipo(t) + badgePgto(t.forma_pagamento) +
              '</div>' +
              '<p class="font-black text-white text-base truncate">' + (t.descricao || '') + '</p>' +
              '<p class="text-xs mt-0.5" style="color:#7a8eaf;">' + MCF.formatDateBR(t.data) + ' · ' + (t.categoria_nome || '') + (t.observacao ? ' · ' + t.observacao : '') + '</p>' +
            '</div>' +
            '<div class="text-right">' +
              '<div class="font-black text-lg" style="' + valColor + '">' + sinal + MCF.formatBRL(t.valor) + '</div>' +
              '<div class="flex gap-2 mt-3">' +
                '<a href="/editar?id=' + encodeURIComponent(t.id) + '" class="btn-ghost !px-2.5 !py-1.5 text-xs">' +
                  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-edit"/></svg> Editar' +
                '</a>' +
                '<button type="button" data-del="' + t.id + '" class="btn-danger !px-2.5 !py-1.5 text-xs btn-delete">' +
                  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><use href="#icon-trash"/></svg> Excluir' +
                '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
          (t.forma_pagamento === 'Cartão de crédito' && t.cartao_nome
            ? '<div class="mt-3 text-[11px] font-bold px-3 py-2 rounded-2xl" style="color:#fde68a; background: linear-gradient(180deg, rgba(245,158,11,0.2), rgba(120,53,15,0.5)); border:1px solid rgba(245,158,11,.35);">💳 ' + t.cartao_nome + (t.qtd_parcelas > 1 ? (' · parcela ' + t.parcela_atual + ' de ' + t.qtd_parcelas) : ' · à vista') + '</div>'
            : '') +
        '</div>'
      );
    }).join('');
  }

  async function deleteTx(id, row) {
    if (!window.confirm('Confirma a exclusão deste lançamento? Essa ação não pode ser desfeita.')) return;
    try {
      await MCF.api('/api/transactions/' + encodeURIComponent(id), { method: 'DELETE' });
      MCF.toast('Lançamento excluído com sucesso.', 'success');
      load();
    } catch (e) {
      MCF.toast(e.message || 'Erro ao excluir.', 'error');
    }
  }

  function bindDelete() {
    document.querySelectorAll('[data-del]').forEach(function (btn) {
      if (btn.__bound) return;
      btn.__bound = true;
      btn.addEventListener('click', function () {
        deleteTx(btn.getAttribute('data-del'));
      });
    });
  }

  function localRerender() {
    try {
      var filtered = applyLocalFilters(loaded || []);
      try { renderSummary(filtered); } catch (e) { try { MCF.toast('Erro no resumo.', 'warn'); } catch (_) {} }
      try { renderRows(filtered); } catch (e) { try { MCF.toast('Erro ao desenhar tabela.', 'warn'); } catch (_) {} }
      try { bindDelete(); } catch (e) {}
    } catch (outer) {
      try { MCF.toast('Erro interno ao renderizar.', 'error'); } catch (_) {}
    }
  }

  // Timer DEFENSIVO: nunca deixa "Carregando..." infinito.
  // Mesmo que a Promise da API fique pendente para sempre (ex: Lambda travado / timeout nao propagado),
  // esse setTimeout garante que localRerender() sera chamado em no MAXIMO 6 segundos apos iniciar o load().
  var MAX_LOAD_MS = 6000;
  var loadTimerId = null;
  var loadResolved = false;
  function _forceLoadFinish(silentTimeout) {
    try {
      if (loadResolved) return;
      loadResolved = true;
      if (loadTimerId) { clearTimeout(loadTimerId); loadTimerId = null; }
      if (silentTimeout && (!loaded || loaded.length === 0)) {
        try { MCF.toast('Tempo excedido: mostrando lista local. Recarregue a página para tentar novamente.', 'warn'); } catch (e) {}
      }
      // Garante que loaded NUNCA é null quando sair daqui (evita render do skeleton)
      if (!loaded) loaded = [];
      try { localRerender(); } catch (e) {
        try { MCF.toast('Erro ao renderizar lançamentos.', 'error'); } catch (_) {}
      }
    } catch (outer) {
      // Ultima camada: remover skeleton manualmente via DOM direto
      try {
        var tableWrap = document.querySelector('section.card-soft');
        var sk = document.querySelectorAll('.skeleton');
        (sk || []).forEach(function (el) { el.style.display = 'none'; });
        if (tableWrap) tableWrap.innerHTML = '<div class="p-10 text-center text-royal-200/70"><b style="font-size:22px; display:block; margin-bottom:10px;">Nenhum lançamento encontrado</b><p class="text-sm">Tente ajustar os filtros acima ou clique em Novo Lançamento.</p></div>';
      } catch (__) {}
    }
  }

  async function load() {
    // ==========================================================
    // PRIMEIRA COISA: agenda o timer DEFENSIVO hard 6 segundos.
    // NÃO PODE THROW ANTES DISSO. Nunca mais skeleton infinito.
    // ==========================================================
    loadResolved = false;
    if (loadTimerId) { clearTimeout(loadTimerId); loadTimerId = null; }
    loadTimerId = setTimeout(function () { _forceLoadFinish(true); }, MAX_LOAD_MS);

    // Agora sim: resto do código (qualquer throw aqui não mata o timer)
    loaded = null;
    var f = getFormFilters();
    MCF.setQuery(f);
    var pEl = document.getElementById('periodLabel');
    if (pEl) { try { pEl.textContent = periodText(f.start_date, f.end_date); } catch (e) {} }
    try {
      var url = MCF.buildTransactionsQuery(f);
      var resultado = await MCF.withTimeout(
        MCF.api(url),
        MAX_LOAD_MS,
        'Tempo máximo de carregamento excedido.',
      );
      if (!Array.isArray(resultado)) throw new Error('Resposta inválida da API de lançamentos.');
      loaded = resultado;
      // se query string tem search, preenche
      var q = MCF.qs('search', MCF.qs('q', ''));
      var b = document.getElementById('busca');
      if (b && q) { b.value = q; localSearch = q; }
      else if (b) { localSearch = b.value; }
    } catch (e) {
      loaded = [];
      if (!loadResolved) MCF.toast(e.message || 'Erro ao carregar lançamentos.', 'error');
    } finally {
      _forceLoadFinish(false);
    }
  }

  async function loadCategories() {
    try {
      var f = MCF.currentFilters();
      if (!f.month) f.month = MCF.qs('mes', '');
      if (!f.year)  f.year  = MCF.qs('ano', '');
      var cats = await MCF.withTimeout(MCF.api('/api/categories'), 6000);
      fillCategoryOptions(cats, f);
    } catch (e) {
      MCF.toast('Erro ao carregar categorias (usando padrão).', 'warn');
      fillCategoryOptions([], MCF.currentFilters());
    }
  }

  function setupQuickChips() {
    var ct = document.getElementById('chipsTipo');
    if (ct) {
      ct.querySelectorAll('.chip[data-type]').forEach(function (c) {
        c.addEventListener('click', function () {
          ct.querySelectorAll('.chip').forEach(function (x) { x.classList.remove('is-active'); });
          c.classList.add('is-active');
          quickType = c.getAttribute('data-type') || '';
          // sync select f_type
          var s = document.getElementById('f_type');
          if (s) s.value = quickType;
          localRerender();
        });
      });
    }
    var cp = document.getElementById('chipsPag');
    if (cp) {
      cp.querySelectorAll('.chip[data-pg]').forEach(function (c) {
        c.addEventListener('click', function () {
          cp.querySelectorAll('.chip').forEach(function (x) { x.classList.remove('is-active'); });
          c.classList.add('is-active');
          quickPag = c.getAttribute('data-pg') || '';
          var s = document.getElementById('f_pag');
          if (s) s.value = quickPag;
          localRerender();
        });
      });
    }
    var b = document.getElementById('busca');
    if (b) {
      var t;
      b.addEventListener('input', function () {
        clearTimeout(t);
        t = setTimeout(function () {
          localSearch = b.value || '';
          MCF.setQuery({ search: localSearch, q: '' });
          localRerender();
        }, 180);
      });
      window.addEventListener('mcf:search-change', function (e) {
        b.value = (e.detail && e.detail.q) || '';
        localSearch = b.value;
        localRerender();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', async function () {
    try {
      var f = MCF.currentFilters();
      if (!f.month) f.month = MCF.qs('mes', '');
      if (!f.year)  f.year  = MCF.qs('ano', '');
      fillMonthYear(f);
      try { applyFiltersToForm(f); } catch (e) {}
      var st = document.getElementById('f_start'), en = document.getElementById('f_end');
      if (st && !st.value && f.start_date) st.value = f.start_date;
      if (en && !en.value && f.end_date)   en.value = f.end_date;
      // compat: mes/ano e datas sincronizas
      var mesQ = MCF.qs('mes', ''), anoQ = MCF.qs('ano', '');
      if (mesQ && anoQ && !st.value && !en.value) {
        var m = parseInt(mesQ, 10) - 1, y = parseInt(anoQ, 10);
        var lastD = new Date(y, m + 1, 0).getDate();
        st.value = (y + '-' + String(m + 1).padStart(2, '0') + '-01');
        en.value = (y + '-' + String(m + 1).padStart(2, '0') + '-' + String(lastD).padStart(2, '0'));
      }
      var pEl = document.getElementById('periodLabel');
      try { if (pEl) pEl.textContent = periodText(st ? st.value : '', en ? en.value : ''); } catch (e) {}

      try { await loadCategories(); } catch (e) {}
      try { setupQuickChips(); } catch (e) {}

      var filterForm = document.getElementById('filterForm');
      if (filterForm) {
        filterForm.addEventListener('submit', function (e) {
          e.preventDefault();
          try {
            quickType = document.getElementById('f_type').value || '';
            quickPag  = document.getElementById('f_pag').value  || '';
            // sincroniza chips
            var ct = document.getElementById('chipsTipo'); if (ct) {
              ct.querySelectorAll('.chip').forEach(function (x) { x.classList.toggle('is-active', (x.getAttribute('data-type') || '') === quickType); });
            }
            var cp = document.getElementById('chipsPag'); if (cp) {
              cp.querySelectorAll('.chip').forEach(function (x) { x.classList.toggle('is-active', (x.getAttribute('data-pg') || '') === quickPag); });
            }
          } catch (inner) {}
          load();
        });
      }
      var btnReset = document.getElementById('btnReset');
      if (btnReset) {
        btnReset.addEventListener('click', function () {
          MCF.setQuery({ month: '', year: '', mes: '', ano: '', start_date: '', end_date: '', type: '', category: '', payment_method: '', search: '', q: '' });
          setTimeout(function () { location.reload(); }, 0);
        });
      }

      var fm = document.getElementById('f_mes'), fa = document.getElementById('f_ano');
      function sync() {
        if (!fm || !fa) return;
        if (!fm.value || !fa.value) return;
        var mv = fm.value, av = fa.value;
        var m2 = parseInt(mv, 10) - 1, y2 = parseInt(av, 10);
        var last2 = new Date(y2, m2 + 1, 0).getDate();
        if (st) st.value = (y2 + '-' + String(m2 + 1).padStart(2, '0') + '-01');
        if (en) en.value = (y2 + '-' + String(m2 + 1).padStart(2, '0') + '-' + String(last2).padStart(2, '0'));
        if (pEl) { try { pEl.textContent = periodText(st ? st.value : '', en ? en.value : ''); } catch (e) {} }
      }
      fm && fm.addEventListener('change', sync);
      fa && fa.addEventListener('change', sync);
    } catch (outerInit) {
      try { MCF.toast('Erro ao inicializar lançamentos.', 'error'); } catch (_) {}
    } finally {
      try { load(); } catch (_) {}
    }
  });

  // ======================================================================
  // WATCHDOG GLOBAL DE ÚLTIMA INSTÂNCIA (fora de try/catch, setInterval)
  // Roda a cada 300ms e, se 8s após abrir a página ainda houver skeleton
  // visível, FORÇA sair do modo carregamento via DOM direto.
  // Isso é o que impede 100% o "carregando infinito" independente de
  // qualquer throw antes, durante ou depois do load().
  // ======================================================================
  (function watchdog() {
    try {
      var startedAt = Date.now();
      var WATCHDOG_MAX_MS = 8000;
      var alreadyFixed = false;
      var id = setInterval(function () {
        try {
          if (alreadyFixed) { clearInterval(id); return; }
          if (Date.now() - startedAt < WATCHDOG_MAX_MS) return;
          var stillLoading = false;
          var sk = document.querySelectorAll('.skeleton');
          (sk || []).forEach(function (el) { if (el.offsetParent !== null) stillLoading = true; });
          var txTbody = document.getElementById('txTbody');
          if (txTbody && /Carregando/i.test(txTbody.innerText || '')) stillLoading = true;
          if (!stillLoading) { alreadyFixed = true; clearInterval(id); return; }
          // Força saída
          alreadyFixed = true;
          clearInterval(id);
          if (typeof loaded === 'undefined' || !loaded) { loaded = []; }
          try { _forceLoadFinish(true); } catch (_) {}
          // fallback final: DOM direto
          try {
            (sk || []).forEach(function (el) { el.style.display = 'none'; });
            if (txTbody) txTbody.innerHTML =
              '<tr><td colspan="7" class="px-5 py-16 text-center">' +
                '<div class="mx-auto h-14 w-14 rounded-3xl grid place-items-center mb-3" style="background: linear-gradient(180deg, rgba(30,58,107,.5), rgba(5,12,26,.9)); border:1px solid rgba(59,130,246,.2); color:#93c5fd;">' +
                  '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h6m-6 4h6M12 4v4m0 8v4M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/></svg>' +
                '</div>' +
                '<p class="text-lg font-black text-royal-100/90">Nenhum lançamento encontrado</p>' +
                '<p class="text-sm mt-1 text-royal-300/70">Ajuste os filtros ou crie um novo lançamento (atalho: N)</p>' +
              '</td></tr>';
            try { MCF.toast('Recarregue a página para tentar novamente.', 'warn'); } catch (_) {}
          } catch (fatal) {}
        } catch (e) { /* guarda final: não propagar */ }
      }, 300);
    } catch (outerWd) {}
  })();
})();
