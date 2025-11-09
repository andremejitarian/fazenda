// cepValidation.js - Módulo de busca e validação de CEP
class CEPValidator {
    constructor() {
        this.endpoints = {
            viaCEP: 'https://viacep.com.br/ws/{cep}/json/',
            brasilAPI: 'https://brasilapi.com.br/api/cep/v2/{cep}'
        };
        this.timeout = 8000; // 8 segundos
    }

    isValidFormat(cep) {
        const cepLimpo = cep.replace(/\D/g, '');
        return cepLimpo.length === 8 && /^\d{8}$/.test(cepLimpo);
    }

    cleanCEP(cep) {
        return cep.replace(/\D/g, '');
    }

    formatCEP(cep) {
        const cepLimpo = this.cleanCEP(cep);
        if (cepLimpo.length !== 8) return cep;
        return `${cepLimpo.substr(0, 5)}-${cepLimpo.substr(5, 3)}`;
    }

    // MELHORIA: Buscar CEP com fallback automático usando Promise.any
    async buscarCEP(cep) {
        const cepLimpo = this.cleanCEP(cep);

        if (!this.isValidFormat(cepLimpo)) {
            return {
                erro: true,
                mensagem: 'CEP deve conter 8 dígitos',
                permitirManual: false
            };
        }

        console.log(`🔍 Buscando CEP: ${this.formatCEP(cepLimpo)}`);

        try {
            // Tenta buscar em ambas as APIs e retorna a primeira que resolver com sucesso
            // Se uma promessa rejeitar, Promise.any espera pela próxima. Se todas rejeitarem,
            // o Promise.any rejeita com um AggregateError que é capturado no catch.
            const resultado = await Promise.any([
                this.buscarViaCEP(cepLimpo),
                this.buscarBrasilAPI(cepLimpo)
            ]);

            console.log(`✅ CEP encontrado via ${resultado.fonte}`);
            return resultado;

        } catch (error) {
            // Entra aqui se TODAS as promessas forem rejeitadas (AggregateError)
            console.warn('⚠️ Nenhuma API de CEP respondeu com sucesso ou encontrou o CEP:', error);
            // Podemos inspecionar error.errors para ver os erros individuais das promessas
            return {
                erro: true,
                mensagem: 'CEP não encontrado. Preencha o endereço manualmente.',
                permitirManual: true
            };
        }
    }

    // Buscar via ViaCEP
    async buscarViaCEP(cepLimpo) {
        const url = this.endpoints.viaCEP.replace('{cep}', cepLimpo);
    
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
    
        if (!response.ok) {
            // Rejeita a promessa para que Promise.any tente a próxima
            throw new Error(`ViaCEP: Falha na requisição HTTP (${response.status})`);
        }
    
        const data = await response.json();
    
        if (data.erro) {
            // Rejeita a promessa para que Promise.any tente a próxima
            throw new Error('ViaCEP: CEP não encontrado');
        }
    
        // CORREÇÃO: Retornar todos os campos necessários
        return {
            erro: false,
            cep: this.formatCEP(cepLimpo),  // ← LINHA ADICIONADA
            logradouro: data.logradouro,
            complemento: data.complemento,
            bairro: data.bairro,
            cidade: data.localidade, // ViaCEP usa 'localidade'
            estado: data.uf,         // ViaCEP usa 'uf'
            fonte: 'ViaCEP'
        };
    }

    // Buscar via BrasilAPI
    async buscarBrasilAPI(cepLimpo) {
        const url = this.endpoints.brasilAPI.replace('{cep}', cepLimpo);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
    
        if (!response.ok) {
            // Rejeita a promessa para que Promise.any tente a próxima
            throw new Error(`BrasilAPI: Falha na requisição HTTP (${response.status})`);
        }
    
        const data = await response.json();
        
        // A BrasilAPI retorna um objeto com 'name: "CepPromiseError"' se o CEP não for encontrado
        if (data && data.name === "CepPromiseError") {
             throw new Error('BrasilAPI: CEP não encontrado');
        }
    
        // CORREÇÃO: Retornar todos os campos necessários
        return {
            erro: false,
            cep: this.formatCEP(cepLimpo),  // ← LINHA ADICIONADA
            logradouro: data.street,      // BrasilAPI usa 'street'
            complemento: '',              // API não fornece diretamente
            bairro: data.neighborhood,  // BrasilAPI usa 'neighborhood'
            cidade: data.city,          // BrasilAPI usa 'city'
            estado: data.state,         // BrasilAPI usa 'state'
            fonte: 'BrasilAPI'
        };
    }
}

let cepValidator = null;

function initializeCEPValidator() {
    cepValidator = new CEPValidator();
    console.log('🔗 Validador de CEP inicializado');
}

async function buscarCEP(cep) {
    if (!cepValidator) {
        initializeCEPValidator();
    }
    return await cepValidator.buscarCEP(cep);
}

console.log('✅ Módulo cepValidation.js carregado');
