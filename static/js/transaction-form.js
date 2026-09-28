/* transaction-form.js - form de novo e editar lançamento */
(function () {
  'use strict';

  var _state = {
    endpoint: '/api/transactions',
    method: 'POST',
    initial: null,
    redirect: '/lancamentos',
  };

  function setStatus(msg, kind) {
    var el = document.getElementById('formStatus');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'text-sm ' + (
      kind === 'error' ? 'text-rose-700' :
      kind === 'success' ? 'text-emerald-700' :
      'text-slate-500'
    );
  }

  function isCreditCard() {
    return document.getElementById('forma_pagamento').value === 'Cartão de crédito';
  }

  function toggleCreditFields() {
    var box = document.getElementById('creditFields');
    if (!box) return;
    if (isCreditCard()) box.classList.remove('hidden');
    else box.classList.add('hidden');
  }

  function fillCategoriesByType(type, selectedId) {
    var cat = document.getElementById('categoria');
    if (!cat || !window.__CATEGORIES__) return;
    var arr = window.__CATEGORIES__[type] || [];
    cat.innerHTML = '<option value="">Selecione...</option>';
    arr.forEach(function (c) {
      var o = document.createElement('option');
      o.value = c.id;
      o.textContent = c.nome;
      cat.appendChild(o);
    });
    if (selectedId) cat.value = selectedId;
  }

  function bindTipoChange() {
    var radios = document.querySelectorAll('input[name="tipo"]');
    radios.forEach(function (r) {
      r.addEventListener('change', function () {
        fillCategoriesByType(r.value, null);
      });
    });
  }

  function collectPayload() {
    var form = document.getElementById('txForm');
    var tipo = (form.querySelector('input[name="tipo"]:checked') || {}).value;
    var descricao = document.getElementById('descricao').value.trim();
    var category_id = document.getElementById('categoria').value || null;
    var valor = MCF.moneyToDecimal(document.getElementById('valor'));
    var data = document.getElementById('data').value;
    var forma_pagamento = document.getElementById('forma_pagamento').value;
    var cartao_nome = document.getElementById('cartao_nome').value.trim() || null;
    var qtd_parcelas_raw = document.getElementById('qtd_parcelas').value;
    var parcela_atual_raw = document.getElementById('parcela_atual').value;
    var observacao = document.getElementById('observacao').value.trim() || null;

    var qtd_parcelas = (qtd_parcelas_raw === '' || qtd_parcelas_raw == null) ? null : parseInt(qtd_parcelas_raw, 10);
    var parcela_atual = (parcela_atual_raw === '' || parcela_atual_raw == null) ? null : parseInt(parcela_atual_raw, 10);

    if (forma_pagamento !== 'Cartão de crédito') {
      cartao_nome = null;
      qtd_parcelas = null;
      parcela_atual = null;
    }

    var payload = {
      tipo: tipo,
      descricao: descricao,
      category_id: category_id,
      valor: parseFloat(valor),
      data: data,
      forma_pagamento: forma_pagamento,
      observacao: observacao,
    };
    if (cartao_nome != null) payload.cartao_nome = cartao_nome;
    if (qtd_parcelas != null) payload.qtd_parcelas = qtd_parcelas;
    if (parcela_atual != null) payload.parcela_atual = parcela_atual;

    return payload;
  }

  function applyInitial(tx) {
    if (!tx) return;
    var form = document.getElementById('txForm');
    var radios = form.querySelectorAll('input[name="tipo"]');
    radios.forEach(function (r) {
      if (r.value === tx.tipo) r.checked = true;
    });
    fillCategoriesByType(tx.tipo, tx.category_id);
    document.getElementById('descricao').value = tx.descricao || '';
    document.getElementById('valor').setAttribute('data-value', Number(tx.valor).toFixed(2));
    document.getElementById('valor').value = MCF.formatBRL(tx.valor).replace('R$', '').trim();
    document.getElementById('data').value = (tx.data || '').slice(0, 10);
    document.getElementById('forma_pagamento').value = tx.forma_pagamento || '';
    toggleCreditFields();
    document.getElementById('cartao_nome').value = tx.cartao_nome || '';
    document.getElementById('qtd_parcelas').value = tx.qtd_parcelas || '';
    document.getElementById('parcela_atual').value = tx.parcela_atual || '';
    document.getElementById('observacao').value = tx.observacao || '';
  }

  function validate(payload) {
    var errs = [];
    if (!payload.tipo) errs.push('Selecione o tipo de lançamento.');
    if (!payload.descricao) errs.push('Informe a descrição.');
    if (!payload.category_id) errs.push('Selecione a categoria.');
    if (!(payload.valor > 0)) errs.push('Valor deve ser maior que zero.');
    if (!payload.data) errs.push('Selecione a data.');
    if (!payload.forma_pagamento) errs.push('Selecione a forma de pagamento.');
    if (payload.forma_pagamento === 'Cartão de crédito') {
      if (payload.qtd_parcelas && payload.parcela_atual && payload.parcela_atual > payload.qtd_parcelas) {
        errs.push('Parcela atual não pode ser maior que a quantidade de parcelas.');
      }
    }
    return errs;
  }

  async function onSubmit(e) {
    e.preventDefault();
    var payload = collectPayload();
    var errs = validate(payload);
    if (errs.length) {
      setStatus(errs.join(' '), 'error');
      MCF.toast(errs[0], 'error');
      return;
    }
    var btn = document.getElementById('btnSave');
    btn.disabled = true;
    setStatus('Salvando...', 'info');
    try {
      await MCF.api(_state.endpoint, {
        method: _state.method,
        body: JSON.stringify(payload),
      });
      setStatus('Lançamento salvo! Redirecionando...', 'success');
      MCF.toast('Lançamento salvo com sucesso.', 'success');
      setTimeout(function () { window.location.href = _state.redirect; }, 900);
    } catch (err) {
      var msg = (err && err.message) ? err.message : 'Erro ao salvar.';
      setStatus(msg, 'error');
      MCF.toast(msg, 'error');
      btn.disabled = false;
    }
  }

  async function init(endpoint, method, initialData, redirect) {
    _state.endpoint = endpoint || _state.endpoint;
    _state.method = (method || 'POST').toUpperCase();
    _state.initial = initialData || null;
    _state.redirect = redirect || '/lancamentos';

    MCF.maskMoney(document.getElementById('valor'));
    document.getElementById('forma_pagamento').addEventListener('change', toggleCreditFields);
    document.getElementById('txForm').addEventListener('submit', onSubmit);

    if (!document.getElementById('data').value) {
      document.getElementById('data').value = MCF.todayISO();
    }
    bindTipoChange();

    try {
      var cats = await MCF.api('/api/categories');
      window.__CATEGORIES__ = cats;
    } catch (e) {
      MCF.toast('Erro ao carregar categorias.', 'error');
      window.__CATEGORIES__ = { RECEITA: [], DESPESA: [] };
    }

    // Se não tem tipo selecionado e sem initial, marca Receita como padrão para o primeiro carregamento de categorias
    if (!initialData) {
      var firstRadio = document.querySelector('input[name="tipo"][value="RECEITA"]');
      if (firstRadio && !document.querySelector('input[name="tipo"]:checked')) firstRadio.checked = true;
      var t = (document.querySelector('input[name="tipo"]:checked') || { value: 'RECEITA' }).value;
      fillCategoriesByType(t, null);
    }

    toggleCreditFields();
    if (initialData) applyInitial(initialData);
  }

  window.MCF = window.MCF || {};
  window.MCF.initTransactionForm = init;
})();
