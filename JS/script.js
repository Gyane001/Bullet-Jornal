"use strict";

let itemAberto = {};
let paginaAtualId = null;
let salvarTimeout = null;
let itemRenomeandoId = null; // qual item está com o campo de nome editável aberto
let itemArrastando = null;   // id do item sendo arrastado no momento

document.addEventListener("DOMContentLoaded", () => {
    // ---------- Menu hambúrguer (igual antes) ----------
    const menuButton = document.getElementById("menuButton");
    const closeMenuButton = document.getElementById("closeMenuButton");
    const sideMenu = document.getElementById("sideMenu");
    const menuOverlay = document.getElementById("menuOverlay");

    function openMenu() {
        sideMenu.classList.add("open");
        menuOverlay.classList.add("visible");
        menuButton.setAttribute("aria-expanded", "true");
        sideMenu.setAttribute("aria-hidden", "false");
    }

    function closeMenu() {
        sideMenu.classList.remove("open");
        menuOverlay.classList.remove("visible");
        menuButton.setAttribute("aria-expanded", "false");
        sideMenu.setAttribute("aria-hidden", "true");
    }

    function toggleMenu() {
        sideMenu.classList.contains("open") ? closeMenu() : openMenu();
    }

    if (menuButton && closeMenuButton && sideMenu && menuOverlay) {
        menuButton.addEventListener("click", toggleMenu);
        closeMenuButton.addEventListener("click", closeMenu);
        menuOverlay.addEventListener("click", closeMenu);

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                closeMenu();
                esconderMenuContexto();
            }
        });

        document.querySelectorAll(".menu-item").forEach(button => {
            button.addEventListener("click", () => {
                document.querySelectorAll(".menu-item").forEach(item => item.classList.remove("active"));
                button.classList.add("active");
                closeMenu();
            });
        });
    }

    // Fecha o menu de contexto ao clicar em qualquer lugar fora dele
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".context-menu")) {
            esconderMenuContexto();
        }
    });

    // ---------- Botões "Nova pasta" / "Nova página" (na raiz) ----------
    const novaPastaBtn = document.getElementById("novaPastaBtn");
    const novaPaginaBtn = document.getElementById("novaPaginaBtn");

    if (novaPastaBtn) {
        novaPastaBtn.addEventListener("click", () => criarFilhoInline(null, "folder"));
    }

    if (novaPaginaBtn) {
        novaPaginaBtn.addEventListener("click", () => criarFilhoInline(null, "page"));
    }

    configurarDropNaRaiz();
    renderizarArvore();
});

// ---------- Criação de itens sem prompt (campo de nome aparece na hora) ----------

function criarFilhoInline(parentId, type) {
    const novo = criarItem({
        parentId,
        type,
        title: "Sem título",
        icon: type === "folder" ? "📁" : "📄"
    });
    if (parentId) itemAberto[parentId] = true; // abre o pai pra mostrar o item novo
    itemRenomeandoId = novo.id;
    renderizarArvore();
    if (type === "page") abrirPagina(novo.id);
}

function iniciarRenomear(id) {
    itemRenomeandoId = id;
    renderizarArvore();
}

function confirmarRenomear(id, valorDigitado) {
    const titulo = valorDigitado.trim() || "Sem título";
    atualizarItem(id, { title: titulo });
    itemRenomeandoId = null;
    renderizarArvore();
}

// ---------- Renderização da árvore ----------

function itemTemFilhos(id) {
    return obterFilhos(id).length > 0;
}

function renderizarArvore() {
    const container = document.getElementById("arvoreItens");
    if (!container) return;
    container.innerHTML = "";
    renderizarNivel(null, container);

    // Se algum item está em modo de renomear, foca o campo de texto dele
    if (itemRenomeandoId) {
        const input = document.querySelector(`.arvore-rename-input[data-rename-id="${itemRenomeandoId}"]`);
        if (input) {
            input.focus();
            input.select();
        }
    }
}

function renderizarNivel(parentId, containerPai) {
    const filhos = obterFilhos(parentId);

    filhos.forEach(item => {
        const linha = document.createElement("div");
        linha.className = "arvore-item";
        linha.dataset.id = item.id;
        if (item.id === paginaAtualId) linha.classList.add("selecionado");

        const podeExpandir = item.type === "folder" || itemTemFilhos(item.id);

        // Seta de expandir/recolher
        const seta = document.createElement("span");
        seta.className = "arvore-seta";
        seta.textContent = podeExpandir ? (itemAberto[item.id] ? "▾" : "▸") : "";
        if (podeExpandir) {
            seta.addEventListener("click", (e) => {
                e.stopPropagation();
                itemAberto[item.id] = !itemAberto[item.id];
                renderizarArvore();
            });
        }

        // Rótulo (nome do item) — vira um <input> quando está em modo "renomear"
        let labelEl;
        if (item.id === itemRenomeandoId) {
            labelEl = document.createElement("input");
            labelEl.className = "arvore-rename-input";
            labelEl.dataset.renameId = item.id;
            labelEl.value = item.title;
            labelEl.addEventListener("click", (e) => e.stopPropagation());
            labelEl.addEventListener("keydown", (e) => {
                if (e.key === "Enter") confirmarRenomear(item.id, labelEl.value);
                if (e.key === "Escape") { itemRenomeandoId = null; renderizarArvore(); }
            });
            labelEl.addEventListener("blur", () => confirmarRenomear(item.id, labelEl.value));
        } else {
            labelEl = document.createElement("span");
            labelEl.className = "arvore-label";
            labelEl.textContent = `${item.icon} ${item.title}`;
            labelEl.addEventListener("click", (e) => {
                e.stopPropagation();
                if (item.type === "page") {
                    abrirPagina(item.id);
                } else {
                    itemAberto[item.id] = !itemAberto[item.id];
                    renderizarArvore();
                }
            });
        }

        // Botões de ação (+ e ⋯)
        const acoes = document.createElement("span");
        acoes.className = "arvore-acoes";

        const addBtn = document.createElement("button");
        addBtn.className = "arvore-add-btn";
        addBtn.type = "button";
        addBtn.textContent = "+";
        addBtn.title = "Criar página dentro";
        addBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            criarFilhoInline(item.id, "page");
        });

        const menuBtn = document.createElement("button");
        menuBtn.className = "arvore-menu-btn";
        menuBtn.type = "button";
        menuBtn.textContent = "⋯";
        menuBtn.title = "Mais opções";
        menuBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const rect = menuBtn.getBoundingClientRect();
            mostrarMenuContexto(item, rect.left, rect.bottom + 4);
        });

        acoes.appendChild(addBtn);
        acoes.appendChild(menuBtn);

        linha.appendChild(seta);
        linha.appendChild(labelEl);
        linha.appendChild(acoes);

        // Clique direito também abre o menu de opções
        linha.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            mostrarMenuContexto(item, e.clientX, e.clientY);
        });

        // ----- Drag and drop -----
        linha.draggable = item.id !== itemRenomeandoId;

        linha.addEventListener("dragstart", (e) => {
            itemArrastando = item.id;
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", item.id);
            linha.classList.add("arrastando");
        });

        linha.addEventListener("dragend", () => {
            itemArrastando = null;
            document.querySelectorAll(".arvore-item").forEach(el => {
                el.classList.remove("arrastando", "drop-before", "drop-after", "drop-inside");
            });
        });

        linha.addEventListener("dragover", (e) => {
            if (!itemArrastando || itemArrastando === item.id) return;
            e.preventDefault();
            e.stopPropagation();
            const rect = linha.getBoundingClientRect();
            const ratio = (e.clientY - rect.top) / rect.height;
            linha.classList.remove("drop-before", "drop-after", "drop-inside");
            if (ratio < 0.25) linha.classList.add("drop-before");
            else if (ratio > 0.75) linha.classList.add("drop-after");
            else linha.classList.add("drop-inside");
        });

        linha.addEventListener("dragleave", () => {
            linha.classList.remove("drop-before", "drop-after", "drop-inside");
        });

        linha.addEventListener("drop", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!itemArrastando || itemArrastando === item.id) return;
            const rect = linha.getBoundingClientRect();
            const ratio = (e.clientY - rect.top) / rect.height;
            tratarDrop(item, ratio);
            linha.classList.remove("drop-before", "drop-after", "drop-inside");
        });

        containerPai.appendChild(linha);

        if (itemAberto[item.id]) {
            const filhosContainer = document.createElement("div");
            filhosContainer.className = "arvore-filhos";
            containerPai.appendChild(filhosContainer);
            renderizarNivel(item.id, filhosContainer);
        }
    });
}

// ---------- Lógica do "onde soltar" (antes / depois / dentro) ----------

function tratarDrop(itemDestino, ratio) {
    const idArrastado = itemArrastando;
    let novoParentId;
    let indice;

    if (ratio < 0.25 || ratio > 0.75) {
        // Solto perto do topo ou do fundo da linha: vira IRMÃO (antes ou depois)
        novoParentId = itemDestino.parentId;
        const irmaos = obterFilhos(novoParentId).filter(i => i.id !== idArrastado);
        const posDestino = irmaos.findIndex(i => i.id === itemDestino.id);
        indice = ratio < 0.25 ? posDestino : posDestino + 1;
    } else {
        // Solto no meio da linha: vira FILHO (dentro do item de destino)
        novoParentId = itemDestino.id;
        const filhosDestino = obterFilhos(novoParentId).filter(i => i.id !== idArrastado);
        indice = filhosDestino.length;
        itemAberto[itemDestino.id] = true;
    }

    moverItem(idArrastado, novoParentId, indice);
    itemArrastando = null;
    renderizarArvore();
}

// Permite soltar num espaço vazio da lista para mandar o item de volta pra raiz
function configurarDropNaRaiz() {
    const container = document.getElementById("arvoreItens");
    if (!container) return;

    container.addEventListener("dragover", (e) => {
        if (itemArrastando) e.preventDefault();
    });

    container.addEventListener("drop", (e) => {
        e.preventDefault();
        if (!itemArrastando) return;
        const filhosRaiz = obterFilhos(null).filter(i => i.id !== itemArrastando);
        moverItem(itemArrastando, null, filhosRaiz.length);
        itemArrastando = null;
        renderizarArvore();
    });
}

// ---------- Menu de contexto (clique direito ou botão "⋯") ----------

function mostrarMenuContexto(item, x, y) {
    let menu = document.getElementById("contextMenu");
    if (!menu) {
        menu = document.createElement("div");
        menu.id = "contextMenu";
        menu.className = "context-menu";
        document.body.appendChild(menu);
    }
    menu.innerHTML = "";

    menu.appendChild(criarOpcaoContexto("✏️ Renomear", () => {
        iniciarRenomear(item.id);
        esconderMenuContexto();
    }));

    menu.appendChild(criarOpcaoContexto("📁 Criar uma pasta", () => {
        criarFilhoInline(item.id, "folder");
        esconderMenuContexto();
    }));

    menu.appendChild(criarOpcaoContexto("📄 Criar uma página", () => {
        criarFilhoInline(item.id, "page");
        esconderMenuContexto();
    }));

    const divisor = document.createElement("div");
    divisor.className = "context-menu-divider";
    menu.appendChild(divisor);

    const delBtn = criarOpcaoContexto("🗑️ Delete", () => {
        excluirItem(item.id);
        if (paginaAtualId === item.id) mostrarEstadoVazio();
        esconderMenuContexto();
        renderizarArvore();
    });
    delBtn.classList.add("excluir");
    menu.appendChild(delBtn);

    menu.style.display = "flex";

    const larguraMenu = 200;
    const alturaMenu = 170;
    menu.style.left = Math.min(x, window.innerWidth - larguraMenu - 10) + "px";
    menu.style.top = Math.min(y, window.innerHeight - alturaMenu - 10) + "px";
}

function esconderMenuContexto() {
    const menu = document.getElementById("contextMenu");
    if (menu) menu.style.display = "none";
}

function criarOpcaoContexto(texto, aoClicar) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = texto;
    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        aoClicar();
    });
    return btn;
}

// ---------- Editor da página ----------

function abrirPagina(id) {
    const item = carregarItens().find(i => i.id === id);
    if (!item) return;
    paginaAtualId = id;

    const editor = document.getElementById("workspaceEditor");
    editor.innerHTML = `
        <input class="page-title" id="pageTitleInput" value="${escapeHtml(item.title)}" />
        <div class="page-content" id="pageContentArea" contenteditable="true">${item.content || ""}</div>
    `;

    document.getElementById("pageTitleInput").addEventListener("input", agendarSalvar);
    document.getElementById("pageContentArea").addEventListener("input", agendarSalvar);

    renderizarArvore();
}

function mostrarEstadoVazio() {
    paginaAtualId = null;
    const editor = document.getElementById("workspaceEditor");
    editor.innerHTML = `<div class="empty-state">Selecione uma página na lista ao lado, ou crie uma nova para começar a escrever.</div>`;
}

function agendarSalvar() {
    clearTimeout(salvarTimeout);
    salvarTimeout = setTimeout(() => {
        if (!paginaAtualId) return;
        const tituloEl = document.getElementById("pageTitleInput");
        const conteudoEl = document.getElementById("pageContentArea");
        if (!tituloEl || !conteudoEl) return;
        atualizarItem(paginaAtualId, {
            title: tituloEl.value || "Sem título",
            content: conteudoEl.innerHTML
        });
        renderizarArvore();
    }, 500);
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}