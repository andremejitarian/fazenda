/**
 * Módulo de validação de CPF
 * Implementa funções para validar CPF conforme algoritmo oficial
 */

// Função para validar CPF
function validarCPF(cpf) {
    // Remove caracteres não numéricos
    cpf = cpf.replace(/[^\d]/g, '');

    // Verifica se o CPF tem 11 dígitos
    if (cpf.length !== 11) {
        return false;
    }

    // Verifica se todos os dígitos são iguais (caso inválido)
    if (/^(\d)\1{10}$/.test(cpf)) {
        return false;
    }

    // Validação do primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = soma % 11;
    let digitoVerificador1 = resto < 2 ? 0 : 11 - resto;

    if (digitoVerificador1 !== parseInt(cpf.charAt(9))) {
        return false;
    }

    // Validação do segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = soma % 11;
    let digitoVerificador2 = resto < 2 ? 0 : 11 - resto;

    if (digitoVerificador2 !== parseInt(cpf.charAt(10))) {
        return false;
    }

    return true;
}

// Inicializa a validação de CPF nos campos quando o documento estiver pronto
$(document).ready(function() {
    // Aplica a máscara ao campo CPF
    $('.cpf-mask').mask('000.000.000-00');

    // Validação em tempo real do CPF
    $(document).on('blur', '.cpf-mask', function() {
        const cpfInput = $(this);
        const cpfValue = cpfInput.val();
        const errorMessage = cpfInput.siblings('.error-message');

        if (cpfValue.length > 0) {
            if (!validarCPF(cpfValue)) {
                errorMessage.text('CPF inválido. Por favor, verifique.');
                cpfInput.addClass('invalid-input');
            } else {
                errorMessage.text('');
                cpfInput.removeClass('invalid-input');
            }
        } else {
            errorMessage.text('');
            cpfInput.removeClass('invalid-input');
        }
    });
});
