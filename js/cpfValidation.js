// Validação de CPF/CNPJ
function validateCPF($input) {
    const value = $input.val().replace(/\D/g, '');
    const $feedback = $input.siblings('.cpf-feedback');

    if (value.length === 11) {
        return validateCPFDigits11(value, $input, $feedback);
    } else if (value.length === 14) {
        return validateCNPJDigits(value, $input, $feedback);
    } else {
        showCPFError($input, $feedback, 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos');
        return false;
    }
}

function validateCPFDigits11(cpf, $input, $feedback) {
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cpf)) {
        showCPFError($input, $feedback, 'CPF inválido');
        return false;
    }

    // Primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = 11 - (sum % 11);
    let digit1 = remainder >= 10 ? 0 : remainder;

    if (digit1 !== parseInt(cpf.charAt(9))) {
        showCPFError($input, $feedback, 'CPF inválido');
        return false;
    }

    // Segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = 11 - (sum % 11);
    let digit2 = remainder >= 10 ? 0 : remainder;

    if (digit2 !== parseInt(cpf.charAt(10))) {
        showCPFError($input, $feedback, 'CPF inválido');
        return false;
    }

    showCPFSuccess($input, $feedback, 'CPF válido');
    return true;
}

function validateCNPJDigits(cnpj, $input, $feedback) {
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1{13}$/.test(cnpj)) {
        showCPFError($input, $feedback, 'CNPJ inválido');
        return false;
    }

    // Primeiro dígito verificador
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(cnpj.charAt(i)) * weights1[i];
    }
    let remainder = sum % 11;
    let digit1 = remainder < 2 ? 0 : 11 - remainder;

    if (digit1 !== parseInt(cnpj.charAt(12))) {
        showCPFError($input, $feedback, 'CNPJ inválido');
        return false;
    }

    // Segundo dígito verificador
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    sum = 0;
    for (let i = 0; i < 13; i++) {
        sum += parseInt(cnpj.charAt(i)) * weights2[i];
    }
    remainder = sum % 11;
    let digit2 = remainder < 2 ? 0 : 11 - remainder;

    if (digit2 !== parseInt(cnpj.charAt(13))) {
        showCPFError($input, $feedback, 'CNPJ inválido');
        return false;
    }

    showCPFSuccess($input, $feedback, 'CNPJ válido');
    return true;
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

console.log('Validação de CPF/CNPJ carregada');
