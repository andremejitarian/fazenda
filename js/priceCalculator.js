// priceCalculator.js — funções para cálculos de hospedagem/evento e aplicação de cupons
(function(){
  function calculateAge(birthdate){
    if(!birthdate) return null;
    const bd = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - bd.getFullYear();
    const m = today.getMonth() - bd.getMonth();
    if(m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
    return age;
  }

  function applyAgeRules(valueAdult, age, rules){
    if(!rules || rules.length === 0) return valueAdult;
    for(const r of rules){
      const min = r.faixa_min_anos || 0;
      const max = typeof r.faixa_max_anos === 'number' ? r.faixa_max_anos : Infinity;
      if(age >= min && age <= max){
        return valueAdult * (r.percentual_valor_adulto || 1);
      }
    }
    return valueAdult;
  }

  function calculateAccommodation(valorDiariaPorPessoa, numDiarias, age, regrasHospedagem){
    const base = (valorDiariaPorPessoa || 0) * (numDiarias || 1);
    return applyAgeRules(base, age, regrasHospedagem);
  }

  function calculateEventValue(valorEvento, age, regrasEvento){
    return applyAgeRules(valorEvento, age, regrasEvento);
  }

  // calc totals: participantes: [{age, baseHosp, baseEvent}], formaPagamento {taxa_gateway_percentual}, regrasIdade: {hospedagem:[], evento:[]}
  // returns { participants: [{valorHospedagem, valorEvento}], subtotalHospedagem, subtotalEvento, desconto, total }
  function calcTotals(participantes, formaPagamento, cupom, regrasIdade){
    // defensive
    regrasIdade = regrasIdade || { hospedagem: [], evento: [] };

    // prepare result participants array
    const resultParts = participantes.map(p=>({}));

    // helper to apply reservation-level rules for one pricing type
    function applyRulesForType(typeKey){
      const rules = (regrasIdade && regrasIdade[typeKey]) || [];
      const baseField = (typeKey === 'hospedagem') ? 'baseHosp' : 'baseEvent';
      const outField = (typeKey === 'hospedagem') ? 'valorHospedagem' : 'valorEvento';

      // Build list of participants with their age and base value
  const list = participantes.map((p, idx)=>({ idx, age: p.age, base: ( (typeof p[baseField] !== 'undefined') ? p[baseField] : ( (typeof p.valorHospedagem !== 'undefined' && baseField==='baseHosp') ? p.valorHospedagem : (typeof p.valorEvento !== 'undefined' && baseField==='baseEvent' ? p.valorEvento : 0) ) ) || 0 }));

      // For each rule, process matching participants
      // We'll default to matching the first rule per participant (rules should be non-overlapping in PRD).
      // First handle rules that have limite_gratuidade_por_reserva, because they require cross-participant counting.
      const gratuityRules = rules.filter(r=>typeof r.limite_gratuidade_por_reserva === 'number' && r.limite_gratuidade_por_reserva > 0);
      const normalRules = rules.filter(r=>!(typeof r.limite_gratuidade_por_reserva === 'number' && r.limite_gratuidade_por_reserva > 0));

      // process gratuity rules
      for(const r of gratuityRules){
        const min = r.faixa_min_anos || 0;
        const max = typeof r.faixa_max_anos === 'number' ? r.faixa_max_anos : Infinity;
        // collect matching participants
        const matching = list.filter(item=>typeof item.age === 'number' && item.age >= min && item.age <= max);
        if(matching.length === 0) continue;
        // sort matching by age ascending (youngest first) to deterministically assign gratuities
        matching.sort((a,b)=>a.age - b.age);
        const limit = r.limite_gratuidade_por_reserva || 0;
        // first `limit` are free
        const free = matching.slice(0, limit);
        const extras = matching.slice(limit);
        // assign free
        free.forEach(f=>{ resultParts[f.idx][outField] = 0; });
        // assign extras: if regra_excedente_gratuito present, use its percentual_valor_adulto; otherwise fall back to rule.percentual_valor_adulto
        const excedentePercent = (r.regra_excedente_gratuito && typeof r.regra_excedente_gratuito.percentual_valor_adulto === 'number') ? r.regra_excedente_gratuito.percentual_valor_adulto : (r.percentual_valor_adulto || 0);
        extras.forEach(e=>{ resultParts[e.idx][outField] = +( (e.base || 0) * excedentePercent ).toFixed(2); });
      }

      // process normal rules and any participants not yet assigned for this type
      for(const r of normalRules){
        const min = r.faixa_min_anos || 0;
        const max = typeof r.faixa_max_anos === 'number' ? r.faixa_max_anos : Infinity;
        participantes.forEach((p, idx)=>{
          // skip if already assigned by gratuity rule
          if(typeof resultParts[idx][outField] === 'number') return;
          if(typeof p.age !== 'number'){
            // if age unknown, treat as adult (100%)
            return;
          }
          if(p.age >= min && p.age <= max){
            const baseVal = (typeof p[baseField] !== 'undefined') ? p[baseField] : ( (outField==='valorHospedagem') ? (p.valorHospedagem || 0) : (p.valorEvento || 0) );
            resultParts[idx][outField] = +( (baseVal || 0) * (r.percentual_valor_adulto || 1) ).toFixed(2);
          }
        });
      }

      // for any participants still unassigned, apply default adult price
      participantes.forEach((p, idx)=>{
        if(typeof resultParts[idx][outField] !== 'number'){
          resultParts[idx][outField] = +( (p[baseField] || 0) * 1 ).toFixed(2);
        }
      });
    }

    // apply for hospedagem and evento
    applyRulesForType('hospedagem');
    applyRulesForType('evento');

    // now compute subtotals
    const totals = {subtotalHospedagem:0, subtotalEvento:0, desconto:0, total:0, participants: resultParts};
    resultParts.forEach(p=>{ totals.subtotalHospedagem += (p.valorHospedagem || 0); totals.subtotalEvento += (p.valorEvento || 0); });
    // determine discount based on cupom.aplicacao
    let desconto = 0;
  const baseHosp = totals.subtotalHospedagem;
  const baseEvent = totals.subtotalEvento;
  const baseTotal = baseHosp + baseEvent;
    if(cupom){
      const tipo = cupom.tipo_desconto;
      const aplic = (cupom.aplicacao || 'total'); // 'total' | 'hospedagem' | 'evento'
      if(tipo === 'percentual'){
        if(aplic === 'hospedagem') desconto = baseHosp * (cupom.valor_desconto || 0);
        else if(aplic === 'evento') desconto = baseEvent * (cupom.valor_desconto || 0);
        else desconto = baseTotal * (cupom.valor_desconto || 0);
      } else if(tipo === 'fixo'){
        // fixed discount: apply to target pool, but not exceed that pool
        if(aplic === 'hospedagem') desconto = Math.min(cupom.valor_desconto || 0, baseHosp);
        else if(aplic === 'evento') desconto = Math.min(cupom.valor_desconto || 0, baseEvent);
        else desconto = Math.min(cupom.valor_desconto || 0, baseTotal);
      }
    }
    totals.subtotalHospedagem = +totals.subtotalHospedagem.toFixed(2);
    totals.subtotalEvento = +totals.subtotalEvento.toFixed(2);
    totals.desconto = +desconto.toFixed(2);
    const afterDiscount = Math.max(0, baseTotal - desconto);
    const taxa = (formaPagamento && formaPagamento.taxa_gateway_percentual) ? formaPagamento.taxa_gateway_percentual : 0;
    totals.total = +((afterDiscount * (1 + taxa)).toFixed(2));
    return totals;
  }

  window.priceCalculator = {
    calculateAge,
    applyAgeRules,
    calculateAccommodation,
    calculateEventValue,
    calcTotals
  };
})();
