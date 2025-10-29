// cepValidation.js - Módulo de busca e validação de CEP
class CEPValidator {
    constructor() {
        this.endpoints = {
            viaCEP: 'https://viacep.com.br/ws/{cep}/json/',
            brasilAPI: 'https://brasilapi.com.br/api/cep/v2/{cep}'
        };
        this.timeout = 8000; // 8 segundos
    }

    // Validar formato do CEP
    isValidFormat(cep) {
        const cepLimpo = cep.replace(/\D/g, '');
        return cepLimpo.length === 8 && /^\d{8}$/.test(cepLimpo);
    }

    // Limpar CEP (remover caracteres não numéricos)
    cleanCEP(cep) {
        return cep.replace(/\D/g, '');
    }

    // Formatar CEP (00000-000)
    formatCEP(cep) {
        const cepLimpo = this.cleanCEP(cep);
        if (cepLimpo.length !== 8) return cep;
        return `${cepLimpo.substr(0, 5)}-${cepLimpo.substr(5, 3)}`;
    }

    // Buscar CEP com fallback automático
    async buscarCEP(cep) {
        const cepLimpo = this.cleanCEP(cep);

        // Validar formato
        if (!this.isValidFormat(cepLimpo)) {
            return {
                erro: true,
                mensagem: 'CEP deve conter 8 dígitos',
                permitirManual: false
            };
        }

        console.log(`🔍 Buscando CEP: ${this.formatCEP(cepLimpo)}`);

        // Tentar ViaCEP primeiro
        try {
            const resultado = await this.buscarViaCEP(cepLimpo);
            if (!resultado.erro) {
                console.log('✅ CEP encontrado via ViaCEP');
                return resultado;
            }
        } catch (error) {
            console.warn('⚠️ ViaCEP falhou:', error.message);
        }

        // Fallback para BrasilAPI
        try {
            const resultado = await this.buscarBrasilAPI(cepLimpo);
            if (!resultado.erro) {
                console.log('✅ CEP encontrado via BrasilAPI');
                return resultado;
            }
        } catch (error) {
            console.warn('⚠️ BrasilAPI falhou:', error.message);
        }

        // Ambas as APIs falharam
        return {
            erro: true,
            mensagem: 'CEP não encontrado. Preencha o endereço manualmente.',
            permitirManual: true
        };
    }

    // Buscar via ViaCEP
    async buscarViaCEP(cepLimpo) {
        const url = this.endpoints.viaCEP.replace('{cep}', cepLimpo);
    
        const response = await Promise.race([
            fetch(url),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout ViaCEP')), this.timeout)
            )
        ]);
    
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
    
        const data = await response.json();
    
        if (data.erro) {
            return {
                erro: true,
                mensagem: 'CEP não encontrado'
            };
        }
    
        return {
            erro: false,
            cep: this.formatCEP(cepLimpo),
            fonte: 'ViaCEP'
        };
    }

    // Buscar via BrasilAPI
    async buscarBrasilAPI(cepLimpo) {
        const url = this.endpoints.brasilAPI.replace('{cep}', cepLimpo);
    
        const response = await Promise.race([
            fetch(url),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout BrasilAPI')), this.timeout)
            )
        ]);
    
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
    
        const data = await response.json();
    
        return {
            erro: false,
            cep: this.formatCEP(cepLimpo),
            fonte: 'BrasilAPI'
        };
    }
    
}

// Instância global
let cepValidator = null;

// Inicializar validador
function initializeCEPValidator() {
    cepValidator = new CEPValidator();
    console.log('🔗 Validador de CEP inicializado');
}

// Função auxiliar para buscar CEP (compatibilidade)
async function buscarCEP(cep) {
    if (!cepValidator) {
        initializeCEPValidator();
    }
    return await cepValidator.buscarCEP(cep);
}

console.log('✅ Módulo cepValidation.js carregado');
