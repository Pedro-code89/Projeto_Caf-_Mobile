// ==========================================================
// camera.js - Dia 5: câmera do celular e galeria de fotos
// RECURSO DE HARDWARE: câmera (frontal e traseira)
// Exige HTTPS (ou localhost) e permissão do usuário.
// ==========================================================

const areaCamera = document.querySelector("#area-camera");
const video = document.querySelector("#video");
const canvas = document.querySelector("#canvas");
const btnLigarCamera = document.querySelector("#btn-ligar-camera");
const btnFoto = document.querySelector("#btn-foto");
const btnTrocarCamera = document.querySelector("#btn-trocar-camera");
const inputFoto = document.querySelector("#input-foto");
const galeria = document.querySelector("#galeria");

let stream = null;                 // a "transmissão" da câmera ligada
let cameraAtual = "environment";   // "environment" = traseira, "user" = frontal
let tentativaCamera = 0;

// ---------- Ligar e desligar ----------

// async/await: esperamos o usuário responder ao pedido de permissão
async function ligarCamera() {
  // O navegador tem acesso à câmera? (sem HTTPS, mediaDevices nem existe)
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    mostrarAviso("Câmera indisponível. Abra o app pelo link https://");
    return;
  }

  desligarCamera(); // se já estava ligada, desliga antes de trocar
  const tentativa = tentativaCamera;

  try {
    const novaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: cameraAtual, width: { ideal: 1080 } },
      audio: false
    });
    // A permissão pode chegar depois de o usuário já ter saído desta aba.
    if (tentativa !== tentativaCamera) {
      for (const track of novaStream.getTracks()) {
        track.stop();
      }
      return;
    }
    stream = novaStream;
    video.srcObject = stream;               // liga o vídeo na câmera
    video.classList.toggle("espelhado", cameraAtual === "user");
    areaCamera.classList.add("ligada");
    btnFoto.disabled = false;
    btnTrocarCamera.disabled = false;
    btnLigarCamera.textContent = "Desligar";
  } catch (erro) {
    // NotAllowedError = usuário negou | NotFoundError = sem câmera
    console.log(erro);
    if (erro.name === "NotAllowedError") {
      mostrarAviso("Você precisa permitir o uso da câmera");
    } else {
      mostrarAviso("Não foi possível abrir a câmera (" + erro.name + ")");
    }
  }
}

function desligarCamera() {
  tentativaCamera += 1;
  if (stream) {
    // Cada "track" é um sensor em uso; stop() desliga (e apaga a luz da câmera)
    for (const track of stream.getTracks()) {
      track.stop();
    }
    stream = null;
  }
  video.srcObject = null;
  areaCamera.classList.remove("ligada");
  btnFoto.disabled = true;
  btnTrocarCamera.disabled = true;
  btnLigarCamera.textContent = "Ligar câmera";
}

function trocarCamera() {
  if (cameraAtual === "environment") {
    cameraAtual = "user";
  } else {
    cameraAtual = "environment";
  }
  ligarCamera();
}

btnLigarCamera.addEventListener("click", function () {
  if (stream) {
    desligarCamera();
  } else {
    ligarCamera();
  }
});
btnTrocarCamera.addEventListener("click", trocarCamera);

// ---------- Fotos ----------

function carregarFotos() {
  const salvas = localStorage.getItem("fotos");
  if (salvas) {
    return JSON.parse(salvas);
  }
  return [];
}

let fotos = carregarFotos(); // cada foto: { imagem, data, legenda }

function salvarFotos() {
  // Fotos em 1080 px e qualidade 95% ocupam mais espaço (Dia 4).
  // Tentamos remover as antigas sem entrar em uma repetição infinita.
  while (true) {
    try {
      localStorage.setItem("fotos", JSON.stringify(fotos));
      return true;
    } catch (erro) {
      if (erro.name === "QuotaExceededError" && fotos.length > 1) {
        fotos.pop();
      } else {
        mostrarAviso("Não foi possível salvar a foto. Confira o armazenamento do navegador.");
        return false;
      }
    }
  }
}

// Desenha uma imagem (do vídeo ou de um arquivo) no canvas, já reduzida,
// e guarda o resultado na galeria
function guardarImagem(fonte, larguraOriginal, alturaOriginal) {
  if (!larguraOriginal || !alturaOriginal) {
    mostrarAviso("Espere a imagem da câmera aparecer antes de fotografar.");
    return false;
  }
  const largura = Math.min(1080, larguraOriginal); // até 1080 px, sem ampliar imagens pequenas
  const altura = Math.round((alturaOriginal / larguraOriginal) * largura);
  canvas.width = largura;
  canvas.height = altura;

  const contexto = canvas.getContext("2d");
  contexto.drawImage(fonte, 0, 0, largura, altura);

  // Mudanças do Dia 4: qualidade 95% e legenda escolhida pelo usuário.
  const imagem = canvas.toDataURL("image/jpeg", 0.95);
  const legenda = (window.prompt("Legenda da foto:") || "").trim();
  const fotosAnteriores = fotos.slice();

  fotos.unshift({ imagem: imagem, data: new Date().toLocaleString("pt-BR"), legenda: legenda });
  if (fotos.length > 12) {
    fotos.pop(); // guardamos no máximo 12 fotos
  }
  if (!salvarFotos()) {
    fotos = fotosAnteriores;
    return false;
  }
  mostrarGaleria();
  return true;
}

function tirarFoto() {
  if (!stream) {
    return;
  }
  if (!guardarImagem(video, video.videoWidth, video.videoHeight)) {
    return;
  }

  // Efeito de flash + vibração, como uma câmera de verdade
  areaCamera.classList.remove("flash");
  void areaCamera.offsetWidth; // truque para reiniciar a animação
  areaCamera.classList.add("flash");
  vibrar(30);
  mostrarAviso("📸 Foto salva na galeria");
}

btnFoto.addEventListener("click", tirarFoto);

// Jeito simples: <input type="file" capture> abre o app de câmera do celular
inputFoto.addEventListener("change", function () {
  const arquivo = inputFoto.files[0];
  if (!arquivo) {
    return;
  }
  if (!arquivo.type.startsWith("image/")) {
    mostrarAviso("Escolha um arquivo de imagem.");
    inputFoto.value = "";
    return;
  }
  const img = new Image();
  img.onload = function () {
    const salva = guardarImagem(img, img.naturalWidth, img.naturalHeight);
    URL.revokeObjectURL(img.src);
    if (salva) {
      mostrarAviso("📸 Foto salva na galeria");
    }
  };
  img.onerror = function () {
    URL.revokeObjectURL(img.src);
    mostrarAviso("Não foi possível abrir essa imagem. Tente uma foto JPEG ou PNG.");
  };
  img.src = URL.createObjectURL(arquivo);
  inputFoto.value = ""; // permite escolher a mesma foto de novo
});

function mostrarGaleria() {
  galeria.innerHTML = "";
  document.querySelector("#titulo-galeria").textContent = "Galeria (" + fotos.length + ")";
  if (fotos.length === 0) {
    galeria.innerHTML = '<p class="vazio">Nenhuma foto ainda.</p>';
    return;
  }
  for (const foto of fotos) {
    const div = document.createElement("div");
    div.className = "foto";
    div.innerHTML = `
      <img src="${foto.imagem}" alt="Foto do meu café">
      <small></small>
      <div class="foto-acoes">
        <button class="btn-compartilhar-foto" aria-label="Compartilhar foto">📤</button>
      </div>
    `;
    // textContent exibe a legenda como texto, mesmo se ela contiver símbolos HTML.
    div.querySelector("small").textContent = foto.legenda || foto.data;
    div.querySelector(".btn-compartilhar-foto").addEventListener("click", function () {
      compartilharFoto(foto); // função que está em pwa.js
    });
    galeria.appendChild(div);
  }
}

// ---------- Início ----------
mostrarGaleria();
