const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
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

// ─── Implementações dos RPCs ──────────────────────────────────────────────────

// Unary: Somar
function somar(call, callback) {
  const { a, b } = call.request;
  const valor = a + b;
  console.log(`[Somar] ${a} + ${b} = ${valor}`);
  callback(null, { valor, mensagem: `${a} + ${b} = ${valor}` });
}

// Unary: Subtrair
function subtrair(call, callback) {
  const { a, b } = call.request;
  const valor = a - b;
  console.log(`[Subtrair] ${a} - ${b} = ${valor}`);
  callback(null, { valor, mensagem: `${a} - ${b} = ${valor}` });
}

// Unary: Multiplicar
function multiplicar(call, callback) {
  const { a, b } = call.request;
  const valor = a * b;
  console.log(`[Multiplicar] ${a} × ${b} = ${valor}`);
  callback(null, { valor, mensagem: `${a} × ${b} = ${valor}` });
}

// Unary: Dividir (com tratamento de divisão por zero)
function dividir(call, callback) {
  const { a, b } = call.request;
  if (b === 0) {
    console.log(`[Dividir] Erro: divisão por zero`);
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: "Erro: divisão por zero não é permitida",
    });
  }
  const valor = a / b;
  console.log(`[Dividir] ${a} ÷ ${b} = ${valor}`);
  callback(null, { valor, mensagem: `${a} ÷ ${b} = ${valor}` });
}

// Unary: CalcularPotencia
function calcularPotencia(call, callback) {
  const { base, expoente } = call.request;
  const valor = Math.pow(base, expoente);
  console.log(`[Potência] ${base}^${expoente} = ${valor}`);
  callback(null, { valor, mensagem: `${base}^${expoente} = ${valor}` });
}

// Unary: CalcularRaizQuadrada
function calcularRaizQuadrada(call, callback) {
  const { valor: num } = call.request;
  if (num < 0) {
    console.log(`[Raiz] Erro: número negativo`);
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: "Erro: não é possível calcular raiz quadrada de número negativo",
    });
  }
  const valor = Math.sqrt(num);
  console.log(`[Raiz] √${num} = ${valor}`);
  callback(null, { valor, mensagem: `√${num} = ${valor}` });
}

// Client Streaming: SomarStream
function somarStream(call, callback) {
  let soma = 0;
  let count = 0;
  const numeros = [];

  call.on("data", (numero) => {
    soma += numero.valor;
    numeros.push(numero.valor);
    count++;
    console.log(`[SomarStream] Recebido: ${numero.valor} (soma parcial: ${soma})`);
  });

  call.on("end", () => {
    console.log(`[SomarStream] Stream encerrado. Total de ${count} números. Soma = ${soma}`);
    callback(null, {
      valor: soma,
      mensagem: `Soma de ${count} número(s) [${numeros.join(", ")}] = ${soma}`,
    });
  });

  call.on("error", (err) => {
    console.error(`[SomarStream] Erro: ${err.message}`);
  });
}

// Server Streaming: GerarTabuada
function gerarTabuada(call) {
  const { valor } = call.request;
  console.log(`[Tabuada] Gerando tabuada do ${valor}`);

  let i = 1;
  const intervalo = setInterval(() => {
    if (i > 10) {
      clearInterval(intervalo);
      call.end();
      return;
    }
    const resultado = valor * i;
    const expressao = `${valor} × ${i} = ${resultado}`;
    console.log(`[Tabuada] ${expressao}`);
    call.write({ multiplicador: i, resultado, expressao });
    i++;
  }, 100);
}

// Bidirectional Streaming: CalcularMediaMovel
function calcularMediaMovel(call) {
  let soma = 0;
  let count = 0;

  call.on("data", (numero) => {
    soma += numero.valor;
    count++;
    const media = soma / count;
    console.log(`[Média Móvel] Recebido: ${numero.valor} → Média(${count}): ${media.toFixed(4)}`);
    call.write({ media, quantidade: count });
  });

  call.on("end", () => {
    console.log(`[Média Móvel] Stream encerrado após ${count} números`);
    call.end();
  });

  call.on("error", (err) => {
    console.error(`[Média Móvel] Erro: ${err.message}`);
  });
}

// ─── Inicialização do Servidor ────────────────────────────────────────────────
function main() {
  const server = new grpc.Server();

  server.addService(calculadoraProto.Calculadora.service, {
    Somar: somar,
    Subtrair: subtrair,
    Multiplicar: multiplicar,
    Dividir: dividir,
    CalcularPotencia: calcularPotencia,
    CalcularRaizQuadrada: calcularRaizQuadrada,
    SomarStream: somarStream,
    GerarTabuada: gerarTabuada,
    CalcularMediaMovel: calcularMediaMovel,
  });

  const porta = process.env.PORT || "50051";
  server.bindAsync(
    `0.0.0.0:${porta}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error("Erro ao iniciar servidor:", err);
        process.exit(1);
      }
      console.log("╔══════════════════════════════════════════╗");
      console.log("║     Servidor gRPC Calculadora Online     ║");
      console.log(`║     Escutando na porta: ${port}           ║`);
      console.log("╚══════════════════════════════════════════╝");
      console.log("\nAguardando conexões de clientes...\n");
    }
  );
}

main();
