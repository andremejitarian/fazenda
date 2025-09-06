// Sistema de integração com webhooks
class WebhookIntegration {
    constructor() {
        this.endpoints = {
            submission: 'https://criadordigital-n8n-webhook.kttqgl.easypanel.host/webhook/c51bd45c-c232-44db-8490-f52f22ae34ce',
            preload: 'https://criadordigital-n8n-webhook.kttqgl.easypanel.host/webhook/preload-evento',
            paymentLink: null // Será definido por evento ou usará o endpoint de submission
        };
        this.timeout = 10000; // 10 segundos
        this.retryAttempts = 3;
    }

    // Pré-carregar dados do evento via webhook
    async preloadEventData(eventoId) {
        try {
            console.log(`Tentando pré-carregar evento via webhook: ${eventoId}`);
            
            const response = await this.makeRequest('GET', this.endpoints.preload, null, {
                evento: eventoId
            });

            if (response && response.evento) {
                console.log('Dados do evento carregados via webhook:', response.evento);
                return response.evento;
            } else {
                throw new Error('Resposta inválida do webhook de pré-carregamento');
            }
        } catch (error) {
            console.warn('Falha no pré-carregamento via webhook:', error.message);
            console.log('Fallback: carregando do arquivo JSON local');
            return null; // Fallback para JSON local
        }
    }

    // Submeter formulário via webhook
    async submitForm(formData) {
        try {
            console.log('Enviando formulário via webhook...');
            
            const response = await this.makeRequest('POST', this.endpoints.submission, formData);
            
            if (response) {
                console.log('Formulário enviado com sucesso:', response);
                return {
                    success: true,
                    data: response,
                    paymentLink: response.link || null
                };
            } else {
                throw new Error('Resposta vazia do servidor');
            }
        } catch (error) {
            console.error('Erro ao enviar formulário:', error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    // Gerar link de pagamento
    async generatePaymentLink(formData) {
        try {
            const endpoint = currentEvent?.payment_link_webhook_url || this.endpoints.submission;
            console.log('Gerando link de pagamento...');
            
            const payloadForPayment = this.preparePaymentPayload(formData);
            const response = await this.makeRequest('POST', endpoint, payloadForPayment);
            
            if (response && response.link) {
                console.log('Link de pagamento gerado:', response.link);
                return {
                    success: true,
                    link: response.link,
                    provider: response.provider || 'gateway',
                    expiresAt: response.expires_at || null
                };
            } else {
                throw new Error('Link de pagamento não retornado');
            }
        } catch (error) {
            console.error('Erro ao gerar link de pagamento:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Preparar payload para geração de link de pagamento
    preparePaymentPayload(formData) {
        return {
            inscricao_id: formData.inscricao_id,
            evento: formData.evento,
            responsavel: formData.responsavel,
            participantes: formData.participantes.map(p => ({
                nome: p.fullName,
                cpf: p.cpf,
                valorHospedagem: p.valorHospedagem,
                valorEvento: p.valorEvento
            })),
            totals: formData.totais,
            forma_pagamento: formData.forma_pagamento,
            cupom: formData.cupom,
            meta: {
                origin: 'frontend',
                lang: 'pt-BR',
                timestamp: formData.timestamp
            }
        };
    }

    // Fazer requisição HTTP com retry
    async makeRequest(method, url, data = null, params = null) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                console.log(`Tentativa ${attempt}/${this.retryAttempts} para ${method} ${url}`);
                
                const config = {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    timeout: this.timeout
                };

                // Adicionar dados ao corpo da requisição
                if (data && (method === 'POST' || method === 'PUT')) {
                    config.body = JSON.stringify(data);
                }

                // Adicionar parâmetros de query
                let requestUrl = url;
                if (params) {
                    const queryString = new URLSearchParams(params).toString();
                    requestUrl += (url.includes('?') ? '&' : '?') + queryString;
                }

                // Fazer requisição com timeout
                const response = await Promise.race([
                    fetch(requestUrl, config),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout')), this.timeout)
                    )
                ]);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();
                console.log(`Sucesso na tentativa ${attempt}:`, result);
                return result;

            } catch (error) {
                lastError = error;
                console.warn(`Tentativa ${attempt} falhou:`, error.message);
                
                if (attempt < this.retryAttempts) {
                    // Aguardar antes da próxima tentativa (backoff exponencial)
                    const delay = Math.pow(2, attempt) * 1000;
                    console.log(`Aguardando ${delay}ms antes da próxima tentativa...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError;
    }

    // Validar conectividade
    async testConnection() {
        try {
            const response = await fetch(this.endpoints.submission, {
                method: 'HEAD',
                timeout: 5000
            });
            return response.ok;
        } catch (error) {
            console.warn('Teste de conectividade falhou:', error.message);
            return false;
        }
    }
}

// Instância global do integrador
let webhookIntegration = null;

// Inicializar integração
function initializeWebhookIntegration() {
    webhookIntegration = new WebhookIntegration();
    console.log('Integração com webhooks inicializada');
}

// Testar conectividade na inicialização
async function testWebhookConnectivity() {
    if (!webhookIntegration) return false;
    
    const isConnected = await webhookIntegration.testConnection();
    console.log('Conectividade com webhooks:', isConnected ? 'OK' : 'FALHA');
    return isConnected;
}

console.log('Sistema de integração com webhooks carregado');
