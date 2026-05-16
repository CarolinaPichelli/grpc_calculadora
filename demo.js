/**
 * demo.js — Valida o servidor gRPC com 2 clientes simultâneos.
 * Executa todas as operações automaticamente e exibe os resultados.
 */

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.join(__dirname, "calculadora.proto");
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const calculadoraProto = grpc.loadPackageDefinition(packageDef).calculadora;

// ─── Utilitários ──────────────────────────────────────────────────────────────
const VERDE = "\x1b[32m";
const AMARELO = "\x1b[33m";
const AZUL = "\x1b[34m";
const MAGENTA = "\x1b[35m";
const CIANO = "\x1b[36m";
const RESET = "\x1b[0m";
const NEGRITO = "\x1b[1m";

function log(cliente, msg, cor = RESET) {
  const prefixo = cliente === "A"
    ? `${AZUL}[Cliente-A]${RESET}`
    : `${MAGENTA}[Cliente-B]${RESET}`;
  console.log(`${prefixo} ${cor}${msg}${RESET}`);
}

function secao(titulo) {
  console.log(`\n${NEGRITO}${AMARELO}${"═".repeat(55)}`);
  console.log(`  ${titulo}`);
  console.log(`${"═".repeat(55)}${RESET}`);
}

function criarCliente(endereco) {
  return new calculadoraProto.Calculadora(
    endereco,
    grpc.credentials.createInsecure()
  );
}

function conectar(cliente, endereco) {
  return new Promise((resolve, reject) => {
    const deadline = new Date();
    deadline.setSeconds(deadline.getSeconds() + 5);
    cliente.waitForReady(deadline, (err) =>
      err ? reject(new Error(`Falha ao conectar em ${endereco}`)) : resolve()
    );
  });
}

// ─── Wrappers de Promessa ─────────────────────────────────────────────────────
const unary = (c, metodo, req) =>
  new Promise((res, rej) =>
    c[metodo](req, (err, r) => (err ? rej(err) : res(r)))
  );

const somarStream = (c, numeros) =>
  new Promise((res, rej) => {
    const call = c.SomarStream((err, r) => (err ? rej(err) : res(r)));
    numeros.forEach((v) => call.write({ valor: v }));
    call.end();
  });

const gerarTabuada = (c, valor) =>
  new Promise((res, rej) => {
    const itens = [];
    const call = c.GerarTabuada({ valor });
    call.on("data", (item) => itens.push(item));
    call.on("end", () => res(itens));
    call.on("error", rej);
  });

const mediaMovel = (c, numeros) =>
  new Promise((res, rej) => {
    const medias = [];
    const call = c.CalcularMediaMovel();
    call.on("data", (m) => medias.push(m));
    call.on("end", () => res(medias));
    call.on("error", (err) => {
      if (err.code !== grpc.status.CANCELLED) rej(err);
      else res(medias);
    });
    numeros.forEach((v) => call.write({ valor: v }));
    call.end();
  });

// ─── Testes do Cliente A ──────────────────────────────────────────────────────
async function rodarClienteA(c) {
  log("A", "Iniciando bateria de testes...", NEGRITO);

  // Operações básicas
  let r = await unary(c, "Somar", { a: 15, b: 7 });
  log("A", `Somar:       ${r.mensagem}`, VERDE);

  r = await unary(c, "Subtrair", { a: 100, b: 43 });
  log("A", `Subtrair:    ${r.mensagem}`, VERDE);

  r = await unary(c, "Multiplicar", { a: 8, b: 9 });
  log("A", `Multiplicar: ${r.mensagem}`, VERDE);

  r = await unary(c, "Dividir", { a: 144, b: 12 });
  log("A", `Dividir:     ${r.mensagem}`, VERDE);

  // Divisão por zero
  try {
    await unary(c, "Dividir", { a: 5, b: 0 });
  } catch (err) {
    log("A", `Divisão/zero: ✅ Erro capturado → ${err.message}`, CIANO);
  }

  // Avançadas
  r = await unary(c, "CalcularPotencia", { base: 2, expoente: 10 });
  log("A", `Potência:    ${r.mensagem}`, VERDE);

  r = await unary(c, "CalcularRaizQuadrada", { valor: 144 });
  log("A", `Raiz:        ${r.mensagem}`, VERDE);

  // Raiz negativa
  try {
    await unary(c, "CalcularRaizQuadrada", { valor: -9 });
  } catch (err) {
    log("A", `Raiz neg.:   ✅ Erro capturado → ${err.message}`, CIANO);
  }

  // Client Streaming
  const numStream = [10, 20, 30, 40, 50];
  r = await somarStream(c, numStream);
  log("A", `SomarStream: ${r.mensagem}`, VERDE);

  // Server Streaming
  const tabuada = await gerarTabuada(c, 7);
  log("A", `Tabuada do 7: ${tabuada.length} itens recebidos`, VERDE);
  tabuada.forEach((item) => log("A", `  ${item.expressao}`, RESET));

  // Bidirecional
  const medias = await mediaMovel(c, [10, 20, 30, 40, 50]);
  log("A", `Média Móvel: ${medias.length} médias calculadas`, VERDE);
  medias.forEach((m) =>
    log("A", `  Qtd ${m.quantidade}: média = ${m.media.toFixed(2)}`, RESET)
  );

  log("A", "✅ Todos os testes concluídos!", VERDE + NEGRITO);
}

// ─── Testes do Cliente B ──────────────────────────────────────────────────────
async function rodarClienteB(c) {
  log("B", "Iniciando bateria de testes...", NEGRITO);

  // Aguarda 200ms para intercalar logs com Cliente A
  await new Promise((r) => setTimeout(r, 200));

  let r = await unary(c, "Somar", { a: 999, b: 1 });
  log("B", `Somar:       ${r.mensagem}`, VERDE);

  r = await unary(c, "Subtrair", { a: 500, b: 250 });
  log("B", `Subtrair:    ${r.mensagem}`, VERDE);

  r = await unary(c, "Multiplicar", { a: 12, b: 12 });
  log("B", `Multiplicar: ${r.mensagem}`, VERDE);

  r = await unary(c, "Dividir", { a: 355, b: 113 });
  log("B", `Dividir:     ${r.mensagem}`, VERDE);

  r = await unary(c, "CalcularPotencia", { base: 3, expoente: 8 });
  log("B", `Potência:    ${r.mensagem}`, VERDE);

  r = await unary(c, "CalcularRaizQuadrada", { valor: 256 });
  log("B", `Raiz:        ${r.mensagem}`, VERDE);

  const numStream = [5, 15, 25, 35, 45, 55];
  r = await somarStream(c, numStream);
  log("B", `SomarStream: ${r.mensagem}`, VERDE);

  const tabuada = await gerarTabuada(c, 9);
  log("B", `Tabuada do 9: ${tabuada.length} itens recebidos`, VERDE);
  tabuada.forEach((item) => log("B", `  ${item.expressao}`, RESET));

  const medias = await mediaMovel(c, [2, 4, 6, 8, 10, 12]);
  log("B", `Média Móvel: ${medias.length} médias calculadas`, VERDE);
  medias.forEach((m) =>
    log("B", `  Qtd ${m.quantidade}: média = ${m.media.toFixed(2)}`, RESET)
  );

  log("B", "✅ Todos os testes concluídos!", VERDE + NEGRITO);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const ENDERECO = "localhost:50051";

  console.log(`\n${NEGRITO}${CIANO}`);
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║      DEMO — Calculadora gRPC com 2 Clientes          ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(RESET);

  const clienteA = criarCliente(ENDERECO);
  const clienteB = criarCliente(ENDERECO);

  try {
    console.log(`Conectando os dois clientes em ${ENDERECO}...`);
    await Promise.all([conectar(clienteA, ENDERECO), conectar(clienteB, ENDERECO)]);
    console.log(`${VERDE}✅ Cliente-A e Cliente-B conectados com sucesso!${RESET}\n`);
  } catch (err) {
    console.error(`${VERDE === "" ? "" : "\x1b[31m"}❌ ${err.message}${RESET}`);
    console.error("  Certifique-se de que o servidor está rodando: node servidor.js");
    process.exit(1);
  }

  secao("FASE 1 — Clientes executando em PARALELO");
  console.log(`${AZUL}[Cliente-A]${RESET} e ${MAGENTA}[Cliente-B]${RESET} simultâneos:\n`);

  // Executa os dois clientes em paralelo
  await Promise.all([rodarClienteA(clienteA), rodarClienteB(clienteB)]);

  secao("RESUMO FINAL");
  console.log(`${VERDE}${NEGRITO}`);
  console.log("  ✅ Servidor processou requisições de 2 clientes simultâneos");
  console.log("  ✅ Todas as operações unárias testadas (incluindo erros)");
  console.log("  ✅ Client Streaming validado (SomarStream)");
  console.log("  ✅ Server Streaming validado (GerarTabuada)");
  console.log("  ✅ Bidirectional Streaming validado (CalcularMediaMovel)");
  console.log(RESET);

  process.exit(0);
}

main();
