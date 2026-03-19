// webhookIntegration.js - Versão final SEM testes automáticos
class WebhookIntegration {
    constructor() {
        this.endpoints = {
            submission: 'https://andremejitarian--pranna-webhook-server-fastapi-app.modal.run/api/webhooks/prod/fazenda-serrinha/fazenda-checkin-grupos?secret=6f0a9e372a658fede926e6b001a92b431b98bdc5c6034dbf274a076ac98949f1&sync=true'
        };
        this.timeout = 60000;
        this.retryAttempts = 1;
        this.submissionInProgress = false;
    }

    // APENAS a função submitForm
    async submitForm(formData) {
        // Proteção contra submissões duplicadas
        if (this.submissionInProgress) {
            console.warn('⚠️ Submissão já em andamento, ignorando nova tentativa');
            return { success: false, error: 'Submissão já em andamento' };
        }

        // Validação básica dos dados
        if (!formData || !formData.inscricao_id) {
            console.error('❌ Dados inválidos para submissão:', formData);
            return { success: false, error: 'Dados inválidos' };
        }

        this.submissionInProgress = true;

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
                        link: response.output?.link || response.link || response.payment_link || response.pagamento_link
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
        } finally {
            this.submissionInProgress = false;
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
}

let webhookIntegration = null;

function initializeWebhookIntegration() {
    webhookIntegration = new WebhookIntegration();
    console.log('🔗 Integração com webhook inicializada (apenas para submissão)');
}
