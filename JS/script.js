"use strict";

let itemAberto = {};
let paginaAtualId = null;
let salvarTimeout = null;
let menuAbertoId = null; // controla qual dropdown "..." está aberto

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
                fecharDropdown();
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

    // ---------- Fecha o dropdown "..." ao clicar fora dele ----------
    document.addEventListener("click", (e) => {
        if (menuAbertoId && !e.target.closest(".arvore-item-wrapper")) {
            fecharDropdown();
        }
    });

    // ---------- Botões "Nova pasta" / "Nova página" (na raiz) ----------
    const novaPastaBtn = document.getElementById("novaPastaBtn");
    const novaPaginaBtn = document.getElementById("novaPaginaBtn");

    if (novaPastaBtn) {
        novaPastaBtn.addEventListener("click", () => {
            const nome = prompt("Nome da pasta:");
            if (!nome) return;
            criarItem({ type: "folder", title: nome, icon: "📁" });
            renderizarArvore();
        });
    }

    if (novaPaginaBtn) {
        novaPaginaBtn.addEventListener("click", () => {
            const nome = prompt("Nome da página:");
            if (!nome) return;
            const novo = criarItem({ type: "page", title: nome, icon: "📄" });
            renderizarArvore();
            abrirPagina(novo.id);
        });
    }

    renderizarArvore();
});

function fecharDropdown() {
    menuAbertoId = null;
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
}

function renderizarNivel(parentId, containerPai) {
    const filhos = obterFilhos(parentId);

    filhos.forEach(item => {
        const wrapper = document.createElement("div");
        wrapper.className = "arvore-item-wrapper";

        const linha = document.createElement("div");
        linha.className = "arvore-item";
        linha.dataset.id = item.id;
        if (item.id === paginaAtualId) linha.classList.add("selecionado");

        // Pastas sempre mostram a seta; páginas só mostram se tiverem filhos
        const podeExpandir = item.type === "folder" || itemTemFilhos(item.id);

        const seta = document.createElement("span");
        seta.className = "arvore-seta";
        seta.textContent = podeExpandir ? (itemAberto[item.id] ? "▾" : "▸") : "";
        if (podeExpandir) {
            seta.addEventListener("click", (e) => {
                e.stopPropagation();
                menuAbertoId = null;
                itemAberto[item.id] = !itemAberto[item.id];
                renderizarArvore();
            });
        }

        const label = document.createElement("span");
        label.className = "arvore-label";
        label.textContent = `${item.icon} ${item.title}`;
        label.addEventListener("click", (e) => {
            e.stopPropagation();
            menuAbertoId = null;
            if (item.type === "page") {
                abrirPagina(item.id);
            } else {
                itemAberto[item.id] = !itemAberto[item.id];
                renderizarArvore();
            }
        });

        const acoes = document.createElement("span");
        acoes.className = "arvore-acoes";

        const addBtn = document.createElement("button");
        addBtn.className = "arvore-add-btn";
        addBtn.type = "button";
        addBtn.textContent = "+";
        addBtn.title = "Adicionar página/pasta dentro";
        addBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            menuAbertoId = null;
            const criarPasta = confirm('OK = criar PASTA dentro\nCancelar = criar PÁGINA dentro');
            const nome = prompt(criarPasta ? "Nome da pasta:" : "Nome da página:");
            if (!nome) return;
            const novo = criarItem({
                parentId: item.id,
                type: criarPasta ? "folder" : "page",
                title: nome,
                icon: criarPasta ? "📁" : "📄"
            });
            itemAberto[item.id] = true; // já abre o pai pra mostrar o item novo
            renderizarArvore();
            if (!criarPasta) abrirPagina(novo.id);
        });

        const menuBtn = document.createElement("button");
        menuBtn.className = "arvore-menu-btn";
        menuBtn.type = "button";
        menuBtn.textContent = "⋯";
        menuBtn.title = "Mais opções";
        menuBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            menuAbertoId = (menuAbertoId === item.id) ? null : item.id;
            renderizarArvore();
        });

        acoes.appendChild(addBtn);
        acoes.appendChild(menuBtn);

        linha.appendChild(seta);
        linha.appendChild(label);
        linha.appendChild(acoes);
        wrapper.appendChild(linha);

        if (menuAbertoId === item.id) {
            wrapper.appendChild(criarDropdown(item));
        }

        containerPai.appendChild(wrapper);

        if (itemAberto[item.id]) {
            const filhosContainer = document.createElement("div");
            filhosContainer.className = "arvore-filhos";
            containerPai.appendChild(filhosContainer);
            renderizarNivel(item.id, filhosContainer);
        }
    });
}

// ---------- Dropdown "..." (Renomear, Ver info, Duplicar, Remover da pasta, Lixeira) ----------

function criarDropdown(item) {
    const dropdown = document.createElement("div");
    dropdown.className = "arvore-dropdown";

    dropdown.appendChild(criarOpcao("✏️ Renomear", () => {
        const novoNome = prompt("Novo nome:", item.title);
        if (!novoNome) return;
        atualizarItem(item.id, { title: novoNome });
        fecharDropdown();
    }));

    dropdown.appendChild(criarOpcao("ℹ️ Ver informações", () => {
        const criado = item.createdAt ? new Date(item.createdAt).toLocaleString("pt-BR") : "desconhecido";
        alert(`Título: ${item.title}\nTipo: ${item.type === "folder" ? "Pasta" : "Página"}\nCriado em: ${criado}`);
        fecharDropdown();
    }));

    dropdown.appendChild(criarOpcao("📄 Duplicar", () => {
        duplicarItem(item.id);
        fecharDropdown();
    }));

    if (item.parentId !== null) {
        dropdown.appendChild(criarOpcao("📤 Remover da pasta", () => {
            moverParaRaiz(item.id);
            fecharDropdown();
        }));
    }

    const divisor = document.createElement("div");
    divisor.className = "arvore-dropdown-divider";
    dropdown.appendChild(divisor);

    const excluirBtn = criarOpcao("🗑️ Mover para lixeira", () => {
        if (confirm(`Excluir "${item.title}" e tudo que estiver dentro dele?`)) {
            excluirItem(item.id);
            if (paginaAtualId === item.id) mostrarEstadoVazio();
            fecharDropdown();
        }
    });
    excluirBtn.classList.add("excluir");
    dropdown.appendChild(excluirBtn);

    return dropdown;
}

function criarOpcao(texto, aoClicar) {
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