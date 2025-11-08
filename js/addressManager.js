// addressManager.js - Gerenciamento de campos de endereço
class AddressManager {
    constructor() {
        this.currentAddress = null;
        this.isSearching = false;
    }

    // Configurar campos de endereço para um participante
    setupAddressFields($participant) {
        const $addressSection = $participant.find('.address-section');
        
        if ($addressSection.length === 0) {
            console.warn('⚠️ Seção de endereço não encontrada no participante');
            return;
        }

        // Event listener para o campo CEP
        const $cepInput = $participant.find('.cep-input');
        
        // Aplicar máscara
        $cepInput.mask('00000-000');

        // Buscar ao sair do campo (blur)
        $cepInput.on('blur', async () => {
            const cep = $cepInput.val();
            if (cep && cep.replace(/\D/g, '').length === 8) {
                await this.searchAndFillAddress($participant, cep);
            }
        });

        // Buscar ao pressionar Enter
        $cepInput.on('keypress', async (e) => {
            if (e.which === 13) { // Enter
                e.preventDefault();
                const cep = $cepInput.val();
                if (cep && cep.replace(/\D/g, '').length === 8) {
                    await this.searchAndFillAddress($participant, cep);
                }
            }
        });

        // Event listener para o botão de busca (se existir)
        const $searchBtn = $participant.find('.btn-search-cep');
        $searchBtn.on('click', async () => {
            const cep = $cepInput.val();
            await this.searchAndFillAddress($participant, cep);
        });

        console.log('✅ Campos de endereço configurados');
    }

    // Buscar e preencher endereço
    async searchAndFillAddress($participant, cep) {
        if (this.isSearching) {
            console.log('⏳ Busca já em andamento...');
            return;
        }

        this.isSearching = true;

        // Mostrar loading
        this.showLoading($participant);

        try {
            // Buscar CEP usando o módulo cepValidation
            const resultado = await buscarCEP(cep);

            if (resultado.erro) {
                this.showError($participant, resultado.mensagem);
                
                // Se permitir manual, habilitar campos
                if (resultado.permitirManual) {
                    this.enableManualInput($participant);
                }
            } else {
                // Preencher campos com os dados
                this.fillAddressFields($participant, resultado);
                this.showSuccess($participant, `Endereço encontrado via ${resultado.fonte}`);
                this.currentAddress = resultado;
            }
        } catch (error) {
            console.error('❌ Erro ao buscar CEP:', error);
            this.showError($participant, 'Erro ao buscar CEP. Preencha manualmente.');
            this.enableManualInput($participant);
        } finally {
            this.isSearching = false;
            this.hideLoading($participant);
        }
    }

    // Preencher campos de endereço
    fillAddressFields($participant, dados) {
        $participant.find('.cep-input').val(dados.cep);
        $participant.find('.logradouro-input').val(dados.logradouro);
        $participant.find('.bairro-input').val(dados.bairro);
        $participant.find('.cidade-input').val(dados.cidade);
        $participant.find('.estado-select').val(dados.estado);

        // Focar no campo número
        $participant.find('.numero-input').focus();

        // Desabilitar campos preenchidos automaticamente
        $participant.find('.logradouro-input, .bairro-input, .cidade-input, .estado-select')
            .prop('readonly', true)
            .addClass('auto-filled');

        console.log('✅ Campos preenchidos:', dados);
    }

    // Habilitar preenchimento manual
    enableManualInput($participant) {
        $participant.find('.logradouro-input, .bairro-input, .cidade-input, .estado-select')
            .prop('readonly', false)
            .removeClass('auto-filled');

        $participant.find('.logradouro-input').focus();
    }

    // Mostrar loading
    showLoading($participant) {
        const $feedback = $participant.find('.cep-feedback');
        $feedback.html('<span class="calculating-indicator"></span> Buscando CEP...')
            .removeClass('error-message success-message')
            .addClass('loading-message')
            .show();

        $participant.find('.cep-input').prop('disabled', true);
    }

    // Ocultar loading
    hideLoading($participant) {
        $participant.find('.cep-input').prop('disabled', false);
    }

    // Mostrar erro
    showError($participant, mensagem) {
        const $feedback = $participant.find('.cep-feedback');
        $feedback.text(mensagem)
            .removeClass('success-message loading-message')
            .addClass('error-message')
            .show();

        $participant.find('.cep-input').addClass('error');
    }

    // Mostrar sucesso
    showSuccess($participant, mensagem) {
        const $feedback = $participant.find('.cep-feedback');
        $feedback.text(mensagem)
            .removeClass('error-message loading-message')
            .addClass('success-message')
            .show();

        $participant.find('.cep-input').removeClass('error').addClass('success');

        // Ocultar mensagem após 3 segundos
        setTimeout(() => {
            $feedback.fadeOut();
        }, 3000);
    }

    // Validar campos de endereço
    validateAddressFields($participant) {
        const requiredFields = [
            { selector: '.cep-input', name: 'CEP' },
            { selector: '.logradouro-input', name: 'Logradouro' },
            { selector: '.numero-input', name: 'Número' },
            { selector: '.bairro-input', name: 'Bairro' },
            { selector: '.cidade-input', name: 'Cidade' },
            { selector: '.estado-select', name: 'Estado' }
        ];

        let isValid = true;
        let firstErrorField = null;

        requiredFields.forEach(field => {
            const $field = $participant.find(field.selector);
            const value = $field.val()?.trim(); // ✅ Variável 'value' agora declarada

            if (!value) {
                $field.addClass('error');
                if (!firstErrorField) {
                    firstErrorField = $field;
                }
                isValid = false;
            } else {
                $field.removeClass('error');
            }
        });

        return { isValid, firstErrorField };
    }

    // Extrair dados do endereço
    extractAddressData($participant) {
        return {
        };
    }

    // Gerar HTML do resumo de endereço
    generateAddressSummaryHTML(addressData) {
        return `
            <div class="address-summary">
                <h4>Endereço para Nota Fiscal</h4>
                <p><strong>CEP:</strong> ${addressData.cep}</p>
                <p><strong>Endereço:</strong> ${addressData.logradouro}, ${addressData.numero}</p>
                ${addressData.complemento ? `<p><strong>Complemento:</strong> ${addressData.complemento}</p>` : ''}
                <p><strong>Bairro:</strong> ${addressData.bairro}</p>
                <p><strong>Cidade:</strong> ${addressData.cidade} - ${addressData.estado}</p>
            </div>
        `;
    }
}

// Instância global
let addressManager = null;

// Inicializar gerenciador
function initializeAddressManager() {
    addressManager = new AddressManager();
    console.log('🔗 Gerenciador de endereço inicializado');
}

console.log('✅ Módulo addressManager.js carregado');
