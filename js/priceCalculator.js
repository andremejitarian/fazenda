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
        if (!birthDate) return 0;
        
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

    // **NOVO MÉTODO**: Obter participantes elegíveis para gratuidade ordenados
    getEligibleFreeParticipants(type) {
        const eligibleParticipants = [];
        
        this.participants.forEach((participant, index) => {
            if (!participant.birthDate) return;
            
            const age = this.calculateAge(participant.birthDate);
            const ageRule = this.getAgeRule(age, type);
            
            // Verificar se está na faixa de gratuidade
            if (ageRule.percentual_valor_adulto === 0 && ageRule.limite_gratuidade_por_reserva) {
                const minAge = ageRule.faixa_min_anos;
                const maxAge = ageRule.faixa_max_anos || Infinity;
                
                if (age >= minAge && age <= maxAge) {
                    eligibleParticipants.push({
                        participant,
                        index,
                        age,
                        ageRule
                    });
                }
            }
        });
        
        // Ordenar por ordem de inserção (primeiro a ser inserido tem prioridade)
        return eligibleParticipants.sort((a, b) => a.index - b.index);
    }

    // **MÉTODO ATUALIZADO**: Verificar se participante específico é elegível para gratuidade
    isEligibleForFree(participantData, type) {
        if (!participantData.birthDate) return false;
        
        const age = this.calculateAge(participantData.birthDate);
        const ageRule = this.getAgeRule(age, type);
        
        if (!ageRule.limite_gratuidade_por_reserva || ageRule.percentual_valor_adulto !== 0) {
            return false;
        }
        
        // Obter todos os participantes elegíveis para gratuidade
        const eligibleParticipants = this.getEligibleFreeParticipants(type);
        
        // Encontrar a posição deste participante na lista ordenada
        const participantIndex = eligibleParticipants.findIndex(ep => 
            ep.participant.id === participantData.id
        );
        
        if (participantIndex === -1) return false;
        
        // Verificar se está dentro do limite de gratuidade
        return participantIndex < ageRule.limite_gratuidade_por_reserva;
    }

    // **MÉTODO ATUALIZADO**: Verificar se deve aplicar regra de excedente
    shouldApplyExcessRule(participantData, type) {
        if (!participantData.birthDate) return false;
        
        const age = this.calculateAge(participantData.birthDate);
        const ageRule = this.getAgeRule(age, type);
        
        // Verificar se tem regra de excedente e se está na faixa de idade original
        if (!ageRule.regra_excedente_gratuito || ageRule.percentual_valor_adulto !== 0) {
            return false;
        }
        
        // Obter todos os participantes elegíveis para gratuidade
        const eligibleParticipants = this.getEligibleFreeParticipants(type);
        
        // Encontrar a posição deste participante na lista ordenada
        const participantIndex = eligibleParticipants.findIndex(ep => 
            ep.participant.id === participantData.id
        );
        
        if (participantIndex === -1) return false;
        
        // Verificar se está FORA do limite de gratuidade (excedente)
        return participantIndex >= ageRule.limite_gratuidade_por_reserva;
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
        
        // **NOVA LÓGICA**: Verificar gratuidade primeiro
        if (this.isEligibleForFree(participantData, 'hospedagem')) {
            return 0;
        }
        
        // **NOVA LÓGICA**: Verificar regra de excedente
        if (this.shouldApplyExcessRule(participantData, 'hospedagem')) {
            let finalValue = baseValue * ageRule.regra_excedente_gratuito.percentual_valor_adulto;
            
            // Aplicar taxa de gateway se método de pagamento selecionado
            if (this.selectedPaymentMethod) {
                finalValue = finalValue * (1 + this.selectedPaymentMethod.taxa_gateway_percentual);
            }
            
            return Math.round(finalValue * 100) / 100;
        }

        // Aplicar percentual normal da regra de idade
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
        
        // **NOVA LÓGICA**: Verificar gratuidade primeiro
        if (this.isEligibleForFree(participantData, 'evento')) {
            return 0;
        }
        
        // **NOVA LÓGICA**: Verificar regra de excedente
        if (this.shouldApplyExcessRule(participantData, 'evento')) {
            let finalValue = baseValue * ageRule.regra_excedente_gratuito.percentual_valor_adulto;
            
            // Aplicar taxa de gateway se método de pagamento selecionado
            if (this.selectedPaymentMethod) {
                finalValue = finalValue * (1 + this.selectedPaymentMethod.taxa_gateway_percentual);
            }
            
            return Math.round(finalValue * 100) / 100;
        }

        // Aplicar percentual normal da regra de idade
        let finalValue = baseValue * ageRule.percentual_valor_adulto;

        // Aplicar taxa de gateway se método de pagamento selecionado
        if (this.selectedPaymentMethod) {
            finalValue = finalValue * (1 + this.selectedPaymentMethod.taxa_gateway_percentual);
        }

        return Math.round(finalValue * 100) / 100;
    }

    // **MÉTODOS REMOVIDOS**: getFreeChildrenCount e isEligibleForFree antigos foram substituídos

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
    window.priceCalculator = priceCalculator; // Disponibilizar globalmente
    console.log('Calculador de preços inicializado');
}

console.log('Calculador de preços carregado');
