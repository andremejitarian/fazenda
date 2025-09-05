// script.js — controla o carregamento de eventos e renderização do header/hero
(function(){
  const STATE = {
    evento: null,
    participantes: [],
    responsavel: null
  };

  // localStorage helpers
  const STORAGE_KEY = 'fazenda_reserva_state_v1';
  function saveState(){
    try{ const copy = {participantes: STATE.participantes, appliedCupom: STATE.appliedCupom, eventoId: STATE.evento && STATE.evento.id, responsavel: STATE.responsavel};
      localStorage.setItem(STORAGE_KEY, JSON.stringify(copy));
    }catch(e){console.warn('saveState failed', e)}
  }
  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY); if(!raw) return;
      const parsed = JSON.parse(raw);
      if(parsed && Array.isArray(parsed.participantes)) STATE.participantes = parsed.participantes;
      if(parsed && parsed.appliedCupom) STATE.appliedCupom = parsed.appliedCupom;
      if(parsed && typeof parsed.responsavel !== 'undefined') STATE.responsavel = parsed.responsavel;
    }catch(e){console.warn('loadState failed', e)}
  }

  // small inscricao id generator
  function generateInscricaoId(){
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.floor(Math.random()*9000+1000).toString(36).toUpperCase();
    return `FS${ts}${rand}`;
  }

  function renderPaymentLinkResult(result){
    const previewArea = document.getElementById('previewArea');
    if(!previewArea) return;
    let html = '';
    if(result && result.link){
      html += `<div><strong>Link de Pagamento:</strong> <a href="${result.link}" target="_blank">Abrir checkout</a></div>`;
      html += `<div style="margin-top:8px"><button id="copyLinkBtn" class="btn">Copiar link</button> <button id="openLinkBtn" class="btn">Abrir em nova aba</button></div>`;
      // attempt to show QR via Google Charts (fallback if external allowed)
      const qrUrl = 'https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=' + encodeURIComponent(result.link);
      html += `<div style="margin-top:8px"><img src="${qrUrl}" alt="QR" style="width:140px;height:140px;border:1px solid #eee;border-radius:6px"/></div>`;
      previewArea.style.display = 'block';
      previewArea.innerHTML = '<div class="preview-json">' + html + '</div>';
      // wire buttons
      document.getElementById('copyLinkBtn').addEventListener('click', ()=>{ navigator.clipboard.writeText(result.link); });
      document.getElementById('openLinkBtn').addEventListener('click', ()=>{ window.open(result.link, '_blank'); });
    } else {
      previewArea.style.display = 'block';
      previewArea.innerHTML = '<div class="preview-json">Resposta inválida do webhook de pagamento.</div>';
    }
  }

  function qs(name){
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  function el(id){ return document.getElementById(id); }

  function renderHeader(event){
    const banner = el('banner');
    const logoWrap = el('logoWrap');
    const title = el('eventTitle');
    const desc = el('eventDescription');

    if(event.header && event.header.banner_url){
      banner.style.backgroundImage = `url(${event.header.banner_url})`;
    } else {
      banner.style.backgroundColor = '#e9ecef';
    }

    // Logo rendering
    logoWrap.innerHTML = '';
    if(event.header){
      const h = event.header;
      if((h.partner_logos && h.partner_logos.length === 2) || h.logo_duplo){
        const wrapper = document.createElement('div');
        wrapper.className = 'logo-duplo';
        const imgA = document.createElement('img');
        imgA.src = h.partner_logos && h.partner_logos[0] ? h.partner_logos[0] : h.logo_url;
        imgA.alt = 'Parceiro A';
        imgA.className = 'logo-duplo-img a';
        const imgB = document.createElement('img');
        imgB.src = h.partner_logos && h.partner_logos[1] ? h.partner_logos[1] : h.logo_url;
        imgB.alt = 'Parceiro B';
        imgB.className = 'logo-duplo-img b';
        wrapper.appendChild(imgA);
        wrapper.appendChild(imgB);
        logoWrap.appendChild(wrapper);
      } else if(h.logo_url){
        const img = document.createElement('img');
        img.src = h.logo_url;
        img.alt = 'Logo Evento';
        img.className = 'logo-single';
        logoWrap.appendChild(img);
      }
    }

    title.textContent = event.nome || 'Evento';
    desc.textContent = event.descricao || '';
  }

  function createParticipantBlock(index, participant){
    const wrapper = document.createElement('div');
    wrapper.className = 'participant-block';
    wrapper.dataset.index = index;
    wrapper.innerHTML = `
      <div class="participant-header">
        <h3>Participante ${index+1}</h3>
        <label class="responsavel-label" style="display:none"><input type="radio" name="responsavel" class="p-responsavel" value="${index}" /> Responsável pelo Pagamento</label>
        <button type="button" class="remove-participant" title="Remover">✖</button>
      </div>
      <div class="grid">
        <label>Nome<br><input type="text" class="p-name" /></label>
        <label>Telefone<br><input type="text" class="p-phone" /></label>
        <label>CPF<br><input type="text" class="p-cpf" maxlength="14" placeholder="000.000.000-00" /></label>
        <label>Data Nasc.<br><input type="date" class="p-birth" /></label>
      </div>
      <div class="choices">
        <div class="choice-accomodation"></div>
        <div class="choice-event"></div>
      </div>
      <div class="participant-totals">
        <div>Valor Hospedagem: R$ <span class="val-hosp">0.00</span></div>
        <div>Valor Evento: R$ <span class="val-event">0.00</span></div>
      </div>
    `;

    // populate choices based on STATE.evento
    const ev = STATE.evento || {};
    const accContainer = wrapper.querySelector('.choice-accomodation');
    const eventContainer = wrapper.querySelector('.choice-event');

    // Accommodation select (if applicable)
  if(ev.tipos_acomodacao && ev.tipos_acomodacao.length){
      const sel = document.createElement('select');
      sel.className = 'p-acomodacao';
      ev.tipos_acomodacao.forEach(t=>{
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `${t.label} — R$ ${t.valor_diaria_por_pessoa.toFixed(2)}/diária`;
        opt.dataset.valor = t.valor_diaria_por_pessoa;
        sel.appendChild(opt);
      });
      accContainer.appendChild(document.createTextNode('Acomodação: '));
      accContainer.appendChild(sel);
      // default from participant state
      if(participant && participant.acomodacao) sel.value = participant.acomodacao;
      sel.addEventListener('change', ()=>{ 
        // persist selection
        STATE.participantes[index] = STATE.participantes[index] || {};
        STATE.participantes[index].acomodacao = sel.value;
        recalcParticipant(Number(wrapper.dataset.index)); recalcAll();
      });
    }

    // Period select (if applicable)
    let periodoSel = null;
    if(ev.periodos_estadia_opcoes && ev.periodos_estadia_opcoes.length){
      periodoSel = document.createElement('select');
      periodoSel.className = 'p-periodo';
      ev.periodos_estadia_opcoes.forEach(p=>{
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.label} — ${p.num_diarias} diárias`;
        opt.dataset.numDiarias = p.num_diarias;
        opt.dataset.valores = JSON.stringify(p.valores_evento_opcoes || []);
        periodoSel.appendChild(opt);
      });
      eventContainer.appendChild(document.createTextNode('Período: '));
      eventContainer.appendChild(periodoSel);
      if(participant && participant.periodo) periodoSel.value = participant.periodo;
      periodoSel.addEventListener('change', ()=>{
        // persist and update
        STATE.participantes[index] = STATE.participantes[index] || {};
        STATE.participantes[index].periodo = periodoSel.value;
        populateEventOptions();
        // if participant had previously selected an event option that's not in new choices, clear it
        const optExists = Array.from(eventOptSel.options).some(o=>o.value === (STATE.participantes[index].evento_opcao||''));
        if(!optExists) { STATE.participantes[index].evento_opcao = null; }
        recalcParticipant(Number(wrapper.dataset.index));
        recalcAll();
      });
    }

    // Event option select
    const eventOptSel = document.createElement('select');
    eventOptSel.className = 'p-eventopt';
    function populateEventOptions(){
      eventOptSel.innerHTML = '';
      let choices = [];
      // prefer period-local event values
      if(periodoSel && periodoSel.value){
        const chosen = ev.periodos_estadia_opcoes.find(p=>p.id === periodoSel.value);
        if(chosen && chosen.valores_evento_opcoes) choices = chosen.valores_evento_opcoes;
      }
      if(choices.length === 0 && ev.valores_evento_opcoes) choices = ev.valores_evento_opcoes;
      choices.forEach(v=>{
        const o = document.createElement('option');
        o.value = v.id || v.label;
        o.textContent = `${v.label} — R$ ${v.valor.toFixed(2)}`;
        o.dataset.valor = v.valor;
        eventOptSel.appendChild(o);
      });
    }
    populateEventOptions();
    eventContainer.appendChild(document.createTextNode(' Opção Evento: '));
    eventContainer.appendChild(eventOptSel);
    if(participant && participant.evento_opcao) eventOptSel.value = participant.evento_opcao;
    eventOptSel.addEventListener('change', ()=>{ 
      STATE.participantes[index] = STATE.participantes[index] || {};
      STATE.participantes[index].evento_opcao = eventOptSel.value;
      recalcParticipant(Number(wrapper.dataset.index)); recalcAll(); 
    });

    // when building, if participant has stored selections ensure selects reflect them
    // accomodation handled above; period handled above; event option ensured via setting value after populate
    if(participant){
      if(participant.acomodacao){ const s = wrapper.querySelector('.p-acomodacao'); if(s) s.value = participant.acomodacao; }
      if(participant.periodo){ const p = wrapper.querySelector('.p-periodo'); if(p) { p.value = participant.periodo; populateEventOptions(); } }
      if(participant.evento_opcao){ eventOptSel.value = participant.evento_opcao; }
    }

    // attach events
    wrapper.querySelector('.remove-participant').addEventListener('click', ()=>{
      const idx = Number(wrapper.dataset.index);
      STATE.participantes.splice(idx,1);
      // adjust responsavel index if needed
      if(typeof STATE.responsavel === 'number'){
        if(STATE.responsavel === idx){
          STATE.responsavel = null;
        } else if(STATE.responsavel > idx){
          STATE.responsavel = STATE.responsavel - 1;
        }
      }
      saveState();
      rebuildParticipants();
      recalcAll();
    });

    // CPF validation live
    const cpfInput = wrapper.querySelector('.p-cpf');
    // initialize inputs from participant state
    const nameInput = wrapper.querySelector('.p-name');
    const phoneInput = wrapper.querySelector('.p-phone');
    if(participant){
      if(participant.nome) nameInput.value = participant.nome;
      if(participant.telefone) phoneInput.value = participant.telefone;
      if(participant.cpf) cpfInput.value = participant.cpf;
      if(participant.data_nasc) wrapper.querySelector('.p-birth').value = participant.data_nasc;
    }

    cpfInput.addEventListener('input', (e)=>{
      const v = e.target.value.replace(/\D/g,'');
      // format
      e.target.value = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0,14);
      const ok = window.cpfValidation && window.cpfValidation.validateCPF(e.target.value);
      e.target.classList.toggle('invalid', !ok && e.target.value.replace(/\D/g,'').length===11);
      // persist
      STATE.participantes[index] = STATE.participantes[index] || {};
      STATE.participantes[index].cpf = e.target.value;
      saveState();
    });

    // birth change triggers recalculation
    const birth = wrapper.querySelector('.p-birth');
    birth.addEventListener('change', ()=>{
      // persist
      STATE.participantes[index] = STATE.participantes[index] || {};
      STATE.participantes[index].data_nasc = birth.value;
      recalcParticipant(Number(wrapper.dataset.index));
      recalcAll();
      saveState();
    });

    // persist name and phone on blur
    const nameInputField = wrapper.querySelector('.p-name');
    const phoneInputField = wrapper.querySelector('.p-phone');
    nameInputField.addEventListener('blur', (e)=>{ STATE.participantes[index] = STATE.participantes[index] || {}; STATE.participantes[index].nome = e.target.value; saveState(); });
    phoneInputField.addEventListener('blur', (e)=>{ STATE.participantes[index] = STATE.participantes[index] || {}; STATE.participantes[index].telefone = e.target.value; saveState(); });

    return wrapper;
  }

  function rebuildParticipants(){
    const container = document.getElementById('participantsContainer');
    container.innerHTML = '';
    STATE.participantes.forEach((p,idx)=>{
      const block = createParticipantBlock(idx,p);
      // show/hide responsavel radio depending on number of participants
      const label = block.querySelector('.responsavel-label');
      const radio = block.querySelector('.p-responsavel');
      if(label && radio){
        if(STATE.participantes.length > 1){
          label.style.display = 'inline-block';
          radio.checked = (typeof STATE.responsavel === 'number' && STATE.responsavel === idx);
          radio.addEventListener('change', ()=>{ STATE.responsavel = Number(radio.value); saveState(); recalcAll(); });
        } else { label.style.display = 'none'; }
      }
      container.appendChild(block);
    });
  }

  function recalcParticipant(index){
    const block = document.querySelector(`.participant-block[data-index='${index}']`);
    if(!block) return;
    const birth = block.querySelector('.p-birth').value;
    const age = window.priceCalculator.calculateAge(birth);

    // choose defaults from event
    const ev = STATE.evento;
    let hospVal = 0;
    let eventVal = 0;
    if(ev.tipo_formulario === 'hospedagem_apenas' || ev.tipo_formulario === 'hospedagem_e_evento'){
      const tipo = ev.tipos_acomodacao && ev.tipos_acomodacao[0];
      const periodo = ev.periodos_estadia_opcoes && ev.periodos_estadia_opcoes[0];
      if(tipo && periodo){
        hospVal = window.priceCalculator.calculateAccommodation(tipo.valor_diaria_por_pessoa, periodo.num_diarias, age, ev.regras_idade_precificacao.hospedagem);
      }
    }
    if(ev.tipo_formulario === 'evento_apenas' || ev.tipo_formulario === 'hospedagem_e_evento'){
      const periodo = ev.periodos_estadia_opcoes && ev.periodos_estadia_opcoes[0];
      const valOpt = (periodo && periodo.valores_evento_opcoes && periodo.valores_evento_opcoes[0]) || (ev.valores_evento_opcoes && ev.valores_evento_opcoes[0]);
      if(valOpt){
        eventVal = window.priceCalculator.calculateEventValue(valOpt.valor, age, ev.regras_idade_precificacao.evento);
      }
    }

    block.querySelector('.val-hosp').textContent = hospVal.toFixed(2);
    block.querySelector('.val-event').textContent = eventVal.toFixed(2);

    // persist in state
    STATE.participantes[index] = STATE.participantes[index] || {};
    STATE.participantes[index].valorHospedagem = hospVal;
    STATE.participantes[index].valorEvento = eventVal;
    STATE.participantes[index].age = age;
  }

  function recalcAll(){
  const formaId = document.getElementById('paymentMethodSelect') ? document.getElementById('paymentMethodSelect').value : null;
  const forma = (STATE.evento && STATE.evento.formas_pagamento_opcoes) ? (STATE.evento.formas_pagamento_opcoes.find(f=>f.id===formaId) || STATE.evento.formas_pagamento_opcoes[0]) : null;
  const cupom = STATE.appliedCupom || null;
  const totals = window.priceCalculator.calcTotals(STATE.participantes, forma, cupom);
    document.getElementById('subtotalHosp').textContent = totals.subtotalHospedagem.toFixed(2);
    document.getElementById('subtotalEvent').textContent = totals.subtotalEvento.toFixed(2);
    document.getElementById('totalPay').textContent = totals.total.toFixed(2);
  }

  // inicialização
  fetch('eventos.json').then(r=>r.json()).then(data=>{
    const id = qs('evento');
    let ev = null;
    if(id){ ev = data.eventos.find(e=>e.id === id); }
    if(!ev){ ev = data.eventos[0]; }
    if(ev){
      STATE.evento = ev;
      renderHeader(ev);
      // populate payment method select
      const paySel = document.getElementById('paymentMethodSelect');
  if(paySel && ev.formas_pagamento_opcoes){
        paySel.innerHTML = '';
        ev.formas_pagamento_opcoes.forEach(f=>{
          const o = document.createElement('option'); o.value = f.id; o.textContent = `${f.label} (${(f.taxa_gateway_percentual*100).toFixed(1)}%)`; paySel.appendChild(o);
        });
        paySel.addEventListener('change', ()=>{ recalcAll(); });
      }

  // restore persisted state if any
  loadState();

  // if persisted participants exist, ensure UI uses them; otherwise start with one
  if(!STATE.participantes || STATE.participantes.length === 0) STATE.participantes = [{}];

      // coupon apply handler (extract so it can be re-run when payment method changes)
      const applyBtn = document.getElementById('applyCouponBtn');
      const couponInput = document.getElementById('couponCode');
      const couponMsg = document.getElementById('couponMsg');
      function applyCouponFromInput(){
        const code = (couponInput.value || '').trim();
        if(!code){ couponMsg.textContent = 'Informe um código.'; STATE.appliedCupom = null; recalcAll(); return; }
        const found = (ev.cupons_desconto || []).find(c=>c.codigo.toUpperCase() === code.toUpperCase());
        if(!found){ couponMsg.textContent = 'Cupom inválido ou expirado.'; STATE.appliedCupom = null; recalcAll(); return; }
        // validate expiry
        if(found.data_validade_fim){
          const now = new Date();
          const until = new Date(found.data_validade_fim);
          if(now > until){ couponMsg.textContent = 'Cupom expirado.'; STATE.appliedCupom = null; recalcAll(); return; }
        }
        STATE.appliedCupom = found;
        couponMsg.textContent = `Cupom aplicado: ${found.codigo}`;
        recalcAll();
        saveState();
      }
      // auto-apply on coupon input (debounced) and reapply on payment method change
      if(couponInput){
        let timer = null;
        couponInput.addEventListener('input', ()=>{
          clearTimeout(timer);
          timer = setTimeout(()=>{ applyCouponFromInput(); }, 450);
        });
      }
      if(document.getElementById('paymentMethodSelect')){
        document.getElementById('paymentMethodSelect').addEventListener('change', ()=>{ applyCouponFromInput(); recalcAll(); });
      }
      // preparar UI
      const addBtn = document.getElementById('addParticipant');
      addBtn.addEventListener('click', ()=>{
        STATE.participantes.push({});
        rebuildParticipants();
        recalcAll();
        saveState();
      });

      // inicialmente 1 participante
  STATE.participantes = [{}];
      rebuildParticipants();
      recalcAll();
      // wire preview/submit
      const previewBtn = document.getElementById('previewBtn');
      const submitBtn = document.getElementById('submitBtn');
      const previewArea = document.getElementById('previewArea');
      function buildPayload(){
        const payload = {
          evento: { id: ev.id, nome: ev.nome },
          participantes: STATE.participantes.map((p,idx)=>({
            index: idx,
            nome: p.nome || null,
            telefone: p.telefone || null,
            cpf: p.cpf || null,
            data_nasc: p.data_nasc || null,
            acomodacao: p.acomodacao || null,
            periodo: p.periodo || null,
            evento_opcao: p.evento_opcao || null,
            valorHospedagem: p.valorHospedagem || 0,
            valorEvento: p.valorEvento || 0
          })),
          totals: {
            subtotalHospedagem: document.getElementById('subtotalHosp').textContent,
            subtotalEvento: document.getElementById('subtotalEvent').textContent,
            total: document.getElementById('totalPay').textContent
          },
          cupom: STATE.appliedCupom || null,
          forma_pagamento: document.getElementById('paymentMethodSelect') ? document.getElementById('paymentMethodSelect').value : null
        };
        return payload;
      }

      if(previewBtn){
        previewBtn.addEventListener('click', ()=>{
          const payload = buildPayload();
          previewArea.style.display = 'block';
          previewArea.innerHTML = '<div class="preview-json">' + JSON.stringify(payload, null, 2) + '</div>';
        });
      }

      if(submitBtn){
        submitBtn.addEventListener('click', async ()=>{
          // validation: require responsavel when more than one participant
          if(STATE.participantes.length > 1 && (typeof STATE.responsavel !== 'number' || STATE.responsavel === null)){
            const previewArea = document.getElementById('previewArea');
            previewArea.style.display = 'block';
            previewArea.innerHTML = '<div class="preview-json">Selecione o responsável pelo pagamento antes de enviar.</div>';
            return;
          }
          submitBtn.disabled = true; submitBtn.textContent = 'Enviando...';
          const payload = buildPayload();
          // add inscricao id
          const inscricaoId = generateInscricaoId();
          payload.inscricao_id = inscricaoId;
          // prefer event-specific payment link webhook if provided
          const paymentWebhook = ev.payment_link_webhook_url;
          const submitWebhook = ev.webhook_url || 'https://httpbin.org/post';
          try{
            if(paymentWebhook){
              // call payment link webhook with 5s timeout
              const controller = new AbortController();
              const id = setTimeout(()=>controller.abort(), 5000);
              const res = await fetch(paymentWebhook, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload), signal: controller.signal});
              clearTimeout(id);
              if(!res.ok) throw new Error('Erro no webhook de pagamento: '+res.status);
              const json = await res.json();
              // render link and keep saved state until user confirms
              renderPaymentLinkResult(json);
              // also POST to submission webhook in background (fire-and-forget) to register the inscrição
              try{ fetch(submitWebhook, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}).catch(()=>{}); }catch(e){}
            } else {
              // fallback: submit to standard webhook and show response
              const res = await fetch(submitWebhook, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
              const json = await res.json();
              previewArea.style.display = 'block';
              previewArea.innerHTML = '<div class="preview-json">' + JSON.stringify({status:res.status, response:json}, null, 2) + '</div>';
              // if response contains link, render payment link UI
              if(json && json.link) renderPaymentLinkResult(json);
              // clear saved state on success
              localStorage.removeItem(STORAGE_KEY);
            }
          }catch(e){
            const isAbort = (e.name === 'AbortError');
            previewArea.style.display = 'block';
            previewArea.innerHTML = '<div class="preview-json">Erro ao enviar: '+ (isAbort? 'Tempo limite atingido.' : (e.message || e)) +'</div>';
          }finally{ submitBtn.disabled = false; submitBtn.textContent = 'Enviar Reserva'; }
        });
      }
    }
  }).catch(err=>{
    console.error('Erro carregando eventos.json', err);
  });

  // hook start button to scroll to form
  const start = el('startBtn');
  if(start) start.addEventListener('click', ()=>{
    document.getElementById('formArea').scrollIntoView({behavior:'smooth'});
  });

})();
