// cpfValidation.js — validação básica de CPF (algoritmo oficial)
(function(){
  function clean(cpf){ return (cpf || '').replace(/\D+/g, ''); }

  function validateCPF(cpf){
    cpf = clean(cpf);
    if(!cpf || cpf.length !== 11) return false;
    if(/^([0-9])\1{10}$/.test(cpf)) return false; // todos iguais
    const arr = cpf.split('').map(d=>parseInt(d,10));
    // first digit
    let sum=0;
    for(let i=0;i<9;i++) sum += arr[i] * (10 - i);
    let rev = 11 - (sum % 11);
    if(rev === 10 || rev === 11) rev = 0;
    if(rev !== arr[9]) return false;
    // second
    sum = 0;
    for(let i=0;i<10;i++) sum += arr[i] * (11 - i);
    rev = 11 - (sum % 11);
    if(rev === 10 || rev === 11) rev = 0;
    if(rev !== arr[10]) return false;
    return true;
  }

  window.cpfValidation = { validateCPF };
})();
