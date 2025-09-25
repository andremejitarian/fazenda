// Variáveis globais
let currentEvent = null;
let participants = [];
let currentStep = 1;
let appliedCoupon = null;
let selectedPaymentMethod = null;
let webhookConnected = false;
let submissionInProgress = false;
let paymentLinkGenerated = false;

// Function to format ISO date-time string for display (e.g., "DD/MM/YYYY HH:MM")
function formatDateTimeForDisplay(isoDateTimeString) {
    if (!isoDateTimeString) return '';
    const date = new Date(isoDateTimeString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
        console.warn('Invalid date string for formatting:', isoDateTimeString);
        return '';
    }
    const data = date.toLocaleDateString('pt-BR');
    const hora = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${data} ${hora}`;
}

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
    
    // Inicializar integração com webhooks
    initializeWebhookIntegration();
    
    // Testar conectividade
    testWebhookConnectivity().then(connected => {
        webhookConnected = connected;
    });
    
    // Carregar dados do evento (com tentativa de webhook primeiro)
    loadEventDataWithWebhook(eventoId);
    
    // Configurar event listeners
    setupEventListeners();
    
    // Configurar máscaras de input
    setupInputMasks();
}

// Nova função para carregar dados com webhook
async function loadEventDataWithWebhook(eventoId) {
    console.log(`Carregando evento: ${eventoId}`);
    
    // Mostrar estado de loading
    showLoadingState();
    
    try {
        // Tentar carregar via webhook primeiro
        let eventoData = null;
        
        if (webhookIntegration) {
            eventoData = await webhookIntegration.preloadEventData(eventoId);
        }
        
        // Se webhook falhou, carregar do JSON local
        if (!eventoData) {
            console.log('Carregando do arquivo JSON local...');
            eventoData = await loadEventFromJSON(eventoId);
        }
        
        if (!eventoData) {
            throw new Error(`Evento ${eventoId} não encontrado`);
        }
        
        currentEvent = eventoData;
        console.log('Evento carregado:', currentEvent);
        
        // Configurar interface com dados do evento
        setupEventInterface();
        
        // Ocultar loading e mostrar conteúdo
        hideLoadingState();
        
    } catch (error) {
        console.error('Erro ao carregar evento:', error);
        showErrorState(error.message);
    }
}

// Função para carregar do JSON local (fallback)
async function loadEventFromJSON(eventoId) {
    try {
        const response = await fetch('eventos.json');
        if (!response.ok) {
            throw new Error('Erro ao carregar dados dos eventos');
        }
        
        const data = await response.json();
        const evento = data.eventos.find(e => e.id === eventoId);
        
        return evento;
    } catch (error) {
        console.error('Erro ao carregar JSON local:', error);
        return null;
    }
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
    
    // Inicializar calculador de preços
    initializePriceCalculator(currentEvent);
    
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
    
    // Atualizar seções de responsáveis (pagamento e criança)
    updateResponsibleSections();
    
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

        // Se já houver um período selecionado (por markup, estado salvo, etc.), inicializa as datas:
        const selectedPeriodId = $stayPeriodSelect.val();
        if (selectedPeriodId) {
            const periodoInicial = periodos.find(p => String(p.id) === String(selectedPeriodId));
            if (periodoInicial) {
                updateCheckInOutInfo($participant, periodoInicial);
            }
        }

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
    if (!periodo || !periodo.data_inicio || !periodo.data_fim) {
        $participant.find('.checkin-datetime').text('');
        $participant.find('.checkout-datetime').text('');
        return;
    }

    // Usando a função utilitária global para consistência
    const checkinFormatted = formatDateTimeForDisplay(periodo.data_inicio);
    const checkoutFormatted = formatDateTimeForDisplay(periodo.data_fim);

    $participant.find('.checkin-datetime').text(checkinFormatted);
    $participant.find('.checkout-datetime').text(checkoutFormatted);
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
    
    // Data de nascimento - verificar idade para responsável pela criança
    $participant.find('.dob-input').on('change', function() {
        updateResponsibleSections();
        updateParticipantCalculations($participant);
    });
    
    // Listener para mudanças que afetam os cálculos diretamente
    $participant.find('.full-name, .phone-mask, .cpf-mask, .email-input, .accommodation-select, .event-option-select').on('change', function() {
        updateParticipantCalculations($participant);
    });

    // Listener APENAS para o período de estadia
    $participant.find('.stay-period-select').on('change', function() {
        const selectedPeriodId = $(this).val();
        const periodoSelecionado = currentEvent.periodos_estadia_opcoes
            .find(p => String(p.id) === String(selectedPeriodId));

        if (periodoSelecionado) {
            updateCheckInOutInfo($participant, periodoSelecionado);
        } else {
            $participant.find('.checkin-datetime').text('');
            $participant.find('.checkout-datetime').text('');
        }

        updateEventOptionsForPeriod($participant);
        updateParticipantCalculations($participant);
    });
    
    // Responsável pelo pagamento
    $participant.find('.responsible-payer').on('change', function() {
        if ($(this).is(':checked')) {
            $('.responsible-payer').not(this).prop('checked', false);
        }
    });
    
    // Responsável pela criança
    $participant.find('.responsible-child').on('change', function() {
        if ($(this).is(':checked')) {
            $('.responsible-child').not(this).prop('checked', false);
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
    
    // Atualizar seções de responsáveis (pagamento e criança)
    updateResponsibleSections();
    
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
    // Para cada participante, verificar se deve mostrar a seção
    $('#participants-container .participant-block').each(function() {
        const $participant = $(this);
        const $section = $participant.find('.responsible-payer-section');
        const birthDate = $participant.find('.dob-input').val();
        
        // Verificar se este participante é menor de idade
        let isMinor = false;
        if (birthDate) {
            const age = calculateAge(birthDate);
            isMinor = (age !== null && age < 18);
        }
        
        // Se há mais de um participante E este participante NÃO é menor, mostrar a seção
        if (participants.length > 1 && !isMinor) {
            $section.show();
        } else {
            $section.hide();
            // Limpar seleção se este participante era responsável
            $participant.find('.responsible-payer').prop('checked', false);
        }
    });
    
    // Se só há um participante adulto, ele é automaticamente o responsável
    const adultParticipants = $('#participants-container .participant-block').filter(function() {
        const birthDate = $(this).find('.dob-input').val();
        if (!birthDate) return true; // Considera adulto se não há data
        
        const age = calculateAge(birthDate);
        return age === null || age >= 18;
    });
    
    if (adultParticipants.length === 1) {
        adultParticipants.find('.responsible-payer').prop('checked', true);
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
        
        // Atualizar calculador
        if (priceCalculator) {
            priceCalculator.setPaymentMethod(forma);
        }
        
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

// Validar responsável pela criança se houver menores
if (hasMinors()) {
    const hasResponsibleChild = $('.responsible-child:checked').length > 0;
    if (!hasResponsibleChild) {
        alert('Por favor, selecione um responsável pela criança.');
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
    
    return true;
}

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

    // --- NOVO: Carregar e exibir Política de Confirmação e Cancelamento ---
    loadCancellationPolicy();
    // FIM DO NOVO BLOCO
    
}

// NOVA FUNÇÃO: Carregar política de cancelamento
function loadCancellationPolicy() {
    const $policySection = $('#cancellation-policy-section');
    const $policyContent = $policySection.find('.policy-content');

    // Verificar se o evento tem formas de pagamento com política
    if (currentEvent.formas_pagamento_opcoes && currentEvent.formas_pagamento_opcoes.length > 0) {
        // Pegar a descrição da primeira forma de pagamento que contenha HTML
        const formaPagamentoComPolitica = currentEvent.formas_pagamento_opcoes.find(forma => 
            forma.descricao && forma.descricao.includes('<h4>POLÍTICA')
        );

        if (formaPagamentoComPolitica && formaPagamentoComPolitica.descricao.trim() !== '') {
            // Usar .html() porque a descrição contém tags HTML
            $policyContent.html(formaPagamentoComPolitica.descricao);
            $policySection.show();
        } else {
            // Se não houver política, ocultar a seção
            $policySection.hide();
            $policyContent.empty();
        }
    } else {
        // Se não houver formas de pagamento, ocultar a seção
        $policySection.hide();
        $policyContent.empty();
    }
}

// Função para calcular idade
function calculateAge(birthDate) {
    if (!birthDate) return null;
    
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

// Função para verificar se há menores de idade
function hasMinors() {
    let hasMinor = false;
    
    $('#participants-container .participant-block').each(function() {
        const $participant = $(this);
        const birthDate = $participant.find('.dob-input').val();
        
        if (birthDate) {
            const age = calculateAge(birthDate);
            if (age !== null && age < 18) {
                hasMinor = true;
                return false; // break do loop
            }
        }
    });
    
    return hasMinor;
}

// Atualizar seção de responsável pela criança
function updateResponsibleChildSection() {
    // Para cada participante, verificar se deve mostrar a seção
    $('#participants-container .participant-block').each(function() {
        const $participant = $(this);
        const $section = $participant.find('.responsible-child-section');
        const birthDate = $participant.find('.dob-input').val();
        
        // Verificar se este participante é menor de idade
        let isMinor = false;
        if (birthDate) {
            const age = calculateAge(birthDate);
            isMinor = (age !== null && age < 18);
        }
        
        // Se há menores no formulário E este participante NÃO é menor, mostrar a seção
        if (hasMinors() && !isMinor) {
            $section.show();
        } else {
            $section.hide();
            // Limpar seleção se este participante era responsável
            $participant.find('.responsible-child').prop('checked', false);
        }
    });
    
    // **NOVA LÓGICA: SEMPRE SUGERIR O PRIMEIRO ADULTO**
    if (hasMinors()) {
        // Limpar todas as seleções primeiro
        $('.responsible-child').prop('checked', false);
        
        // Encontrar o primeiro participante adulto na ordem do formulário
        let firstAdultFound = false;
        $('#participants-container .participant-block').each(function() {
            if (firstAdultFound) return; // Parar no primeiro adulto encontrado
            
            const $participant = $(this);
            const birthDate = $participant.find('.dob-input').val();
            
            // Verificar se é adulto
            let isAdult = true; // Considera adulto se não há data de nascimento
            if (birthDate) {
                const age = calculateAge(birthDate);
                isAdult = (age === null || age >= 18);
            }
            
            if (isAdult) {
                $participant.find('.responsible-child').prop('checked', true);
                firstAdultFound = true;
                console.log(`Primeiro adulto detectado como responsável pela criança: Participante ${$participant.find('.participant-number').text()}`);
            }
        });
    }
}

// Atualizar ambas as seções de responsáveis
function updateResponsibleSections() {
    updateResponsiblePayerSection();
    updateResponsibleChildSection();
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
                <h3>Responsável pelo Pagamento</h3>
                <div class="payer-info">
                    <p><strong>Nome:</strong> ${responsiblePayerData.fullName}</p>
                    <p><strong>CPF:</strong> ${responsiblePayerData.cpf}</p>
                    <p><strong>Email:</strong> ${responsiblePayerData.email}</p>
                    <p><strong>Telefone:</strong> ${responsiblePayerData.phone}</p>
                </div>
            </div>
        `;
    }

    // Seção do responsável pela criança
    if (hasMinors()) {
        const $responsibleChild = $('.responsible-child:checked').closest('.participant-block');
        let responsibleChildData = null;
        
        if ($responsibleChild.length > 0) {
            responsibleChildData = extractParticipantData($responsibleChild);
            
            summaryHtml += `
                <div class="responsible-payer-summary">
                    <h3>Responsável pela Criança</h3>
                    <div class="payer-info">
                        <p><strong>Nome:</strong> ${responsibleChildData.fullName}</p>
                        <p><strong>CPF:</strong> ${responsibleChildData.cpf}</p>
                        <p><strong>Email:</strong> ${responsibleChildData.email}</p>
                        <p><strong>Telefone:</strong> ${responsibleChildData.phone}</p>
                    </div>
                </div>
            `;
        }
    }
    
    // Detalhamento por participante
    summaryHtml += `
        <div class="participants-summary">
            <h3>Detalhamento por Participante</h3>
    `;
    
    $('#participants-container .participant-block').each(function(index) {
        const $participant = $(this);
        const participantData = extractParticipantData($participant);
        const participantNumber = index + 1;
        
        // Calcular valores individuais
        const lodgingValue = window.priceCalculator ? window.priceCalculator.calculateLodgingValue(participantData) : 0;
        const eventValue = window.priceCalculator ? window.priceCalculator.calculateEventValue(participantData) : 0;
        
        // Obter descrições das opções selecionadas
        const stayPeriodLabel = getStayPeriodLabel(participantData.stayPeriod);
        const accommodationLabel = getAccommodationLabel(participantData.accommodation);
        const eventOptionLabel = getEventOptionLabel(participantData.eventOption, participantData.stayPeriod);

        let checkinInfo = '';
        let checkoutInfo = '';

        // Se um período de estadia foi selecionado E o tipo de formulário inclui hospedagem
        if (participantData.stayPeriod &&
            (currentEvent.tipo_formulario === 'hospedagem_apenas' || currentEvent.tipo_formulario === 'hospedagem_e_evento')) {
            const selectedPeriod = currentEvent.periodos_estadia_opcoes.find(p => p.id === participantData.stayPeriod);
            if (selectedPeriod) {
                checkinInfo = formatDateTimeForDisplay(selectedPeriod.data_inicio);
                checkoutInfo = formatDateTimeForDisplay(selectedPeriod.data_fim);
            }
        }
        
        summaryHtml += `
            <div class="participant-summary-item">
                <h4>Participante ${participantNumber}: ${participantData.fullName}</h4>
                <div class="participant-details">
        `;
        
        // Mostrar detalhes baseado no tipo de formulário
        if (currentEvent.tipo_formulario === 'hospedagem_apenas' || currentEvent.tipo_formulario === 'hospedagem_e_evento') {
            summaryHtml += `
                <p><strong>Hospedagem:</strong> ${accommodationLabel}</p>
                <p><strong>Período:</strong> ${stayPeriodLabel}</p>
                ${checkinInfo ? `<p><strong>Check-in:</strong> ${checkinInfo}</p>` : ''}
                ${checkoutInfo ? `<p><strong>Check-out:</strong> ${checkoutInfo}</p>` : ''}
                <p><strong>Valor da Hospedagem:</strong> ${window.priceCalculator.formatCurrency(lodgingValue)}</p>
            `;
        }
        
        if (currentEvent.tipo_formulario === 'evento_apenas' || currentEvent.tipo_formulario === 'hospedagem_e_evento') {
            summaryHtml += `
                <p><strong>Evento:</strong> ${eventOptionLabel}</p>
                <p><strong>Valor do Evento:</strong> ${window.priceCalculator.formatCurrency(eventValue)}</p>
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

// Submeter formulário
async function submitForm() {
    if (!validateSummaryStep() || submissionInProgress) {
        return;
    }
    
    submissionInProgress = true;
    
    try {
        // Mostrar estado de carregamento
        showSubmissionLoading();
        
        // Gerar ID único da inscrição
        const inscricaoId = generateInscricaoId();
        
        // Preparar dados para envio
        const formData = prepareFormData(inscricaoId);
        
        console.log('Dados preparados para envio:', formData);
        
        // Tentar enviar via webhook
        let submissionResult = null;
        
        if (webhookIntegration && webhookConnected) {
            submissionResult = await webhookIntegration.submitForm(formData);
        } else {
            // Simular envio offline
            submissionResult = await simulateOfflineSubmission(formData);
        }
        
        if (submissionResult.success) {
            console.log('Formulário enviado com sucesso');
            
            // Ir para tela de confirmação
            showConfirmation(inscricaoId, formData, submissionResult.data);
        } else {
            throw new Error(submissionResult.error || 'Erro desconhecido no envio');
        }
        
    } catch (error) {
        console.error('Erro na submissão:', error);
        showSubmissionError(error.message);
    } finally {
        submissionInProgress = false;
        hideSubmissionLoading();
    }
}

// Mostrar estado de carregamento da submissão
function showSubmissionLoading() {
    const $submitBtn = $('.submit-btn');
    $submitBtn.prop('disabled', true);
    $submitBtn.html(`
        <span class="calculating-indicator"></span>
        Enviando inscrição...
    `);
}

// Ocultar estado de carregamento da submissão
function hideSubmissionLoading() {
    const $submitBtn = $('.submit-btn');
    $submitBtn.prop('disabled', false);
    $submitBtn.html('Confirmar Inscrição e Prosseguir');
}

// Mostrar erro na submissão
function showSubmissionError(errorMessage) {
    const errorHtml = `
        <div class="submission-error">
            <div class="error-icon">⚠️</div>
            <h3>Erro no Envio</h3>
            <p>${errorMessage}</p>
            <p>Por favor, verifique sua conexão e tente novamente.</p>
            <button class="btn btn-primary" onclick="submitForm()">Tentar Novamente</button>
        </div>
    `;
    
    // Mostrar modal ou seção de erro
    if ($('.submission-error').length === 0) {
        $('#step-3').append(errorHtml);
    }
    
    // Scroll para o erro
    $('.submission-error')[0].scrollIntoView({ behavior: 'smooth' });
}

// Simular envio offline (fallback)
function simulateOfflineSubmission(formData) {
    console.log('Modo offline: simulando envio...');
    
    // Simular delay de rede
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({
                success: true,
                data: {
                    message: 'Inscrição recebida (modo offline)',
                    link: '#pagamento-offline'
                }
            });
        }, 2000);
    });
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
function showConfirmation(inscricaoId, formData, responseData) {
    // Preencher dados da confirmação
    $('#confirmation-id').text(`#${inscricaoId}`);
    $('#confirmation-total').text(priceCalculator.formatCurrency(formData.totais.total));
    $('#confirmation-payment-method').text(formData.forma_pagamento.label);
    
    // Configurar link de pagamento se disponível
    if (responseData && responseData.link) {
        setupPaymentLink(responseData.link, formData);
    }
    
    // Ir para tela de confirmação
    goToStep(4);
    
    // Salvar dados localmente para recuperação
    saveFormDataLocally(inscricaoId, formData);
}

// Configurar link de pagamento
function setupPaymentLink(paymentLink, formData) {
    const $paymentBtn = $('.payment-link-btn');
    
    if (paymentLink && paymentLink !== '#pagamento-offline') {
        $paymentBtn.show();
        $paymentBtn.off('click').on('click', function() {
            // Abrir link em nova aba
            window.open(paymentLink, '_blank');
            
            // Mostrar opções adicionais
            showPaymentOptions(paymentLink);
        });
    } else {
        // Modo offline ou erro no link
        $paymentBtn.show().text('Gerar Link de Pagamento');
        $paymentBtn.off('click').on('click', function() {
            generatePaymentLinkManually(formData);
        });
    }
}

// Gerar link de pagamento manualmente
async function generatePaymentLinkManually(formData) {
    if (paymentLinkGenerated) return;
    
    paymentLinkGenerated = true;
    
    try {
        // Mostrar carregamento
        const $paymentBtn = $('.payment-link-btn');
        $paymentBtn.prop('disabled', true).html(`
            <span class="calculating-indicator"></span>
            Gerando link...
        `);
        
        // Tentar gerar via webhook
        let linkResult = null;
        
        if (webhookIntegration && webhookConnected) {
            linkResult = await webhookIntegration.generatePaymentLink(formData);
        }
        
        if (linkResult && linkResult.success) {
            // Link gerado com sucesso
            $paymentBtn.prop('disabled', false).text('Ir para Pagamento');
            $paymentBtn.off('click').on('click', function() {
                window.open(linkResult.link, '_blank');
                showPaymentOptions(linkResult.link);
            });
            
            showPaymentSuccess(linkResult);
        } else {
            throw new Error(linkResult?.error || 'Erro ao gerar link de pagamento');
        }
        
    } catch (error) {
        console.error('Erro ao gerar link:', error);
        showPaymentLinkError(error.message);
    } finally {
        paymentLinkGenerated = false;
    }
}

// Mostrar opções de pagamento
function showPaymentOptions(paymentLink) {
    const optionsHtml = `
        <div class="payment-options">
            <h4>Opções de Pagamento</h4>
            <div class="payment-actions">
                <button class="btn btn-secondary" onclick="copyPaymentLink('${paymentLink}')">
                    📋 Copiar Link
                </button>
                <button class="btn btn-secondary" onclick="sharePaymentLink('${paymentLink}')">
                    📤 Compartilhar
                </button>
            </div>
            <div class="qr-code-container" id="qr-code-container">
                <!-- QR Code seria gerado aqui -->
            </div>
        </div>
    `;
    
    if ($('.payment-options').length === 0) {
        $('.payment-link-btn').after(optionsHtml);
    }
}

// Copiar link de pagamento
function copyPaymentLink(link) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(link).then(() => {
            showToast('Link copiado para a área de transferência!', 'success');
        }).catch(() => {
            fallbackCopyText(link);
        });
    } else {
        fallbackCopyText(link);
    }
}

// Fallback para copiar texto
function fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        showToast('Link copiado!', 'success');
    } catch (err) {
        console.error('Erro ao copiar:', err);
        showToast('Erro ao copiar link', 'error');
    }
    
    document.body.removeChild(textArea);
}

// Compartilhar link de pagamento
function sharePaymentLink(link) {
    if (navigator.share) {
        navigator.share({
            title: 'Link de Pagamento - Fazenda Serrinha',
            text: 'Complete seu pagamento através deste link:',
            url: link
        }).catch(err => console.log('Erro ao compartilhar:', err));
    } else {
        // Fallback: copiar link
        copyPaymentLink(link);
    }
}

// Mostrar sucesso na geração do link
function showPaymentSuccess(linkResult) {
    const successHtml = `
        <div class="payment-success">
            <div class="success-icon">✅</div>
            <p>Link de pagamento gerado com sucesso!</p>
            ${linkResult.expiresAt ? `<p class="expires-info">Válido até: ${new Date(linkResult.expiresAt).toLocaleString('pt-BR')}</p>` : ''}
        </div>
    `;
    
    $('.payment-link-btn').after(successHtml);
}

// Mostrar erro na geração do link
function showPaymentLinkError(errorMessage) {
    const $paymentBtn = $('.payment-link-btn');
    $paymentBtn.prop('disabled', false).text('Tentar Novamente');
    
    const errorHtml = `
        <div class="payment-link-error">
            <div class="error-icon">❌</div>
            <p>Erro ao gerar link de pagamento:</p>
            <p class="error-message">${errorMessage}</p>
            <p>Entre em contato conosco para finalizar o pagamento.</p>
        </div>
    `;
    
    if ($('.payment-link-error').length === 0) {
        $('.payment-link-btn').after(errorHtml);
    }
}

// Salvar dados localmente para recuperação
function saveFormDataLocally(inscricaoId, formData) {
    try {
        const dataToSave = {
            inscricaoId,
            formData,
            timestamp: new Date().toISOString(),
            evento: currentEvent.id
        };
        
        localStorage.setItem(`fazenda_serrinha_${inscricaoId}`, JSON.stringify(dataToSave));
        console.log(`Dados salvos localmente para inscrição ${inscricaoId}`);
    } catch (error) {
        console.warn('Erro ao salvar dados localmente:', error);
    }
}

// Mostrar toast de notificação
function showToast(message, type = 'info') {
    const toastHtml = `
        <div class="toast toast-${type}">
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        </div>
    `;
    
    // Remover toasts existentes
    $('.toast').remove();
    
    // Adicionar novo toast
    $('body').append(toastHtml);
    
    // Auto-remover após 5 segundos
    setTimeout(() => {
        $('.toast').fadeOut(300, function() {
            $(this).remove();
        });
    }, 5000);
}

// Configurar etapa de confirmação
function setupConfirmationStep() {
    // Verificar se há dados salvos para recuperação
    checkForSavedData();
    
    // Configurar botões de ação
    setupConfirmationActions();
}

// Verificar dados salvos
function checkForSavedData() {
    const urlParams = new URLSearchParams(window.location.search);
    const inscricaoId = urlParams.get('inscricao');
    
    if (inscricaoId) {
        const savedData = localStorage.getItem(`fazenda_serrinha_${inscricaoId}`);
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                console.log('Dados recuperados:', data);
                
                // Preencher dados da confirmação
                $('#confirmation-id').text(`#${data.inscricaoId}`);
                $('#confirmation-total').text(data.formData.totais.total);
                $('#confirmation-payment-method').text(data.formData.forma_pagamento.label);
            } catch (error) {
                console.error('Erro ao recuperar dados:', error);
            }
        }
    }
}

// Configurar ações da confirmação
function setupConfirmationActions() {
    // Botão de nova inscrição
    if ($('.new-registration-btn').length === 0) {
        $('.payment-link-btn').after(`
            <button class="btn btn-secondary new-registration-btn" style="margin-top: 20px;">
                Nova Inscrição
            </button>
        `);
    }
    
    $('.new-registration-btn').off('click').on('click', function() {
        // Limpar dados e reiniciar
        clearFormData();
        location.reload();
    });
}

// Limpar dados do formulário
function clearFormData() {
    // Limpar localStorage
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('fazenda_serrinha_')) {
            localStorage.removeItem(key);
        }
    });
    
    // Resetar variáveis globais
    currentEvent = null;
    participants = [];
    currentStep = 1;
    appliedCoupon = null;
    selectedPaymentMethod = null;
    submissionInProgress = false;
    paymentLinkGenerated = false;
    
        console.log('Dados do formulário limpos');
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
        isResponsiblePayer: $participant.find('.responsible-payer').is(':checked'),
        isResponsibleChild: $participant.find('.responsible-child').is(':checked') // Nova propriedade
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

// Atualizar cálculos de um participante específico
function updateParticipantCalculations($participant) {
    if (!window.priceCalculator) return;

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

console.log('Script principal carregado com integração completa');

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
    if (!window.priceCalculator) return;

    // Encontrar índice do participante
    const participantIndex = window.priceCalculator.participants.findIndex(p => p.id === participantId);
    
    if (participantIndex >= 0) {
        // Atualizar participante existente
        window.priceCalculator.participants[participantIndex] = {
            id: participantId,
            ...participantData
        };
    } else {
        // Adicionar novo participante
        window.priceCalculator.participants.push({
            id: participantId,
            ...participantData
        });
    }
}

// Atualizar cálculos de um participante específico
function updateParticipantCalculations($participant) {
    if (!window.priceCalculator) return;

    const participantData = extractParticipantData($participant);
    const participantId = $participant.attr('data-participant-id');
    
    // Atualizar dados do participante no calculador
    updateParticipantInCalculator(participantId, participantData);
    
    // Calcular valores individuais
    const lodgingValue = window.priceCalculator.calculateLodgingValue(participantData);
    const eventValue = window.priceCalculator.calculateEventValue(participantData);
    
    // Atualizar display dos valores
    $participant.find('.lodging-value').text(window.priceCalculator.formatCurrency(lodgingValue));
    $participant.find('.event-value').text(window.priceCalculator.formatCurrency(eventValue));
    
    // Atualizar totais gerais se estivermos na tela de resumo
    if (currentStep === 3) {
        updateSummaryTotals();
    }
    
    console.log(`Cálculos atualizados para participante ${participantId}:`, {
        lodging: lodgingValue,
        event: eventValue
    });
}

// Atualizar todos os cálculos
function updateAllCalculations() {
    if (!window.priceCalculator) return;

    // Atualizar dados de todos os participantes
    $('#participants-container .participant-block').each(function() {
        const $participant = $(this);
        const participantData = extractParticipantData($participant);
        const participantId = $participant.attr('data-participant-id');
        
        updateParticipantInCalculator(participantId, participantData);
        
        // Atualizar displays individuais
        const lodgingValue = window.priceCalculator.calculateLodgingValue(participantData);
        const eventValue = window.priceCalculator.calculateEventValue(participantData);
        
        $participant.find('.lodging-value').text(window.priceCalculator.formatCurrency(lodgingValue));
        $participant.find('.event-value').text(window.priceCalculator.formatCurrency(eventValue));
    });
    
    // Atualizar totais se estivermos na tela de resumo
    if (currentStep === 3) {
        updateSummaryTotals();
    }
}

// Atualizar totais na tela de resumo
function updateSummaryTotals() {
    if (!window.priceCalculator) return;

    const summary = window.priceCalculator.getCalculationSummary();
    
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
    if (!window.priceCalculator) return;

    const validation = window.priceCalculator.validateCoupon(couponCode);
    const $feedback = $('#coupon-feedback');
    
    if (validation.valid) {
        window.priceCalculator.setCoupon(validation.coupon);
        $feedback.text(validation.message).removeClass('error-message').addClass('success-message');
        $('#coupon-code').removeClass('error').addClass('success');
        
        // Atualizar totais
        updateSummaryTotals();
        
        console.log('Cupom aplicado:', validation.coupon);
    } else {
        window.priceCalculator.setCoupon(null);
        
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

// Atualizar método de pagamento (versão corrigida)
function updatePaymentMethod() {
    const selectedId = $('#payment-method').val();
    const forma = currentEvent.formas_pagamento_opcoes.find(f => f.id === selectedId);
    
    if (forma) {
        $('#payment-method-description').text(forma.descricao);
        selectedPaymentMethod = forma;
        
        // Atualizar calculador se disponível
        if (window.priceCalculator && typeof window.priceCalculator.setPaymentMethod === 'function') {
            window.priceCalculator.setPaymentMethod(forma);
        }
        
        // Recalcular totais com nova taxa de gateway
        updateAllCalculations();
    }
}
