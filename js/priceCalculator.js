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

  // calc totals: participantes: [{age, valorHospedagem, valorEvento}], formaPagamento {taxa_gateway_percentual}
  function calcTotals(participantes, formaPagamento, cupom){
    const totals = {subtotalHospedagem:0, subtotalEvento:0, desconto:0, total:0};
    participantes.forEach(p=>{
      totals.subtotalHospedagem += (p.valorHospedagem || 0);
      totals.subtotalEvento += (p.valorEvento || 0);
    });
    let baseTotal = totals.subtotalHospedagem + totals.subtotalEvento;
    // cupom handling (simple)
    if(cupom){
      if(cupom.tipo_desconto === 'percentual'){
        totals.desconto = baseTotal * (cupom.valor_desconto || 0);
      } else if(cupom.tipo_desconto === 'fixo'){
        totals.desconto = cupom.valor_desconto || 0;
      }
    }
    const afterDiscount = Math.max(0, baseTotal - totals.desconto);
    const taxa = (formaPagamento && formaPagamento.taxa_gateway_percentual) ? formaPagamento.taxa_gateway_percentual : 0;
    totals.total = afterDiscount * (1 + taxa);
    // round
    totals.subtotalHospedagem = +totals.subtotalHospedagem.toFixed(2);
    totals.subtotalEvento = +totals.subtotalEvento.toFixed(2);
    totals.desconto = +totals.desconto.toFixed(2);
    totals.total = +totals.total.toFixed(2);
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
