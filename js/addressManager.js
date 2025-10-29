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

        // Campo CEP
        const $cepInput = $participant.find('.cep-input');
        
        // Aplicar máscara (protege caso o plugin não esteja disponível)
        if (typeof $cepInput.mask === 'function') {
            $cepInput.mask('00000-000');
        }

        // Função auxiliar para tentar buscar
        const trySearch = async () => {
            if (cepDigits.length === 8) {
                await this.searchAndFillAddress($participant, cepDigits);
            } else {
                this.showError($participant, 'Informe um CEP válido com 8 dígitos.');
                this.enableManualInput($participant);
            }
        };

        // Buscar ao sair do campo (blur)
        $cepInput.on('blur', trySearch);

        // Buscar ao pressionar Enter (keydown, não keypress)
        $cepInput.on('keydown', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                await trySearch();
            }
        });

        // Botão de busca (se existir)
        const $searchBtn = $participant.find('.btn-search-cep');
        $searchBtn.on('click', trySearch);

        console.log('✅ Campos de endereço configurados');
    }

    // Buscar e preencher endereço
    async searchAndFillAddress($participant, cep) {
        if (this.isSearching) {
            console.log('⏳ Busca já em andamento...');
            return;
        }

        // Normaliza e valida o CEP
        if (cepDigits.length !== 8) {
            this.showError($participant, 'Informe um CEP válido com 8 dígitos.');
            this.enableManualInput($participant);
            return;
        }

        this.isSearching = true;

        // Mostrar loading (e limpar estados anteriores)
        this.showLoading($participant);

        try {
            // Buscar CEP usando o módulo cepValidation (deve existir no escopo)
            const resultado = await buscarCEP(cepDigits);

            if (resultado.erro) {
                
                // Se permitir manual, habilitar campos
                if (resultado.permitirManual) {
                    this.enableManualInput($participant);
                }
            } else {
                // Preencher campos com os dados
                this.fillAddressFields($participant, resultado);
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
        
        const $estado = $participant.find('.estado-select');
        if (typeof $estado.trigger === 'function') {
            $estado.trigger('change');
        }

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
        $feedback
            .stop(true, true)
            .html('<span class="calculating-indicator"></span> Buscando CEP...')
            .removeClass('error-message success-message')
            .addClass('loading-message')
            .show();

        $participant.find('.cep-input').removeClass('error success').prop('disabled', true);
    }

    // Ocultar loading
    hideLoading($participant) {
        $participant.find('.cep-input').prop('disabled', false);
    }

    // Mostrar erro
    showError($participant, mensagem) {
        const $feedback = $participant.find('.cep-feedback');
            .removeClass('success-message loading-message')
            .addClass('error-message')
            .show();

        $participant.find('.cep-input').removeClass('success').addClass('error');
    }

    // Mostrar sucesso
    showSuccess($participant, mensagem) {
        const $feedback = $participant.find('.cep-feedback');
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
                ${addressData.complemento ? `<p><strong>Complemento:</strong> ${addressData.complemento}</p>` : ''}
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
