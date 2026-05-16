const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const readline = require("readline");
const path = require("path");

// ─── Carregamento do Proto ────────────────────────────────────────────────────
const PROTO_PATH = path.join(__dirname, "calculadora.proto");
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const calculadoraProto = grpc.loadPackageDefinition(packageDef).calculadora;

// ─── Configuração ─────────────────────────────────────────────────────────────
const HOST = process.env.HOST || "localhost";
const PORT = process.env.PORT || "50051";
const ENDERECO = `${HOST}:${PORT}`;
const NOME_CLIENTE = process.argv[2] || `Cliente-${Math.floor(Math.random() * 100)}`;

// ─── Utilitários ──────────────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const pergunta = (msg) => new Promise((res) => rl.question(msg, res));

function limpar() {
  process.stdout.write("\x1Bc");
}

function linha(char = "─", tam = 50) {
  return char.repeat(tam);
}

function titulo(texto) {
  console.log("\n" + linha("═"));
  console.log(`  ${texto}`);
  console.log(linha("═"));
}

function sucesso(msg) {
  console.log(`\n  ✅ ${msg}`);
}

function erro(msg) {
  console.log(`\n  ❌ ${msg}`);
}

function info(msg) {
  console.log(`  ℹ️  ${msg}`);
}

async function lerNumero(prompt) {
  while (true) {
    const entrada = await pergunta(`  ${prompt}: `);
    const num = parseFloat(entrada.replace(",", "."));
    if (!isNaN(num)) return num;
    console.log("  ⚠️  Valor inválido. Digite um número válido.");
  }
}

async function aguardarEnter() {
  await pergunta("\n  Pressione ENTER para continuar...");
}

// ─── Criação do cliente ───────────────────────────────────────────────────────
let cliente;

function conectar() {
  return new Promise((resolve, reject) => {
    cliente = new calculadoraProto.Calculadora(
      ENDERECO,
      grpc.credentials.createInsecure()
    );

    const deadline = new Date();
    deadline.setSeconds(deadline.getSeconds() + 5);

    cliente.waitForReady(deadline, (err) => {
      if (err) reject(new Error(`Não foi possível conectar ao servidor em ${ENDERECO}`));
      else resolve();
    });
  });
}

// ─── Operações ────────────────────────────────────────────────────────────────

async function opSomar() {
  titulo("➕ SOMA");
  const a = await lerNumero("Primeiro número");
  const b = await lerNumero("Segundo número");

  return new Promise((resolve) => {
    cliente.Somar({ a, b }, (err, res) => {
      if (err) { erro(err.message); }
      else { sucesso(`Resultado: ${res.mensagem}`); }
      resolve();
    });
  });
}

async function opSubtrair() {
  titulo("➖ SUBTRAÇÃO");
  const a = await lerNumero("Primeiro número");
  const b = await lerNumero("Segundo número");

  return new Promise((resolve) => {
    cliente.Subtrair({ a, b }, (err, res) => {
      if (err) { erro(err.message); }
      else { sucesso(`Resultado: ${res.mensagem}`); }
      resolve();
    });
  });
}

async function opMultiplicar() {
  titulo("✖️  MULTIPLICAÇÃO");
  const a = await lerNumero("Primeiro número");
  const b = await lerNumero("Segundo número");

  return new Promise((resolve) => {
    cliente.Multiplicar({ a, b }, (err, res) => {
      if (err) { erro(err.message); }
      else { sucesso(`Resultado: ${res.mensagem}`); }
      resolve();
    });
  });
}

async function opDividir() {
  titulo("➗ DIVISÃO");
  const a = await lerNumero("Dividendo");
  const b = await lerNumero("Divisor");

  return new Promise((resolve) => {
    cliente.Dividir({ a, b }, (err, res) => {
      if (err) { erro(`Erro do servidor: ${err.message}`); }
      else { sucesso(`Resultado: ${res.mensagem}`); }
      resolve();
    });
  });
}

async function opPotencia() {
  titulo("🔢 POTÊNCIA");
  const base = await lerNumero("Base");
  const expoente = await lerNumero("Expoente");

  return new Promise((resolve) => {
    cliente.CalcularPotencia({ base, expoente }, (err, res) => {
      if (err) { erro(err.message); }
      else { sucesso(`Resultado: ${res.mensagem}`); }
      resolve();
    });
  });
}

async function opRaizQuadrada() {
  titulo("√  RAIZ QUADRADA");
  const valor = await lerNumero("Número");

  return new Promise((resolve) => {
    cliente.CalcularRaizQuadrada({ valor }, (err, res) => {
      if (err) { erro(`Erro do servidor: ${err.message}`); }
      else { sucesso(`Resultado: ${res.mensagem}`); }
      resolve();
    });
  });
}

async function opSomarStream() {
  titulo("📡 SOMA VIA STREAM (Client Streaming)");
  info("Envie números um a um. Digite 'fim' para encerrar.\n");

  return new Promise(async (resolve) => {
    const call = cliente.SomarStream((err, res) => {
      if (err) { erro(err.message); }
      else {
        sucesso(`Resultado final: ${res.mensagem}`);
      }
      resolve();
    });

    let count = 0;
    while (true) {
      const entrada = await pergunta(`  Número ${count + 1} (ou 'fim'): `);
      if (entrada.toLowerCase() === "fim") break;
      const num = parseFloat(entrada.replace(",", "."));
      if (isNaN(num)) {
        console.log("  ⚠️  Valor inválido, tente novamente.");
        continue;
      }
      call.write({ valor: num });
      count++;
      info(`Enviado: ${num}`);
    }

    if (count === 0) {
      call.write({ valor: 0 });
    }
    call.end();
    info("Stream encerrado. Aguardando resultado...");
  });
}

async function opGerarTabuada() {
  titulo("📋 TABUADA (Server Streaming)");
  const valor = await lerNumero("Número para tabuada");

  return new Promise((resolve) => {
    info(`\n  Tabuada do ${valor}:\n`);
    const call = cliente.GerarTabuada({ valor });

    call.on("data", (item) => {
      console.log(`  ${item.expressao}`);
    });

    call.on("end", () => {
      sucesso("Tabuada concluída!");
      resolve();
    });

    call.on("error", (err) => {
      erro(`Erro no stream: ${err.message}`);
      resolve();
    });
  });
}

async function opMediaMovel() {
  titulo("📊 MÉDIA MÓVEL (Bidirectional Streaming)");
  info("Envie números para calcular médias parciais. Digite 'fim' para encerrar.\n");

  return new Promise(async (resolve) => {
    const call = cliente.CalcularMediaMovel();

    call.on("data", (res) => {
      info(`Média após ${res.quantidade} número(s): ${res.media.toFixed(4)}`);
    });

    call.on("end", () => {
      sucesso("Cálculo de médias encerrado.");
      resolve();
    });

    call.on("error", (err) => {
      if (err.code !== grpc.status.CANCELLED) {
        erro(`Erro: ${err.message}`);
      }
      resolve();
    });

    let count = 0;
    while (true) {
      const entrada = await pergunta(`  Número ${count + 1} (ou 'fim'): `);
      if (entrada.toLowerCase() === "fim") break;
      const num = parseFloat(entrada.replace(",", "."));
      if (isNaN(num)) {
        console.log("  ⚠️  Valor inválido, tente novamente.");
        continue;
      }
      call.write({ valor: num });
      count++;
    }

    call.end();
  });
}

// ─── Menu Principal ───────────────────────────────────────────────────────────
function exibirMenu() {
  limpar();
  console.log("\n" + linha("═"));
  console.log(`  🧮  CALCULADORA gRPC  |  ${NOME_CLIENTE}`);
  console.log(`  🔗  Conectado em: ${ENDERECO}`);
  console.log(linha("═"));
  console.log("\n  ── Operações Básicas ──────────────────────");
  console.log("  [1]  ➕  Somar");
  console.log("  [2]  ➖  Subtrair");
  console.log("  [3]  ✖️   Multiplicar");
  console.log("  [4]  ➗  Dividir");
  console.log("\n  ── Operações Avançadas ────────────────────");
  console.log("  [5]  🔢  Calcular Potência");
  console.log("  [6]  √   Calcular Raiz Quadrada");
  console.log("\n  ── Streaming ──────────────────────────────");
  console.log("  [7]  📡  Somar via Stream    (Client Streaming)");
  console.log("  [8]  📋  Gerar Tabuada       (Server Streaming)");
  console.log("  [9]  📊  Média Móvel         (Bidirecional)");
  console.log("\n  ── Sistema ────────────────────────────────");
  console.log("  [0]  🚪  Sair");
  console.log("\n" + linha("─"));
}

async function menu() {
  const opcoes = {
    "1": opSomar,
    "2": opSubtrair,
    "3": opMultiplicar,
    "4": opDividir,
    "5": opPotencia,
    "6": opRaizQuadrada,
    "7": opSomarStream,
    "8": opGerarTabuada,
    "9": opMediaMovel,
  };

  while (true) {
    exibirMenu();
    const opcao = await pergunta("\n  Escolha uma opção: ");

    if (opcao === "0") {
      console.log(`\n  👋 Encerrando ${NOME_CLIENTE}. Até logo!\n`);
      rl.close();
      process.exit(0);
    }

    const fn = opcoes[opcao];
    if (fn) {
      await fn();
    } else {
      erro("Opção inválida! Escolha entre 0 e 9.");
    }

    await aguardarEnter();
  }
}

// ─── Inicialização ────────────────────────────────────────────────────────────
async function main() {
  limpar();
  console.log("\n" + linha("═"));
  console.log(`  🚀 Iniciando ${NOME_CLIENTE}`);
  console.log(`  🔗 Conectando ao servidor em ${ENDERECO}...`);
  console.log(linha("═"));

  try {
    await conectar();
    console.log("\n  ✅ Conexão estabelecida com sucesso!\n");
    await new Promise((r) => setTimeout(r, 800));
    await menu();
  } catch (err) {
    console.error(`\n  ❌ Erro de conexão: ${err.message}`);
    console.error(`  ℹ️  Verifique se o servidor está rodando em ${ENDERECO}`);
    console.error(`  ℹ️  Execute: node servidor.js\n`);
    rl.close();
    process.exit(1);
  }
}

main();
