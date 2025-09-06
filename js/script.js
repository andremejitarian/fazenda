/**
 * Script principal do formulário de inscrição
 * Gerencia a navegação entre etapas, validação de campos e cálculo de preços
 */

// Variáveis globais
let currentStep = 1;
let calculator = null;
let eventData = null;

// Inicializa o formulário quando o documento estiver pronto
$(document).ready(function() {
    // Carrega os dados do evento
    loadEventData();
    
    // Inicializa máscaras para campos
    initializeMasks();
    
    // Configura navegação entre etapas
    setupNavigation();
    
    // Configura validações de formulário
    setupValidations();
    
    // Verifica parâmetros da URL para pré-preenchimento
    checkUrlParams();
});

// Carrega os dados do evento do arquivo JSON
function loadEventData() {
    $.getJSON('events.json', function(data) {
        eventData = data;
        
        // Inicializa o calculador de preços
        calculator = new PriceCalculator(eventData);
        
        // Preenche os selects com dados do evento
        populateSelects();
        
        // Adiciona o primeiro participante
        addParticipant();
    }).fail(function() {
        showError('Erro ao carregar dados do evento. Por favor, recarregue a página.');
    });
}

// Inicializa máscaras para campos de formulário
function initializeMasks() {
    $('.date-mask').mask('00/00/0000');
    $('.phone-mask').mask('(00) 00000-0000');
    $('.cep-mask').mask('00000-000');
}

// Configura a navegação entre etapas do formulário
function setupNavigation() {
    // Botões de próximo
    $('.btn-next').click(function() {
        const currentStepElement = $(`.step-${currentStep}`);
        
        // Valida a etapa atual antes de prosseguir
        if (validateStep(currentStep)) {
            // Se for a etapa de participantes, processa os dados antes de avançar
            if (currentStep === 2) {
                processParticipantsData();
                updatePriceSummary();
            }
            
            // Esconde a etapa atual e mostra a próxima
            currentStepElement.hide();
            currentStep++;
            $(`.step-${currentStep}`).show();
            
            // Atualiza o indicador de progresso
            updateProgressIndicator();
            
            // Rola para o topo da página
            window.scrollTo(0, 0);
        }
    });
    
    // Botões de voltar
    $('.btn-prev').click(function() {
        const currentStepElement = $(`.step-${currentStep}`);
        
        // Esconde a etapa atual e mostra a anterior
        currentStepElement.hide();
        currentStep--;
        $(`.step-${currentStep}`).show();
        
        // Atualiza o indicador de progresso
        updateProgressIndicator();
        
        // Rola para o topo da página
        window.scrollTo(0, 0);
    });
    
    // Inicialmente, mostra apenas a primeira etapa
    $('.step').hide();
    $('.step-1').show();
    
    // Inicializa o indicador de progresso
    updateProgressIndicator();
}

// Atualiza o indicador de progresso
function updateProgressIndicator() {
    $('.progress-step').removeClass('active completed');
    
    // Marca as etapas anteriores como concluídas
    for (let i = 1; i < currentStep; i++) {
        $(`.progress-step[data-step="${i}"]`).addClass('completed');
    }
    
    // Marca a etapa atual como ativa
    $(`.progress-step[data-step="${currentStep}"]`).addClass('active');
}

// Configura validações de formulário
function setupValidations() {
    // Validação em tempo real para campos obrigatórios
    $(document).on('blur', '.required', function() {
        validateField($(this));
    });
    
    // Validação de e-mail
    $(document).on('blur', '.email-field', function() {
        validateEmail($(this));
    });
    
    // Validação de data
    $(document).on('blur', '.date-mask', function() {
        validateDate($(this));
    });
    
    // Validação de CPF já implementada no cpfValidation.js
    
    // Validação de CEP com preenchimento automático
    $(document).on('blur', '.cep-mask', function() {
        const cepInput = $(this);
        const cep = cepInput.val().replace(/\D/g, '');
        
        if (cep.length === 8) {
            // Consulta o CEP via API ViaCEP
            $.getJSON(`https://viacep.com.br/ws/${cep}/json/`, function(data) {
                if (!data.erro) {
                    // Preenche os campos de endereço
                    const participantForm = cepInput.closest('.participant-form');
                    participantForm.find('.street-field').val(data.logradouro);
                    participantForm.find('.neighborhood-field').val(data.bairro);
                    participantForm.find('.city-field').val(data.localidade);
                    participantForm.find('.state-field').val(data.uf);
                } else {
                    showFieldError(cepInput, 'CEP não encontrado');
                }
            }).fail(function() {
                showFieldError(cepInput, 'Erro ao consultar CEP');
            });
        }
    });
    
    // Validação e aplicação de cupom
    $('#apply-coupon').click(function() {
        const couponCode = $('#coupon-code').val().trim();
        
        if (couponCode) {
            const result = calculator.applyCoupon(couponCode);
            
            if (result.success) {
                $('#coupon-message').removeClass('error').addClass('success').text(result.message);
                updatePriceSummary();
            } else {
                $('#coupon-message').removeClass('success').addClass('error').text(result.message);
            }
        } else {
            $('#coupon-message').removeClass('success').addClass('error').text('Digite um código de cupom');
        }
    });
    
    // Remover cupom
    $('#remove-coupon').click(function() {
        calculator.removeCoupon();
        $('#coupon-code').val('');
        $('#coupon-message').text('');
        updatePriceSummary();
    });
}

// Valida um campo específico
function validateField(field) {
    const value = field.val().trim();
    const errorMessage = field.siblings('.error-message');
    
    if (field.hasClass('required') && value === '') {
        errorMessage.text('Este campo é obrigatório');
        field.addClass('invalid-input');
        return false;
    } else {
        errorMessage.text('');
        field.removeClass('invalid-input');
        return true;
    }
}

// Valida um campo de e-mail
function validateEmail(field) {
    const value = field.val().trim();
    const errorMessage = field.siblings('.error-message');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (value !== '' && !emailRegex.test(value)) {
        errorMessage.text('E-mail inválido');
        field.addClass('invalid-input');
        return false;
    } else {
        return validateField(field);
    }
}

// Valida um campo de data
function validateDate(field) {
    const value = field.val().trim();
    const errorMessage = field.siblings('.error-message');
    
    if (value !== '') {
        // Verifica o formato da data (DD/MM/AAAA)
        const dateRegex = /^(0[1-9]|[12][0-9]|3[01])[/](0[1-9]|1[012])[/](19|20)\d\d$/;
        
        if (!dateRegex.test(value)) {
            errorMessage.text('Data inválida');
            field.addClass('invalid-input');
            return false;
        }
        
        // Converte para objeto Date e verifica se é uma data válida
        const parts = value.split('/');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Mês em JavaScript é 0-11
        const year = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        
        if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
            errorMessage.text('Data inválida');
            field.addClass('invalid-input');
            return false;
        }
        
        // Verifica se a data de nascimento não é futura
        if (field.hasClass('birth-date')) {
            const today = new Date();
            if (date > today) {
                errorMessage.text('Data de nascimento não pode ser futura');
                field.addClass('invalid-input');
                return false;
            }
        }
        
        errorMessage.text('');
        field.removeClass('invalid-input');
        return true;
    } else {
        return validateField(field);
    }
}

// Mostra erro em um campo específico
function showFieldError(field, message) {
    const errorMessage = field.siblings('.error-message');
    errorMessage.text(message);
    field.addClass('invalid-input');
}

// Mostra mensagem de erro geral
function showError(message) {
    $('#error-message').text(message).show();
    setTimeout(function() {
        $('#error-message').fadeOut();
    }, 5000);
}

// Valida uma etapa inteira do formulário
function validateStep(step) {
    let isValid = true;
    
    // Valida todos os campos obrigatórios na etapa atual
    $(`.step-${step} .required`).each(function() {
        if (!validateField($(this))) {
            isValid = false;
        }
    });
    
    // Valida campos de e-mail na etapa atual
    $(`.step-${step} .email-field`).each(function() {
        if (!validateEmail($(this))) {
            isValid = false;
        }
    });
    
    // Valida campos de data na etapa atual
    $(`.step-${step} .date-mask`).each(function() {
        if (!validateDate($(this))) {
            isValid = false;
        }
    });
    
    // Valida campos de CPF na etapa atual
    $(`.step-${step} .cpf-mask`).each(function() {
        const cpfInput = $(this);
        const cpfValue = cpfInput.val();
        const errorMessage = cpfInput.siblings('.error-message');
        
        if (cpfValue.length > 0 && !validarCPF(cpfValue)) {
            errorMessage.text('CPF inválido. Por favor, verifique.');
            cpfInput.addClass('invalid-input');
            isValid = false;
        }
    });
    
    // Se a etapa não for válida, mostra uma mensagem de erro
    if (!isValid) {
        showError('Por favor, corrija os campos destacados antes de prosseguir.');
    }
    
    return isValid;
}

// Preenche os selects com dados do evento
function populateSelects() {
    if (!eventData) return;
    
    // Template para o select de períodos
    const periodTemplate = $('#period-template');
    const periodSelect = periodTemplate.html();
    
    // Adiciona as opções de períodos
    let periodOptions = '<option value="">Selecione o período</option>';
    eventData.periodos.forEach(function(period) {
        periodOptions += `<option value="${period.id}">${period.nome} (${period.data_inicio} a ${period.data_fim})</option>`;
    });
    
    // Atualiza o template com as opções
    const updatedPeriodSelect = periodSelect.replace('<!-- period-options -->', periodOptions);
    $('#period-template').html(updatedPeriodSelect);
    
    // Template para o select de acomodações
    const accommodationTemplate = $('#accommodation-template');
    const accommodationSelect = accommodationTemplate.html();
    
    // Adiciona as opções de acomodações
    let accommodationOptions = '<option value="">Selecione a acomodação</option>';
    eventData.acomodacoes.forEach(function(accommodation) {
        accommodationOptions += `<option value="${accommodation.id}">${accommodation.nome} - ${accommodation.descricao}</option>`;
    });
    
    // Atualiza o template com as opções
    const updatedAccommodationSelect = accommodationSelect.replace('<!-- accommodation-options -->', accommodationOptions);
    $('#accommodation-template').html(updatedAccommodationSelect);
    
    // Template para o select de opções de evento
    const eventOptionTemplate = $('#event-option-template');
    const eventOptionSelect = eventOptionTemplate.html();
    
    // Adiciona as opções de participação no evento
    let eventOptions = '<option value="">Selecione a opção de participação</option>';
    eventData.opcoes_evento.forEach(function(option) {
        eventOptions += `<option value="${option.id}">${option.nome} - ${option.descricao}</option>`;
    });
    
    // Atualiza o template com as opções
    const updatedEventOptionSelect = eventOptionSelect.replace('<!-- event-options -->', eventOptions);
    $('#event-option-template').html(updatedEventOptionSelect);
}

// Adiciona um novo participante ao formulário
function addParticipant() {
    const participantsContainer = $('#participants-container');
    const participantCount = participantsContainer.children('.participant-form').length;
    const newIndex = participantCount + 1;
    
    // Clona o template do participante
    const participantTemplate = $('#participant-template').html();
    const newParticipant = participantTemplate
        .replace(/\{index\}/g, newIndex)
        .replace('Participante {number}', `Participante ${newIndex}`);
    
    // Adiciona o novo participante ao container
    participantsContainer.append(newParticipant);
    
    // Inicializa as máscaras para os novos campos
    $(`#participant-${newIndex} .date-mask`).mask('00/00/0000');
    $(`#participant-${newIndex} .phone-mask`).mask('(00) 00000-0000');
    $(`#participant-${newIndex} .cpf-mask`).mask('000.000.000-00');
    $(`#participant-${newIndex} .cep-mask`).mask('00000-000');
    
    // Atualiza os selects com as opções do evento
    updateParticipantSelects(newIndex);
    
    // Atualiza os botões de remover participante
    updateRemoveButtons();
    
    // Configura os eventos de cálculo de preço
    setupPriceCalculation(newIndex);
}

// Atualiza os selects de um participante específico
function updateParticipantSelects(index) {
    // Período
    const periodTemplate = $('#period-template').html();
    $(`#participant-${index} .period-select-container`).html(periodTemplate);
    
    // Acomodação
    const accommodationTemplate = $('#accommodation-template').html();
    $(`#participant-${index} .accommodation-select-container`).html(accommodationTemplate);
    
    // Opção de evento
    const eventOptionTemplate = $('#event-option-template').html();
    $(`#participant-${index} .event-option-select-container`).html(eventOptionTemplate);
}

// Atualiza os botões de remover participante
function updateRemoveButtons() {
    const participantForms = $('.participant-form');
    
    // Esconde todos os botões de remover
    $('.btn-remove-participant').hide();
    
    // Se houver mais de um participante, mostra os botões de remover
    if (participantForms.length > 1) {
        $('.btn-remove-participant').show();
    }
}

// Remove um participante do formulário
function removeParticipant(index) {
    $(`#participant-${index}`).remove();
    
    // Renumera os participantes restantes
    $('.participant-form').each(function(i) {
        const newIndex = i + 1;
        const currentIndex = parseInt($(this).attr('id').replace('participant-', ''));
        
        if (currentIndex !== newIndex) {
            // Atualiza o ID e o título
            $(this).attr('id', `participant-${newIndex}`);
            $(this).find('.participant-title').text(`Participante ${newIndex}`);
            
            // Atualiza os IDs e names dos campos
            $(this).find('[id*="participant-"]').each(function() {
                const newId = $(this).attr('id').replace(`participant-${currentIndex}`, `participant-${newIndex}`);
                $(this).attr('id', newId);
            });
            
            $(this).find('[name*="participant-"]').each(function() {
                const newName = $(this).attr('name').replace(`participant-${currentIndex}`, `participant-${newIndex}`);
                $(this).attr('name', newName);
            });
            
            // Atualiza o botão de remover
            $(this).find('.btn-remove-participant').attr('onclick', `removeParticipant(${newIndex})`);
        }
    });
    
    // Atualiza os botões de remover
    updateRemoveButtons();
    
    // Atualiza o cálculo de preço
    processParticipantsData();
    updatePriceSummary();
}

// Configura os eventos de cálculo de preço para um participante
function setupPriceCalculation(index) {
    // Atualiza o preço quando o período, acomodação, opção de evento ou data de nascimento mudar
    $(`#participant-${index} .period-select, #participant-${index} .accommodation-select, #participant-${index} .event-option-select, #participant-${index} .birth-date`).change(function() {
        // Atualiza os dados do participante no calculador
        processParticipantData(index);
        
        // Atualiza o resumo de preços
        updatePriceSummary();
    });
}

// Processa os dados de um participante específico
function processParticipantData(index) {
    if (!calculator) return;
    
    const participantForm = $(`#participant-${index}`);
    const periodId = participantForm.find('.period-select').val();
    const accommodationType = participantForm.find('.accommodation-select').val();
    const participationType = participantForm.find('.event-option-select').val();
    const birthDateStr = participantForm.find('.birth-date').val();
    
    // Converte a data de nascimento para o formato ISO
    let birthDate = null;
    if (birthDateStr) {
        const parts = birthDateStr.split('/');
        if (parts.length === 3) {
            birthDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // AAAA-MM-DD
        }
    }
    
    // Cria o objeto do participante
    const participant = {
        name: participantForm.find('.participant-name').val(),
        birthDate: birthDate,
        periodId: periodId,
        accommodationType: accommodationType,
        participationType: participationType
    };
    
    // Atualiza ou adiciona o participante no calculador
    if (index - 1 < calculator.participants.length) {
        calculator.updateParticipant(index - 1, participant);
    } else {
        calculator.addParticipant(participant);
    }
    
    return participant;
}

// Processa os dados de todos os participantes
function processParticipantsData() {
    if (!calculator) return;
    
    // Limpa os participantes existentes
    calculator.participants = [];
    
    // Processa cada participante
    $('.participant-form').each(function() {
        const index = parseInt($(this).attr('id').replace('participant-', ''));
        processParticipantData(index);
    });
}

// Atualiza o resumo de preços
function updatePriceSummary() {
    if (!calculator) return;
    
    const totals = calculator.calculateTotal();
    
    // Atualiza os valores no resumo
    $('#accommodation-total').text(`R$ ${totals.accommodationTotal.toFixed(2)}`);
    $('#event-total').text(`R$ ${totals.eventTotal.toFixed(2)}`);
    
    // Atualiza o desconto do cupom se houver
    if (totals.couponDiscount > 0) {
        $('#coupon-discount-row').show();
        $('#coupon-discount').text(`R$ ${totals.couponDiscount.toFixed(2)}`);
    } else {
        $('#coupon-discount-row').hide();
    }
    
    // Atualiza o total geral
    $('#total-price').text(`R$ ${totals.total.toFixed(2)}`);
    
    // Atualiza o resumo de participantes
    updateParticipantsSummary();
}

// Atualiza o resumo de participantes
function updateParticipantsSummary() {
    if (!calculator || !calculator.participants.length) return;
    
    const participantsSummary = $('#participants-summary');
    participantsSummary.empty();
    
    // Adiciona cada participante ao resumo
    calculator.participants.forEach(function(participant, index) {
        if (!participant.name) return;
        
        // Encontra os detalhes do período, acomodação e opção de evento
        const period = eventData.periodos.find(p => p.id === participant.periodId);
        const accommodation = eventData.acomodacoes.find(a => a.id === participant.accommodationType);
        const eventOption = eventData.opcoes_evento.find(o => o.id === participant.participationType);
        
        // Calcula os preços individuais
        const accommodationPrice = calculator.calculateAccommodationPrice(
            participant.accommodationType,
            participant.periodId,
            participant.birthDate
        );
        
        const eventPrice = calculator.calculateEventPrice(
            participant.participationType,
            participant.periodId,
            participant.birthDate
        );
        
        // Cria o HTML do resumo do participante
        let html = `
            <div class="participant-summary">
                <h4>Participante ${index + 1}: ${participant.name}</h4>
                <div class="summary-details">
        `;
        
        if (period) {
            html += `<p><strong>Período:</strong> ${period.nome}</p>`;
        }
        
        if (accommodation) {
            html += `<p><strong>Acomodação:</strong> ${accommodation.nome} - R$ ${accommodationPrice.toFixed(2)}</p>`;
        }
        
        if (eventOption) {
            html += `<p><strong>Opção de Evento:</strong> ${eventOption.nome} - R$ ${eventPrice.toFixed(2)}</p>`;
        }
        
        html += `
                    <p><strong>Subtotal:</strong> R$ ${(accommodationPrice + eventPrice).toFixed(2)}</p>
                </div>
            </div>
        `;
        
        participantsSummary.append(html);
    });
}

// Verifica parâmetros da URL para pré-preenchimento
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Pré-preenche o nome do responsável
    if (urlParams.has('nome')) {
        $('#responsible-name').val(urlParams.get('nome'));
    }
    
    // Pré-preenche o e-mail do responsável
    if (urlParams.has('email')) {
        $('#responsible-email').val(urlParams.get('email'));
    }
    
    // Pré-preenche o telefone do responsável
    if (urlParams.has('telefone')) {
        $('#responsible-phone').val(urlParams.get('telefone'));
    }
    
    // Pré-preenche o período
    if (urlParams.has('periodo')) {
        const periodId = urlParams.get('periodo');
        // O select será preenchido quando os dados do evento forem carregados
        // Armazena o valor para ser usado após o carregamento
        window.prefilledPeriod = periodId;
    }
}

// Função para enviar o formulário
function submitForm() {
    // Valida a etapa final antes de enviar
    if (!validateStep(currentStep)) {
        return;
    }
    
    // Coleta todos os dados do formulário
    const formData = {
        responsible: {
            name: $('#responsible-name').val(),
            email: $('#responsible-email').val(),
            phone: $('#responsible-phone').val()
        },
        participants: [],
        payment: {
            method: $('input[name="payment-method"]:checked').val(),
            installments: $('#installments').val(),
            couponCode: calculator.couponCode
        },
        totals: calculator.calculateTotal()
    };
    
    // Coleta os dados de cada participante
    $('.participant-form').each(function() {
        const index = parseInt($(this).attr('id').replace('participant-', ''));
        const participantForm = $(`#participant-${index}`);
        
        const participant = {
            name: participantForm.find('.participant-name').val(),
            email: participantForm.find('.participant-email').val(),
            phone: participantForm.find('.participant-phone').val(),
            cpf: participantForm.find('.cpf-mask').val(),
            birthDate: participantForm.find('.birth-date').val(),
            address: {
                cep: participantForm.find('.cep-mask').val(),
                street: participantForm.find('.street-field').val(),
                number: participantForm.find('.number-field').val(),
                complement: participantForm.find('.complement-field').val(),
                neighborhood: participantForm.find('.neighborhood-field').val(),
                city: participantForm.find('.city-field').val(),
                state: participantForm.find('.state-field').val()
            },
            period: participantForm.find('.period-select').val(),
            accommodation: participantForm.find('.accommodation-select').val(),
            eventOption: participantForm.find('.event-option-select').val()
        };
        
        formData.participants.push(participant);
    });
    
    // Exibe mensagem de sucesso e oculta o formulário
    $('.form-container').hide();
    $('.success-message').show();
    
    // Rola para o topo da página
    window.scrollTo(0, 0);
    
    // Aqui você pode adicionar o código para enviar os dados para o servidor
    console.log('Dados do formulário:', formData);
    
    // Exemplo de envio via AJAX (descomentado para implementação real)
    /*
    $.ajax({
        url: 'https://api.example.com/submit-registration',
        type: 'POST',
        data: JSON.stringify(formData),
        contentType: 'application/json',
        success: function(response) {
            // Exibe mensagem de sucesso e oculta o formulário
            $('.form-container').hide();
            $('.success-message').show();
            
            // Rola para o topo da página
            window.scrollTo(0, 0);
        },
        error: function(xhr, status, error) {
            showError('Erro ao enviar o formulário. Por favor, tente novamente.');
            console.error('Erro:', error);
        }
    });
    */
}

// Botão para adicionar participante
$('#add-participant-btn').click(function() {
    addParticipant();
});

// Botão para enviar o formulário
$('#submit-form-btn').click(function() {
    submitForm();
});
