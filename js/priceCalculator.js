// Sistema de cálculo de preços
class PriceCalculator {
    constructor(event) {
        this.event = event;
        this.participants = [];
        this.appliedCoupon = null;
        this.selectedPaymentMethod = null;
    }

    // Calcular idade em anos
    calculateAge(birthDate) {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }

    // Obter regra de idade aplicável
    getAgeRule(age, type) {
        const rules = this.event.regras_idade_precificacao[type] || [];
        
        for (let rule of rules) {
            const minAge = rule.faixa_min_anos;
            const maxAge = rule.faixa_max_anos || Infinity;
            
            if (age >= minAge && age <= maxAge) {
                return rule;
            }
        }
        
        // Se não encontrar regra específica, retorna valor integral
        return { percentual_valor_adulto: 1.0 };
    }

    // Calcular valor de hospedagem para um participante
    calculateLodgingValue(participantData) {
        if (!participantData.stayPeriod || !participantData.accommodation || !participantData.birthDate) {
            return 0;
        }

        const age = this.calculateAge(participantData.birthDate);
        const periodo = this.event.periodos_estadia_opcoes.find(p => p.id === participantData.stayPeriod);
        const acomodacao = this.event.tipos_acomodacao.find(a => a.id === participantData.accommodation);
        
        if (!periodo || !acomodacao) return 0;

        const baseValue = acomodacao.valor_diaria_por_pessoa * periodo.num_diarias;
        const ageRule = this.getAgeRule(age, 'hospedagem');
        
        // Aplicar regra de gratuidade
        const freeChildrenCount = this.getFreeChildrenCount('hospedagem');
        if (this.isEligibleForFree(age, ageRule, freeChildrenCount, 'hospedagem')) {
            return 0;
        }

        // Aplicar percentual da regra de idade
        let finalValue = baseValue * ageRule.percentual_valor_adulto;

        // Aplicar taxa de gateway se método de pagamento selecionado
        if (this.selectedPaymentMethod) {
            finalValue = finalValue * (1 + this.selectedPaymentMethod.taxa_gateway_percentual);
        }

        return Math.round(finalValue * 100) / 100;
    }

    // Calcular valor de evento para um participante
    calculateEventValue(participantData) {
        if (!participantData.eventOption || !participantData.birthDate) {
            return 0;
        }

        const age = this.calculateAge(participantData.birthDate);
        let eventOption = null;

        // Buscar opção de evento baseada no tipo de formulário
        if (this.event.tipo_formulario === 'evento_apenas') {
            eventOption = this.event.valores_evento_opcoes.find(e => e.id === participantData.eventOption);
        } else if (this.event.tipo_formulario === 'hospedagem_e_evento' && participantData.stayPeriod) {
            const periodo = this.event.periodos_estadia_opcoes.find(p => p.id === participantData.stayPeriod);
            if (periodo && periodo.valores_evento_opcoes) {
                eventOption = periodo.valores_evento_opcoes.find(e => e.id === participantData.eventOption);
            }
        }

        if (!eventOption) return 0;

        const baseValue = eventOption.valor;
        const ageRule = this.getAgeRule(age, 'evento');
        
        // Aplicar regra de gratuidade
        const freeChildrenCount = this.getFreeChildrenCount('evento');
        if (this.isEligibleForFree(age, ageRule, freeChildrenCount, 'evento')) {
            return 0;
        }

        // Aplicar percentual da regra de idade
        let finalValue = baseValue * ageRule.percentual_valor_adulto;

        // Aplicar taxa de gateway se método de pagamento selecionado
        if (this.selectedPaymentMethod) {
            finalValue = finalValue * (1 + this.selectedPaymentMethod.taxa_gateway_percentual);
        }

        return Math.round(finalValue * 100) / 100;
    }

    // Verificar se participante é elegível para gratuidade
    isEligibleForFree(age, ageRule, currentFreeCount, type) {
        if (!ageRule.limite_gratuidade_por_reserva) return false;
        
        const minAge = ageRule.faixa_min_anos;
        const maxAge = ageRule.faixa_max_anos || Infinity;
        
        // Verificar se está na faixa de idade para gratuidade
        if (age >= minAge && age <= maxAge && ageRule.percentual_valor_adulto === 0) {
            // Verificar se ainda há vagas gratuitas
            return currentFreeCount < ageRule.limite_gratuidade_por_reserva;
        }
        
        return false;
    }

    // Contar crianças gratuitas já aplicadas
    getFreeChildrenCount(type) {
        let count = 0;
        
        this.participants.forEach(participant => {
            if (!participant.birthDate) return;
            
            const age = this.calculateAge(participant.birthDate);
            const ageRule = this.getAgeRule(age, type);
            
            if (ageRule.percentual_valor_adulto === 0 && ageRule.limite_gratuidade_por_reserva) {
                const minAge = ageRule.faixa_min_anos;
                const maxAge = ageRule.faixa_max_anos || Infinity;
                
                if (age >= minAge && age <= maxAge) {
                    count++;
                }
            }
        });
        
        return count;
    }

    // Calcular subtotal de hospedagem
    calculateLodgingSubtotal() {
        return this.participants.reduce((total, participant) => {
            return total + this.calculateLodgingValue(participant);
        }, 0);
    }

    // Calcular subtotal de evento
    calculateEventSubtotal() {
        return this.participants.reduce((total, participant) => {
            return total + this.calculateEventValue(participant);
        }, 0);
    }

    // Calcular desconto do cupom
    calculateCouponDiscount() {
        if (!this.appliedCoupon) return 0;

        const lodgingSubtotal = this.calculateLodgingSubtotal();
        const eventSubtotal = this.calculateEventSubtotal();
        let baseValue = 0;

        // Determinar base de cálculo baseada na aplicação do cupom
        switch (this.appliedCoupon.aplicacao) {
            case 'total':
                baseValue = lodgingSubtotal + eventSubtotal;
                break;
            case 'hospedagem':
                baseValue = lodgingSubtotal;
                break;
            case 'evento':
                baseValue = eventSubtotal;
                break;
            default:
                baseValue = lodgingSubtotal + eventSubtotal;
        }

        let discount = 0;

        if (this.appliedCoupon.tipo_desconto === 'percentual') {
            discount = baseValue * this.appliedCoupon.valor_desconto;
        } else if (this.appliedCoupon.tipo_desconto === 'fixo') {
            discount = Math.min(this.appliedCoupon.valor_desconto, baseValue);
        }

        return Math.round(discount * 100) / 100;
    }

    // Calcular total final
    calculateFinalTotal() {
        const lodgingSubtotal = this.calculateLodgingSubtotal();
        const eventSubtotal = this.calculateEventSubtotal();
        const discount = this.calculateCouponDiscount();
        
        const total = lodgingSubtotal + eventSubtotal - discount;
        return Math.max(0, Math.round(total * 100) / 100);
    }

    // Atualizar dados dos participantes
    updateParticipants(participantsData) {
        this.participants = participantsData;
    }

    // Definir cupom aplicado
    setCoupon(coupon) {
        this.appliedCoupon = coupon;
    }

    // Definir método de pagamento
    setPaymentMethod(paymentMethod) {
        this.selectedPaymentMethod = paymentMethod;
    }

    // Validar cupom
    validateCoupon(couponCode) {
        if (!couponCode || !couponCode.trim()) {
            return { valid: false, message: '' };
        }

        const coupon = this.event.cupons_desconto.find(c => 
            c.codigo.toUpperCase() === couponCode.toUpperCase()
        );

        if (!coupon) {
            return { valid: false, message: 'Cupom não encontrado' };
        }

        // Verificar validade
        const now = new Date();
        const validUntil = new Date(coupon.data_validade_fim);

        if (now > validUntil) {
            return { valid: false, message: 'Cupom expirado' };
        }

        return { 
            valid: true, 
            coupon: coupon,
            message: `Desconto aplicado: ${this.formatCouponDiscount(coupon)}`
        };
    }

    // Formatar desconto do cupom para exibição
    formatCouponDiscount(coupon) {
        if (coupon.tipo_desconto === 'percentual') {
            return `${(coupon.valor_desconto * 100).toFixed(0)}%`;
        } else {
            return `R$ ${coupon.valor_desconto.toFixed(2).replace('.', ',')}`;
        }
    }

    // Formatar valor monetário
    formatCurrency(value) {
        return `R$ ${value.toFixed(2).replace('.', ',')}`;
    }

    // Obter resumo completo dos cálculos
    getCalculationSummary() {
        const lodgingSubtotal = this.calculateLodgingSubtotal();
        const eventSubtotal = this.calculateEventSubtotal();
        const discount = this.calculateCouponDiscount();
        const finalTotal = this.calculateFinalTotal();

        return {
            lodgingSubtotal,
            eventSubtotal,
            discount,
            finalTotal,
            formatted: {
                lodgingSubtotal: this.formatCurrency(lodgingSubtotal),
                eventSubtotal: this.formatCurrency(eventSubtotal),
                discount: this.formatCurrency(discount),
                finalTotal: this.formatCurrency(finalTotal)
            }
        };
    }
}

// Instância global do calculador
let priceCalculator = null;

// Inicializar calculador quando evento for carregado
function initializePriceCalculator(event) {
    priceCalculator = new PriceCalculator(event);
    console.log('Calculador de preços inicializado');
}

// Atualizar cálculos de um participante específico
function updateParticipantCalculations($participant) {
    if (!priceCalculator) return;

    const participantData = extractParticipantData($participant);
    const participantId = $participant.attr('data-participant-id');
    
    // Atualizar dados do participante no calculador
    updateParticipantInCalculator(participantId, participantData);
    
    // Calcular valores individuais
    const lodgingValue = priceCalculator.calculateLodgingValue(participantData);
    const eventValue = priceCalculator.calculateEventValue(participantData);
    
    // Atualizar display dos valores
    $participant.find('.lodging-value').text(priceCalculator.formatCurrency(lodgingValue));
    $participant.find('.event-value').text(priceCalculator.formatCurrency(eventValue));
    
    // Atualizar totais gerais se estivermos na tela de resumo
    if (currentStep === 3) {
        updateSummaryTotals();
    }
    
    console.log(`Cálculos atualizados para participante ${participantId}:`, {
        lodging: lodgingValue,
        event: eventValue
    });
}

// Extrair dados do participante do formulário
function extractParticipantData($participant) {
    return {
        fullName: $participant.find('.full-name').val(),
        phone: $participant.find('.phone-mask').val(),
        cpf: $participant.find('.cpf-mask').val(),
        email: $participant.find('.email-input').val(),
        birthDate: $participant.find('.dob-input').val(),
        stayPeriod: $participant.find('.stay-period-select').val() || 
                   (currentEvent.periodos_estadia_opcoes.length === 1 ? currentEvent.periodos_estadia_opcoes[0].id : null),
        accommodation: $participant.find('.accommodation-select').val() || 
                      (currentEvent.tipos_acomodacao.length === 1 ? currentEvent.tipos_acomodacao[0].id : null),
        eventOption: $participant.find('.event-option-select').val() || 
                    (getEventOptionsForParticipant($participant).length === 1 ? getEventOptionsForParticipant($participant)[0].id : null),
        isResponsiblePayer: $participant.find('.responsible-payer').is(':checked')
    };
}

// Obter opções de evento para um participante específico
function getEventOptionsForParticipant($participant) {
    if (currentEvent.tipo_formulario === 'evento_apenas') {
        return currentEvent.valores_evento_opcoes;
    } else if (currentEvent.tipo_formulario === 'hospedagem_e_evento') {
        const stayPeriodId = $participant.find('.stay-period-select').val() || 
                           (currentEvent.periodos_estadia_opcoes.length === 1 ? currentEvent.periodos_estadia_opcoes[0].id : null);
        
        if (stayPeriodId) {
            const periodo = currentEvent.periodos_estadia_opcoes.find(p => p.id === stayPeriodId);
            return periodo ? (periodo.valores_evento_opcoes || []) : [];
        }
    }
    return [];
}

// Atualizar participante no calculador
function updateParticipantInCalculator(participantId, participantData) {
    if (!priceCalculator) return;

    // Encontrar índice do participante
    const participantIndex = priceCalculator.participants.findIndex(p => p.id === participantId);
    
    if (participantIndex >= 0) {
        // Atualizar participante existente
        priceCalculator.participants[participantIndex] = {
            id: participantId,
            ...participantData
        };
    } else {
        // Adicionar novo participante
        priceCalculator.participants.push({
            id: participantId,
            ...participantData
        });
    }
}

// Atualizar todos os cálculos
function updateAllCalculations() {
    if (!priceCalculator) return;

    // Atualizar dados de todos os participantes
    $('#participants-container .participant-block').each(function() {
        const $participant = $(this);
        const participantData = extractParticipantData($participant);
        const participantId = $participant.attr('data-participant-id');
        
        updateParticipantInCalculator(participantId, participantData);
        
        // Atualizar displays individuais
        const lodgingValue = priceCalculator.calculateLodgingValue(participantData);
        const eventValue = priceCalculator.calculateEventValue(participantData);
        
        $participant.find('.lodging-value').text(priceCalculator.formatCurrency(lodgingValue));
        $participant.find('.event-value').text(priceCalculator.formatCurrency(eventValue));
    });
    
    // Atualizar totais se estivermos na tela de resumo
    if (currentStep === 3) {
        updateSummaryTotals();
    }
}

// Atualizar totais na tela de resumo
function updateSummaryTotals() {
    if (!priceCalculator) return;

    const summary = priceCalculator.getCalculationSummary();
    
    // Atualizar displays
    $('#subtotal-hospedagem').text(summary.formatted.lodgingSubtotal);
    $('#subtotal-evento').text(summary.formatted.eventSubtotal);
    $('#discount-value').text('-' + summary.formatted.discount);
    $('#final-total').text(summary.formatted.finalTotal);
    
    // Mostrar/ocultar linhas baseado no tipo de formulário
    const tipoFormulario = currentEvent.tipo_formulario;
    
    if (tipoFormulario === 'hospedagem_apenas') {
        $('#subtotal-evento').parent().hide();
    } else if (tipoFormulario === 'evento_apenas') {
        $('#subtotal-hospedagem').parent().hide();
    }
    
    console.log('Totais atualizados:', summary);
}

// Aplicar cupom de desconto
function applyCoupon(couponCode) {
    if (!priceCalculator) return;

    const validation = priceCalculator.validateCoupon(couponCode);
    const $feedback = $('#coupon-feedback');
    
    if (validation.valid) {
        priceCalculator.setCoupon(validation.coupon);
        $feedback.text(validation.message).removeClass('error-message').addClass('success-message');
        $('#coupon-code').removeClass('error').addClass('success');
        
        // Atualizar totais
        updateSummaryTotals();
        
        console.log('Cupom aplicado:', validation.coupon);
    } else {
        priceCalculator.setCoupon(null);
        
        if (validation.message) {
            $feedback.text(validation.message).removeClass('success-message').addClass('error-message');
            $('#coupon-code').addClass('error').removeClass('success');
        } else {
            $feedback.text('').removeClass('success-message error-message');
            $('#coupon-code').removeClass('error success');
        }
        
        // Atualizar totais
        updateSummaryTotals();
    }
}

// Validar cupom (chamada pelo event listener)
function validateCoupon() {
    const couponCode = $('#coupon-code').val();
    applyCoupon(couponCode);
}

console.log('Calculador de preços carregado');
