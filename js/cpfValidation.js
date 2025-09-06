// Validação de CPF
function validateCPF($input) {
    const cpf = $input.val().replace(/\D/g, '');
    const $feedback = $input.siblings('.cpf-feedback');
    
    if (cpf.length !== 11) {
        showCPFError($input, $feedback, 'CPF deve ter 11 dígitos');
        return false;
    }
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cpf)) {
        showCPFError($input, $feedback, 'CPF inválido');
        return false;
    }
    
    // Validar dígitos verificadores
    if (!validateCPFDigits(cpf)) {
        showCPFError($input, $feedback, 'CPF inválido');
        return false;
    }
    
    showCPFSuccess($input, $feedback);
    return true;
}

function validateCPFDigits(cpf) {
    // Primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = 11 - (sum % 11);
    let digit1 = remainder >= 10 ? 0 : remainder;
    
    if (digit1 !== parseInt(cpf.charAt(9))) {
        return false;
    }
    
    // Segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = 11 - (sum % 11);
    let digit2 = remainder >= 10 ? 0 : remainder;
    
    return digit2 === parseInt(cpf.charAt(10));
}

function showCPFError($input, $feedback, message) {
    $input.addClass('error').removeClass('success');
    $feedback.text(message).removeClass('success-message').addClass('error-message');
}

function showCPFSuccess($input, $feedback) {
    $input.removeClass('error').addClass('success');
    $feedback.text('CPF válido').removeClass('error-message').addClass('success-message');
}

console.log('Validação de CPF carregada');
