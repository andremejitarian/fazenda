// webhookIntegration.js - Versão final sem preload
class WebhookIntegration {
    constructor() {
        this.endpoints = {
            submission: 'https://criadordigital-n8n-webhook.kttqgl.easypanel.host/webhook/5fd5f5c1-6d60-4c4f-a463-cc9b0302afae'
        };
        this.timeout = 15000;
        this.retryAttempts = 2;
    }

    // APENAS a função submitForm - SEM preloadEventData
    async submitForm(formData) {
        try {
            console.log('=== ENVIANDO FORMULÁRIO PARA WEBHOOK ===');
            console.log('URL:', this.endpoints.submission);
            console.log('Dados enviados:', JSON.stringify(formData, null, 2));
            
            const response = await this.makeRequest('POST', this.endpoints.submission, formData);
            
            if (response) {
                console.log('✅ Resposta do webhook recebida:', response);
                
                return {
                    success: true,
                    data: {
                        message: response.message || 'Inscrição processada com sucesso',
                        link: response.link || response.payment_link || response.pagamento_link
                    }
                };
            } else {
                throw new Error('Resposta vazia do webhook');
            }
        } catch (error) {
            console.error('❌ Erro ao enviar para webhook:', error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    async makeRequest(method, url, data = null) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                console.log(`🔄 Tentativa ${attempt}/${this.retryAttempts} para ${method} ${url}`);
                
                const config = {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    mode: 'cors'
                };

                if (data && method === 'POST') {
                    config.body = JSON.stringify(data);
                    console.log('📤 JSON enviado:', config.body);
                }

                const response = await Promise.race([
                    fetch(url, config),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout da requisição')), this.timeout)
                    )
                ]);

                console.log('📡 Status HTTP:', response.status, response.statusText);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ Erro HTTP:', response.status, errorText);
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const contentType = response.headers.get('content-type');
                let result;
                
                if (contentType && contentType.includes('application/json')) {
                    result = await response.json();
                } else {
                    const textResult = await response.text();
                    try {
                        result = JSON.parse(textResult);
                    } catch {
                        result = { message: textResult };
                    }
                }

                console.log(`✅ Sucesso na tentativa ${attempt}:`, result);
                return result;

            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Tentativa ${attempt} falhou:`, error.message);
                
                if (attempt < this.retryAttempts) {
                    const delay = 1000 * attempt;
                    console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError;
    }

    async testConnection() {
        try {
            const response = await fetch(this.endpoints.submission, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ test: true }),
                timeout: 5000
            });
            
            return response.status < 500;
        } catch (error) {
            console.warn('❌ Teste de conectividade falhou:', error.message);
            return false;
        }
    }
}

let webhookIntegration = null;

function initializeWebhookIntegration() {
    webhookIntegration = new WebhookIntegration();
    console.log('🔗 Integração com webhook inicializada (sem preload)');
}

async function testWebhookConnectivity() {
    if (!webhookIntegration) return false;
    
    const isConnected = await webhookIntegration.testConnection();
    console.log('🌐 Conectividade com webhook:', isConnected ? 'OK' : 'FALHA');
    return isConnected;
}
