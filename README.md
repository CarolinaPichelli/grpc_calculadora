# Calculadora Distribuída com gRPC — Node.js

Heloísa Pichelli Souza<br>
Carolina Pichelli Souza<br>
Lucas Batista de Sousa<br>
Maicon Pereira Veloso<br><br>

Sistema de calculadora distribuída usando **gRPC** com operações unárias, client streaming, server streaming e streaming bidirecional.

---

## 📁 Estrutura do Projeto

```
grpc-calculadora/
├── calculadora.proto   # Definição do contrato gRPC
├── servidor.js         # Servidor gRPC (porta 50051)
├── cliente.js          # Cliente interativo com menu
├── demo.js             # Demo automática com 2 clientes simultâneos
└── README.md
```

---

## Como Executar

### 1. Instalar dependências
```bash
npm install
```

### 2. Iniciar o Servidor
```bash
node servidor.js
```

### 3. Iniciar o Cliente Interativo
Abra **outro terminal**:
```bash
node cliente.js "Meu-Cliente"
```

### 4. Validar com 2 Clientes Simultâneos (Demo Automática)
Com o servidor rodando, em outro terminal:
```bash
node demo.js
```

---

##  RPCs Implementados

| RPC                  | Tipo                     | Descrição                                      |
|----------------------|--------------------------|------------------------------------------------|
| `Somar`              | Unary                    | Soma dois números                              |
| `Subtrair`           | Unary                    | Subtrai dois números                           |
| `Multiplicar`        | Unary                    | Multiplica dois números                        |
| `Dividir`            | Unary                    | Divide dois números (trata divisão por zero)   |
| `CalcularPotencia`   | Unary                    | Calcula base^expoente                          |
| `CalcularRaizQuadrada` | Unary                  | Calcula √número (trata negativos)              |
| `SomarStream`        | Client Streaming         | Recebe stream de números, retorna soma total   |
| `GerarTabuada`       | Server Streaming         | Envia stream com tabuada de 1 a 10             |
| `CalcularMediaMovel` | Bidirectional Streaming  | Recebe números, retorna médias parciais        |

---

## Menu do Cliente Interativo

```
══════════════════════════════════════════════════
    CALCULADORA gRPC  |  Cliente-1
    Conectado em: localhost:50051
══════════════════════════════════════════════════

  ── Operações Básicas ──────────────────────
  [1]  ➕  Somar
  [2]  ➖  Subtrair
  [3]  ✖️   Multiplicar
  [4]  ➗  Dividir

  ── Operações Avançadas ────────────────────
  [5]  🔢  Calcular Potência
  [6]  √   Calcular Raiz Quadrada

  ── Streaming ──────────────────────────────
  [7]  📡  Somar via Stream    (Client Streaming)
  [8]  📋  Gerar Tabuada       (Server Streaming)
  [9]  📊  Média Móvel         (Bidirecional)

  ── Sistema ────────────────────────────────
  [0]  🚪  Sair
```

---

##  Variáveis de Ambiente

| Variável | Padrão      | Descrição                  |
|----------|-------------|----------------------------|
| `PORT`   | `50051`     | Porta do servidor/cliente  |
| `HOST`   | `localhost` | Host do servidor (cliente) |

Exemplo:
```bash
PORT=50052 node servidor.js
HOST=192.168.1.10 PORT=50052 node cliente.js
```
