// Variáveis globais
let currentEvent = null;
let participants = [];
let currentStep = 1;
let appliedCoupon = null;
let selectedPaymentMethod = null;
let submissionInProgress = false;
let paymentLinkGenerated = false;


// Função debounce para evitar execuções excessivas
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

// Função para rolar suavemente até um elemento e focá-lo
function scrollToAndFocusElement($element) {
    if ($element.length === 0) return;

    // Calcular posição considerando header fixo (se houver)
    const headerHeight = 80; // Ajuste conforme necessário
    const elementTop = $element.offset().top - headerHeight;

    // Rolar suavemente até o elemento
    $('html, body').animate({
        scrollTop: elementTop
    }, 500, function () {
        // Após a animação, focar no elemento
        $element.focus();

        // Para campos select, abrir o dropdown
        if ($element.is('select')) {
            $element.trigger('click');
        }

        // Adicionar efeito visual temporário
        $element.addClass('field-highlight');
        setTimeout(() => {
            $element.removeClass('field-highlight');
        }, 2000);
    });
}

// Inicialização
$(document).ready(function () {
    console.log('Formulário iniciado');
    initializeForm();
});

// Função principal de inicialização
function initializeForm() {
    // Detectar parâmetro de evento na URL
    const urlParams = new URLSearchParams(window.location.search);
    const eventoId = urlParams.get('evento') || 'G001'; // Fallback para G001

    // Inicializar integração com webhooks (SEM testes)
    initializeWebhookIntegration();

    // NOVO: Inicializar validador de CEP
    initializeCEPValidator();

    // NOVO: Inicializar gerenciador de endereço
    initializeAddressManager();

    // Carregar dados do evento APENAS do JSON local
    console.log(`📂 Carregando evento: ${eventoId}`);

    // Mostrar estado de loading
    showLoadingState();

    loadEventFromJSON(eventoId).then(eventoData => {
        if (eventoData) {
            currentEvent = eventoData;
            console.log('📋 Evento carregado do JSON:', currentEvent);

            // Configurar interface com dados do evento
            setupEventInterface();

            // Ocultar loading e mostrar conteúdo
            hideLoadingState();
        } else {
            showErrorState(`Evento ${eventoId} não encontrado`);
        }
    }).catch(error => {
        console.error('❌ Erro ao carregar evento:', error);
        showErrorState(error.message);
    });

    // Configurar event listeners
    setupEventListeners();

    // Configurar máscaras de input
    setupInputMasks();
}

// Função para carregar do JSON local
async function loadEventFromJSON(eventoId) {
    try {
        console.log(`📂 Carregando evento ${eventoId} do arquivo JSON...`);
        const response = await fetch('eventos.json');
        if (!response.ok) {
            throw new Error('Erro ao carregar dados dos eventos');
        }

        const data = await response.json();
        const evento = data.eventos.find(e => e.id === eventoId);

        if (evento) {
            console.log('✅ Evento encontrado:', evento.nome);
        } else {
            console.warn('⚠️ Evento não encontrado:', eventoId);
        }

        return evento;
    } catch (error) {
        console.error('❌ Erro ao carregar JSON local:', error);
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
    $('#start-form-btn').on('click', function () {
        goToStep(2);
    });

    // Botão adicionar participante
    $('#add-participant-btn').on('click', addParticipant);

    // Navegação entre etapas
    $('.back-btn').on('click', function () {
        const currentStepNum = getCurrentStepNumber();
        if (currentStepNum > 1) {
            goToStep(currentStepNum - 1);
        }
    });

    $('.next-btn').on('click', function () {
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
    switch (stepNumber) {
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

    // NOVO: Inicializar campos adultos como ocultos
    const $cpfGroup = $participant.find('.cpf-mask').closest('.form-group');
    const $emailGroup = $participant.find('.email-input').closest('.form-group');
    const $phoneGroup = $participant.find('.phone-input').closest('.form-group');

    $cpfGroup.hide();
    $emailGroup.hide();
    $phoneGroup.hide();

    // Remover obrigatoriedade inicial
    $participant.find('.cpf-mask').removeAttr('required');
    $participant.find('.email-input').removeAttr('required');
    $participant.find('.phone-input').removeAttr('required');

    // Adicionar aos dados
    participants.push({
        id: participantId,
        number: participantNumber,
        data: {},
        element: $participant
    });

    // Atualizar seções de responsáveis (pagamento e criança)
    updateResponsibleSections();

    // NOVA LINHA: Atualizar seção de preferência de cama
    updateBedPreferenceSection();

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

    // Configurar campos de endereço (CEP, logradouro, etc.)
    if (addressManager) {
        addressManager.setupAddressFields($participant);
    } else {
        console.warn('⚠️ addressManager não disponível ainda');
    }
}

// Retorna o label de acomodação com valor total do período (ou por diária como fallback)
function buildAccommodationLabel(acomodacao, numDiarias) {
    const valorDiaria = acomodacao.valor_diaria_por_pessoa;
    if (numDiarias) {
        const total = valorDiaria * numDiarias;
        const totalFormatado = `R$ ${total.toFixed(2).replace('.', ',')}`;
        return `${acomodacao.label} - ${totalFormatado}`;
    }
    const valorFormatado = `R$ ${valorDiaria.toFixed(2).replace('.', ',')}`;
    return `${acomodacao.label} - ${valorFormatado}/diária`;
}

// Atualiza os labels de acomodação quando o período muda
function updateAccommodationLabels($participant, numDiarias) {
    const acomodacoes = currentEvent.tipos_acomodacao;
    if (acomodacoes.length === 1) {
        const label = buildAccommodationLabel(acomodacoes[0], numDiarias);
        $participant.find('.accommodation-info')
            .text(`${label} - ${acomodacoes[0].descricao}`);
    } else {
        $participant.find('.accommodation-select option').each(function () {
            const val = $(this).val();
            if (!val) return;
            const acomodacao = acomodacoes.find(a => String(a.id) === String(val));
            if (acomodacao) $(this).text(buildAccommodationLabel(acomodacao, numDiarias));
        });
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
    const numDiariasInicial = periodos.length === 1 ? periodos[0].num_diarias : null;

    if (acomodacoes.length === 1) {
        // Apenas uma opção - mostrar como texto COM VALOR
        const label = buildAccommodationLabel(acomodacoes[0], numDiariasInicial);
        $accommodationSelect.hide();
        $accommodationInfo.text(`${label} - ${acomodacoes[0].descricao}`).show();
    } else {
        // Múltiplas opções - mostrar dropdown COM VALORES
        $accommodationSelect.empty().append('<option value="">Selecione a acomodação</option>');
        acomodacoes.forEach(acomodacao => {
            const optionLabel = buildAccommodationLabel(acomodacao, numDiariasInicial);
            $accommodationSelect.append(`<option value="${acomodacao.id}">${optionLabel}</option>`);
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
        const selectedPeriodId = $participant.find('.stay-period-select').val();
        if (selectedPeriodId) {
            const periodo = currentEvent.periodos_estadia_opcoes.find(p => p.id === selectedPeriodId);
            if (periodo && periodo.valores_evento_opcoes) {
                eventOptions = periodo.valores_evento_opcoes;
            }
        } else {
            // ✅ NÃO RETORNAR AQUI - apenas deixar eventOptions vazio
            eventOptions = [];
        }
    }

    // ✅ Processar as opções (com valores formatados)
    if (eventOptions.length === 1) {
        // Apenas uma opção - mostrar como texto COM VALOR
        const valorFormatado = `R$ ${eventOptions[0].valor.toFixed(2).replace('.', ',')}`;
        $eventSelect.hide();
        $eventInfo.text(`${eventOptions[0].label} - ${valorFormatado}`).show();
    } else if (eventOptions.length > 1) {
        // Múltiplas opções - mostrar dropdown COM VALORES
        $eventSelect.empty().append('<option value="">Selecione a participação</option>');
        eventOptions.forEach(opcao => {
            const valorFormatado = `R$ ${opcao.valor.toFixed(2).replace('.', ',')}`;
            const optionLabel = `${opcao.label} - ${valorFormatado}`;

            $eventSelect.append(`<option value="${opcao.id}">${optionLabel}</option>`);
        });
        $eventSelect.show();
        $eventInfo.hide();
    }
    // ✅ Se eventOptions.length === 0, não faz nada (campos ficam ocultos até período ser selecionado)
}

// Atualizar informações de check-in/out E refeições
function updateCheckInOutInfo($participant, periodo) {
    if (!periodo || !periodo.data_inicio || !periodo.data_fim) {
        $participant.find('.checkin-datetime').text('');
        $participant.find('.checkout-datetime').text('');
        // Ocultar informações de refeições
        $participant.find('.primeira-refeicao-info').hide();
        $participant.find('.ultima-refeicao-info').hide();
        return;
    }

    // Atualizar datas (código existente)
    const checkinFormatted = formatDateTimeForDisplay(periodo.data_inicio);
    const checkoutFormatted = formatDateTimeForDisplay(periodo.data_fim);

    $participant.find('.checkin-datetime').text(checkinFormatted);
    $participant.find('.checkout-datetime').text(checkoutFormatted);

    // NOVO: Atualizar informações de refeições
    if (periodo.primeira_refeicao) {
        $participant.find('.primeira-refeicao-text').text(periodo.primeira_refeicao);
        $participant.find('.primeira-refeicao-info').show();
    } else {
        $participant.find('.primeira-refeicao-info').hide();
    }

    if (periodo.ultima_refeicao) {
        $participant.find('.ultima-refeicao-text').text(periodo.ultima_refeicao);
        $participant.find('.ultima-refeicao-info').show();
    } else {
        $participant.find('.ultima-refeicao-info').hide();
    }

    console.log('Informações de refeições atualizadas:', {
        primeira: periodo.primeira_refeicao,
        ultima: periodo.ultima_refeicao
    });
}

// Configurar máscaras para participante
function setupParticipantMasks($participant) {
    $participant.find('.cpf-mask').mask('000.000.000-00');
    const $phoneInput = $participant.find('.phone-input');
    applyPhoneMask($phoneInput, 'BR');
}

// NOVA FUNÇÃO: Aplicar máscara de telefone baseada no país
function applyPhoneMask($phoneInput, countryCode) {
    // Remover máscara existente
    $phoneInput.unmask();

    // Aplicar máscara baseada no país
    switch (countryCode) {
        case 'BR':
            $phoneInput.mask('(00) 00000-0000');
            $phoneInput.attr('placeholder', '(11) 99999-9999');
            break;
        case 'US':
        case 'CA':
            $phoneInput.mask('(000) 000-0000');
            $phoneInput.attr('placeholder', '(555) 123-4567');
            break;
        case 'AR':
            $phoneInput.mask('(00) 0000-0000');
            $phoneInput.attr('placeholder', '(11) 1234-5678');
            break;
        case 'CL':
            $phoneInput.mask('0 0000 0000');
            $phoneInput.attr('placeholder', '9 1234 5678');
            break;
        case 'CO':
            $phoneInput.mask('000 000 0000');
            $phoneInput.attr('placeholder', '300 123 4567');
            break;
        case 'PE':
            $phoneInput.mask('000 000 000');
            $phoneInput.attr('placeholder', '987 654 321');
            break;
        case 'UY':
            $phoneInput.mask('0000 0000');
            $phoneInput.attr('placeholder', '9876 5432');
            break;
        case 'PY':
            $phoneInput.mask('000 000 000');
            $phoneInput.attr('placeholder', '987 123 456');
            break;
        case 'BO':
            $phoneInput.mask('0000 0000');
            $phoneInput.attr('placeholder', '7123 4567');
            break;
        case 'EC':
            $phoneInput.mask('00 000 0000');
            $phoneInput.attr('placeholder', '99 123 4567');
            break;
        case 'VE':
            $phoneInput.mask('000-000-0000');
            $phoneInput.attr('placeholder', '412-123-4567');
            break;
        case 'PT':
            $phoneInput.mask('000 000 000');
            $phoneInput.attr('placeholder', '912 345 678');
            break;
        case 'ES':
            $phoneInput.mask('000 00 00 00');
            $phoneInput.attr('placeholder', '612 34 56 78');
            break;
        case 'FR':
            $phoneInput.mask('00 00 00 00 00');
            $phoneInput.attr('placeholder', '06 12 34 56 78');
            break;
        case 'DE':
            $phoneInput.mask('000 00000000');
            $phoneInput.attr('placeholder', '030 12345678');
            break;
        case 'IT':
            $phoneInput.mask('000 000 0000');
            $phoneInput.attr('placeholder', '347 123 4567');
            break;
        case 'GB':
            $phoneInput.mask('00000 000000');
            $phoneInput.attr('placeholder', '07700 123456');
            break;
        default:
            // Sem máscara para países não mapeados
            $phoneInput.attr('placeholder', 'Digite o telefone');
            break;
    }
}

// NOVA FUNÇÃO: Validar telefone baseado no país
function validatePhoneNumber($phoneInput, countryCode) {
    const phoneValue = $phoneInput.val().replace(/\D/g, ''); // Remove caracteres não numéricos

    let isValid = false;
    let minLength = 0;
    let maxLength = 0;

    switch (countryCode) {
        case 'BR':
            minLength = 10;
            maxLength = 11;
            break;
        case 'US':
        case 'CA':
            minLength = 10;
            maxLength = 10;
            break;
        case 'AR':
            minLength = 10;
            maxLength = 11;
            break;
        case 'CL':
            minLength = 8;
            maxLength = 9;
            break;
        case 'CO':
            minLength = 10;
            maxLength = 10;
            break;
        case 'PE':
            minLength = 9;
            maxLength = 9;
            break;
        case 'UY':
            minLength = 8;
            maxLength = 8;
            break;
        case 'PY':
            minLength = 9;
            maxLength = 9;
            break;
        case 'BO':
            minLength = 8;
            maxLength = 8;
            break;
        case 'EC':
            minLength = 9;
            maxLength = 9;
            break;
        case 'VE':
            minLength = 10;
            maxLength = 10;
            break;
        case 'PT':
            minLength = 9;
            maxLength = 9;
            break;
        case 'ES':
            minLength = 9;
            maxLength = 9;
            break;
        case 'FR':
            minLength = 10;
            maxLength = 10;
            break;
        case 'DE':
            minLength = 10;
            maxLength = 12;
            break;
        case 'IT':
            minLength = 9;
            maxLength = 10;
            break;
        case 'GB':
            minLength = 10;
            maxLength = 11;
            break;
        default:
            minLength = 7;
            maxLength = 15;
            break;
    }

    isValid = phoneValue.length >= minLength && phoneValue.length <= maxLength;

    if (isValid) {
        $phoneInput.removeClass('error').addClass('valid');
    } else {
        $phoneInput.addClass('error').removeClass('valid');
    }

    return isValid;
}

// Configurar event listeners para participante (VERSÃO CORRIGIDA)
function setupParticipantEventListeners($participant) {
    // ✅ CRÍTICO: Remover TODOS os listeners antigos primeiro
    $participant.off('.participant');
    $participant.find('*').off('.participant');

    const participantId = $participant.attr('data-participant-id');

    // ========================================
    // EVENTOS QUE NÃO AFETAM CÁLCULOS
    // ========================================

    // Remover participante
    $participant.find('.btn-remove-participant')
        .off('click.participant')
        .on('click.participant', function () {
            removeParticipant($participant);
        });

    // Mudança de país do telefone
    $participant.find('.country-select')
        .off('change.participant')
        .on('change.participant', function () {
            const selectedCountry = $(this).find(':selected').data('country');
            const $phoneInput = $participant.find('.phone-input');

            // Limpar valor atual e aplicar nova máscara
            $phoneInput.val('');
            applyPhoneMask($phoneInput, selectedCountry);

            console.log(`País alterado para: ${selectedCountry}`);
        });

    // Listener para gênero
    $participant.find('.gender-select')
        .off('change.participant')
        .on('change.participant', function () {
            const selectedGender = $(this).val();
            console.log(`Gênero alterado: ${selectedGender}`);

            // Remover classe de erro se havia
            $(this).removeClass('error');
        });

    // Responsável pelo pagamento
    $participant.find('.responsible-payer')
        .off('change.participant')
        .on('change.participant', function () {
            if ($(this).is(':checked')) {
                $('.responsible-payer').not(this).prop('checked', false);
            }
        });

    // Responsável pela criança
    $participant.find('.responsible-child')
        .off('change.participant')
        .on('change.participant', function () {
            if ($(this).is(':checked')) {
                $('.responsible-child').not(this).prop('checked', false);
            }
        });

    // Preferência de cama
    $participant.find('.bed-preference-select')
        .off('change.participant')
        .on('change.participant', function () {
            const selectedPreference = $(this).val();
            console.log(`Preferência de cama alterada: ${selectedPreference}`);
        });

    // ========================================
    // VALIDAÇÕES (SEM CÁLCULO)
    // ========================================

    // Validação de telefone
    $participant.find('.phone-input')
        .off('blur.participant')
        .on('blur.participant', function () {
            const selectedCountry = $participant.find('.country-select').find(':selected').data('country');
            validatePhoneNumber($(this), selectedCountry);
        });

    // Validação de CPF
    $participant.find('.cpf-mask')
        .off('blur.participant')
        .on('blur.participant', function () {
            validateCPF($(this));
        });

    // Validação de email (blur)
    $participant.find('.email-input')
        .off('blur.participant')
        .on('blur.participant', function () {
            validateEmail($(this));
        });

    // Validação de email em tempo real (input com debounce)
    $participant.find('.email-input')
        .off('input.participant')
        .on('input.participant', debounce(function () {
            const email = $(this).val().trim();
            if (email.length > 0) {
                validateEmail($(this));
            } else {
                $(this).removeClass('error valid');
            }
        }, 500));

    // ========================================
    // EVENTOS QUE AFETAM CÁLCULOS (COM DEBOUNCE)
    // ========================================

    // Data de nascimento - CRÍTICO para cálculos
    $participant.find('.dob-input')
        .off('change.participant')
        .on('change.participant', function () {
            const $p = $(this).closest('.participant-block');
            const birthDate = $(this).val();

            // Atualizar visibilidade de campos
            toggleAdultFields($p, birthDate);
            updateResponsibleSections();
            updateBedPreferenceSection();

            // ✅ DEBOUNCE: Aguardar 300ms antes de calcular
            clearTimeout($p.data('dobTimer'));
            const timer = setTimeout(() => {
                updateParticipantCalculations($p);
            }, 300);
            $p.data('dobTimer', timer);
        });

    // Acomodação - afeta cálculos E visibilidade
    $participant.find('.accommodation-select')
        .off('change.participant')
        .on('change.participant', function () {
            const $p = $(this).closest('.participant-block');
            const $childDiscountInfo = $p.find('.child-discount-info');
            const dob = $p.find('.dob-input').val();

            // Atualizar visibilidade de info de desconto
            if (dob && $(this).val()) {
                const age = window.priceCalculator ? window.priceCalculator.calculateAge(dob) : calculateAge(dob);

                if (age < 12) {
                    $childDiscountInfo.show();
                } else {
                    $childDiscountInfo.hide();
                }
            }

            // ✅ DEBOUNCE: Aguardar 300ms antes de calcular
            clearTimeout($p.data('accommodationTimer'));
            const timer = setTimeout(() => {
                updateParticipantCalculations($p);
            }, 300);
            $p.data('accommodationTimer', timer);
        });

    // Período de estadia - afeta opções de evento E cálculos
    $participant.find('.stay-period-select')
        .off('change.participant')
        .on('change.participant', function () {
            const $p = $(this).closest('.participant-block');
            const selectedPeriodId = $(this).val();
            const periodoSelecionado = currentEvent.periodos_estadia_opcoes
                .find(p => String(p.id) === String(selectedPeriodId));

            // Atualizar informações de check-in/out
            if (periodoSelecionado) {
                updateCheckInOutInfo($p, periodoSelecionado);
            } else {
                $p.find('.checkin-datetime').text('');
                $p.find('.checkout-datetime').text('');
            }

            // Atualizar labels de acomodação com valor total do período
            if (periodoSelecionado && periodoSelecionado.num_diarias) {
                updateAccommodationLabels($p, periodoSelecionado.num_diarias);
            }

            // Atualizar opções de evento disponíveis
            updateEventOptionsForPeriod($p);

            // ✅ DEBOUNCE: Aguardar 300ms antes de calcular
            clearTimeout($p.data('periodTimer'));
            const timer = setTimeout(() => {
                updateParticipantCalculations($p);
            }, 300);
            $p.data('periodTimer', timer);
        });

    // Opção de evento - afeta cálculos
    $participant.find('.event-option-select')
        .off('change.participant')
        .on('change.participant', function () {
            const $p = $(this).closest('.participant-block');

            // ✅ DEBOUNCE: Aguardar 300ms antes de calcular
            clearTimeout($p.data('eventTimer'));
            const timer = setTimeout(() => {
                updateParticipantCalculations($p);
            }, 300);
            $p.data('eventTimer', timer);
        });

    // ========================================
    // CAMPOS DE TEXTO (SEM CÁLCULO IMEDIATO)
    // ========================================

    // Nome, telefone - apenas para coleta de dados
    $participant.find('.full-name, .phone-mask')
        .off('change.participant blur.participant')
        .on('blur.participant', function () {
            // Apenas validação visual, sem recálculo
            const value = $(this).val().trim();
            if (value.length === 0) {
                $(this).addClass('error');
            } else {
                $(this).removeClass('error');
            }
        });

    // ========================================
    // CONFIGURAÇÃO DE ENDEREÇO
    // ========================================

    if (typeof addressManager !== 'undefined' && addressManager) {
        addressManager.setupAddressFields($participant);
    }

    console.log(`✅ Event listeners configurados para ${participantId}`);
}

// NOVA FUNÇÃO: Controlar visibilidade dos campos baseado na idade
function toggleAdultFields($participant, birthDate) {
    const $cpfField = $participant.find('.cpf-mask');
    const $emailField = $participant.find('.email-input');
    const $phoneField = $participant.find('.phone-input');
    const $countrySelect = $participant.find('.country-select');
    const $genderField = $participant.find('.gender-select');

    // Elementos containers dos campos
    const $cpfGroup = $cpfField.closest('.form-group');
    const $emailGroup = $emailField.closest('.form-group');
    const $phoneGroup = $phoneField.closest('.form-group');

    if (!birthDate) {
        // Se não há data de nascimento, ocultar todos os campos adultos
        $cpfGroup.hide();
        $emailGroup.hide();
        $phoneGroup.hide();

        // Remover obrigatoriedade e limpar valores
        $cpfField.removeAttr('required').val('').removeClass('error valid');
        $emailField.removeAttr('required').val('').removeClass('error valid');
        $phoneField.removeAttr('required').val('').removeClass('error valid');
        $countrySelect.val('+55'); // Reset para Brasil

        console.log('Campos adultos ocultados - sem data de nascimento');
        return;
    }

    const age = calculateAge(birthDate);

    if (age !== null && age > 10) {
        // Pessoa com mais de 10 anos - mostrar e tornar obrigatórios
        $cpfGroup.show();
        $emailGroup.show();
        $phoneGroup.show();

        $cpfField.attr('required', true);
        $emailField.attr('required', true);
        $phoneField.attr('required', true);

        console.log(`Campos adultos exibidos para idade: ${age} anos`);
    } else {
        // Pessoa com 10 anos ou menos - ocultar e remover obrigatoriedade
        $cpfGroup.hide();
        $emailGroup.hide();
        $phoneGroup.hide();

        // Remover obrigatoriedade e limpar valores
        $cpfField.removeAttr('required').val('').removeClass('error valid');
        $emailField.removeAttr('required').val('').removeClass('error valid');
        $phoneField.removeAttr('required').val('').removeClass('error valid');
        $countrySelect.val('+55'); // Reset para Brasil

        console.log(`Campos adultos ocultados para idade: ${age} anos`);
    }
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

    // **CORREÇÃO**: Atualizar todos os cálculos após remoção
    updateAllCalculations();

    // Atualizar seções de responsáveis (pagamento e criança)
    updateResponsibleSections();

    // NOVA LINHA: Atualizar seção de preferência de cama
    updateBedPreferenceSection();

    console.log(`Participante ${participantId} removido`);
}

// Renumerar participantes
function renumberParticipants() {
    $('#participants-container .participant-block').each(function (index) {
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
    $('#participants-container .participant-block').each(function () {
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
        if (participants.length > 1 && !isMinor && birthDate) { // ADICIONADO: && birthDate
            $section.show();
        } else {
            $section.hide();
            // Limpar seleção se este participante era responsável
            $participant.find('.responsible-payer').prop('checked', false);
        }
    });

    // Se só há um participante adulto, ele é automaticamente o responsável
    const adultParticipants = $('#participants-container .participant-block').filter(function () {
        const birthDate = $(this).find('.dob-input').val();
        if (!birthDate) return false; // CORRIGIDO: Não considera adulto se não há data

        const age = calculateAge(birthDate);
        return age !== null && age >= 18; // CORRIGIDO: Só adultos com data válida
    });

    if (adultParticipants.length === 1) {
        adultParticipants.find('.responsible-payer').prop('checked', true);
    }
}

// NOVA FUNÇÃO: Verificar se há múltiplos adultos
function hasMultipleAdults() {
    let adultCount = 0;

    $('#participants-container .participant-block').each(function () {
        const $participant = $(this);
        const birthDate = $participant.find('.dob-input').val();

        // CORREÇÃO: Só considera adulto se há data de nascimento E idade >= 18
        if (birthDate) {
            const age = calculateAge(birthDate);
            if (age !== null && age >= 18) {
                adultCount++;
            }
        }
        // REMOVIDO: Não considera mais participantes sem data como adultos automaticamente
    });

    console.log(`🔍 DEBUG hasMultipleAdults: ${adultCount} adultos encontrados`);
    return adultCount > 1;
}

// NOVA FUNÇÃO: Atualizar seção de preferência de cama
function updateBedPreferenceSection() {
    const showBedPreference = hasMultipleAdults();

    $('#participants-container .participant-block').each(function () {
        const $participant = $(this);
        const $bedSection = $participant.find('.bed-preference-section');
        const birthDate = $participant.find('.dob-input').val();

        // Verificar se este participante é adulto
        let isAdult = false; // CORRIGIDO: Padrão false
        if (birthDate) {
            const age = calculateAge(birthDate);
            isAdult = (age !== null && age >= 18); // CORRIGIDO: Só adulto com data válida
        }

        // Mostrar seção apenas para adultos quando há múltiplos adultos
        if (showBedPreference && isAdult) {
            $bedSection.show();
        } else {
            $bedSection.hide();
            // Limpar seleção quando ocultar
            $participant.find('.bed-preference-select').val('');
        }
    });

    console.log(`Preferência de cama ${showBedPreference ? 'habilitada' : 'desabilitada'} - Adultos: ${$('#participants-container .participant-block').filter(function () {
        const birthDate = $(this).find('.dob-input').val();
        if (!birthDate) return false; // CORRIGIDO
        const age = calculateAge(birthDate);
        return age !== null && age >= 18;
    }).length}`);
}

// Atualizar opções de evento baseado no período selecionado
function updateEventOptionsForPeriod($participant) {
    if (currentEvent.tipo_formulario !== 'hospedagem_e_evento') return;

    const selectedPeriodId = $participant.find('.stay-period-select').val();
    if (!selectedPeriodId) return;

    const periodo = currentEvent.periodos_estadia_opcoes.find(p => p.id === selectedPeriodId);

    const $eventSelect = $participant.find('.event-option-select');
    const $eventInfo = $participant.find('.event-option-info');
    const eventOptions = periodo.valores_evento_opcoes;

    if (eventOptions.length === 1) {
        // Apenas uma opção - mostrar como texto COM VALOR
        const valorFormatado = `R$ ${eventOptions[0].valor.toFixed(2).replace('.', ',')}`;
        $eventSelect.hide();
        $eventInfo.text(`${eventOptions[0].label} - ${valorFormatado}`).show();
    } else {
        // Múltiplas opções - mostrar dropdown COM VALORES
        $eventSelect.empty().append('<option value="">Selecione a participação</option>');
        eventOptions.forEach(opcao => {
            const valorFormatado = `R$ ${opcao.valor.toFixed(2).replace('.', ',')}`;
            const optionLabel = `${opcao.label} - ${valorFormatado}`;

            $eventSelect.append(`<option value="${opcao.id}">${optionLabel}</option>`);
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
    switch (currentStep) {
        case 2:
            return validateParticipantsStep();
        case 3:
            return validateSummaryStep();
        default:
            return true;
    }
}

// Função para validar email
function validateEmail($emailField) {
    const email = $emailField.val().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
        $emailField.addClass('error').removeClass('valid');
        return false;
    }

    if (!emailRegex.test(email)) {
        $emailField.addClass('error').removeClass('valid');
        return false;
    }

    $emailField.removeClass('error').addClass('valid');
    return true;
}

// Validar etapa de participantes
function validateParticipantsStep() {
    let isValid = true;
    let firstErrorField = null;

    // Validar cada participante
    $('#participants-container .participant-block').each(function () {
        const $participant = $(this);

        // Campos sempre obrigatórios
        const alwaysRequiredFields = [
            { selector: '.full-name', name: 'Nome Completo' },
            { selector: '.dob-input', name: 'Data de Nascimento' }
        ];

        // Campos condicionalmente obrigatórios (apenas se visíveis)
        const conditionalFields = [
            { selector: '.phone-input', name: 'Telefone' },
            { selector: '.cpf-mask', name: 'CPF' },
            { selector: '.email-input', name: 'E-mail' }
        ];

        // Validar campos sempre obrigatórios
        alwaysRequiredFields.forEach(field => {
            const $field = $participant.find(field.selector);
            if (!$field.val().trim()) {
                $field.addClass('error');
                if (!firstErrorField) {
                    firstErrorField = $field;
                }
                isValid = false;
            } else {
                $field.removeClass('error');
            }
        });

        // Validar campos condicionalmente obrigatórios (apenas se visíveis)
        conditionalFields.forEach(field => {
            const $field = $participant.find(field.selector);
            const $fieldGroup = $field.closest('.form-group');

            // Só validar se o campo estiver visível
            if ($fieldGroup.is(':visible')) {
                if (!$field.val().trim()) {
                    $field.addClass('error');
                    if (!firstErrorField) {
                        firstErrorField = $field;
                    }
                    isValid = false;
                } else {
                    $field.removeClass('error');
                }
            }
        });

        // Validar gênero (sempre obrigatório)
        const $genderField = $participant.find('.gender-select');
        if (!$genderField.val()) {
            $genderField.addClass('error');
            if (!firstErrorField) {
                firstErrorField = $genderField;
            }
            isValid = false;
        } else {
            $genderField.removeClass('error');
        }

        // Validações específicas apenas para campos visíveis
        const $cpfField = $participant.find('.cpf-mask');
        if ($cpfField.closest('.form-group').is(':visible') && !validateCPF($cpfField)) {
            if (!firstErrorField) {
                firstErrorField = $cpfField;
            }
            isValid = false;
        }

        const $emailField = $participant.find('.email-input');
        if ($emailField.closest('.form-group').is(':visible') && !validateEmail($emailField)) {
            if (!firstErrorField) {
                firstErrorField = $emailField;
            }
            isValid = false;
        }

        const $phoneField = $participant.find('.phone-input');
        if ($phoneField.closest('.form-group').is(':visible')) {
            const selectedCountry = $participant.find('.country-select').find(':selected').data('country');
            if (!validatePhoneNumber($phoneField, selectedCountry)) {
                if (!firstErrorField) {
                    firstErrorField = $phoneField;
                }
                isValid = false;
            }
        }

        // NOVA VALIDAÇÃO: Preferência de cama (se visível)
        const $bedPreferenceSection = $participant.find('.bed-preference-section');
        const $bedPreferenceField = $participant.find('.bed-preference-select');

        if ($bedPreferenceSection.is(':visible') && !$bedPreferenceField.val()) {
            $bedPreferenceField.addClass('error');
            if (!firstErrorField) {
                firstErrorField = $bedPreferenceField;
            }
            isValid = false;
        } else {
            $bedPreferenceField.removeClass('error');
        }

        // Validar seleções baseadas no tipo de formulário
        if (currentEvent.tipo_formulario === 'hospedagem_apenas' || currentEvent.tipo_formulario === 'hospedagem_e_evento') {
            const $stayPeriod = $participant.find('.stay-period-select');
            const $accommodation = $participant.find('.accommodation-select');

            if ($stayPeriod.is(':visible') && !$stayPeriod.val()) {
                $stayPeriod.addClass('error');
                if (!firstErrorField) {
                    firstErrorField = $stayPeriod;
                }
                isValid = false;
            } else {
                $stayPeriod.removeClass('error');
            }

            if ($accommodation.is(':visible') && !$accommodation.val()) {
                $accommodation.addClass('error');
                if (!firstErrorField) {
                    firstErrorField = $accommodation;
                }
                isValid = false;
            } else {
                $accommodation.removeClass('error');
            }
        }

        if (currentEvent.tipo_formulario === 'evento_apenas' || currentEvent.tipo_formulario === 'hospedagem_e_evento') {
            const $eventOption = $participant.find('.event-option-select');

            if ($eventOption.is(':visible') && !$eventOption.val()) {
                $eventOption.addClass('error');
                if (!firstErrorField) {
                    firstErrorField = $eventOption;
                }
                isValid = false;
            } else {
                $eventOption.removeClass('error');
            }
        }
    });

    // NOVO: Validar endereço do responsável pelo pagamento
    const $responsiblePayer = $('.responsible-payer:checked').closest('.participant-block');
    let $payerParticipant = $responsiblePayer.length > 0 ? $responsiblePayer : $('#participants-container .participant-block').first();

    if ($payerParticipant.length > 0 && addressManager) {
        const addressValidation = addressManager.validateAddressFields($payerParticipant);

        if (!addressValidation.isValid) {
            isValid = false;
            if (!firstErrorField) {
                firstErrorField = addressValidation.firstErrorField;
            }
        }
    }


    // Validar responsável pelo pagamento se múltiplos participantes
    if (participants.length > 1) {
        const hasResponsible = $('.responsible-payer:checked').length > 0;
        if (!hasResponsible) {
            const $firstResponsibleCheckbox = $('.responsible-payer-section:visible').first().find('.responsible-payer');
            if ($firstResponsibleCheckbox.length > 0 && !firstErrorField) {
                firstErrorField = $firstResponsibleCheckbox;
            }
            isValid = false;
        }
    }

    // Validar responsável pela criança se houver menores
    if (hasMinors()) {
        const hasResponsibleChild = $('.responsible-child:checked').length > 0;
        if (!hasResponsibleChild) {
            const $firstResponsibleChildCheckbox = $('.responsible-child-section:visible').first().find('.responsible-child');
            if ($firstResponsibleChildCheckbox.length > 0 && !firstErrorField) {
                firstErrorField = $firstResponsibleChildCheckbox;
            }
            isValid = false;
        }
    }

    // Se há erro, rolar até o primeiro campo com problema
    if (!isValid && firstErrorField) {
        scrollToAndFocusElement(firstErrorField);
        showValidationMessage(firstErrorField);
    }

    return isValid;
}

// Validar etapa de resumo
function validateSummaryStep() {
    let firstErrorField = null;

    // Verificar se forma de pagamento foi selecionada
    if (!selectedPaymentMethod) {
        const $paymentField = $('#payment-method');
        $paymentField.addClass('error');
        firstErrorField = $paymentField;
    } else {
        $('#payment-method').removeClass('error');
    }

    // Verificar se termos foram aceitos
    if (!$('#terms-conditions').is(':checked')) {
        const $termsField = $('#terms-conditions');
        if (!firstErrorField) {
            firstErrorField = $termsField.closest('.terms-section');
        }
    }

    // Se há erro, rolar até o primeiro campo com problema
    if (firstErrorField) {
        scrollToAndFocusElement(firstErrorField);
        showValidationMessage(firstErrorField);
        return false;
    }

    return true;
}

// Função simplificada para mostrar feedback visual de validação
function showValidationMessage($field) {
    // Adicionar classe de erro visual aos containers pais quando necessário
    if ($field.hasClass('responsible-payer')) {
        $field.closest('.responsible-payer-section').addClass('error');
    } else if ($field.hasClass('responsible-child')) {
        $field.closest('.responsible-child-section').addClass('error');
    } else if ($field.closest('.terms-section').length > 0) {
        $field.closest('.terms-section').addClass('error');
    }

    // Log específico para diferentes tipos de erro (opcional, para debug)
    if ($field.hasClass('email-input')) {
        console.log('Email inválido detectado:', $field.val());
    }

    // Remover classes de erro após alguns segundos
    setTimeout(() => {
        $('.responsible-payer-section, .responsible-child-section, .terms-section').removeClass('error');
    }, 3000);
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

// FUNÇÃO SIMPLIFICADA: Carregar descrição da forma de pagamento selecionada
function loadCancellationPolicy() {
    const $policySection = $('#cancellation-policy-section');
    const $policyContent = $policySection.find('.policy-content');

    // Verificar se há uma forma de pagamento selecionada
    if (selectedPaymentMethod && selectedPaymentMethod.descricao) {
        // Usar a descrição da forma de pagamento selecionada (qualquer conteúdo)
        const descricaoSelecionada = selectedPaymentMethod.descricao;

        // Adicionar classe específica para política
        $policySection.addClass('policy-section');

        // Usar .html() porque a descrição pode conter tags HTML
        $policyContent.html(descricaoSelecionada);
        $policySection.show();

        console.log('Descrição carregada da forma de pagamento selecionada:', selectedPaymentMethod.label);
    } else {
        // Se não há forma de pagamento selecionada, ocultar a seção
        $policySection.hide();
        $policyContent.empty();
        console.log('Nenhuma forma de pagamento selecionada ainda');
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

    $('#participants-container .participant-block').each(function () {
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
    $('#participants-container .participant-block').each(function () {
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
        $('#participants-container .participant-block').each(function () {
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
    updateAddressSection();
}

// NOVA FUNÇÃO: Atualizar visibilidade da seção de endereço
function updateAddressSection() {
    // Ocultar todas as seções de endereço primeiro
    $('.address-section').hide();
    $('.address-section .form-control').removeAttr('required');

    // Encontrar o responsável pelo pagamento
    const $responsiblePayer = $('.responsible-payer:checked').closest('.participant-block');

    if ($responsiblePayer.length > 0) {
        // Mostrar seção de endereço para o responsável
        const $addressSection = $responsiblePayer.find('.address-section');
        $addressSection.show();

        // Tornar campos obrigatórios (exceto complemento)
        $addressSection.find('.cep-input, .logradouro-input, .numero-input, .bairro-input, .cidade-input, .estado-select')
            .attr('required', true);

        // ✨ ADICIONE A CORREÇÃO AQUI ✨
        if (addressManager) {
            addressManager.setupAddressFields($responsiblePayer);
        }

        console.log('📍 Seção de endereço habilitada para o responsável pelo pagamento');
    } else if (participants.length === 1) {
        // Se há apenas um participante, ele é o responsável
        const $singleParticipant = $('#participants-container .participant-block').first();
        const $addressSection = $singleParticipant.find('.address-section');
        $addressSection.show();

        // Tornar campos obrigatórios
        $addressSection.find('.cep-input, .logradouro-input, .numero-input, .bairro-input, .cidade-input, .estado-select')
            .attr('required', true);

        // ✨ ADICIONE A CORREÇÃO AQUI TAMBÉM ✨
        if (addressManager) {
            addressManager.setupAddressFields($singleParticipant);
        }

        console.log('📍 Seção de endereço habilitada para o único participante');
    }
}


// Gerar resumo dos participantes
function generateParticipantsSummary() {
    const $summaryContent = $('#summary-content');
    let summaryHtml = '';

    // **IMPORTANTE**: Atualizar dados do calculador antes de gerar o resumo
    updateAllCalculations();

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
        console.log('🔍 DEBUG Responsável Pagamento:', responsiblePayerData);

        summaryHtml += `
            <div class="responsible-payer-summary">
                <h3>Responsável pelo Pagamento</h3>
                <div class="payer-info">
                    <p><strong>Nome:</strong> ${responsiblePayerData.fullName}</p>
        `;

        // CORRIGIDO: Só mostrar campos se eles têm valor
        if (responsiblePayerData.cpf && responsiblePayerData.cpf.trim()) {
            summaryHtml += `<p><strong>CPF:</strong> ${responsiblePayerData.cpf}</p>`;
        }
        if (responsiblePayerData.email && responsiblePayerData.email.trim()) {
            summaryHtml += `<p><strong>Email:</strong> ${responsiblePayerData.email}</p>`;
        }
        if (responsiblePayerData.phone && responsiblePayerData.phone.trim()) {
            summaryHtml += `<p><strong>Telefone:</strong> ${responsiblePayerData.phone}</p>`;
        }

        summaryHtml += `
                </div>
            </div>
        `;
    }

    // ✅ ADICIONE ESTA SEÇÃO DE ENDEREÇO AQUI (SUBSTITUA O BLOCO ANTIGO):
    if (responsiblePayerData && $responsiblePayer.length > 0) {
        // Extrair dados de endereço
        const cep = $responsiblePayer.find('.cep-input').val();
        const logradouro = $responsiblePayer.find('.logradouro-input').val();
        const numero = $responsiblePayer.find('.numero-input').val();
        const complemento = $responsiblePayer.find('.complemento-input').val();
        const bairro = $responsiblePayer.find('.bairro-input').val();
        const cidade = $responsiblePayer.find('.cidade-input').val();
        const estado = $responsiblePayer.find('.estado-select').val();

        // Verificar se há dados de endereço preenchidos
        if (cep && logradouro) {
            summaryHtml += `
                    <div class="address-summary">
                        <h3>Endereço do Responsável</h3>
                        <div class="address-info">
                            <p><strong>Logradouro:</strong> ${logradouro}</p>
                            <p><strong>Número:</strong> ${numero}</p>
                            <p><strong>Complemento:</strong> ${complemento}</p>
                            <p><strong>CEP:</strong> ${cep}</p>
                            <p><strong>Bairro:</strong> ${bairro}</p>
                            <p><strong>Cidade:</strong> ${cidade}</p>
                            <p><strong>Estado:</strong> ${estado}</p>
                        </div>
                    </div>
                `;
        }
    }

    // Seção do responsável pela criança
    if (hasMinors()) {
        const $responsibleChild = $('.responsible-child:checked').closest('.participant-block');
        let responsibleChildData = null;

        if ($responsibleChild.length > 0) {
            responsibleChildData = extractParticipantData($responsibleChild);
            console.log('🔍 DEBUG Responsável Criança:', responsibleChildData);

            summaryHtml += `
                <div class="responsible-payer-summary">
                    <h3>Responsável pela Criança</h3>
                    <div class="payer-info">
                        <p><strong>Nome:</strong> ${responsibleChildData.fullName}</p>
            `;

            // CORRIGIDO: Só mostrar campos se eles têm valor
            if (responsibleChildData.cpf && responsibleChildData.cpf.trim()) {
                summaryHtml += `<p><strong>CPF:</strong> ${responsibleChildData.cpf}</p>`;
            }
            if (responsibleChildData.email && responsibleChildData.email.trim()) {
                summaryHtml += `<p><strong>Email:</strong> ${responsibleChildData.email}</p>`;
            }
            if (responsibleChildData.phone && responsibleChildData.phone.trim()) {
                summaryHtml += `<p><strong>Telefone:</strong> ${responsibleChildData.phone}</p>`;
            }

            summaryHtml += `
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

    $('#participants-container .participant-block').each(function (index) {
        const $participant = $(this);
        const participantData = extractParticipantData($participant);
        const participantNumber = index + 1;

        console.log(`🔍 DEBUG Participante ${participantNumber}:`, participantData);

        // **CORREÇÃO**: Buscar valores do calculador usando o ID correto
        const participantId = $participant.attr('data-participant-id');
        const calculatorParticipant = window.priceCalculator.participants.find(p => p.id === participantId);

        let lodgingValue = 0;
        let eventValue = 0;

        if (calculatorParticipant) {
            // Usar dados do calculador que já foram processados
            lodgingValue = window.priceCalculator.calculateLodgingValue(calculatorParticipant);
            eventValue = window.priceCalculator.calculateEventValue(calculatorParticipant);
        } else {
            // Fallback: calcular diretamente
            lodgingValue = window.priceCalculator.calculateLodgingValue(participantData);
            eventValue = window.priceCalculator.calculateEventValue(participantData);
        }

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

        // Função para formatar o gênero para exibição
        function formatGenderForDisplay(gender) {
            const genderLabels = {
                'masculino': 'Masculino',
                'feminino': 'Feminino',
                'nao-binario': 'Não-binário',
                'prefiro-nao-informar': 'Prefiro não informar'
            };
            return genderLabels[gender] || gender;
        }

        summaryHtml += `
            <div class="participant-summary-item">
                <h4>Participante ${participantNumber}: ${participantData.fullName}</h4>
                <div class="participant-details">
                <p><strong>Gênero:</strong> ${formatGenderForDisplay(participantData.gender)}</p>
        `;

        // CORRIGIDO: Só mostrar dados pessoais se existirem E tiverem valor
        if (participantData.cpf && participantData.cpf.trim()) {
            summaryHtml += `<p><strong>CPF:</strong> ${participantData.cpf}</p>`;
        }
        if (participantData.email && participantData.email.trim()) {
            summaryHtml += `<p><strong>Email:</strong> ${participantData.email}</p>`;
        }
        if (participantData.phone && participantData.phone.trim()) {
            summaryHtml += `<p><strong>Telefone:</strong> ${participantData.phone}</p>`;
        }

        // Resto do código permanece igual...
        // Mostrar detalhes baseado no tipo de formulário
        if (currentEvent.tipo_formulario === 'hospedagem_apenas' || currentEvent.tipo_formulario === 'hospedagem_e_evento') {
            // **CORREÇÃO**: Adicionar informação sobre gratuidade/desconto
            let lodgingInfo = '';
            if (lodgingValue === 0) {
                lodgingInfo = ' <span class="free-indicator">(Gratuito)</span>';
            } else {
                // Verificar se está aplicando regra de excedente
                const age = window.priceCalculator.calculateAge(participantData.birthDate);
                if (age >= 0 && age <= 4 && window.priceCalculator.shouldApplyExcessRule(participantData, 'hospedagem')) {
                    lodgingInfo = ' <span class="discount-indicator">(50% - Excedente)</span>';
                }
            }

            // NOVA SEÇÃO: Mostrar preferência de cama se foi selecionada
            if (participantData.bedPreference) {
                const bedPreferenceLabel = participantData.bedPreference === 'casal' ? 'Cama de Casal' : 'Cama de Solteiro';
                summaryHtml += `<p><strong>Preferência de Cama:</strong> ${bedPreferenceLabel}</p>`;
            }

            // NOVO: Buscar informações de refeições do período selecionado
            let refeicoesInfo = '';
            if (participantData.stayPeriod) {
                const selectedPeriod = currentEvent.periodos_estadia_opcoes.find(p => p.id === participantData.stayPeriod);
                if (selectedPeriod) {
                    if (selectedPeriod.primeira_refeicao) {
                        refeicoesInfo += `<p><strong>Primeira Refeição:</strong> ${selectedPeriod.primeira_refeicao}</p>`;
                    }
                    if (selectedPeriod.ultima_refeicao) {
                        refeicoesInfo += `<p><strong>Última Refeição:</strong> ${selectedPeriod.ultima_refeicao}</p>`;
                    }
                }
            }

            summaryHtml += `
                <p><strong>Hospedagem:</strong> ${accommodationLabel}</p>
                ${checkinInfo ? `<p><strong>Check-in:</strong> ${checkinInfo}</p>` : ''}
                ${checkoutInfo ? `<p><strong>Check-out:</strong> ${checkoutInfo}</p>` : ''}
                ${refeicoesInfo}
                <p><strong>Valor da Hospedagem:</strong> ${window.priceCalculator.formatCurrency(lodgingValue)}${lodgingInfo}</p>
            `;
        }

        if (currentEvent.tipo_formulario === 'evento_apenas' || currentEvent.tipo_formulario === 'hospedagem_e_evento') {
            // **CORREÇÃO**: Adicionar informação sobre gratuidade/desconto
            let eventInfo = '';
            if (eventValue === 0) {
                eventInfo = ' <span class="free-indicator">(Gratuito)</span>';
            } else {
                // Verificar se está aplicando regra de excedente
                const age = window.priceCalculator.calculateAge(participantData.birthDate);
                if (age >= 0 && age <= 4 && window.priceCalculator.shouldApplyExcessRule(participantData, 'evento')) {
                    eventInfo = ' <span class="discount-indicator">(50% - Excedente)</span>';
                }
            }

            summaryHtml += `
                <p><strong>Evento:</strong> ${eventOptionLabel}</p>
                <p><strong>Valor do Evento:</strong> ${window.priceCalculator.formatCurrency(eventValue)}${eventInfo}</p>
            `;
        }

        // NOVA SEÇÃO: Adicionar restrições se preenchidas
        if (participantData.restrictions && participantData.restrictions.length > 0) {
            summaryHtml += `<p><strong>Restrições/Observações:</strong> ${participantData.restrictions}</p>`;
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
        console.log('=== INICIANDO SUBMISSÃO ===');

        // Mostrar estado de carregamento
        showSubmissionLoading();

        // Gerar ID único da inscrição
        const inscricaoId = generateInscricaoId();

        // Preparar dados para envio
        const formData = prepareFormData(inscricaoId);

        console.log('📦 Dados preparados para webhook:', formData);

        let submissionResult = null;

        if (webhookIntegration) {
            console.log('📡 Enviando para webhook...');
            submissionResult = await webhookIntegration.submitForm(formData);
        } else {
            console.log('⚠️ Webhook não inicializado, usando modo offline...');
            submissionResult = await simulateOfflineSubmission(formData);
        }

        console.log('📨 Resultado da submissão:', submissionResult);

        if (submissionResult.success) {
            console.log('✅ Formulário enviado com sucesso');

            // Verificar se recebeu link de pagamento
            if (submissionResult.data && submissionResult.data.link) {
                console.log('💳 Link de pagamento recebido:', submissionResult.data.link);
            } else {
                console.warn('⚠️ Link de pagamento não encontrado na resposta');
            }

            // Ir para tela de confirmação
            showConfirmation(inscricaoId, formData, submissionResult.data);
        } else {
            throw new Error(submissionResult.error || 'Erro desconhecido no envio');
        }

    } catch (error) {
        console.error('💥 Erro na submissão:', error);
        showSubmissionError(error.message);
    } finally {
        submissionInProgress = false;
        hideSubmissionLoading();
    }
}

// Mostrar estado de carregamento da submissão
function showSubmissionLoading() {
    $('.submission-overlay').fadeIn(300);

    // Simular progresso nas etapas
    setTimeout(() => {
        $('#step-sending').removeClass('active').addClass('completed');
        $('#step-sending .step-icon').text('✅');
        $('#step-processing').addClass('active');
    }, 2000);

    setTimeout(() => {
        $('#step-processing').removeClass('active').addClass('completed');
        $('#step-processing .step-icon').text('✅');
        $('#step-finalizing').addClass('active');
    }, 15000); // 15 segundos depois
}

// Ocultar estado de carregamento da submissão
function hideSubmissionLoading() {
    $('.submission-overlay').fadeOut(300);

    // Resetar etapas para a próxima vez
    setTimeout(() => {
        $('.processing-step').removeClass('active completed');
        $('#step-sending').addClass('active');
        $('#step-sending .step-icon').text('🔄');
        $('#step-processing .step-icon').text('⚙️');
        $('#step-finalizing .step-icon').text('🏁');
    }, 500);
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
    const eventCode = currentEvent ? currentEvent.id : 'UNKN';
    const timestamp = Date.now().toString().slice(-3); // 3 dígitos
    const random = Math.random().toString(36).substr(2, 1).toUpperCase(); // 1 char
    return `${eventCode}${timestamp}${random}`;
}

// Preparar dados do formulário
function prepareFormData(inscricaoId) {
    const summary = priceCalculator.getCalculationSummary();

    // Coletar dados dos participantes
    const participantsData = [];
    $('#participants-container .participant-block').each(function () {
        const $participant = $(this);
        const participantData = extractParticipantData($participant);

        // Preparar objeto do participante SEM duplicação
        const participantForWebhook = {
            fullName: participantData.fullName,
            phone: participantData.phone,
            cpf: participantData.cpf,
            gender: participantData.gender,
            email: participantData.email,
            birthDate: participantData.birthDate,
            stayPeriod: participantData.stayPeriod,
            accommodation: participantData.accommodation,
            eventOption: participantData.eventOption,
            bedPreference: participantData.bedPreference, // Campo existente
            restrictions: participantData.restrictions, // NOVA LINHA
            isResponsiblePayer: participantData.isResponsiblePayer,
            isResponsibleChild: participantData.isResponsibleChild,
            valorHospedagem: priceCalculator.calculateLodgingValue(participantData),
            valorEvento: priceCalculator.calculateEventValue(participantData),
            idade: priceCalculator.calculateAge(participantData.birthDate)
        };

        // Adicionar campos de hospedagem apenas se existirem (SEM duplicação)
        if (participantData.numDiarias !== null) {
            participantForWebhook.num_diarias = participantData.numDiarias;
        }

        if (participantData.dataCheckin !== null) {
            participantForWebhook.data_checkin = participantData.dataCheckin;
        }

        if (participantData.dataCheckout !== null) {
            participantForWebhook.data_checkout = participantData.dataCheckout;
        }

        if (participantData.primeiraRefeicao !== null) {
            participantForWebhook.primeira_refeicao = participantData.primeiraRefeicao;
        }

        if (participantData.ultimaRefeicao !== null) {
            participantForWebhook.ultima_refeicao = participantData.ultimaRefeicao;
        }

        participantsData.push(participantForWebhook);
    });

    // Identificar responsável pelo pagamento
    const responsiblePayer = participantsData.find(p => p.isResponsiblePayer) || participantsData[0];

    // NOVO: Extrair dados de endereço do responsável
    const $responsiblePayerElement = $('.responsible-payer:checked').closest('.participant-block');
    const $payerElement = $responsiblePayerElement.length > 0 ? $responsiblePayerElement : $('#participants-container .participant-block').first();

    let addressData = null;
    if (addressManager && $payerElement.length > 0) {
        addressData = addressManager.extractAddressData($payerElement);
    }

    // Preparar objeto do responsável com endereço
    const responsavelCompleto = {
        nome: responsiblePayer.fullName,
        cpf: responsiblePayer.cpf,
        email: responsiblePayer.email,
        telefone: responsiblePayer.phone
    };

    // NOVO: Adicionar endereço se disponível
    if (addressData && addressData.cep) {
        responsavelCompleto.endereco = {
            cep: addressData.cep,
            logradouro: addressData.logradouro,
            numero: addressData.numero,
            complemento: addressData.complemento,
            bairro: addressData.bairro,
            cidade: addressData.cidade,
            estado: addressData.estado
        };
    }

    // Preparar dados da forma de pagamento com descrição
    const formaPagamentoCompleta = {
        id: selectedPaymentMethod.id,
        label: selectedPaymentMethod.label,
        tipo: selectedPaymentMethod.tipo,
        descricao: selectedPaymentMethod.descricao,
        taxa_gateway_percentual: selectedPaymentMethod.taxa_gateway_percentual
    };

    // Adicionar campos opcionais da forma de pagamento se existirem
    if (selectedPaymentMethod.parcelas_maximas) {
        formaPagamentoCompleta.parcelas_maximas = selectedPaymentMethod.parcelas_maximas;
    }
    if (selectedPaymentMethod.juros !== undefined) {
        formaPagamentoCompleta.juros = selectedPaymentMethod.juros;
    }

    // Preparar dados completos do evento
    const eventoCompleto = {
        id: currentEvent.id,
        external_reference: currentEvent.external_reference,
        nome: currentEvent.nome,
        tipo_formulario: currentEvent.tipo_formulario,
        descricao: currentEvent.descricao,
        politicas_evento_url: currentEvent.politicas_evento_url,
        planilha_url: currentEvent.planilha_url,
        regrasIdadePrecificacao: currentEvent.regras_idade_precificacao,
    };

    // Adicionar observações adicionais apenas se existirem
    if (currentEvent.observacoes_adicionais) {
        eventoCompleto.observacoes_adicionais = currentEvent.observacoes_adicionais;
    }

    return {
        inscricao_id: inscricaoId,
        evento: eventoCompleto,
        responsavel: responsavelCompleto, // ATUALIZADO
        participantes: participantsData,
        totais: {
            subtotalHospedagem: summary.lodgingSubtotal,
            subtotalEvento: summary.eventSubtotal,
            desconto: summary.discount,
            total: summary.finalTotal
        },
        forma_pagamento: formaPagamentoCompleta,
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
        $paymentBtn.off('click').on('click', function () {
            // Abrir link em nova aba
            window.open(paymentLink, '_blank');
        });
    } else {
        // Modo offline ou erro no link
        $paymentBtn.show().text('Gerar Link de Pagamento');
        $paymentBtn.off('click').on('click', function () {
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
            $paymentBtn.off('click').on('click', function () {
                window.open(linkResult.link, '_blank');
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
        $('.toast').fadeOut(300, function () {
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
    // Remover qualquer botão de nova inscrição existente
    $('.new-registration-btn').remove();

    // Não criar novo botão
    // (código de criação removido)
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
    const stayPeriodId = $participant.find('.stay-period-select').val() ||
        (currentEvent.periodos_estadia_opcoes.length === 1 ? currentEvent.periodos_estadia_opcoes[0].id : null);

    // Buscar dados do período selecionado
    let numDiarias = null;
    let dataCheckin = null;
    let dataCheckout = null;
    let primeiraRefeicao = null;
    let ultimaRefeicao = null;

    if (stayPeriodId && currentEvent.periodos_estadia_opcoes) {
        const periodoSelecionado = currentEvent.periodos_estadia_opcoes.find(p => p.id === stayPeriodId);
        if (periodoSelecionado) {
            // Capturar num_diarias
            if (periodoSelecionado.num_diarias) {
                numDiarias = periodoSelecionado.num_diarias;
            }

            // Capturar datas de check-in e check-out
            if (periodoSelecionado.data_inicio) {
                dataCheckin = periodoSelecionado.data_inicio;
            }
            if (periodoSelecionado.data_fim) {
                dataCheckout = periodoSelecionado.data_fim;
            }

            // ✅ NOVO: Capturar informações de refeições
            if (periodoSelecionado.primeira_refeicao) {
                primeiraRefeicao = periodoSelecionado.primeira_refeicao;
            }
            if (periodoSelecionado.ultima_refeicao) {
                ultimaRefeicao = periodoSelecionado.ultima_refeicao;
            }
        }
    }

    // CORRIGIDO: Capturar dados sempre, independente da visibilidade
    const countryCode = $participant.find('.country-select').val() || '';
    const countryName = $participant.find('.country-select').find(':selected').data('country') || '';
    const phoneNumber = $participant.find('.phone-input').val() || '';
    const cpfValue = $participant.find('.cpf-mask').val() || '';
    const emailValue = $participant.find('.email-input').val() || '';

    // DEBUG: Log para verificar se os valores estão sendo capturados
    console.log('🔍 DEBUG extractParticipantData:', {
        participantId: $participant.attr('data-participant-id'),
        phoneNumber,
        cpfValue,
        emailValue,
        primeiraRefeicao,
        ultimaRefeicao,
        phoneVisible: $participant.find('.phone-input').closest('.form-group').is(':visible'),
        cpfVisible: $participant.find('.cpf-mask').closest('.form-group').is(':visible'),
        emailVisible: $participant.find('.email-input').closest('.form-group').is(':visible')
    });

    // Extrair dados de endereço (apenas se visível - responsável pelo pagamento)
    let addressData = null;
    const $addressSection = $participant.find('.address-section');
    if ($addressSection.is(':visible') && addressManager) {
        addressData = addressManager.extractAddressData($participant);
    }

    return {
        fullName: $participant.find('.full-name').val() || '',
        phone: phoneNumber,
        phoneCountryCode: countryCode,
        phoneCountry: countryName,
        cpf: cpfValue,
        gender: $participant.find('.gender-select').val() || '',
        email: emailValue,
        birthDate: $participant.find('.dob-input').val() || '',
        stayPeriod: stayPeriodId,
        accommodation: $participant.find('.accommodation-select').val() ||
            (currentEvent.tipos_acomodacao.length === 1 ? currentEvent.tipos_acomodacao[0].id : null),
        eventOption: $participant.find('.event-option-select').val() ||
            (getEventOptionsForParticipant($participant).length === 1 ? getEventOptionsForParticipant($participant)[0].id : null),
        bedPreference: $participant.find('.bed-preference-select').val() || '',
        restrictions: $participant.find('.restrictions-input').val().trim() || '',
        isResponsiblePayer: $participant.find('.responsible-payer').is(':checked'),
        isResponsibleChild: $participant.find('.responsible-child').is(':checked'),
        numDiarias: numDiarias,
        dataCheckin: dataCheckin,
        dataCheckout: dataCheckout,
        primeiraRefeicao: primeiraRefeicao,
        ultimaRefeicao: ultimaRefeicao,
        address: addressData
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

// **FUNÇÃO CORRIGIDA**: Atualizar cálculos de um participante específico
function updateParticipantCalculations($participant) {
    if (!window.priceCalculator) return;

    const participantData = extractParticipantData($participant);
    const participantId = $participant.attr('data-participant-id');

    // Garantir que o participantData tenha o ID
    participantData.id = participantId;

    // Atualizar apenas este participante no calculador
    updateParticipantInCalculator(participantId, participantData);

    // Calcular valores individuais usando os dados atualizados
    const lodgingValue = window.priceCalculator.calculateLodgingValue(participantData);
    const eventValue = window.priceCalculator.calculateEventValue(participantData);

    // Calcular idade para o debug
    const age = window.priceCalculator.calculateAge(participantData.birthDate);

    // Atualizar display dos valores com informações adicionais
    updateParticipantValueDisplay($participant, lodgingValue, eventValue, participantData);

    console.log(`Cálculos atualizados para participante ${participantId}:`, {
        idade: age,
        posicaoNoArray: window.priceCalculator.participants.findIndex(p => p.id === participantId),
        totalParticipantes: window.priceCalculator.participants.length,
        elegiveisGratuidade: window.priceCalculator.getEligibleFreeParticipants('hospedagem').length,
        lodgingValue,
        eventValue
    });

    // Atualizar totais gerais se estivermos na tela de resumo
    if (currentStep === 3) {
        updateSummaryTotals();
    }
}

// **FUNÇÃO CORRIGIDA**: Atualizar todos os participantes no calculador
function updateAllParticipantsInCalculator() {
    if (!window.priceCalculator) return;

    // Limpar participantes existentes
    window.priceCalculator.participants = [];

    // Adicionar todos os participantes na ordem correta
    $('#participants-container .participant-block').each(function () {
        const $participant = $(this);
        const participantId = $participant.attr('data-participant-id');

        // ✅ CORREÇÃO: Removida verificação redundante
        const participantData = extractParticipantData($participant);
        participantData.id = participantId;
        window.priceCalculator.participants.push(participantData);
    });

    console.log('Todos os participantes atualizados no calculador:', window.priceCalculator.participants.length);
}

// **NOVA FUNÇÃO OTIMIZADA**: Atualizar todos os cálculos sem loop
function updateAllCalculations() {
    if (!window.priceCalculator) return;

    // ✅ CORREÇÃO: Usar flag para evitar chamadas recursivas
    if (window.isUpdatingCalculations) return;
    window.isUpdatingCalculations = true;

    try {
        // Primeiro atualizar todos os participantes no calculador
        updateAllParticipantsInCalculator();

        // Depois atualizar displays individuais
        $('#participants-container .participant-block').each(function () {
            const $participant = $(this);
            const participantId = $participant.attr('data-participant-id');

            // Buscar dados do participante já no calculador
            const participantData = window.priceCalculator.participants.find(p => p.id === participantId);

            if (participantData) {
                // Calcular valores individuais
                const lodgingValue = window.priceCalculator.calculateLodgingValue(participantData);
                const eventValue = window.priceCalculator.calculateEventValue(participantData);

                // Atualizar display
                updateParticipantValueDisplay($participant, lodgingValue, eventValue, participantData);
            }
        });

        // Atualizar totais se estivermos na tela de resumo
        if (currentStep === 3) {
            updateSummaryTotals();
        }
    } finally {
        // Liberar flag após 100ms para permitir novas atualizações
        setTimeout(() => {
            window.isUpdatingCalculations = false;
        }, 100);
    }
}

// **NOVA FUNÇÃO**: Atualizar display de valores do participante
function updateParticipantValueDisplay($participant, lodgingValue, eventValue, participantData) {
    const age = window.priceCalculator.calculateAge(participantData.birthDate);
    const participantId = $participant.attr('data-participant-id');

    console.log(`🔄 Atualizando display para participante ${participantId}:`, {
        idade: age,
        lodgingValue,
        eventValue,
        isEligibleForFreeLodging: window.priceCalculator.isEligibleForFree(participantData, 'hospedagem'),
        shouldApplyExcessLodging: window.priceCalculator.shouldApplyExcessRule(participantData, 'hospedagem'),
        isEligibleForFreeEvent: window.priceCalculator.isEligibleForFree(participantData, 'evento'),
        shouldApplyExcessEvent: window.priceCalculator.shouldApplyExcessRule(participantData, 'evento')
    });

    // Atualizar valor de hospedagem
    const $lodgingValue = $participant.find('.lodging-value');
    if ($lodgingValue.length > 0) {
        let lodgingText = window.priceCalculator.formatCurrency(lodgingValue);

        // Adicionar indicador se necessário
        if (lodgingValue === 0 && age >= 0 && age <= 4) {
            lodgingText += ' <span class="free-indicator">(Gratuito)</span>';
        } else if (age >= 0 && age <= 4 && window.priceCalculator.shouldApplyExcessRule(participantData, 'hospedagem')) {
            lodgingText += ' <span class="discount-indicator">(50%)</span>';
        }

        $lodgingValue.html(lodgingText);
        console.log(`💰 Hospedagem atualizada para ${participantId}: ${lodgingText}`);
    } else {
        console.warn(`⚠️ Elemento .lodging-value não encontrado para participante ${participantId}`);
    }

    // Atualizar valor de evento
    const $eventValue = $participant.find('.event-value');
    if ($eventValue.length > 0) {
        let eventText = window.priceCalculator.formatCurrency(eventValue);

        // Adicionar indicador se necessário
        if (eventValue === 0 && age >= 0 && age <= 4) {
            eventText += ' <span class="free-indicator">(Gratuito)</span>';
        } else if (age >= 0 && age <= 4 && window.priceCalculator.shouldApplyExcessRule(participantData, 'evento')) {
            eventText += ' <span class="discount-indicator">(50%)</span>';
        }

        $eventValue.html(eventText);
        console.log(`🎈 Evento atualizado para ${participantId}: ${eventText}`);
    } else {
        console.warn(`⚠️ Elemento .event-value não encontrado para participante ${participantId}`);
    }
}

// Atualizar totais na tela de resumo
function updateSummaryTotals() {
    if (!window.priceCalculator) return;

    const summary = window.priceCalculator.getCalculationSummary();

    // Atualizar displays para subtotais e total final
    $('#subtotal-hospedagem').text(summary.formatted.lodgingSubtotal);
    $('#subtotal-evento').text(summary.formatted.eventSubtotal);
    $('#final-total').text(summary.formatted.finalTotal);

    // Elementos da linha de desconto
    const $discountLine = $('#discount-line');
    const $discountValue = $('#discount-value');

    // Lógica para mostrar/ocultar a linha de desconto
    if (summary.discount > 0) {
        // Há desconto válido - mostrar a linha
        $discountValue.text('-' + summary.formatted.discount);
        $discountLine.show();
    } else {
        // Não há desconto - ocultar a linha
        $discountValue.text('-R\$ 0,00');
        $discountLine.hide();
    }

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

// Atualizar método de pagamento (versão final)
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

        // Atualizar descrição da forma de pagamento na seção de política
        if (currentStep === 3) {
            loadCancellationPolicy();
        }
    } else {
        // Se nenhuma forma foi selecionada, limpar a seção
        selectedPaymentMethod = null;
        if (currentStep === 3) {
            $('#cancellation-policy-section').hide();
            $('#cancellation-policy-section .policy-content').empty();
        }
    }
}
