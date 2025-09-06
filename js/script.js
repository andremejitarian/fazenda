// Variáveis globais
let currentEvent = null;
let participants = [];
let currentStep = 1;
let appliedCoupon = null;
let selectedPaymentMethod = null;

// Inicialização
$(document).ready(function() {
    console.log('Formulário iniciado');
    initializeForm();
});

// Função principal de inicialização
function initializeForm() {
    // Detectar parâmetro de evento na URL
    const urlParams = new URLSearchParams(window.location.search);
    const eventoId = urlParams.get('evento') || 'G001'; // Fallback para G001
    
    // Carregar dados do evento
    loadEventData(eventoId);
    
    // Configurar event listeners
    setupEventListeners();
    
    // Configurar máscaras de input
    setupInputMasks();
}

// Carregar dados do evento
function loadEventData(eventoId) {
    console.log(`Carregando evento: ${eventoId}`);
    
    // Mostrar estado de loading
    showLoadingState();
    
    // Carregar eventos.json
    fetch('eventos.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao carregar dados dos eventos');
            }
            return response.json();
        })
        .then(data => {
            const evento = data.eventos.find(e => e.id === eventoId);
            
            if (!evento) {
                throw new Error(`Evento ${eventoId} não encontrado`);
            }
            
            currentEvent = evento;
            console.log('Evento carregado:', currentEvent);
            
            // Configurar interface com dados do evento
            setupEventInterface();
            
            // Ocultar loading e mostrar conteúdo
            hideLoadingState();
            
        })
        .catch(error => {
            console.error('Erro ao carregar evento:', error);
            showErrorState(error.message);
        });
}

// Configurar interface com dados do evento
function setupEventInterface() {
    // Configurar header se disponível
    if (currentEvent.header) {
        setupEventHeader();
    }
    
    // Preencher informações básicas
    $('#event-title').text(currentEvent.nome);
    $('#event-description').text(currentEvent.descricao);
    
    if (currentEvent.observacoes_adicionais) {
        $('#event-observations').text(currentEvent.observacoes_adicionais).show();
    } else {
        $('#event-observations').hide();
    }
    
    // Configurar link dos termos
    $('#terms-link').attr('href', currentEvent.politicas_evento_url);
    
    // Mostrar botão de avançar
    $('#start-form-btn').show();
}

// Configurar header do evento
function setupEventHeader() {
    const header = currentEvent.header;
    
    // Configurar banner
    if (header.banner_url) {
        $('.header-banner').css('background-image', `url(${header.banner_url})`);
    }
    
    // Configurar logo(s)
    const logoContainer = $('.logo-container');
    logoContainer.empty();
    
    if (header.partner_logos && header.partner_logos.length === 2 && 
        (header.logo_duplo || currentEvent.tipo_formulario === 'hospedagem_e_evento')) {
        
        // Logo duplo para parceiros
        logoContainer.append(`
            <img src="${header.partner_logos[0]}" alt="Logo Principal" class="partner-logo logo-main">
            <img src="${header.partner_logos[1]}" alt="Logo Parceiro" class="partner-logo logo-partner">
        `);
    } else {
        // Logo único
        const logoUrl = header.logo_url || 'https://assets.fazendaserrinha.com.br/logos/fs_logo_circular.png';
        logoContainer.append(`<img src="${logoUrl}" alt="Logo Fazenda Serrinha" class="logo">`);
    }
}

// Estados de loading e erro
function showLoadingState() {
    $('.loading-state').show();
    $('.welcome-section').hide();
    $('#start-form-btn').hide();
    $('.error-state').hide();
}

function hideLoadingState() {
    $('.loading-state').hide();
    $('.welcome-section').show();
    $('.error-state').hide();
}

function showErrorState(message) {
    $('.loading-state').hide();
    $('.welcome-section').hide();
    $('#start-form-btn').hide();
    $('.error-state').show();
    $('.error-state p').text(message);
}

// Configurar event listeners
function setupEventListeners() {
    // Botão iniciar formulário
    $('#start-form-btn').on('click', function() {
        goToStep(2);
    });
    
    // Botão adicionar participante
    $('#add-participant-btn').on('click', addParticipant);
    
    // Navegação entre etapas
    $('.back-btn').on('click', function() {
        const currentStepNum = getCurrentStepNumber();
        if (currentStepNum > 1) {
            goToStep(currentStepNum - 1);
        }
    });
    
    $('.next-btn').on('click', function() {
        if (validateCurrentStep()) {
            const currentStepNum = getCurrentStepNumber();
            goToStep(currentStepNum + 1);
        }
    });
    
    // Botão finalizar
    $('.submit-btn').on('click', submitForm);
    
    // Cupom de desconto
    $('#coupon-code').on('input', debounce(validateCoupon, 500));
    
    // Forma de pagamento
    $('#payment-method').on('change', updatePaymentMethod);
}

// Configurar máscaras de input
function setupInputMasks() {
    // Será configurado quando os participantes forem adicionados
}

// Navegação entre etapas
function goToStep(stepNumber) {
    // Ocultar todas as etapas
    $('.form-content').hide();
    
    // Mostrar etapa específica
    $(`#step-${stepNumber}`).show();
    
    // Atualizar step atual
    currentStep = stepNumber;
    
    // Configurações específicas por etapa
    switch(stepNumber) {
        case 2:
            setupParticipantsStep();
            break;
        case 3:
            setupSummaryStep();
            break;
        case 4:
            setupConfirmationStep();
            break;
    }
    
    // Scroll para o topo
    $('html, body').animate({ scrollTop: 0 }, 300);
}

function getCurrentStepNumber() {
    return currentStep;
}

// Configurar etapa de participantes
function setupParticipantsStep() {
    // Adicionar primeiro participante se não existir
    if (participants.length === 0) {
        addParticipant();
    }
    
    // Configurar formas de pagamento
    setupPaymentMethods();
}

// Adicionar participante
function addParticipant() {
    const participantNumber = participants.length + 1;
    const template = $('#participant-template').html();
    
    // Criar novo participante
    const participantHtml = template.replace(/PARTICIPANTE 1/g, `PARTICIPANTE ${participantNumber}`);
    const $participant = $(participantHtml);
    
    // Configurar ID único
    const participantId = `participant-${participantNumber}`;
    $participant.attr('data-participant-id', participantId);
    
    // Configurar número do participante
    $participant.find('.participant-number').text(participantNumber);
    
    // Mostrar botão remover se não for o primeiro
    if (participantNumber > 1) {
        $participant.find('.btn-remove-participant').show();
    }
    
    // Configurar seções baseadas no tipo de formulário
    setupParticipantSections($participant);
    
    // Adicionar ao container
    $('#participants-container').append($participant);
    
    // Configurar máscaras para este participante
    setupParticipantMasks($participant);
    
    // Configurar event listeners para este participante
    setupParticipantEventListeners($participant);
    
    // Adicionar aos dados
    participants.push({
        id: participantId,
        number: participantNumber,
        data: {},
        element: $participant
    });
    
    // Atualizar seção de responsável pelo pagamento
    updateResponsiblePayerSection();
    
    console.log(`Participante ${participantNumber} adicionado`);
}

// Configurar seções do participante baseado no tipo de formulário
function setupParticipantSections($participant) {
    const tipoFormulario = currentEvent.tipo_formulario;
    
    // Mostrar/ocultar seções baseado no tipo
    if (tipoFormulario === 'hospedagem_apenas' || tipoFormulario === 'hospedagem_e_evento') {
        $participant.find('.lodging-section').show();
        setupLodgingOptions($participant);
    }
    
    if (tipoFormulario === 'evento_apenas' || tipoFormulario === 'hospedagem_e_evento') {
        $participant.find('.event-section').show();
        setupEventOptions($participant);
    }
}

// Configurar opções de hospedagem
function setupLodgingOptions($participant) {
    const $stayPeriodSelect = $participant.find('.stay-period-select');
    const $stayPeriodInfo = $participant.find('.stay-period-info');
    const $accommodationSelect = $participant.find('.accommodation-select');
    const $accommodationInfo = $participant.find('.accommodation-info');
    
    // Períodos de estadia
    const periodos = currentEvent.periodos_estadia_opcoes;
    
    if (periodos.length === 1) {
        // Apenas uma opção - mostrar como texto
        $stayPeriodSelect.hide();
        $stayPeriodInfo.text(periodos[0].label).show();
        updateCheckInOutInfo($participant, periodos[0]);
    } else {
        // Múltiplas opções - mostrar dropdown
        $stayPeriodSelect.empty().append('<option value="">Selecione o período</option>');
        periodos.forEach(periodo => {
            $stayPeriodSelect.append(`<option value="${periodo.id}">${periodo.label}</option>`);
        });
        $stayPeriodSelect.show();
        $stayPeriodInfo.hide();
    }
    
    // Tipos de acomodação
    const acomodacoes = currentEvent.tipos_acomodacao;
    
    if (acomodacoes.length === 1) {
        // Apenas uma opção - mostrar como texto
        $accommodationSelect.hide();
        $accommodationInfo.text(`${acomodacoes[0].label} - ${acomodacoes[0].descricao}`).show();
    } else {
        // Múltiplas opções - mostrar dropdown
        $accommodationSelect.empty().append('<option value="">Selecione a acomodação</option>');
        acomodacoes.forEach(acomodacao => {
            $accommodationSelect.append(`<option value="${acomodacao.id}">${acomodacao.label}</option>`);
        });
        $accommodationSelect.show();
        $accommodationInfo.hide();
    }
}

// Configurar opções de evento
function setupEventOptions($participant) {
    const $eventSelect = $participant.find('.event-option-select');
    const $eventInfo = $participant.find('.event-option-info');
    
    let eventOptions = [];
    
    if (currentEvent.tipo_formulario === 'evento_apenas') {
        eventOptions = currentEvent.valores_evento_opcoes;
    } else if (currentEvent.tipo_formulario === 'hospedagem_e_evento') {
        // Será atualizado quando o período for selecionado
        eventOptions = [];
    }
    
    if (eventOptions.length === 1) {
        // Apenas uma opção - mostrar como texto
        $eventSelect.hide();
        $eventInfo.text(`${eventOptions[0].label} - ${eventOptions[0].descricao}`).show();
    } else if (eventOptions.length > 1) {
        // Múltiplas opções - mostrar dropdown
        $eventSelect.empty().append('<option value="">Selecione a participação</option>');
        eventOptions.forEach(opcao => {
            $eventSelect.append(`<option value="${opcao.id}">${opcao.label}</option>`);
        });
        $eventSelect.show();
        $eventInfo.hide();
    }
}

// Atualizar informações de check-in/out
function updateCheckInOutInfo($participant, periodo) {
    const dataInicio = new Date(periodo.data_inicio);
    const dataFim = new Date(periodo.data_fim);
    
    const formatDateTime = (date) => {
        return date.toLocaleDateString('pt-BR') + ' ' + 
               date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };
    
    $participant.find('.checkin-datetime').text(formatDateTime(dataInicio));
    $participant.find('.checkout-datetime').text(formatDateTime(dataFim));
}

// Configurar máscaras para participante
function setupParticipantMasks($participant) {
    $participant.find('.phone-mask').mask('(00) 00000-0000');
    $participant.find('.cpf-mask').mask('000.000.000-00');
}

// Configurar event listeners para participante
function setupParticipantEventListeners($participant) {
    // Remover participante
    $participant.find('.btn-remove-participant').on('click', function() {
        removeParticipant($participant);
    });
    
    // Validação de CPF
    $participant.find('.cpf-mask').on('blur', function() {
        validateCPF($(this));
    });
    
    // Mudanças que afetam cálculos
    $participant.find('.stay-period-select, .accommodation-select, .event-option-select, .dob-input').on('change', function() {
        updateParticipantCalculations($participant);
        updateEventOptionsForPeriod($participant);
    });
    
    // Responsável pelo pagamento
    $participant.find('.responsible-payer').on('change', function() {
        if ($(this).is(':checked')) {
            // Desmarcar outros responsáveis
            $('.responsible-payer').not(this).prop('checked', false);
        }
    });
}

// Remover participante
function removeParticipant($participant) {
    const participantId = $participant.attr('data-participant-id');
    
    // Remover dos dados
    participants = participants.filter(p => p.id !== participantId);
    
    // Remover do DOM
    $participant.remove();
    
    // Renumerar participantes
    renumberParticipants();
    
    // Atualizar seção de responsável pelo pagamento
    updateResponsiblePayerSection();
    
    console.log(`Participante ${participantId} removido`);
}

// Renumerar participantes
function renumberParticipants() {
    $('#participants-container .participant-block').each(function(index) {
        const newNumber = index + 1;
        $(this).find('.participant-number').text(newNumber);
        
        // Atualizar dados
        if (participants[index]) {
            participants[index].number = newNumber;
        }
    });
}

// Atualizar seção de responsável pelo pagamento
function updateResponsiblePayerSection() {
    const $sections = $('.responsible-payer-section');
    
    if (participants.length > 1) {
        $sections.show();
    } else {
        $sections.hide();
        // Se só há um participante, ele é automaticamente o responsável
        if (participants.length === 1) {
            participants[0].element.find('.responsible-payer').prop('checked', true);
        }
    }
}

// Atualizar opções de evento baseado no período selecionado
function updateEventOptionsForPeriod($participant) {
    if (currentEvent.tipo_formulario !== 'hospedagem_e_evento') return;
    
    const selectedPeriodId = $participant.find('.stay-period-select').val();
    if (!selectedPeriodId) return;
    
    const periodo = currentEvent.periodos_estadia_opcoes.find(p => p.id === selectedPeriodId);
    if (!periodo || !periodo.valores_evento_opcoes) return;
    
    const $eventSelect = $participant.find('.event-option-select');
    const $eventInfo = $participant.find('.event-option-info');
    const eventOptions = periodo.valores_evento_opcoes;
    
    if (eventOptions.length === 1) {
        // Apenas uma opção - mostrar como texto
        $eventSelect.hide();
        $eventInfo.text(`${eventOptions[0].label} - ${eventOptions[0].descricao}`).show();
    } else {
        // Múltiplas opções - mostrar dropdown
        $eventSelect.empty().append('<option value="">Selecione a participação</option>');
        eventOptions.forEach(opcao => {
            $eventSelect.append(`<option value="${opcao.id}">${opcao.label}</option>`);
        });
        $eventSelect.show();
        $eventInfo.hide();
    }
}

// Configurar formas de pagamento
function setupPaymentMethods() {
    const $paymentSelect = $('#payment-method');
    const $paymentDescription = $('#payment-method-description');
    const formasPagamento = currentEvent.formas_pagamento_opcoes;
    
    $paymentSelect.empty().append('<option value="">Selecione a forma de pagamento</option>');
    
    formasPagamento.forEach(forma => {
        $paymentSelect.append(`<option value="${forma.id}">${forma.label}</option>`);
    });
    
    // Se apenas uma opção, selecionar automaticamente
    if (formasPagamento.length === 1) {
        $paymentSelect.val(formasPagamento[0].id);
        $paymentDescription.text(formasPagamento[0].descricao);
        selectedPaymentMethod = formasPagamento[0];
    }
}

// Atualizar método de pagamento
function updatePaymentMethod() {
    const selectedId = $('#payment-method').val();
    const forma = currentEvent.formas_pagamento_opcoes.find(f => f.id === selectedId);
    
    if (forma) {
        $('#payment-method-description').text(forma.descricao);
        selectedPaymentMethod = forma;
        
        // Recalcular totais com nova taxa de gateway
        updateAllCalculations();
    }
}

// Função utilitária debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Validação de etapa atual
function validateCurrentStep() {
    switch(currentStep) {
        case 2:
            return validateParticipantsStep();
        case 3:
            return validateSummaryStep();
        default:
            return true;
    }
}

// Validar etapa de participantes
function validateParticipantsStep() {
    let isValid = true;
    
    // Validar cada participante
    $('#participants-container .participant-block').each(function() {
        const $participant = $(this);
        
        // Campos obrigatórios
        const requiredFields = [
            '.full-name',
            '.phone-mask',
            '.cpf-mask',
            '.email-input',
            '.dob-input'
        ];
        
        requiredFields.forEach(selector => {
            const $field = $participant.find(selector);
            if (!$field.val().trim()) {
                $field.addClass('error');
                isValid = false;
            } else {
                $field.removeClass('error');
            }
        });
        
        // Validar CPF
        const $cpfField = $participant.find('.cpf-mask');
        if (!validateCPF($cpfField)) {
            isValid = false;
        }
        
        // Validar seleções baseadas no tipo de formulário
        if (currentEvent.tipo_formulario === 'hospedagem_apenas' || currentEvent.tipo_formulario === 'hospedagem_e_evento') {
            const $stayPeriod = $participant.find('.stay-period-select');
            const $accommodation = $participant.find('.accommodation-select');
            
            if ($stayPeriod.is(':visible') && !$stayPeriod.val()) {
                $stayPeriod.addClass('error');
                isValid = false;
            }
            
            if ($accommodation.is(':visible') && !$accommodation.val()) {
                $accommodation.addClass('error');
                isValid = false;
            }
        }
        
        if (currentEvent.tipo_formulario === 'evento_apenas' || currentEvent.tipo_formulario === 'hospedagem_e_evento') {
            const $eventOption = $participant.find('.event-option-select');
            
            if ($eventOption.is(':visible') && !$eventOption.val()) {
                $eventOption.addClass('error');
                isValid = false;
            }
        }
    });
    
    // Validar responsável pelo pagamento se múltiplos participantes
    if (participants.length > 1) {
        const hasResponsible = $('.responsible-payer:checked').length > 0;
        if (!hasResponsible) {
            alert('Por favor, selecione um responsável pelo pagamento.');
            isValid = false;
        }
    }
    
    return isValid;
}

// Validar etapa de resumo
function validateSummaryStep() {
    // Verificar se forma de pagamento foi selecionada
    if (!selectedPaymentMethod) {
        $('#payment-method').addClass('error');
        alert('Por favor, selecione uma forma de pagamento.');
        return false;
    }
    
    // Verificar se termos foram aceitos
    if (!$('#terms-conditions').is(':checked')) {
        alert('Por favor, aceite os termos e condições.');
        return false;
    }
    // Adicionar estas funções ao final do script.js existente

// Configurar etapa de resumo
function setupSummaryStep() {
    // Atualizar dados do calculador com método de pagamento
    if (selectedPaymentMethod) {
        priceCalculator.setPaymentMethod(selectedPaymentMethod);
    }
    
    // Gerar resumo dos participantes
    generateParticipantsSummary();
    
    // Atualizar todos os cálculos
    updateAllCalculations();
    
    // Configurar cupom se já havia um aplicado
    const currentCoupon = $('#coupon-code').val();
    if (currentCoupon) {
        applyCoupon(currentCoupon);
    }
}

// Gerar resumo dos participantes
function generateParticipantsSummary() {
    const $summaryContent = $('#summary-content');
    let summaryHtml = '';
    
    // Identificar responsável pelo pagamento
    const $responsiblePayer = $('.responsible-payer:checked').closest('.participant-block');
    let responsiblePayerData = null;
    
    if ($responsiblePayer.length > 0) {
        responsiblePayerData = extractParticipantData($responsiblePayer);
    } else if (participants.length === 1) {
        // Se só há um participante, ele é o responsável
        responsiblePayerData = extractParticipantData($('#participants-container .participant-block').first());
    }
    
    // Seção do responsável pelo pagamento
    if (responsiblePayerData) {
        summaryHtml += `
            <div class="responsible-payer-summary">
                <h3>👤 Responsável pelo Pagamento</h3>
                <div class="payer-info">
                    <p><strong>Nome:</strong> ${responsiblePayerData.fullName}</p>
                    <p><strong>CPF:</strong> ${responsiblePayerData.cpf}</p>
                    <p><strong>Email:</strong> ${responsiblePayerData.email}</p>
                    <p><strong>Telefone:</strong> ${responsiblePayerData.phone}</p>
                </div>
            </div>
        `;
    }
    
    // Detalhamento por participante
    summaryHtml += `
        <div class="participants-summary">
            <h3>📋 Detalhamento por Participante</h3>
    `;
    
    $('#participants-container .participant-block').each(function(index) {
        const $participant = $(this);
        const participantData = extractParticipantData($participant);
        const participantNumber = index + 1;
        
        // Calcular valores individuais
        const lodgingValue = priceCalculator ? priceCalculator.calculateLodgingValue(participantData) : 0;
        const eventValue = priceCalculator ? priceCalculator.calculateEventValue(participantData) : 0;
        
        // Obter descrições das opções selecionadas
        const stayPeriodLabel = getStayPeriodLabel(participantData.stayPeriod);
        const accommodationLabel = getAccommodationLabel(participantData.accommodation);
        const eventOptionLabel = getEventOptionLabel(participantData.eventOption, participantData.stayPeriod);
        
        summaryHtml += `
            <div class="participant-summary-item">
                <h4>👤 Participante ${participantNumber}: ${participantData.fullName}</h4>
                <div class="participant-details">
        `;
        
        // Mostrar detalhes baseado no tipo de formulário
        if (currentEvent.tipo_formulario === 'hospedagem_apenas' || currentEvent.tipo_formulario === 'hospedagem_e_evento') {
            summaryHtml += `
                <p><strong>Hospedagem:</strong> ${accommodationLabel}</p>
                <p><strong>Período:</strong> ${stayPeriodLabel}</p>
                <p><strong>Valor da Hospedagem:</strong> ${priceCalculator.formatCurrency(lodgingValue)}</p>
            `;
        }
        
        if (currentEvent.tipo_formulario === 'evento_apenas' || currentEvent.tipo_formulario === 'hospedagem_e_evento') {
            summaryHtml += `
                <p><strong>Evento:</strong> ${eventOptionLabel}</p>
                <p><strong>Valor do Evento:</strong> ${priceCalculator.formatCurrency(eventValue)}</p>
            `;
        }
        
        summaryHtml += `
                </div>
            </div>
        `;
    });
    
    summaryHtml += '</div>';
    
    $summaryContent.html(summaryHtml);
}

// Obter label do período de estadia
function getStayPeriodLabel(stayPeriodId) {
    if (!stayPeriodId) return 'Não selecionado';
    
    const periodo = currentEvent.periodos_estadia_opcoes.find(p => p.id === stayPeriodId);
    return periodo ? periodo.label : 'Período não encontrado';
}

// Obter label da acomodação
function getAccommodationLabel(accommodationId) {
    if (!accommodationId) return 'Não selecionado';
    
    const acomodacao = currentEvent.tipos_acomodacao.find(a => a.id === accommodationId);
    return acomodacao ? acomodacao.label : 'Acomodação não encontrada';
}

// Obter label da opção de evento
function getEventOptionLabel(eventOptionId, stayPeriodId) {
    if (!eventOptionId) return 'Não selecionado';
    
    let eventOptions = [];
    
    if (currentEvent.tipo_formulario === 'evento_apenas') {
        eventOptions = currentEvent.valores_evento_opcoes;
    } else if (currentEvent.tipo_formulario === 'hospedagem_e_evento' && stayPeriodId) {
        const periodo = currentEvent.periodos_estadia_opcoes.find(p => p.id === stayPeriodId);
        eventOptions = periodo ? (periodo.valores_evento_opcoes || []) : [];
    }
    
    const eventOption = eventOptions.find(e => e.id === eventOptionId);
    return eventOption ? eventOption.label : 'Opção não encontrada';
}

// Atualizar método de pagamento (sobrescrever função existente)
function updatePaymentMethod() {
    const selectedId = $('#payment-method').val();
    const forma = currentEvent.formas_pagamento_opcoes.find(f => f.id === selectedId);
    
    if (forma) {
        $('#payment-method-description').text(forma.descricao);
        selectedPaymentMethod = forma;
        
        // Atualizar calculador
        if (priceCalculator) {
            priceCalculator.setPaymentMethod(forma);
        }
        
        // Recalcular totais com nova taxa de gateway
        updateAllCalculations();
    }
}

// Configurar interface com dados do evento (atualizar função existente)
function setupEventInterface() {
    // Configurar header se disponível
    if (currentEvent.header) {
        setupEventHeader();
    }
    
    // Preencher informações básicas
    $('#event-title').text(currentEvent.nome);
    $('#event-description').text(currentEvent.descricao);
    
    if (currentEvent.observacoes_adicionais) {
        $('#event-observations').text(currentEvent.observacoes_adicionais).show();
    } else {
        $('#event-observations').hide();
    }
    
    // Configurar link dos termos
    $('#terms-link').attr('href', currentEvent.politicas_evento_url);
    
    // Inicializar calculador de preços
    initializePriceCalculator(currentEvent);
    
    // Mostrar botão de avançar
    $('#start-form-btn').show();
}

// Submeter formulário
function submitForm() {
    if (!validateSummaryStep()) {
        return;
    }
    
    // Gerar ID único da inscrição
    const inscricaoId = generateInscricaoId();
    
    // Preparar dados para envio
    const formData = prepareFormData(inscricaoId);
    
    // Simular envio (substituir por chamada real ao webhook)
    console.log('Dados do formulário:', formData);
    
    // Ir para tela de confirmação
    showConfirmation(inscricaoId, formData);
}

// Gerar ID único da inscrição
function generateInscricaoId() {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `FS${year}${timestamp}`;
}

// Preparar dados do formulário
function prepareFormData(inscricaoId) {
    const summary = priceCalculator.getCalculationSummary();
    
    // Coletar dados dos participantes
    const participantsData = [];
    $('#participants-container .participant-block').each(function() {
        const $participant = $(this);
        const participantData = extractParticipantData($participant);
        
        participantsData.push({
            ...participantData,
            valorHospedagem: priceCalculator.calculateLodgingValue(participantData),
            valorEvento: priceCalculator.calculateEventValue(participantData),
            idade: priceCalculator.calculateAge(participantData.birthDate)
        });
    });
    
    // Identificar responsável pelo pagamento
    const responsiblePayer = participantsData.find(p => p.isResponsiblePayer) || participantsData[0];
    
    return {
        inscricao_id: inscricaoId,
        evento: {
            id: currentEvent.id,
            nome: currentEvent.nome,
            tipo_formulario: currentEvent.tipo_formulario
        },
        responsavel: {
            nome: responsiblePayer.fullName,
            cpf: responsiblePayer.cpf,
            email: responsiblePayer.email,
            telefone: responsiblePayer.phone
        },
        participantes: participantsData,
        totais: {
            subtotalHospedagem: summary.lodgingSubtotal,
            subtotalEvento: summary.eventSubtotal,
            desconto: summary.discount,
            total: summary.finalTotal
        },
        forma_pagamento: selectedPaymentMethod,
        cupom: priceCalculator.appliedCoupon,
        timestamp: new Date().toISOString()
    };
}

// Mostrar confirmação
function showConfirmation(inscricaoId, formData) {
    // Preencher dados da confirmação
    $('#confirmation-id').text(`#${inscricaoId}`);
    $('#confirmation-total').text(priceCalculator.formatCurrency(formData.totais.total));
    $('#confirmation-payment-method').text(formData.forma_pagamento.label);
    
    // Ir para tela de confirmação
    goToStep(4);
}

// Configurar etapa de confirmação
function setupConfirmationStep() {
    // Aqui seria feita a integração com o webhook de pagamento
    // Por enquanto, apenas simular
    
    setTimeout(() => {
        $('.payment-link-btn').show().text('Ir para Pagamento');
    }, 1000);
}

console.log('Funções de cálculo e resumo adicionadas');
    return true;
}

console.log('Script principal carregado');
