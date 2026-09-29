/* transaction-form.js - cadastro e edição de lançamentos */
(function () {
  'use strict';

  var CATEGORIES_BY_ID = {};
  var CATEGORIES_BY_NAME = {};
  var CATEGORIES_BY_TYPE = { RECEITA: [], DESPESA: [] };

  function slugify(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function setTipo(tipo, options) {
    var sw = document.getElementById('tipoSwitch');
    if (!sw) return;
    var opts = options || {};
    sw.querySelectorAll('button[data-type]').forEach(function (btn) {
      if (btn.getAttribute('data-type') === tipo) btn.classList.add('is-active');
      else btn.classList.remove('is-active');
    });
    if (!opts.keepCategories) renderCategoryChips(tipo);
    if (!opts.silent && window.__txForm) {
      // se for RECEITA e categoria atual for DESPESA → reset categoria
      var cur = document.getElementById('categoria').value;
      var curObj = cur ? CATEGORIES_BY_ID[cur] : null;
      if (curObj && curObj.tipo !== tipo) selectCategoria('', null);
    }
  }

  function currentTipo() {
    var sw = document.getElementById('tipoSwitch');
    if (!sw) return (document.querySelector('input[name="tipo"]:checked') || {}).value || 'DESPESA';
    var active = sw.querySelector('button[data-type].is-active');
    return active ? active.getAttribute('data-type') : 'RECEITA';
  }

  function renderCategoryChips(tipo) {
    var wrap = document.getElementById('categoryChips');
    if (!wrap) return;
    wrap.innerHTML = '';
    var list = CATEGORIES_BY_TYPE[tipo] || [];
    var chipClass = tipo === 'RECEITA' ? 'chip chip-income' : 'chip chip-outcome';
    if (!list.length) {
      wrap.innerHTML = '<p class="text-xs text-slate-400 font-semibold">Carregando categorias...</p>';
      return;
    }
    list.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = chipClass;
      b.setAttribute('data-cat', c.id);
      b.setAttribute('data-slug', c.slug || slugify(c.nome));
      b.textContent = c.nome;
      b.addEventListener('click', function () { selectCategoria(c.id, c); });
      wrap.appendChild(b);
    });
    // sincroniza seleção prévia se existir
    var selected = document.getElementById('categoria').value;
    if (selected) {
      var cat = CATEGORIES_BY_ID[selected];
      selectCategoria(selected, cat);
    }
  }

  function selectCategoria(id, cat) {
    var sel = document.getElementById('categoria');
    sel.value = id || '';
    var wrap = document.getElementById('categoryChips');
    if (!wrap) return;
    wrap.querySelectorAll('.chip').forEach(function (chip) {
      if (chip.getAttribute('data-cat') === id) chip.classList.add('is-active');
      else chip.classList.remove('is-active');
    });
    if (cat && window.__txForm && window.__txForm.syncDescricao !== false) {
      // se descrição vazia e categoria for Salário / Mercado etc, sugere descrição
      var descEl = document.getElementById('descricao');
      if (descEl && !descEl.value) {
        if (cat.slug === 'salario') descEl.value = 'Salário';
        else if (cat.slug === 'mercado') descEl.value = 'Supermercado';
        else if (cat.slug === 'freelance') descEl.value = 'Serviço / Freelance';
        else if (cat.slug === 'alimentacao') descEl.value = 'Refeição';
        else if (cat.slug === 'transporte') descEl.value = 'Transporte';
      }
    }
  }

  function selectForma(pg) {
    document.getElementById('forma_pagamento').value = pg || '';
    var chips = document.querySelectorAll('#formaChips .chip');
    chips.forEach(function (chip) {
      if (chip.getAttribute('data-pg') === pg) chip.classList.add('is-active');
      else chip.classList.remove('is-active');
    });
    var cred = document.getElementById('creditFields');
    if (!cred) return;
    if (pg === 'Cartão de crédito') cred.classList.remove('hidden');
    else cred.classList.add('hidden');
    atualizaParcelaHelper();
  }

  function isoToDate(s) {
    if (!s) return null;
    var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }
  function addMonths(d, months) {
    if (!d) return null;
    var y = d.getFullYear();
    var mo = d.getMonth() + (months || 0);
    var targetYear = y + Math.floor(mo / 12);
    var targetMonth = ((mo % 12) + 12) % 12;
    // último dia do mês alvo
    var last = new Date(targetYear, targetMonth + 1, 0).getDate();
    var day = Math.min(d.getDate(), last);
    return new Date(targetYear, targetMonth, day);
  }
  function fmtBRDate(d) {
    if (!d) return '—';
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    return dd + '/' + mm + '/' + d.getFullYear();
  }

  function atualizaParcelaHelper() {
    var helper = document.getElementById('parcelaHelper');
    if (!helper) return;
    var pg = document.getElementById('forma_pagamento') ? document.getElementById('forma_pagamento').value : '';
    var qtd = Number((document.getElementById('qtd_parcelas') || {}).value || 1) || 1;
    var parcAtual = Number((document.getElementById('parcela_atual') || {}).value || 1) || 1;
    if (parcAtual < 1) parcAtual = 1;
    var valorStr = (document.getElementById('valor') || {}).value || '';
    var valor = Number(MCF.moneyToDecimal(document.getElementById('valor')));
    var data = isoToDate((document.getElementById('data') || {}).value);

    if (pg !== 'Cartão de crédito' && !(qtd > 1)) {
      helper.innerHTML = 'Deixe 1 para pagamento à vista.';
      return;
    }
    if (qtd <= 1) {
      helper.innerHTML = 'Pagamento à vista — nenhuma parcela futura.';
      return;
    }
    var data1 = data;
    var dataUlt = addMonths(data1, (qtd - parcAtual));
    var total = valor * qtd;
    helper.innerHTML =
      '<div>📅 1ª parcela: <b>' + fmtBRDate(data1) + '</b> · Última: <b>' + fmtBRDate(dataUlt) + '</b></div>' +
      '<div class="mt-1">💳 Total <b>' + qtd + 'x</b> de <b>' + MCF.formatBRL(valor) + '</b> = <b>' + MCF.formatBRL(total) + '</b></div>' +
      (parcAtual > 1
        ? '<div class="mt-1 text-amber-200/80">✦ Você escolheu começar na parcela ' + parcAtual + ' — as ' + (parcAtual - 1) + ' anteriores não serão lançadas.</div>'
        : '');
  }

  function bindParcelaWatchers() {
    ['qtd_parcelas', 'parcela_atual', 'data'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', atualizaParcelaHelper);
      el.addEventListener('change', atualizaParcelaHelper);
    });
    var v = document.getElementById('valor');
    if (v) {
      v.addEventListener('keyup', function () { clearTimeout(window.__phTimer); window.__phTimer = setTimeout(atualizaParcelaHelper, 120); });
      v.addEventListener('blur', atualizaParcelaHelper);
      v.addEventListener('change', atualizaParcelaHelper);
    }
  }

  function setQuickValue(val) {
    var v = String(val || '0');
    if (v.indexOf('.') === -1) v = v + '.00';
    var input = document.getElementById('valor');
    MCF.maskMoney(input, v);
  }

  function quickPick(kind) {
    var PICKERS = {
      salario:       { tipo: 'RECEITA', desc: 'Salário',                 cat: 'Salário',             valor: '7500.00', pg: 'PIX' },
      freela:        { tipo: 'RECEITA', desc: 'Serviço / Freelance',     cat: 'Freelance',           valor: '1500.00', pg: 'Transferência' },
      mercado:       { tipo: 'DESPESA', desc: 'Supermercado do mês',     cat: 'Mercado',             valor: '780.00', pg: 'Cartão de crédito', cartao: 'Nubank Ultravioleta', qtd: 1 },
      alimentacao:   { tipo: 'DESPESA', desc: 'Restaurante / Almoço',    cat: 'Alimentação',         valor: '120.00', pg: 'PIX' },
      transporte:    { tipo: 'DESPESA', desc: 'Transporte da semana',    cat: 'Transporte',          valor: '150.00', pg: 'Débito' },
    };
    var p = PICKERS[kind];
    if (!p) return;
    setTipo(p.tipo, { silent: false });
    if (document.getElementById('descricao')) document.getElementById('descricao').value = p.desc;
    var catId = (CATEGORIES_BY_NAME[p.tipo] && CATEGORIES_BY_NAME[p.tipo][p.cat]) ? CATEGORIES_BY_NAME[p.tipo][p.cat].id : '';
    selectCategoria(catId, CATEGORIES_BY_ID[catId]);
    if (p.valor) setQuickValue(p.valor);
    selectForma(p.pg || '');
    if (p.pg === 'Cartão de crédito' && p.cartao) {
      var sCart = document.getElementById('cartao_nome_select');
      var inputCart = document.getElementById('cartao_nome');
      if (sCart && Array.from(sCart.options).some(function (o) { return o.value === p.cartao; })) sCart.value = p.cartao;
      if (inputCart) inputCart.value = p.cartao;
      if (p.qtd) document.getElementById('qtd_parcelas').value = String(p.qtd);
      if (p.qtd) document.getElementById('parcela_atual').value = String(p.qtd === 1 ? 1 : 1);
    }
  }

  function validate(payload) {
    var errs = [];
    if (!payload.tipo || (payload.tipo !== 'RECEITA' && payload.tipo !== 'DESPESA')) errs.push('Selecione um tipo: Receita ou Despesa.');
    if (!payload.descricao || !String(payload.descricao).trim()) errs.push('Informe uma descrição.');
    if (!payload.category_id) errs.push('Selecione uma categoria.');
    if (!payload.forma_pagamento) errs.push('Selecione a forma de pagamento.');
    if (!payload.data) errs.push('Informe a data da movimentação.');
    var valor = Number(MCF.moneyToDecimal(document.getElementById('valor')));
    if (!(valor > 0)) errs.push('Informe um valor maior que zero.');
    if (payload.forma_pagamento === 'Cartão de crédito') {
      var q = Number(payload.qtd_parcelas || 1) || 0;
      var pa = Number(payload.parcela_atual || 1) || 0;
      if (q < 1) errs.push('Quantidade de parcelas deve ser pelo menos 1.');
      if (pa < 1 || pa > q) errs.push('Parcela atual inválida.');
    }
    return errs;
  }

  async function loadCategories() {
    var data = await MCF.api('/api/categories');
    ['RECEITA', 'DESPESA'].forEach(function (t) {
      CATEGORIES_BY_TYPE[t] = (data[t] || []).slice().sort(function (a, b) { return a.nome.localeCompare(b.nome); });
      CATEGORIES_BY_NAME[t] = {};
      CATEGORIES_BY_TYPE[t].forEach(function (c) {
        CATEGORIES_BY_ID[c.id] = c;
        CATEGORIES_BY_NAME[t][c.nome] = c;
      });
    });
    var sel = document.getElementById('categoria');
    if (sel) {
      sel.innerHTML = '<option value="">Selecione...</option>';
      ['RECEITA', 'DESPESA'].forEach(function (t) {
        var grp = document.createElement('optgroup');
        grp.label = t === 'RECEITA' ? 'Receitas' : 'Despesas';
        CATEGORIES_BY_TYPE[t].forEach(function (c) {
          var o = document.createElement('option');
          o.value = c.id;
          o.textContent = c.nome;
          grp.appendChild(o);
        });
        sel.appendChild(grp);
      });
    }
    return data;
  }

  function initStaticBehavior() {
    // Tipo switch
    var sw = document.getElementById('tipoSwitch');
    if (sw) {
      sw.querySelectorAll('button[data-type]').forEach(function (btn) {
        btn.addEventListener('click', function () { setTipo(btn.getAttribute('data-type')); });
      });
    }
    // Forma chips
    var formaChipsWrap = document.getElementById('formaChips');
    if (formaChipsWrap) {
      formaChipsWrap.querySelectorAll('.chip[data-pg]').forEach(function (chip) {
        chip.addEventListener('click', function () { selectForma(chip.getAttribute('data-pg')); });
      });
      document.getElementById('forma_pagamento').addEventListener('change', function () {
        selectForma(document.getElementById('forma_pagamento').value);
      });
    }
    // Quantidade de parcelas chips
    var qtd = document.getElementById('qtdChips');
    if (qtd) {
      qtd.querySelectorAll('[data-qtd]').forEach(function (b) {
        b.addEventListener('click', function () {
          var v = b.getAttribute('data-qtd');
          document.getElementById('qtd_parcelas').value = v;
          document.getElementById('parcela_atual').value = '1';
          qtd.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('is-active', c === b); });
        });
      });
    }
    // Quick values
    var qv = document.getElementById('quickValues');
    if (qv) {
      qv.querySelectorAll('[data-val]').forEach(function (b) {
        b.addEventListener('click', function () {
          var v = Number(b.getAttribute('data-val'));
          setQuickValue(v.toFixed(2));
          qv.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('is-active', c === b); });
        });
      });
    }
    // Quick picks
    var qp = document.getElementById('quickPicks');
    if (qp) {
      qp.querySelectorAll('[data-quick]').forEach(function (b) {
        b.addEventListener('click', function () {
          var kind = b.getAttribute('data-quick');
          quickPick(kind);
          qp.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('is-active', c === b); });
          setTimeout(function () { document.getElementById('descricao').focus(); }, 20);
        });
      });
    }
    // Hoje
    var hj = document.getElementById('btnHoje');
    if (hj) {
      hj.addEventListener('click', function () {
        document.getElementById('data').value = MCF.todayISO();
      });
    }
    // Cartão select sync
    var cartSel = document.getElementById('cartao_nome_select');
    if (cartSel) {
      cartSel.addEventListener('change', function () {
        if (cartSel.value) document.getElementById('cartao_nome').value = cartSel.value;
      });
    }
    // Máscara dinheiro
    MCF.maskMoney(document.getElementById('valor'));
    // Watchers de parcela (calcula datas/valor total em tempo real)
    bindParcelaWatchers();
    atualizaParcelaHelper();
  }

  function applyQSPresetsNew() {
    // Apenas em novo lançamento (editar traz por initial tx)
    var tipo = MCF.qs('tipo', '');
    if (tipo === 'RECEITA' || tipo === 'DESPESA') setTipo(tipo);
    else setTipo('DESPESA');

    var desc = MCF.qs('descricao', '');
    if (desc) document.getElementById('descricao').value = desc;

    var valor = MCF.qs('valor', '');
    if (valor) setQuickValue(valor);

    var data = MCF.qs('data', '');
    if (data) document.getElementById('data').value = data;
    else document.getElementById('data').value = MCF.todayISO();

    var forma = MCF.qs('forma_pagamento', '');
    if (forma) selectForma(forma);

    var cartao = MCF.qs('cartao_nome', '');
    if (cartao) document.getElementById('cartao_nome').value = cartao;

    var qtd = MCF.qs('qtd_parcelas', '');
    if (qtd) document.getElementById('qtd_parcelas').value = qtd;

    var pa = MCF.qs('parcela_atual', '');
    if (pa) document.getElementById('parcela_atual').value = pa;

    var categoriaNome = MCF.qs('categoria', '');
    var tipoAtual = currentTipo();
    if (categoriaNome && CATEGORIES_BY_NAME[tipoAtual] && CATEGORIES_BY_NAME[tipoAtual][categoriaNome]) {
      var c = CATEGORIES_BY_NAME[tipoAtual][categoriaNome];
      selectCategoria(c.id, c);
    }
  }

  function applyInitial(tx) {
    if (!tx) return;
    setTipo(tx.tipo, { keepCategories: false });
    document.getElementById('descricao').value = tx.descricao || '';
    if (tx.valor) setQuickValue(Number(tx.valor).toFixed(2));
    document.getElementById('data').value = tx.data || MCF.todayISO();
    if (tx.category_id) selectCategoria(tx.category_id, CATEGORIES_BY_ID[tx.category_id]);
    selectForma(tx.forma_pagamento || '');
    if (tx.cartao_nome) {
      document.getElementById('cartao_nome').value = tx.cartao_nome;
      var s = document.getElementById('cartao_nome_select');
      if (s && Array.from(s.options).some(function (o) { return o.value === tx.cartao_nome; })) s.value = tx.cartao_nome;
    }
    document.getElementById('qtd_parcelas').value = tx.qtd_parcelas || '';
    document.getElementById('parcela_atual').value = tx.parcela_atual || '';
    document.getElementById('observacao').value = tx.observacao || '';
  }

  async function initTransactionForm(endpoint, method, initial, redirectOnSuccess) {
    window.__txForm = { endpoint: endpoint, method: method, redirect: redirectOnSuccess, syncDescricao: true };
    initStaticBehavior();
    try {
      await loadCategories();
    } catch (e) {
      MCF.toast('Erro ao carregar categorias.', 'error');
    }
    if (initial) {
      window.__txForm.syncDescricao = false;
      applyInitial(initial);
      window.__txForm.syncDescricao = true;
    } else {
      applyQSPresetsNew();
    }
    // Atualiza helper de parcelas com valores já pré-definidos (initial ou QS)
    atualizaParcelaHelper();
    // Sincroniza chips de qtd parcela ativos
    var qtdChips = document.getElementById('qtdChips');
    if (qtdChips) {
      var qtdAtual = Number((document.getElementById('qtd_parcelas') || {}).value || 1) || 1;
      qtdChips.querySelectorAll('[data-qtd]').forEach(function (c) {
        c.classList.toggle('is-active', Number(c.getAttribute('data-qtd')) === qtdAtual);
      });
    }
    // Render chips categoria no tipo default
    renderCategoryChips(currentTipo());
    // Sincroniza select categoria manual com chips
    document.getElementById('categoria').addEventListener('change', function () {
      var id = document.getElementById('categoria').value;
      selectCategoria(id, CATEGORIES_BY_ID[id]);
    });

    // Submit
    var form = document.getElementById('txForm');
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var statusEl = document.getElementById('formStatus');
      statusEl.textContent = 'Validando...';
      statusEl.className = 'text-sm text-slate-500';
      document.getElementById('btnSave').disabled = true;

      var payload = {
        tipo: currentTipo(),
        descricao: String(document.getElementById('descricao').value || '').trim(),
        category_id: document.getElementById('categoria').value || null,
        valor: MCF.moneyToDecimal(document.getElementById('valor')),
        data: document.getElementById('data').value || null,
        forma_pagamento: document.getElementById('forma_pagamento').value || null,
        cartao_nome: String(document.getElementById('cartao_nome').value || '').trim() || null,
        qtd_parcelas: Number(document.getElementById('qtd_parcelas').value || 1) || 1,
        parcela_atual: Number(document.getElementById('parcela_atual').value || 1) || 1,
        observacao: String(document.getElementById('observacao').value || '').trim() || null,
      };
      if (payload.forma_pagamento !== 'Cartão de crédito') {
        payload.cartao_nome = null;
        payload.qtd_parcelas = 1;
        payload.parcela_atual = 1;
      }
      // validar categoria pertence ao tipo
      if (payload.category_id && CATEGORIES_BY_ID[payload.category_id] && CATEGORIES_BY_ID[payload.category_id].tipo !== payload.tipo) {
        MCF.toast('A categoria não pertence ao tipo selecionado.', 'error');
        statusEl.textContent = '';
        document.getElementById('btnSave').disabled = false;
        return;
      }
      var errs = validate(payload);
      if (errs.length) {
        MCF.toast(errs[0], 'error');
        statusEl.innerHTML = errs.map(function (m) { return '<span class="text-outcome-600 font-semibold">• ' + m + '</span>'; }).join('<br/>');
        document.getElementById('btnSave').disabled = false;
        return;
      }
      statusEl.textContent = 'Salvando...';
      try {
        await MCF.api(endpoint, { method: method, body: JSON.stringify(payload) });
        MCF.toast(method === 'PUT' ? 'Lançamento atualizado com sucesso.' : 'Lançamento salvo com sucesso.', 'success');
        statusEl.innerHTML = '<span class="text-income-600 font-bold">✔ Salvo com sucesso! Redirecionando...</span>';
        setTimeout(function () { window.location.assign(redirectOnSuccess || '/lancamentos'); }, 600);
      } catch (e) {
        MCF.toast(e.message || 'Erro ao salvar.', 'error');
        statusEl.innerHTML = '<span class="text-outcome-600 font-bold">' + (e.message || 'Erro ao salvar.') + '</span>';
        document.getElementById('btnSave').disabled = false;
      }
    });
  }

  window.MCF = window.MCF || {};
  window.MCF.initTransactionForm = initTransactionForm;
})();
