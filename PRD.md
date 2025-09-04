## 📄 Product Requirement Document (PRD) - COMPLETO

### 1. Título do Projeto

**Formulário de Inscrição e Reserva para Retiros – Fazenda Serrinha**

### 2. Versão e Data

*   **Versão:** 2.1 (Completa)
*   **Data:** 04/09/2025
*   **Elaborado por:** André

### 3. Introdução e Objetivo

#### 3.1. Contexto
A **Fazenda Serrinha** é um hotel rural que hospeda retiros e eventos. O processo atual de registro e venda de pacotes de hospedagem e participação em eventos é predominantemente manual, o que gera ineficiências e retrabalho. Há uma necessidade clara de automatizar e otimizar este processo para garantir precisão, escalabilidade e uma melhor experiência para os participantes e para a gestão do hotel.

#### 3.2. Problema a ser Resolvido
Os métodos atuais de inscrição para retiros e eventos da Fazenda Serrinha não permitem a fácil gestão de múltiplos participantes em uma única reserva, a aplicação dinâmica de regras de precificação complexas (como por idade), a utilização de cupons de desconto de forma flexível, e a designação de um responsável pelo pagamento em reservas de grupo. A falta de um ID único para cada inscrição dificulta o rastreamento e a comunicação. A manutenção manual dos detalhes de cada evento consome tempo e é propensa a erros. Adicionalmente, a necessidade de flexibilizar o formulário para atender eventos que separam a inscrição da hospedagem da inscrição do evento é crucial.

#### 3.3. Objetivo do Formulário
Criar um formulário online intuitivo e dinâmico que permita aos participantes:
*   Registrar seus dados pessoais completos (incluindo data de nascimento para precificação).
*   Adicionar e gerenciar múltiplos participantes em uma única submissão do formulário.
*   **Adaptar-se dinamicamente para coletar dados apenas de hospedagem, apenas de evento, ou de ambos**, conforme a configuração do evento no JSON.
*   Para cada participante, selecionar opções de hospedagem (tipo de acomodação e período de estadia com horários de check-in/out simplificados para hora e minuto) e/ou de participação no evento, com os valores de evento **vinculados ao período de estadia selecionado (quando aplicável)**, e todos os valores calculados dinamicamente com base em regras de idade e de evento definidas em um arquivo JSON.
*   Aplicar cupons de desconto válidos para o evento, com regras de aplicação (total, hospedagem ou evento) e tipo de desconto (percentual ou fixo) também definidas no JSON, sem a necessidade de um valor mínimo de compra.
*   Designar um único responsável pelo pagamento para toda a reserva quando houver múltiplos participantes.
*   Visualizar o valor total a ser pago, incluindo todos os cálculos e descontos aplicados, **e considerando internamente as taxas de gateway de pagamento**, de forma clara e transparente.
*   Indicar a forma de pagamento preferida através de um **dropdown**.
*   Gerar um ID de inscrição único para cada nova submissão.
*   Experimentar uma interface simplificada, onde opções únicas de seleção são apresentadas apenas como texto informativo, evitando cliques desnecessários.
*   **Pré-preenchimento automático de campos através de token de evento via webhook**.
*   Agilizar e otimizar todo o processo de inscrição e reserva para a **Fazenda Serrinha**.

#### 3.4. Público-Alvo
*   **Usuários Finais:** Participantes dos Retiros (indivíduos que preencherão o formulário para si e/ou para um grupo).
*   **Gestor do Conteúdo:** André (Hotel Manager da Fazenda Serrinha), responsável pela manutenção do arquivo JSON que configura todos os detalhes dos eventos, regras de precificação e cupons.

### 4. Requisitos Técnicos

#### 4.1. Frontend
*   **Tecnologias:** HTML5, CSS3, JavaScript (jQuery v3.6.0)
*   **Estrutura Modular:** Scripts organizados em módulos específicos:
    *   `js/script.js` - Script principal e controle de fluxo
    *   `js/priceCalculator.js` - Cálculos de preços e regras de idade
    *   `js/cpfValidation.js` - Validação interna de CPF
*   **Dados:** Eventos armazenados em `eventos.json`
*   **Máscaras de Input:** jQuery Mask (v1.14.16) para formatação de campos
*   **Assets:** Imagens e recursos organizados em pastas específicas

#### 4.2. Validações e Formatações

##### 4.2.1. Campo CPF
*   **Tipo:** Texto com máscara \"000.000.000-00\"
*   **Obrigatório:** Sim
*   **Validação:** Script JavaScript interno usando algoritmo de validação de CPF
*   **Feedback:** Mensagens de erro claras em caso de CPF inválido

##### 4.2.2. Campo Telefone
*   **Tipo:** Texto com máscara \"(00) 00000-0000\"
*   **Obrigatório:** Sim

#### 4.3. Pré-preenchimento de Campos

##### 4.3.1. Preenchimento Automático via Webhook (Token de Evento)
*   **Detecção de Parâmetro:** O formulário deve detectar a presença do parâmetro `evento` na URL (ex: `https://fazendaserrinha.com/?evento=003`)
*   **Chamada ao Webhook:** Se o parâmetro for encontrado, realizar chamada fetch para:
    *   **Endpoint:** `https://criadordigital-n8n-webhook.kttqgl.easypanel.host/webhook/sua_webhook_de_consulta_dados_evento`
    *   **Método:** GET
    *   **Parâmetro:** `?evento=003`
*   **Processamento da Resposta:**
    *   O webhook do N8N consultará fonte de dados (Google Sheets, banco de dados) usando o evento como chave
    *   Retornará objeto JSON abrangente com todos os dados do evento
    *   O formulário parseará a resposta e pré-preencherá campos correspondentes
*   **Tratamento de Falhas:** Em caso de falha na consulta ou ausência do parâmetro, o formulário iniciará vazio

### 5. Wireframes Textuais

Esta seção apresenta a estrutura visual e organizacional de cada tela do formulário, descrevendo o layout, posicionamento dos elementos e fluxo de navegação.

#### 5.1. Tela 1: Boas-Vindas e Informações do Evento

```
┌─────────────────────────────────────────────────────────────┐
│ [Banner com imagem da Fazenda Serrinha]                     │
│ [Logo circular à esquerda]                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                INSCRIÇÃO NO EVENTO                  │   │
│  │                                                     │   │
│  │  🌿 [Boas-vindas]                                   │   │
│  │  📅 [NOME DO EVENTO - carregado do JSON]           │   │
│  │  📝 [DESCRIÇÃO DO EVENTO - carregada do JSON]      │   │
│  │  ℹ️  [OBSERVAÇÕES ADICIONAIS - se houver]          │   │
│  │                                                     │   │
│  │  [Dados do participante]                           │   │
│  │  [Informações de contato]                          │   │
│  │  [Preferências/Opções do evento]                   │   │
│  │  [Forma de pagamento]                              │   │
│  │  [Cupom de desconto]                               │   │
│  │  [Resumo da inscrição]                             │   │
│  │  [Aceite dos termos]                               │   │
│  │                                                     │   │
│  │  [Botões: Voltar / Avançar / Finalizar]            │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Elementos da Tela:**
- Header com logo
- Seção central com informações do evento carregadas dinamicamente do JSON
- Botão de call-to-action para iniciar o processo de inscrição

#### 5.2. Tela 2: Dados dos Participantes e Escolhas Individuais

```
┌─────────────────────────────────────────────────────────────┐
│ [Banner com imagem da Fazenda Serrinha]                     │
│ [Logo circular à esquerda]                                  │
│                                                             │
│  👥 DADOS DOS PARTICIPANTES                                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              👤 PARTICIPANTE 1                      │   │
│  │                                                     │   │
│  │  Nome Completo: [________________]                  │   │
│  │  Telefone:      [(00) 00000-0000]                  │   │
│  │  CPF:           [000.000.000-00]                   │   │
│  │  E-mail:        [________________]                  │   │
│  │  Data Nasc.:    [DD/MM/AAAA]                       │   │
│  │                                                     │   │
│  │  ┌─ HOSPEDAGEM (se aplicável) ─────────────────┐   │   │
│  │  │ Período Estadia: [Dropdown/Texto Info]     │   │   │
│  │  │ Check-in:  [DD/MM/AAAA HH:MM] (bloqueado)  │   │   │
│  │  │ Check-out: [DD/MM/AAAA HH:MM] (bloqueado)  │   │   │
│  │  │ Acomodação: [Dropdown/Texto Info]          │   │   │
│  │  │ 💰 Valor Hospedagem: R\$ XXX,XX             │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  ┌─ EVENTO (se aplicável) ──────────────────────┐   │   │
│  │  │ Participação: [Dropdown/Texto Info]         │   │   │
│  │  │ 💰 Valor Evento: R\$ XXX,XX                  │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  ☑️ Responsável pelo Pagamento (se > 1 participante) │   │
│  │                                                     │   │
│  │                               [❌ Remover]          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                    [➕ ADICIONAR PARTICIPANTE]              │
│                                                             │
│                                                             │
│                        [PRÓXIMO]                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Elementos da Tela:**
- Blocos de participantes expansíveis/removíveis
- Campos condicionais baseados no `tipo_formulario`
- Cálculos dinâmicos em tempo real
- Validações inline para CPF e outros campos

#### 5.3. Tela 3: Resumo Geral e Pagamento

```
┌─────────────────────────────────────────────────────────────┐
│ [Banner com imagem da Fazenda Serrinha]                     │
│ [Logo circular à esquerda]                                  │
│                                                             │
│  🧾 RESUMO E PAGAMENTO                                     │
│                                                             │
│  ┌─ RESPONSÁVEL PELO PAGAMENTO ─────────────────────────┐   │
│  │ 👤 [Nome do Responsável]                            │   │
│  │  CPF: [000.000.000-00]                               │   │
│  │ 📧 [email@responsavel.com]                          │   │
│  │ 📱 [(00) 00000-0000]                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─ DETALHAMENTO POR PESSOA       ──────────────────────┐   │
│  │                                                     │   │
│  │ 👤 Participante 1:                                  │   │
│  │    [Nome]                                           │   │
│  │    Hospedagem: [Tipo]                               │   │
│  │    Período: [Período]                               │   │
│  │    Valor da hospedagm: R\$ XXX,XX                   │   │
│  │    Evento: [Opção]                                  │   │
│  │    Valor do Evento: R\$ XXX,XX                      │   │
│  │                                                     │   │
│  │ 👤 Participante 2:                                  │   │
│  │    [Nome]                                           │   │
│  │    Hospedagem: [Tipo]                               │   │
│  │    Período: [Período]                               │   │
│  │    Valor da hospedagm: R\$ XXX,XX                   │   │
│  │    Evento: [Opção]                                  │   │
│  │    Valor do Evento: R\$ XXX,XX                      │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─ FORMA DE PAGAMENTO ──────────────────────────────────┐   │
│  │ Método: [Dropdown/Texto Info]                       │   │
│  │ Descrição: [Detalhes do método selecionado]         │   │
│  └─────────────────────────────────────────────────────┘   │

│  ┌─ TOTAIS ──────────────────────────────────────────────┐   │
│  │ Subtotal Hospedagem:    R\$ XXX,XX                   │   │
│  │ Subtotal Evento:        R\$ XXX,XX                   │   │
│  │ Desconto Cupom:         -R\$ XX,XX                   │   │
│  │ ─────────────────────────────────                   │   │
│  │ 💰 TOTAL A PAGAR:         R\$ XXX,XX                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─ CUPOM DE DESCONTO ───────────────────────────────────┐   │
│  │ Código: [____________] [APLICAR CUPOM]               │   │
│  │ ✅ Desconto aplicado: (CUPOMVALIDO)                  │   │
│  │ ❌ Cupom inválido ou expirado                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                                                             │
│  ☑️ Li e concordo com os [Termos e Condições]              │
│                                                             │
│            [CONFIRMAR INSCRIÇÃO E PROSSEGUIR]              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Elementos da Tela:**
- Identificação clara do responsável pelo pagamento
- Detalhamento completo por participante
- Seção de cupom com feedback visual
- Seleção de forma de pagamento
- Cálculo final com todas as taxas inclusas
- Checkbox obrigatório para termos e condições

#### 5.4. Tela 4: Confirmação e Próximos Passos

```
┌─────────────────────────────────────────────────────────────┐
│ [Banner com imagem da Fazenda Serrinha]                     │
│ [Logo circular à esquerda]                                  │
│                                                             │
│                     ✅ INSCRIÇÃO CONFIRMADA!                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    �� SUCESSO!                      │   │
│  │                                                     │   │
│  │  Sua inscrição na Fazenda Serrinha foi             │   │
│  │  enviada com sucesso!                               │   │
│  │                                                     │   │
│  │  �� ID da Inscrição: #FS2025001234                  │   │
│  │                                                     │   │
│  │  💰 Valor Total: R\$ XXX,XX                          │   │
│  │  💳 Forma de Pagamento: [Método Selecionado]        │   │
│  │                                                     │   │
│  │  📧 Clique no botão abaixo para realizar o          │   │
│  │      pagamento.                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                                                             │
│                   [BOTAO COM LINK DE PAGAMENTO]             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Elementos da Tela:**
- Confirmação visual clara de sucesso
- ID único da inscrição em destaque
- Resumo dos valores e método de pagamento
- Botão de acesso ao link de pagamento

#### 5.5. Estados de Erro e Carregamento

```
┌─ ESTADO DE CARREGAMENTO ──────────────────────────────────┐
│                                                           │
│              🔄 Carregando dados do evento...             │
│                     [Spinner/Loading]                    │
│                                                           │
└───────────────────────────────────────────────────────────┘

┌─ ESTADO DE ERRO ──────────────────────────────────────────┐
│                                                           │
│                    ❌ Ops! Algo deu errado                │
│                                                           │
│  Não foi possível carregar os dados do evento.           │
│  Verifique o link ou tente novamente.                     │
│                                                           │
│              [TENTAR NOVAMENTE] [CONTATO]                 │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### 6. Funcionalidades Principais

O formulário deverá oferecer as seguintes funcionalidades:

*   **Carregamento Dinâmico por URL:** Todos os detalhes específicos de um evento (título, descrição, opções de acomodação, períodos de estadia, valores do evento, regras de precificação por idade e cupons) serão carregados a partir de um arquivo JSON, com base em um ID de evento passado via parâmetro de URL (`?evento=ID`).
*   **Geração de ID Único:** Cada nova inscrição bem-sucedida gerará um identificador único (`inscricao`) para rastreamento e comunicação futura.
*   **Configuração Dinâmica do Tipo de Formulário:** O formulário adaptará seus campos e fluxo com base no campo `tipo_formulario` no JSON do evento:
    *   `hospedagem_apenas`: Exibirá apenas campos e cálculos relacionados à hospedagem.
    *   `evento_apenas`: Exibirá apenas campos e cálculos relacionados ao evento/retiro.
    *   `hospedagem_e_evento`: Exibirá todos os campos e cálculos, integrando hospedagem e evento.
*   **Registro de Múltiplos Participantes:** Capacidade de adicionar múltiplos blocos de inscrição, cada um para um participante distinto, dentro da mesma submissão.
*   **Dados do Participante:** Coleta de informações essenciais para cada participante: Nome Completo, Telefone de Contato, CPF, Endereço de E-mail e Data de Nascimento.
*   **Escolhas Individuais por Participante (Condicional pelo `tipo_formulario`):** Para cada participante, permitir a seleção independente de:
    *   **Se `hospedagem_apenas` ou `hospedagem_e_evento`:**
        *   Tipo de acomodação (cada participante equivale a uma pessoa na acomodação).
        *   Período de estadia (Check-in/Check-out com data e hora simplificada para hora e minuto).
    *   **Se `evento_apenas` ou `hospedagem_e_evento`:**
        *   Opção de valor de participação no evento.
            *   Se `hospedagem_e_evento`: as opções de evento serão vinculadas e filtradas com base no `Período de Estadia` selecionado.
            *   Se `evento_apenas`: as opções de evento serão as definidas no nível superior do evento no JSON.
*   **Precificação por Idade (JSON-driven):**
    *   As regras de desconto por idade para **HOSPEDAGEM** e para **PARTICIPAÇÃO NO EVENTO** serão definidas no JSON do evento.
    *   Estas regras incluirão faixas etárias (`faixa_min_anos`, `faixa_max_anos`) e o percentual do valor de adulto a ser aplicado (`percentual_valor_adulto`).
    *   A lógica de gratuidade para crianças de 0 a 4 anos será aplicada: uma criança nesta faixa por reserva terá gratuidade, as demais nesta faixa etária e as crianças de 5 a 10 anos terão um percentual de desconto (ex: 50% do valor adulto), conforme configurado no JSON (`limite_gratuidade_por_reserva` e `regra_excedente_gratuito`).
*   **Designação de Responsável pelo Pagamento:** Quando houver dois ou mais participantes, um campo de seleção (checkbox/radio button) será exibido em cada bloco de participante para que *apenas um* deles seja marcado como o responsável pelo pagamento. Este campo será obrigatório nesta condição.
*   **Cupom de Desconto (JSON-driven):**
    *   Um campo de texto será disponibilizado na tela final para inserção do código do cupom.
    *   A validação do cupom será feita contra os dados `cupons_desconto` definidos no JSON do evento, verificando: código, validade (`data_validade_fim`), tipo de desconto (`percentual` ou `fixo`), e o local de `aplicacao` (sobre o valor `total`, `hospedagem` ou `evento`).
    *   **Não haverá validação de um valor mínimo de compra para a aplicação do cupom.**
    *   O desconto será aplicado ao `VALOR TOTAL GERAL A PAGAR`.
*   **Cálculo Total Agregado (com Taxa de Gateway):** O formulário calculará e exibirá o valor total a ser pago, somando os valores de hospedagem e evento de *todos* os participantes (após aplicação das regras de precificação por idade) e subtraindo o desconto do cupom aplicado. **Este valor final exibido ao usuário já incluirá a `taxa_gateway_percentual` da forma de pagamento selecionada, que será aplicada internamente ao valor base, ou seja, o valor exibido ao usuario final já será com as taxas do gateway inclusas.**
*   **Formas de Pagamento Dinâmicas:** O participante selecionará uma forma de pagamento entre as opções disponíveis para o evento através de um **dropdown**, conforme configurado no JSON. Cada evento pode ter diferentes formas de pagamento.
*   **Display de Opções Simplificado:** Para campos de seleção (Tipo de Acomodação, Período de Estadia, Valor de Participação no Evento, Forma de Pagamento), se houver **apenas uma única opção** disponível para o evento (conforme o JSON), esta opção não será apresentada como um elemento selecionável (dropdown), mas sim como um **texto informativo não editável**, simplificando a interface.
*   **Resumo e Confirmação:** Uma tela final para revisão de todos os dados e valores antes da submissão.
*   **Notificações:** Envio automático de confirmações por e-mail para o **responsável pelo pagamento** e para a administração da **Fazenda Serrinha**, incluindo o ID único da inscrição através de integração com n8n.

### 7. Fluxo de Usuário (User Flow)

Este fluxo descreve a jornada do participante ao preencher o formulário:

1.  **Acesso ao Formulário:**
    *   O participante acessa o formulário através de uma URL específica do evento (ex: `https://fazendaserrinha.com.br/?evento=G001`).
    *   O sistema identifica o ID do evento (`G001`) **via fetch por webhook N8N** e busca o objeto correspondente no arquivo JSON de eventos e pré-carrega todos os dados do evento, incluindo regras de precificação por idade, cupons de desconto, e o `tipo_formulario`.
    *   **Pré-preenchimento:** Se o parâmetro `evento` for detectado, o sistema fará chamada ao webhook de pré-preenchimento para buscar dados do evento.
    *   **Tratamento de Erros:** Se o `evento` ID não for encontrado no JSON, o formulário exibirá uma mensagem de erro clara ou redirecionará para uma página padrão (ex: página inicial da Fazenda Serrinha ou página de contato).

2.  **Tela 1: Boas-Vindas e Informações do Evento:**
    *   A tela exibe uma mensagem de boas-vindas da **Fazenda Serrinha**.
    *   O `nome` e a `descricao` do evento, carregados do JSON, são exibidos para confirmar que o formulário é para o retiro correto.
    *   Um botão \"Iniciar Inscrição\" ou \"Prosseguir\" guia o usuário para a próxima etapa.

3.  **Tela 2: Dados do(s) Participante(s) e Escolhas Individuais:**
    *   Esta tela apresenta um bloco de campos para o primeiro participante. Um botão \"Adicionar Outro Participante\" permite duplicar esse bloco para incluir mais pessoas na mesma inscrição. Cada bloco de participante terá um botão \"Remover Participante\".
    *   **Para cada Participante:**
        *   **Dados Pessoais:**
            *   `Nome Completo`: Campo de texto.
            *   `Telefone de Contato`: Campo de texto com máscara \"(00) 00000-0000\".
            *   `CPF`: Campo de texto com máscara \"000.000.000-00\" e validação interna.
            *   `E-mail`: Campo de texto formatado (com validação de e-mail).
            *   `Data de Nascimento`: Campo de seleção de data para cálculo preciso da idade.
        *   **Detalhes da Estadia e Evento (condicional pelo `tipo_formulario`):**
            *   **Se `hospedagem_apenas` ou `hospedagem_e_evento`:**
                *   `Período de Estadia`: Se a lista `periodos_estadia_opcoes` no JSON tiver apenas 1 item, exibe o rótulo e o valor como texto informativo não editável. Caso contrário, exibe um dropdown com as opções do JSON. As `data_inicio` e `data_fim` correspondentes (incluindo **horários simplificados hh:mm**) são exibidas e bloqueadas para edição após a seleção (ou informação).
                *   `Tipo de Acomodação`: Se a lista `tipos_acomodacao` no JSON tiver apenas 1 item, exibe o rótulo e o valor como texto informativo não editável. Caso contrário, exibe um dropdown com as opções do JSON.
            *   **Se `evento_apenas` ou `hospedagem_e_evento`:**
                *   `Valor de Participação no Evento`:
                    *   Se `hospedagem_e_evento`: Este dropdown será preenchido com as `valores_evento_opcoes` específicas do `Período de Estadia` selecionado.
                    *   Se `evento_apenas`: Este dropdown será preenchido com as `valores_evento_opcoes` definidas diretamente no nível do evento no JSON.
                    *   Em ambos os casos, se a lista de opções para o período/evento tiver apenas 1 item, exibe o rótulo e o valor como texto informativo não editável. Caso contrário, exibe um dropdown.
        *   **Cálculos Individuais (Atualização Dinâmica):**
            *   `Valor da Hospedagem (individual)`: Calculado dinamicamente com base no `valor_diaria_por_pessoa` da acomodação selecionada, no `num_diarias` do período escolhido, e na idade do participante (aplicando as `regras_idade_precificacao.hospedagem` do JSON). Exibido apenas se `tipo_formulario` for `hospedagem_apenas` ou `hospedagem_e_evento`.
            *   `Valor do Evento (individual)`: Calculado dinamicamente com base no `valor` da opção de evento selecionada, e na idade do participante (aplicando as `regras_idade_precificacao.evento` do JSON). Exibido apenas se `tipo_formulario` for `evento_apenas` ou `hospedagem_e_evento`.
        *   **Responsável pelo Pagamento (Condicional):**
            *   Quando houver 2 ou mais blocos de participantes ativos, um checkbox ou radio button rotulado como \"Responsável pelo Pagamento\" é exibido para cada participante.
            *   **Validação:** Apenas *um* participante pode ser marcado como responsável pelo pagamento. Se um for selecionado, os outros são automaticamente desmarcados. Este campo é **obrigatório** se houver mais de um participante.
    *   Um botão \"Próximo\" permite ao usuário avançar após preencher todos os participantes desejados.

4.  **Tela 3: Resumo Geral e Pagamento:**
    *   **Resumo Detalhado:**
        *   Identificação clara do participante **Responsável pelo Pagamento**.
        *   Listagem completa de cada participante, suas escolhas de acomodação e evento, e os valores individuais calculados.
        *   `Valor Total Agregado da Hospedagem`: Soma de todos os `Valor da Hospedagem (individual)`. Visível condicionalmente.
        *   `Valor Total Agregado do Evento`: Soma de todos os `Valor do Evento (individual)`. Visível condicionalmente.
    *   **Campo Cupom de Desconto:**
        *   Um campo de texto (`input`) é fornecido para o participante inserir um `codigo` de cupom.
        *   Não é necessário um botão \"Aplicar Cupom\" para validar e aplicar o desconto, valide e aplique o cupom através do preenchimento dos dados do cupom.
        *   **Feedback Visual:** Mensagens claras indicarão se o cupom é válido, inválido, expirado, ou qual o valor do desconto aplicado.
        *   **Cálculo do Desconto:** O desconto será calculado com base no `tipo_desconto` (`percentual` ou `fixo`) e no `aplicacao` (`total`, `hospedagem` ou `evento`) do cupom correspondente no JSON.
    *   `Valor do Desconto Aplicado`: Exibição do valor total do desconto subtraído.
    *   `Valor Total Geral a Pagar`: O valor final e total em destaque, calculado como (`Valor Total Agregado da Hospedagem` + `Valor Total Agregado do Evento` - `Valor do Desconto Aplicado`) **a `taxa_gateway_percentual` não precisa ser recalculada devido a aplicação do desconto. **.
    *   **Forma de Pagamento:** Se a lista `formas_pagamento_opcoes` no JSON tiver apenas 1 item, exibe o rótulo e o valor como texto informativo não editável. Caso contrário, exibe as opções de **dropdown** carregadas do JSON (com `label` e `descricao`). A seleção desta opção impacta o `Valor Total Agregado da Hospedagem` e o `Valor Total Agregado do Evento` pela sua respectiva `taxa_gateway_percentual`, toda vez que a forma de pagamento for alterada o calculo do cupom de desconto deve ser calculado novamente.
    *   **Termos e Condições:** Um checkbox obrigatório \"Li e concordo com os Termos e Condições de Reserva/Participação\" é exibido, com um link para a `politicas_evento_url` carregada do JSON.
    *   Um botão \"Confirmar Inscrição(ões) e Prosseguir para Pagamento\" finaliza esta etapa.

5.  **Tela 4: Confirmação e Próximos Passos:**
    *   Uma mensagem de sucesso: \"Sua inscrição(ões) na Fazenda Serrinha foi enviada com sucesso!\"
    *   O `ID da Inscrição` único gerado para esta reserva será exibido claramente para o usuário.
    *   Instruções claras para os próximos passos.
    *   Um botão \"Link de pagamento" permite abrir o link que será usado para efetivar o pagamento.

### 8. Requisitos Não Funcionais

#### 8.1. Usabilidade (UX)
*   **RNF.1.1 - Interface Intuitiva:** Design limpo e fácil de navegar, com indicadores claros para adicionar/remover participantes. Para o pré-preenchimento, os campos preenchidos devem ser claramente visíveis e editáveis.
*   **RNF.1.2 - Feedback Claro:** Mensagens de erro e sucesso visíveis e compreensíveis, especialmente para validação de CPF e aplicação de cupom. Feedback visual claro se o pré-preenchimento foi bem-sucedido ou se houve um erro na consulta dos dados do evento.
*   **RNF.1.3 - Máscaras de Entrada:** Campos de telefone e CPF devem ter máscaras para facilitar o preenchimento e garantir o formato correto.
*   **RNF.1.4 - Rolagem para o Topo:** Após a transição entre etapas ou adição de novo bloco de participante, a página deve rolar para o topo para garantir que o usuário veja o novo conteúdo.

#### 8.2. Performance
*   **RNF.2.1 - Carregamento Rápido:** O formulário e seus recursos (JS, CSS, JSON) devem carregar rapidamente.
*   **RNF.2.2 - Resposta Rápida das Validações:** As validações locais (incluindo CPF) devem ser instantâneas para não impactar a fluidez da navegação. A consulta ao webhook de pré-preenchimento deve ter um tempo de resposta aceitável para não atrasar a exibição inicial do formulário.

#### 8.3. Compatibilidade
*   **RNF.3.1 - Responsividade:** O formulário deve ser totalmente responsivo e funcionar bem em diferentes tamanhos de tela (desktop, tablet, mobile).
*   **RNF.3.2 - Compatibilidade com Navegadores:** Compatível com as versões mais recentes dos principais navegadores (Chrome, Firefox, Safari, Edge).

#### 8.4. Segurança
*   **RNF.4.1 - Comunicação Segura:** Todas as chamadas para webhooks devem ser realizadas via HTTPS.
*   **RNF.4.2 - Não Armazenamento de Dados Sensíveis:** O frontend não deve armazenar permanentemente dados sensíveis dos usuários. O processamento e armazenamento devem ocorrer nos sistemas de backend integrados.
*   **RNF.4.3 - Token de Evento:** O token de evento na URL (evento=XXX) deve ser um identificador opaco, sem informações sensíveis ou facilmente adivinháveis, que apenas o webhook do N8N consegue associar a dados de eventos reais.

#### 8.5. Manutenibilidade
*   **RNF.5.1 - Código Modular:** Estrutura de código HTML, CSS e JavaScript organizada para facilitar futuras manutenções e atualizações, com funções bem definidas para cada lógica (cálculo de preço, validação de CPF, manipulação de participantes, pré-preenchimento).
*   **RNF.5.2 - Dados de Preço e Cupons Externos:** O uso de arquivos JSON separados para dados de evento (eventos.json) permite atualizações sem a necessidade de modificar o código JavaScript principal.

### 9. Integrações

O formulário depende das seguintes integrações externas:

#### 9.1. Webhook de Submissão de Formulário
*   **Endpoint:** `https://criadordigital-n8n-webhook.kttqgl.easypanel.host/webhook/c51bd45c-c232-44db-8490-f52f22ae34ce`
*   **Método:** POST
*   **Payload:** Objeto JSON contendo todos os dados do formulário, incluindo `valor_calculado_total`, `detalhes_evento` (serializado como JSON), e `evento`. A estrutura de `detalhes_evento` deve ser capaz de representar a lista de participantes, cada um com seus detalhes, e as informações globais de forma de pagamento e desconto.
*   **Resposta Esperada:** `{ \"link\": \"url_de_pagamento\" }` (ou sinal de sucesso para bolsistas).

#### 9.2. Webhook de Pré-preenchimento de Dados (N8N)
*   **Endpoint:** `https://criadordigital-n8n-webhook.kttqgl.easypanel.host/webhook/sua_webhook_de_consulta_dados_evento` (substituir por endpoint real)
*   **Método:** GET
*   **Parâmetro de Query:** `evento={valor_do_evento}`
*   **Funcionalidade:** Consulta base de dados (Google Sheets, Airtable, etc.) utilizando o token de evento e retorna dados no formato JSON especificado para pré-preenchimento do formulário.

### 10. Considerações Técnicas/Assunções

*   **Tecnologias Frontend:** HTML5, CSS3, JavaScript.
*   **Bibliotecas:** jQuery (v3.6.0) e jQuery Mask (v1.14.16) para manipulação do DOM e máscaras de entrada.
*   **Estrutura de Dados de Eventos:** Arquivo `eventos.json` local com a estrutura definida para eventos.
*   **Backend:** Assumimos que o webhook de pré-preenchimento (N8N) é capaz de consultar uma base de dados (e.g., Google Sheets, Airtable, etc.) utilizando o token de evento e retornar os dados no formato JSON especificado. O webhook de submissão (N8N) será responsável por processar os dados completos do formulário, incluindo o evento para rastreabilidade e a deserialização dos detalhes.
*   **Sistema de Pagamento:** O formulário não processa pagamentos diretamente; ele redireciona para um sistema de pagamento externo via um link fornecido pelo webhook.
*   **Arquivos de Referência:** 
    *   Site: `https://fazendaserrinha.com.br`
    *   Arquivos: `index.html`, `style.css`, `js/script.js`, `js/priceCalculator.js`, `js/cpfValidation.js`, `eventos.json`, imagens

### 11. Estrutura do Arquivo JSON de Eventos
´´´
{
  "eventos": [
    {
      "id": "G001",
      "nome": "Retiro de Bem-Estar e Meditação na Fazenda Serrinha (Hospedagem e Evento)",
      "descricao": "Um retiro completo de 3 dias focado em mindfulness, yoga e conexão com a natureza, incluindo hospedagem e workshops.",
      "politicas_evento_url": "https://fazendaserrinha.com.br/politicas/G001",
      "observacoes_adicionais": "Trazer tapete de yoga.",
      "tipo_formulario": "hospedagem_e_evento",
      
      "tipos_acomodacao": [
        {
          "id": "indiv",
          "label": "Individual",
          "descricao": "Acomodação privativa com cama de solteiro.",
          "valor_diaria_por_pessoa": 250.00
        },
        {
          "id": "compart",
          "label": "Compartilhada (até 3 pessoas)",
          "descricao": "Quarto compartilhado com até 2 outros participantes.",
          "valor_diaria_por_pessoa": 180.00
        }
      ],

      "periodos_estadia_opcoes": [
        {
          "id": "padrao",
          "label": "Período Padrão do Retiro (10/10 - 12/10)",
          "data_inicio": "2025-10-10T18:00",
          "data_fim": "2025-10-12T14:00",
          "num_diarias": 2,
          "valores_evento_opcoes": [
            {
              "id": "ideal_2dias",
              "label": "Valor Ideal (2 dias)",
              "valor": 850.00,
              "descricao": "Valor que cobre os custos e sustenta o projeto para 2 dias."
            },
            {
              "id": "social_2dias",
              "label": "Valor Social (2 dias)",
              "valor": 700.00,
              "descricao": "Opção para quem busca apoio e solidariedade para 2 dias."
            }
          ]
        },
        {
          "id": "adiantado",
          "label": "Chegada Antecipada (09/10 - 12/10)",
          "data_inicio": "2025-10-09T18:00",
          "data_fim": "2025-10-12T14:00",
          "num_diarias": 3,
          "valores_evento_opcoes": [
            {
              "id": "ideal_3dias",
              "label": "Valor Ideal (3 dias)",
              "valor": 1000.00,
              "descricao": "Valor que cobre os custos e sustenta o projeto para 3 dias."
            },
            {
              "id": "social_3dias",
              "label": "Valor Social (3 dias)",
              "valor": 850.00,
              "descricao": "Opção para quem busca apoio e solidariedade para 3 dias."
            }
          ]
        }
      ],

      "valores_evento_opcoes": [],

      "formas_pagamento_opcoes": [
        {
          "id": "pix_vista",
          "label": "PIX à Vista",
          "tipo": "PIX",
          "descricao": "Pagamento total no ato da inscrição.",
          "taxa_gateway_percentual": 0.01
        },      
        {
          "id": "cartao_parcelado",
          "label": "Cartão Parcelado (até 6x sem juros)",
          "tipo": "Cartao",
          "parcelas_maximas": 6,
          "juros": false,
          "descricao": "Parcelamento em até 6 vezes sem juros no cartão de crédito.",
          "taxa_gateway_percentual": 0.035
        }
      ],

      "regras_idade_precificacao": {
        "hospedagem": [
          {
            "faixa_min_anos": 0,
            "faixa_max_anos": 4,
            "percentual_valor_adulto": 0.0,
            "limite_gratuidade_por_reserva": 1,
            "regra_excedente_gratuito": {
              "percentual_valor_adulto": 0.5,
              "descricao": "Crianças 0-4 anos extras pagam 50% da hospedagem"
            }
          },
          {
            "faixa_min_anos": 5,
            "faixa_max_anos": 10,
            "percentual_valor_adulto": 0.5,
            "descricao": "Crianças de 5 a 10 anos pagam 50% do valor de hospedagem"
          },
          {
            "faixa_min_anos": 11,
            "percentual_valor_adulto": 1.0,
            "descricao": "Acima de 10 anos pagam valor integral de hospedagem"
          }
        ],
        "evento": [
          {
            "faixa_min_anos": 0,
            "faixa_max_anos": 4,
            "percentual_valor_adulto": 0.0,
            "limite_gratuidade_por_reserva": 1,
            "regra_excedente_gratuito": {
              "percentual_valor_adulto": 0.5,
              "descricao": "Crianças 0-4 anos extras pagam 50% do evento"
            }
          },
          {
            "faixa_min_anos": 5,
            "faixa_max_anos": 10,
            "percentual_valor_adulto": 0.5,
            "descricao": "Crianças de 5 a 10 anos pagam 50% do valor do evento"
          },
          {
            "faixa_min_anos": 11,
            "percentual_valor_adulto": 1.0,
            "descricao": "Acima de 10 anos pagam valor integral do evento"
          }
        ]
      },

      "cupons_desconto": [
        {
          "codigo": "VERAO2025",
          "tipo_desconto": "percentual",
          "valor_desconto": 0.10,
          "data_validade_fim": "2025-12-31T23:59:59",
          "aplicacao": "total"
        },
        {
          "codigo": "EVENTODESC50",
          "tipo_desconto": "fixo",
          "valor_desconto": 50.00,
          "data_validade_fim": "2025-11-30T23:59:59",
          "aplicacao": "evento"
        }
      ]
    },
    {
      "id": "G002",
      "nome": "Inscrição para o Workshop de Yoga (Apenas Evento)",
      "descricao": "Workshop intensivo de Yoga e Meditação, sem hospedagem inclusa.",
      "politicas_evento_url": "https://fazendaserrinha.com.br/politicas/G002",
      "observacoes_adicionais": "Evento ocorre das 09h às 17h. Almoço não incluso.",
      "tipo_formulario": "evento_apenas",

      "tipos_acomodacao": [],
      "periodos_estadia_opcoes": [],
      
      "valores_evento_opcoes": [
        {
          "id": "workshop_basico",
          "label": "Acesso Básico ao Workshop",
          "valor": 300.00,
          "descricao": "Inclui acesso a todas as sessões do workshop."
        },
        {
          "id": "workshop_premium",
          "label": "Acesso Premium ao Workshop",
          "valor": 450.00,
          "descricao": "Inclui acesso e material de apoio exclusivo."
        }
      ],

      "formas_pagamento_opcoes": [
        {
          "id": "pix_vista",
          "label": "PIX à Vista",
          "tipo": "PIX",
          "descricao": "Pagamento total.",
          "taxa_gateway_percentual": 0.01
        }
      ],

      "regras_idade_precificacao": {
        "hospedagem": [],
        "evento": [
          {
            "faixa_min_anos": 0,
            "faixa_max_anos": 5,
            "percentual_valor_adulto": 0.0,
            "limite_gratuidade_por_reserva": 1,
            "regra_excedente_gratuito": {
              "percentual_valor_adulto": 0.25,
              "descricao": "Crianças 0-5 anos extras pagam 25% do evento"
            }
          },
          {
            "faixa_min_anos": 6,
            "faixa_max_anos": 12,
            "percentual_valor_adulto": 0.5,
            "descricao": "Crianças de 6 a 12 anos pagam 50% do valor do evento"
          },
          {
            "faixa_min_anos": 13,
            "percentual_valor_adulto": 1.0,
            "descricao": "Acima de 12 anos pagam valor integral do evento"
          }
        ]
      },

      "cupons_desconto": [
        {
          "codigo": "WORKSHOP10",
          "tipo_desconto": "percentual",
          "valor_desconto": 0.10,
          "data_validade_fim": "2025-09-30T23:59:59",
          "aplicacao": "total"
        }
      ]
    },
    {
      "id": "G003",
      "nome": "Reserva de Quarto Pós-Evento (Apenas Hospedagem)",
      "descricao": "Hospedagem avulsa em nossos quartos aconchegantes.",
      "politicas_evento_url": "https://fazendaserrinha.com.br/politicas/G003",
      "observacoes_adicionais": "Não inclui acesso a eventos ou alimentação. Check-out até 12h.",
      "tipo_formulario": "hospedagem_apenas",

      "tipos_acomodacao": [
        {
          "id": "padrao_single",
          "label": "Quarto Padrão Individual",
          "descricao": "Acomodação para uma pessoa.",
          "valor_diaria_por_pessoa": 200.00
        },
        {
          "id": "padrao_duplo",
          "label": "Quarto Padrão Duplo",
          "descricao": "Acomodação para duas pessoas.",
          "valor_diaria_por_pessoa": 150.00
        }
      ],

      "periodos_estadia_opcoes": [
        {
          "id": "uma_noite",
          "label": "1 Noite (20/10 - 21/10)",
          "data_inicio": "2025-10-20T14:00",
          "data_fim": "2025-10-21T12:00",
          "num_diarias": 1
        },
        {
          "id": "duas_noites",
          "label": "2 Noites (20/10 - 22/10)",
          "data_inicio": "2025-10-20T14:00",
          "data_fim": "2025-10-22T12:00",
          "num_diarias": 2
        }
      ],

      "valores_evento_opcoes": [],

      "formas_pagamento_opcoes": [
        {
          "id": "cartao_credito",
          "label": "Cartão de Crédito",
          "tipo": "Cartao",
          "descricao": "Pagamento em até 3x.",
          "taxa_gateway_percentual": 0.04
        }
      ],

      "regras_idade_precificacao": {
        "hospedagem": [
          {
            "faixa_min_anos": 0,
            "faixa_max_anos": 3,
            "percentual_valor_adulto": 0.0,
            "limite_gratuidade_por_reserva": 1,
            "regra_excedente_gratuito": {
              "percentual_valor_adulto": 0.3,
              "descricao": "Crianças 0-3 anos extras pagam 30% da hospedagem"
            }
          },
          {
            "faixa_min_anos": 4,
            "faixa_max_anos": 10,
            "percentual_valor_adulto": 0.6,
            "descricao": "Crianças de 4 a 10 anos pagam 60% do valor de hospedagem"
          },
          {
            "faixa_min_anos": 11,
            "percentual_valor_adulto": 1.0,
            "descricao": "Acima de 10 anos pagam valor integral de hospedagem"
          }
        ],
        "evento": []
      },

      "cupons_desconto": [
        {
          "codigo": "HOSPEDAGEM15",
          "tipo_desconto": "percentual",
          "valor_desconto": 0.15,
          "data_validade_fim": "2025-11-15T23:59:59",
          "aplicacao": "hospedagem"
        }
      ]
    }
  ]
}
´´´

#### Detalhamento dos Campos do JSON:
*   `id`: (String, único) Identificador único para o evento, usado no parâmetro da URL.
*   `nome`: (String) Título completo do evento.
*   `descricao`: (String) Breve descrição do evento.
*   `politicas_evento_url`: (String) URL específica para os termos e condições deste evento.
*   `observacoes_adicionais`: (String, Opcional) Qualquer nota extra para o participante sobre o evento.
*   **`tipo_formulario`**: (String) **CAMPO CRÍTICO** que define a modalidade do formulário para o evento específico. Valores possíveis:
    *   `hospedagem_apenas`: O formulário exibirá apenas seções de hospedagem.
    *   `evento_apenas`: O formulário exibirá apenas seções de evento.
    *   `hospedagem_e_evento`: O formulário exibirá seções de hospedagem e evento integradas.
*   `tipos_acomodacao`: (Array de Objetos) Define as opções de acomodação. Visível apenas se `tipo_formulario` for `hospedagem_apenas` ou `hospedagem_e_evento`.
*   `periodos_estadia_opcoes`: (Array de Objetos) Define as opções de período de estadia. Visível apenas se `tipo_formulario` for `hospedagem_apenas` ou `hospedagem_e_evento`.
*   `valores_evento_opcoes`: (Array de Objetos) Pode existir em duas localizações:
    *   **No nível raiz do evento**: Usado se `tipo_formulario` for `evento_apenas`.
    *   **Aninhado dentro de `periodos_estadia_opcoes`**: Usado se `tipo_formulario` for `hospedagem_e_evento`.
*   `formas_pagamento_opcoes`: (Array de Objetos) Define as opções de pagamento com `taxa_gateway_percentual`.
*   `regras_idade_precificacao`: (Objeto) Contém arrays de regras para `hospedagem` e `evento`.
*   `cupons_desconto`: (Array de Objetos) Lista de cupons disponíveis com validação e aplicação.

### 12. Requisitos Detalhados dos Campos

<table class="data-table">
  <thead>
    <tr>
      <th scope="col">Seção</th>
      <th scope="col">Campo</th>
      <th scope="col">Tipo</th>
      <th scope="col">Obrigatório?</th>
      <th scope="col">Comportamento de Display</th>
      <th scope="col">Observações</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Dados do Participante (por bloco)</td>
      <td>Nome Completo</td>
      <td>Texto</td>
      <td>Sim</td>
      <td>Normal</td>
      <td></td>
    </tr>
    <tr>
      <td></td>
      <td>Telefone de Contato</td>
      <td>Texto com máscara</td>
      <td>Sim</td>
      <td>Normal</td>
      <td>Máscara "(00) 00000-0000".</td>
    </tr>
    <tr>
      <td></td>
      <td>CPF</td>
      <td>Texto com máscara</td>
      <td>Sim</td>
      <td>Normal</td>
      <td>Máscara "000.000.000-00" e validação interna via script JavaScript.</td>
    </tr>
    <tr>
      <td></td>
      <td>E-mail</td>
      <td>E-mail</td>
      <td>Sim</td>
      <td>Normal</td>
      <td>Validação de formato de e-mail.</td>
    </tr>
    <tr>
      <td></td>
      <td>Data de Nascimento</td>
      <td>Data</td>
      <td>Sim</td>
      <td>Normal</td>
      <td>Para cálculo da idade e aplicação das regras de precificação do JSON.</td>
    </tr>
    <tr>
      <td></td>
      <td>Responsável pelo Pagamento</td>
      <td>Checkbox/Radio</td>
      <td>Condicional</td>
      <td>Normal</td>
      <td>Aparece e é obrigatório se > 1 participante. Apenas um pode ser selecionado.</td>
    </tr>
    <tr>
      <td>Detalhes da Estadia e Evento (por bloco)</td>
      <td>Período de Estadia</td>
      <td>Dropdown</td>
      <td>Condicional</td>
      <td>Dropdown se > 1 opção no JSON; Texto Informativo se 1 opção no JSON.</td>
      <td>Visível apenas se `tipo_formulario` for `hospedagem_apenas` ou `hospedagem_e_evento`. Opções carregadas de `periodos_estadia_opcoes` do JSON. Exibe datas e HORAS/MINUTOS de Check-in/out.</td>
    </tr>
    <tr>
      <td></td>
      <td>Tipo de Acomodação</td>
      <td>Dropdown</td>
      <td>Condicional</td>
      <td>Dropdown se > 1 opção no JSON; Texto Informativo se 1 opção no JSON.</td>
      <td>Visível apenas se `tipo_formulario` for `hospedagem_apenas` ou `hospedagem_e_evento`. Opções carregadas de `tipos_acomodacao` do JSON. Cada participante = 1 pessoa na acomodação.</td>
    </tr>
    <tr>
      <td></td>
      <td>Valor de Participação no Evento</td>
      <td>Dropdown</td>
      <td>Condicional</td>
      <td>Dropdown se > 1 opção no JSON do período de estadia (ou evento raiz); Texto Informativo se 1 opção.</td>
      <td>Visível apenas se `tipo_formulario` for `evento_apenas` ou `hospedagem_e_evento`. Opções carregadas dinamicamente do JSON (vinculadas ao Período de Estadia ou do evento raiz).</td>
    </tr>
    <tr>
      <td></td>
      <td>Valor da Hospedagem (individual)</td>
      <td>Calculado (R$)</td>
      <td>Não</td>
      <td>Normal (Exibição)</td>
      <td>Visível apenas se `tipo_formulario` for `hospedagem_apenas` ou `hospedagem_e_evento`. (`valor_diaria_por_pessoa` da acomodação * `num_diarias` do período * Fator de Preço por Idade para HOSPEDAGEM, do JSON).</td>
    </tr>
    <tr>
      <td></td>
      <td>Valor do Evento (individual)</td>
      <td>Calculado (R$)</td>
      <td>Não</td>
      <td>Normal (Exibição)</td>
      <td>Visível apenas se `tipo_formulario` for `evento_apenas` ou `hospedagem_e_evento`. (`valor` da opção selecionada em `valores_evento_opcoes` **do período de estadia ou evento raiz** * Fator de Preço por Idade para EVENTO, do JSON).</td>
    </tr>
    <tr>
      <td>Resumo Geral e Pagamento</td>
      <td>Valor Total Agregado da Hospedagem</td>
      <td>Calculado (R$)</td>
      <td>Não</td>
      <td>Normal (Exibição)</td>
      <td>Soma de todos os 'Valor da Hospedagem (individual)'. Visível condicionalmente.</td>
    </tr>
    <tr>
      <td></td>
      <td>Valor Total Agregado do Evento</td>
      <td>Calculado (R$)</td>
      <td>Não</td>
      <td>Normal (Exibição)</td>
      <td>Soma de todos os 'Valor do Evento (individual)'. Visível condicionalmente.</td>
    </tr>
    <tr>
      <td></td>
      <td>Cupom de Desconto</td>
      <td>Texto</td>
      <td>Não</td>
      <td>Normal</td>
      <td>Campo para inserir o código do cupom.</td>
    </tr>
    <tr>
      <td></td>
      <td>Valor do Desconto Aplicado</td>
      <td>Calculado (R$)</td>
      <td>Não</td>
      <td>Normal (Exibição)</td>
      <td>Valor subtraído do total geral após aplicar um cupom válido, conforme `tipo_desconto` e `aplicacao` do JSON.</td>
    </tr>
    <tr>
      <td></td>
      <td>Valor Total Geral a Pagar</td>
      <td>Calculado (R$)</td>
      <td>Não</td>
      <td>Normal (Exibição)</td>
      <td>Soma de 'Valor Total Agregado da Hospedagem' e 'Valor Total Agregado do Evento', MENOS 'Valor do Desconto Aplicado', **MAIS a `taxa_gateway_percentual` da forma de pagamento selecionada**.</td>
    </tr>
    <tr>
      <td></td>
      <td>Forma de Pagamento</td>
      <td>Dropdown</td>
      <td>Sim</td>
      <td>Dropdown se > 1 opção no JSON; Texto Informativo se 1 opção no JSON.</td>
      <td>Opções carregadas de `formas_pagamento_opcoes` do JSON. Exibe `label` e `descricao`. A seleção afeta o `Valor Total Geral a Pagar` com a `taxa_gateway_percentual`.</td>
    </tr>
    <tr>
      <td></td>
      <td>Termos e Condições</td>
      <td>Checkbox</td>
      <td>Sim</td>
      <td>Normal</td>
      <td>Link (`politicas_evento_url`) carregado do JSON.</td>
    </tr>
    <tr>
      <td>Confirmação</td>
      <td>ID da Inscrição</td>
      <td>Texto</td>
      <td>Não</td>
      <td>Normal (Exibição)</td>
      <td>ID único gerado para cada nova inscrição. Exibido ao usuário e incluído nas notificações.</td>
    </tr>
  </tbody>
</table>

### 13. Gerenciamento de Conteúdo (Fazenda Serrinha)

*   **Responsabilidade:** André, como gestor da **Fazenda Serrinha**, será o responsável por manter e atualizar o arquivo JSON de eventos. Isso implica em:
    *   Adicionar novos objetos de evento, bem como cupons e regras de idade a cada novo retiro ou campanha.
    *   Atualizar os detalhes de eventos existentes (preços, datas e horários, acomodações, etc.), cupons (validade, valores, aplicação) e regras de idade.
    *   **Configurar corretamente o `tipo_formulario` para cada evento e garantir que apenas as seções relevantes (`tipos_acomodacao`, `periodos_estadia_opcoes`, e `valores_evento_opcoes` na localização correta) estejam populadas no JSON, enquanto as não relevantes estejam vazias ou ausentes, para evitar erros de renderização e cálculo no formulário.**
    *   **Definir as `taxa_gateway_percentual` precisas para cada forma de pagamento.**
    *   Garantir a validade e a integridade do formato JSON para evitar erros no formulário.
*   **Mecanismo de Atualização:** O arquivo JSON deverá ser hospedado em um local acessível publicamente (ex: um bucket S3, um servidor web estático) para que o formulário possa carregá-lo. As atualizações devem ser refletidas em tempo real para o formulário.

### 14. Critérios de Aceitação

#### 14.1. Funcionalidades Obrigatórias
- ✅ **Carregamento dinâmico de eventos via URL**
- ✅ **Adaptação automática do formulário baseada em `tipo_formulario`**
- ✅ **Múltiplos participantes com cálculos individuais**
- ✅ **Validação completa de CPF e outros campos**
- ✅ **Sistema de cupons de desconto funcional**
- ✅ **Cálculo correto de taxas de gateway**
- ✅ **Pré-preenchimento via webhook**
- ✅ **Geração de ID único de inscrição**
- ✅ **Responsividade completa**

#### 14.2. Validações Críticas
- ✅ **CPF deve ser validado com algoritmo correto**
- ✅ **Apenas um responsável pelo pagamento por reserva**
- ✅ **Cupons devem respeitar data de validade**
- ✅ **Regras de idade aplicadas corretamente**
- ✅ **Campos obrigatórios não podem ficar vazios**

#### 14.3. Performance e UX
- ✅ **Carregamento inicial em menos de 3 segundos**
- ✅ **Cálculos dinâmicos instantâneos**
- ✅ **Interface intuitiva e sem confusão**
- ✅ **Feedback claro para todas as ações**

### 15. Cronograma de Desenvolvimento

#### Fase 1: Estrutura Base (Semana 1)
- Configuração do ambiente de desenvolvimento
- Criação da estrutura HTML básica
- Implementação do sistema de carregamento de eventos
- Configuração das validações de campos

#### Fase 2: Lógica de Negócio (Semana 2)
- Implementação dos cálculos de preços
- Sistema de múltiplos participantes
- Regras de idade e cupons de desconto
- Integração com webhooks

#### Fase 3: Interface e UX (Semana 3)
- Design responsivo
- Wireframes implementados
- Estados de carregamento e erro
- Testes de usabilidade

#### Fase 4: Testes e Deploy (Semana 4)
- Testes funcionais completos
- Testes de integração
- Otimizações de performance
- Deploy em produção

### 16. Riscos e Mitigações

#### 16.1. Riscos Técnicos
- **Risco:** Falha na integração com webhooks N8N
- **Mitigação:** Implementar fallbacks e tratamento robusto de erros

- **Risco:** Performance lenta em dispositivos móveis
- **Mitigação:** Otimização de código e carregamento assíncrono

#### 16.2. Riscos de Negócio
- **Risco:** Mudanças frequentes nas regras de precificação
- **Mitigação:** Estrutura JSON flexível e documentação clara

- **Risco:** Problemas de usabilidade para usuários não técnicos
- **Mitigação:** Testes extensivos com usuários reais

### 17. Métricas de Sucesso

#### 17.1. Métricas Técnicas
- **Taxa de Conversão:** > 85% dos usuários que iniciam completam o formulário
- **Tempo de Carregamento:** < 3 segundos para carregamento inicial
- **Taxa de Erro:** < 2% de erros técnicos durante o preenchimento

#### 17.2. Métricas de Negócio
- **Redução de Trabalho Manual:** > 80% de redução no processamento manual
- **Satisfação do Usuário:** > 4.5/5 em pesquisas de satisfação
- **Precisão dos Dados:** > 98% de dados corretos coletados

### 18. Documentação de Apoio

#### 18.1. Manuais do Usuário
- Guia passo-a-passo para preenchimento do formulário
- FAQ com dúvidas mais comuns
- Vídeo tutorial de uso

#### 18.2. Documentação Técnica
- Guia de manutenção do arquivo JSON
- Documentação da API dos webhooks
- Manual de troubleshooting

### 19. Considerações de Segurança

#### 19.1. Proteção de Dados
- Dados pessoais não armazenados no frontend
- Comunicação via HTTPS obrigatória
- Validação de entrada para prevenir ataques

#### 19.2. Compliance
- Conformidade com LGPD
- Termos de uso claros
- Política de privacidade acessível

---

## 📋 RESUMO EXECUTIVO FINAL

Este **Product Requirement Document (PRD) COMPLETO** define integralmente o desenvolvimento do formulário de inscrição dinâmico para a **Fazenda Serrinha**, abrangendo:

### ✅ **Especificações Técnicas Completas:**
- Frontend modular com jQuery e validações robustas
- Sistema JSON configurável para eventos
- Integração completa com webhooks N8N
- Estrutura responsiva e acessível

### ✅ **Funcionalidades Avançadas:**
- Três modalidades de formulário dinâmicas
- Sistema inteligente de múltiplos participantes
- Cálculos automáticos com regras de idade complexas
- Sistema flexível de cupons de desconto
- Pré-preenchimento automático via webhook

### ✅ **Wireframes e UX:**
- 4 telas principais completamente mapeadas
- Estados de erro e carregamento definidos
- Fluxo de usuário otimizado
- Interface intuitiva e simplificada

### ✅ **Gestão e Manutenção:**
- Arquivo JSON centralizador de configurações
- Documentação completa para gestão de conteúdo
- Critérios de aceitação claros
- Cronograma de desenvolvimento estruturado

### ✅ **Qualidade e Performance:**
- Requisitos não funcionais detalhados
- Métricas de sucesso definidas
- Considerações de segurança e compliance
- Plano de riscos e mitigações

**O documento está 100% completo e pronto para implementação pela equipe de desenvolvimento.**
