// ==========================================================
// pwa.js - Dia 5: Service Worker, instalação e compartilhamento
// ==========================================================

// ---------- 1. Registrar o Service Worker ----------
// O Service Worker (sw.js) guarda os arquivos no celular para o app abrir offline.
// Só funciona em HTTPS ou localhost. Abrindo pelo arquivo (file://) dá erro, e tudo bem.
if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("sw.js")
      .then(function () {
        console.log("Service Worker registrado!");
      })
      .catch(function (erro) {
        console.log("Service Worker não registrado:", erro.message);
      });
  });
}

// ---------- 2. Botão "Instalar" ----------
// Chrome/Edge (Android e computador) avisam quando o app pode ser instalado.
// No iPhone não existe esse aviso: instala-se por Compartilhar > Adicionar à Tela de Início.
const btnInstalar = document.querySelector("#btn-instalar");
let pedidoDeInstalacao = null;

window.addEventListener("beforeinstallprompt", function (evento) {
  evento.preventDefault();           // impede o aviso automático do navegador
  pedidoDeInstalacao = evento;       // guarda para usar quando o usuário clicar
  btnInstalar.hidden = false;
});

btnInstalar.addEventListener("click", async function () {
  if (!pedidoDeInstalacao) {
    return;
  }
  const convite = pedidoDeInstalacao;
  pedidoDeInstalacao = null;
  btnInstalar.hidden = true;
  try {
    await convite.prompt();
    const escolha = await convite.userChoice;
    console.log("Resposta do usuário:", escolha.outcome);
  } catch (erro) {
    mostrarAviso("Não foi possível instalar agora. Tente pelo menu do navegador.");
  }
});

window.addEventListener("appinstalled", function () {
  pedidoDeInstalacao = null;
  btnInstalar.hidden = true;
  mostrarAviso("☕ Café Mobile instalado!");
});

// O aviso também ajuda a conferir o teste sem conexão.
function atualizarConexao() {
  document.querySelector("#status-offline").hidden = navigator.onLine;
}
window.addEventListener("online", atualizarConexao);
window.addEventListener("offline", atualizarConexao);
atualizarConexao();

// ---------- 3. Compartilhar (Web Share API) ----------
// Abre a janela nativa de compartilhamento do celular (WhatsApp, e-mail...)

function montarResumoPedido() {
  let texto = "☕ Meu pedido no Café Mobile:\n";
  for (const item of pedido) {
    texto = texto + item.quantidade + "x " + item.nome + " - " + formatarPreco(item.preco * item.quantidade) + "\n";
  }
  texto = texto + "Total: " + formatarPreco(calcularTotal());
  return texto;
}

async function compartilharPedido() {
  if (pedido.length === 0) {
    return;
  }
  const texto = montarResumoPedido();

  if (navigator.share) {
    try {
      await navigator.share({ title: "Meu pedido", text: texto });
    } catch (erro) {
      if (erro.name !== "AbortError") {
        mostrarAviso("Não foi possível compartilhar o pedido. Tente novamente.");
      }
    }
  } else {
    // Computador sem suporte: copia o texto para a área de transferência
    try {
      await navigator.clipboard.writeText(texto);
      mostrarAviso("Resumo copiado! Cole onde quiser.");
    } catch (erro) {
      // Se a cópia automática estiver bloqueada, ainda dá para copiar à mão.
      window.prompt("Copie o resumo do pedido:", texto);
    }
  }
}

document.querySelector("#btn-compartilhar-pedido").addEventListener("click", compartilharPedido);

async function compartilharFoto(foto) {
  try {
    // Transforma a imagem guardada (texto base64) em um arquivo de verdade
    const resposta = await fetch(foto.imagem);
    const blob = await resposta.blob();
    const arquivo = new File([blob], "meu-cafe.jpg", { type: blob.type });

    // canShare verifica se o aparelho consegue compartilhar ARQUIVOS
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [arquivo] })) {
      await navigator.share({
        files: [arquivo],
        title: "Meu café",
        text: foto.legenda || "Olha o meu café! ☕"
      });
    } else {
      mostrarAviso("Este aparelho não compartilha imagens");
    }
  } catch (erro) {
    if (erro.name !== "AbortError") {
      mostrarAviso("Não foi possível compartilhar a foto. Tente novamente.");
    }
  }
}
