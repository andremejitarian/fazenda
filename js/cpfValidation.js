// Validação de CPF/CNPJ
//
// Suporta o formato de CNPJ alfanumérico publicado pela Receita Federal
// (vigente a partir de 2026): 14 posições, sendo as 12 primeiras alfanuméricas
// [0-9A-Z] e as 2 últimas SEMPRE dígitos verificadores numéricos.
//
// CPF continua exclusivamente numérico (11 dígitos).
//
// Regra do DV (módulo 11, pesos cíclicos padrão do CNPJ):
// o valor de cada caractere = código ASCII - 48
//   '0'..'9' -> 0..9
//   'A'      -> 17 ... 'Z' -> 42

// Remove máscara (pontos, traço, barra, espaços) e força uppercase.
function normalizeCpfCnpj(value) {
    return (value || '')
        .toUpperCase()
        .replace(/[^0-9A-Z]/g, '');
}

// Formata para exibição.
// - <= 11 chars e só dígitos -> máscara de CPF (000.000.000-00)
// - caso contrário -> máscara de CNPJ (XX.XXX.XXX/XXXX-XX), aceitando letras
//   nas 12 primeiras posições.
function formatCpfCnpj(value) {
    const clean = normalizeCpfCnpj(value).slice(0, 14);

    const isCpfShape = clean.length <= 11 && /^[0-9]*$/.test(clean);

    if (isCpfShape) {
        // CPF: 000.000.000-00
        return clean
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }

    // CNPJ: XX.XXX.XXX/XXXX-XX (12 primeiras alfanuméricas, 2 últimas dígitos)
    let out = clean;
    if (out.length > 2) out = out.replace(/^([0-9A-Z]{2})([0-9A-Z])/, '$1.$2');
    if (out.length > 6) out = out.replace(/^([0-9A-Z]{2}\.[0-9A-Z]{3})([0-9A-Z])/, '$1.$2');
    if (out.length > 10) out = out.replace(/^([0-9A-Z]{2}\.[0-9A-Z]{3}\.[0-9A-Z]{3})([0-9A-Z])/, '$1/$2');
    if (out.length > 15) out = out.replace(/^([0-9A-Z]{2}\.[0-9A-Z]{3}\.[0-9A-Z]{3}\/[0-9A-Z]{4})([0-9]{1,2})/, '$1-$2');
    return out;
}

// Valor do caractere para o cálculo do DV: ASCII - 48.
function charValue(ch) {
    return ch.charCodeAt(0) - 48;
}

// Valida o DV de um CPF numérico (11 dígitos).
function isValidCpf(clean) {
    if (!/^[0-9]{11}$/.test(clean)) return false;
    if (/^(\d)\1{10}$/.test(clean)) return false; // rejeita sequências iguais

    const calcDigit = (len) => {
        let sum = 0;
        for (let i = 0; i < len; i++) {
            sum += parseInt(clean[i], 10) * (len + 1 - i);
        }
        const rest = (sum * 10) % 11;
        return rest === 10 ? 0 : rest;
    };

    return calcDigit(9) === parseInt(clean[9], 10) && calcDigit(10) === parseInt(clean[10], 10);
}

// Valida o DV de um CNPJ (numérico ou alfanumérico), 14 posições.
// As 12 primeiras podem ser [0-9A-Z]; as 2 últimas são dígitos verificadores.
function isValidCnpj(clean) {
    if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(clean)) return false;

    // Pesos cíclicos padrão do CNPJ (2..9 repetido), da direita p/ esquerda.
    const calcDigit = (len) => {
        let sum = 0;
        let weight = 2;
        for (let i = len - 1; i >= 0; i--) {
            sum += charValue(clean[i]) * weight;
            weight = weight === 9 ? 2 : weight + 1;
        }
        const rest = sum % 11;
        return rest < 2 ? 0 : 11 - rest;
    };

    return calcDigit(12) === parseInt(clean[12], 10) && calcDigit(13) === parseInt(clean[13], 10);
}

// Valida um documento (CPF ou CNPJ) já normalizado ou com máscara.
// Retorna true também para string vazia (documento é opcional no cadastro).
function isValidCpfCnpj(value) {
    const clean = normalizeCpfCnpj(value);
    if (clean.length === 0) return true; // opcional
    if (clean.length === 11) return isValidCpf(clean);
    if (clean.length === 14) return isValidCnpj(clean);
    return false; // comprimento inesperado
}

// ------------------------------------------------------------------
// Integração com o formulário (jQuery): mantém a API validateCPF($input)
// já usada pelo restante do app, agora apoiada nos helpers acima.
// Também aceita uma string simples (usado pelos testes em tests/), caso em
// que não há elemento de feedback na tela para atualizar.
// ------------------------------------------------------------------
function validateCPF($input) {
    const isJQueryLike = $input && typeof $input.val === 'function';
    const raw = isJQueryLike ? $input.val() : ($input || '');
    const clean = normalizeCpfCnpj(raw);
    const $feedback = isJQueryLike ? $input.siblings('.cpf-feedback') : null;

    if (clean.length === 11) {
        if (isValidCpf(clean)) {
            if (isJQueryLike) showCPFSuccess($input, $feedback, 'CPF válido');
            return true;
        }
        if (isJQueryLike) showCPFError($input, $feedback, 'CPF inválido');
        return false;
    } else if (clean.length === 14) {
        if (isValidCnpj(clean)) {
            if (isJQueryLike) showCPFSuccess($input, $feedback, 'CNPJ válido');
            return true;
        }
        if (isJQueryLike) showCPFError($input, $feedback, 'CNPJ inválido');
        return false;
    } else {
        if (isJQueryLike) showCPFError($input, $feedback, 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 caracteres');
        return false;
    }
}

function showCPFError($input, $feedback, message) {
    $input.addClass('error').removeClass('success');
    $feedback.text(message).removeClass('success-message').addClass('error-message');
}

function showCPFSuccess($input, $feedback, message) {
    message = message || 'CPF válido';
    $input.removeClass('error').addClass('success');
    $feedback.text(message).removeClass('error-message').addClass('success-message');
}

// Disponibiliza os helpers globalmente (mesmo padrão de window.priceCalculator).
window.cpfValidation = {
    normalizeCpfCnpj,
    formatCpfCnpj,
    isValidCpf,
    isValidCnpj,
    isValidCpfCnpj,
    validateCPF
};

console.log('Validação de CPF/CNPJ carregada');
