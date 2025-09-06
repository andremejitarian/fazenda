/**
 * Módulo de cálculo de preços
 * Implementa funções para calcular preços de hospedagem e evento com base em regras de idade
 */

// Classe para gerenciar cálculos de preço
class PriceCalculator {
    constructor(eventData) {
        this.eventData = eventData;
        this.participants = [];
        this.couponCode = null;
        this.couponDiscount = 0;
        this.couponType = null;
        this.couponTarget = null;
    }

    // Calcula a idade com base na data de nascimento
    calculateAge(birthDate) {
        const today = new Date();
        const birthDateObj = new Date(birthDate);
        let age = today.getFullYear() - birthDateObj.getFullYear();
        const monthDiff = today.getMonth() - birthDateObj.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
            age--;
        }
        
        return age;
    }

    // Calcula o preço da hospedagem com base no tipo de acomodação, período e idade
    calculateAccommodationPrice(accommodationType, periodId, birthDate) {
        if (!accommodationType || !periodId || !this.eventData) {
            return 0;
        }

        // Encontra o período selecionado
        const period = this.eventData.periodos.find(p => p.id === periodId);
        if (!period) return 0;

        // Encontra a acomodação selecionada
        const accommodation = this.eventData.acomodacoes.find(a => a.id === accommodationType);
        if (!accommodation) return 0;

        // Obtém o preço base da acomodação para o período
        let basePrice = accommodation.preco_por_periodo[periodId] || 0;

        // Aplica regras de idade se existirem
        if (birthDate && this.eventData.regras_idade && this.eventData.regras_idade.hospedagem) {
            const age = this.calculateAge(birthDate);
            const ageRules = this.eventData.regras_idade.hospedagem;

            // Verifica cada regra de idade
            for (const rule of ageRules) {
                if (age >= rule.idade_min && age <= rule.idade_max) {
                    if (rule.tipo_desconto === 'percentual') {
                        basePrice = basePrice * (1 - rule.valor_desconto / 100);
                    } else if (rule.tipo_desconto === 'fixo') {
                        basePrice = basePrice - rule.valor_desconto;
                    } else if (rule.tipo_desconto === 'valor_fixo') {
                        basePrice = rule.valor_desconto;
                    }
                    break;
                }
            }
        }

        return Math.max(0, basePrice); // Garante que o preço não seja negativo
    }

    // Calcula o preço do evento com base no tipo de participação, período e idade
    calculateEventPrice(participationType, periodId, birthDate) {
        if (!participationType || !this.eventData) {
            return 0;
        }

        // Encontra a opção de participação selecionada
        const participation = this.eventData.opcoes_evento.find(o => o.id === participationType);
        if (!participation) return 0;

        // Obtém o preço base da participação
        // Se o preço for vinculado ao período, usa o preço específico do período
        let basePrice = 0;
        if (participation.preco_por_periodo && periodId) {
            basePrice = participation.preco_por_periodo[periodId] || participation.preco || 0;
        } else {
            basePrice = participation.preco || 0;
        }

        // Aplica regras de idade se existirem
        if (birthDate && this.eventData.regras_idade && this.eventData.regras_idade.evento) {
            const age = this.calculateAge(birthDate);
            const ageRules = this.eventData.regras_idade.evento;

            // Verifica cada regra de idade
            for (const rule of ageRules) {
                if (age >= rule.idade_min && age <= rule.idade_max) {
                    if (rule.tipo_desconto === 'percentual') {
                        basePrice = basePrice * (1 - rule.valor_desconto / 100);
                    } else if (rule.tipo_desconto === 'fixo') {
                        basePrice = basePrice - rule.valor_desconto;
                    } else if (rule.tipo_desconto === 'valor_fixo') {
                        basePrice = rule.valor_desconto;
                    }
                    break;
                }
            }
        }

        return Math.max(0, basePrice); // Garante que o preço não seja negativo
    }

    // Adiciona um participante ao cálculo
    addParticipant(participant) {
        this.participants.push(participant);
    }

    // Remove um participante do cálculo
    removeParticipant(index) {
        if (index >= 0 && index < this.participants.length) {
            this.participants.splice(index, 1);
        }
    }

    // Atualiza os dados de um participante
    updateParticipant(index, participant) {
        if (index >= 0 && index < this.participants.length) {
            this.participants[index] = participant;
        }
    }

    // Aplica um cupom de desconto
    applyCoupon(code) {
        if (!this.eventData || !this.eventData.cupons) {
            return { success: false, message: 'Não há cupons disponíveis para este evento.' };
        }

        // Encontra o cupom pelo código
        const coupon = this.eventData.cupons.find(c => c.codigo.toLowerCase() === code.toLowerCase());
        
        if (!coupon) {
            return { success: false, message: 'Cupom inválido ou inexistente.' };
        }

        // Verifica se o cupom está ativo
        if (!coupon.ativo) {
            return { success: false, message: 'Este cupom não está mais ativo.' };
        }

        // Verifica a data de validade do cupom
        if (coupon.data_validade) {
            const today = new Date();
            const expiryDate = new Date(coupon.data_validade);
            if (today > expiryDate) {
                return { success: false, message: 'Este cupom está expirado.' };
            }
        }

        // Armazena as informações do cupom
        this.couponCode = code;
        this.couponType = coupon.tipo_desconto;
        this.couponTarget = coupon.aplicacao;
        this.couponDiscount = coupon.valor_desconto;

        return { 
            success: true, 
            message: 'Cupom aplicado com sucesso!',
            discount: this.calculateCouponDiscount()
        };
    }

    // Remove o cupom aplicado
    removeCoupon() {
        this.couponCode = null;
        this.couponDiscount = 0;
        this.couponType = null;
        this.couponTarget = null;
    }

    // Calcula o desconto do cupom
    calculateCouponDiscount() {
        if (!this.couponCode || this.couponDiscount <= 0) {
            return 0;
        }

        const subtotals = this.calculateSubtotals();
        let baseAmount = 0;

        // Determina o valor base para aplicação do desconto
        if (this.couponTarget === 'total') {
            baseAmount = subtotals.accommodationTotal + subtotals.eventTotal;
        } else if (this.couponTarget === 'hospedagem') {
            baseAmount = subtotals.accommodationTotal;
        } else if (this.couponTarget === 'evento') {
            baseAmount = subtotals.eventTotal;
        }

        // Calcula o desconto com base no tipo
        if (this.couponType === 'percentual') {
            return baseAmount * (this.couponDiscount / 100);
        } else if (this.couponType === 'fixo') {
            return Math.min(baseAmount, this.couponDiscount); // Não permite desconto maior que o valor base
        }

        return 0;
    }

    // Calcula os subtotais de hospedagem e evento
    calculateSubtotals() {
        let accommodationTotal = 0;
        let eventTotal = 0;

        for (const participant of this.participants) {
            if (participant.accommodationType && participant.periodId) {
                accommodationTotal += this.calculateAccommodationPrice(
                    participant.accommodationType,
                    participant.periodId,
                    participant.birthDate
                );
            }

            if (participant.participationType) {
                eventTotal += this.calculateEventPrice(
                    participant.participationType,
                    participant.periodId, // Usa o mesmo período da hospedagem se aplicável
                    participant.birthDate
                );
            }
        }

        return {
            accommodationTotal,
            eventTotal
        };
    }

    // Calcula o total geral incluindo descontos
    calculateTotal() {
        const subtotals = this.calculateSubtotals();
        const couponDiscount = this.calculateCouponDiscount();

        // Calcula o total
        const total = subtotals.accommodationTotal + subtotals.eventTotal - couponDiscount;

        return {
            accommodationTotal: subtotals.accommodationTotal,
            eventTotal: subtotals.eventTotal,
            couponDiscount: couponDiscount,
            total: Math.max(0, total) // Garante que o total não seja negativo
        };
    }
}

// Exporta a classe para uso global
window.PriceCalculator = PriceCalculator;
