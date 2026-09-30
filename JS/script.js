"use strict";

let itemAberto = {};
let paginaAtualId = null;
let salvarTimeout = null;

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
            if (event.key === "Escape") closeMenu();
        });

        document.querySelectorAll(".menu-item").forEach(button => {
            button.addEventListener("click", () => {
                document.querySelectorAll(".menu-item").forEach(item => item.classList.remove("active"));
                button.classList.add("active");
                closeMenu();
            });
        });
    }

    // ---------- Botões "Nova pasta" / "Nova página" ----------
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

// ---------- Renderização da árvore ----------

function renderizarArvore() {
    const container = document.getElementById("arvoreItens");
    if (!container) return;
    container.innerHTML = "";
    renderizarNivel(null, container);
}

function renderizarNivel(parentId, containerPai) {
    const filhos = obterFilhos(parentId);

    filhos.forEach(item => {
        const linha = document.createElement("div");
        linha.className = "arvore-item";
        linha.dataset.id = item.id;
        if (item.id === paginaAtualId) linha.classList.add("selecionado");

        const seta = document.createElement("span");
        seta.className = "arvore-seta";
        seta.textContent = item.type === "folder" ? (itemAberto[item.id] ? "▾" : "▸") : "";

        const label = document.createElement("span");
        label.className = "arvore-label";
        label.textContent = `${item.icon} ${item.title}`;

        const acoes = document.createElement("span");
        acoes.className = "arvore-acoes";

        const addBtn = document.createElement("button");
        addBtn.className = "arvore-add-btn";
        addBtn.type = "button";
        addBtn.textContent = "+";
        addBtn.title = "Adicionar página/pasta dentro";
        addBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const criarPasta = confirm('OK = criar PASTA dentro\nCancelar = criar PÁGINA dentro');
            const nome = prompt(criarPasta ? "Nome da pasta:" : "Nome da página:");
            if (!nome) return;
            const novo = criarItem({
                parentId: item.id,
                type: criarPasta ? "folder" : "page",
                title: nome,
                icon: criarPasta ? "📁" : "📄"
            });
            itemAberto[item.id] = true;
            renderizarArvore();
            if (!criarPasta) abrirPagina(novo.id);
        });

        const delBtn = document.createElement("button");
        delBtn.className = "arvore-del-btn";
        delBtn.type = "button";
        delBtn.textContent = "🗑";
        delBtn.title = "Excluir";
        delBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (confirm(`Excluir "${item.title}" e tudo que estiver dentro dele?`)) {
                excluirItem(item.id);
                if (paginaAtualId === item.id) mostrarEstadoVazio();
                renderizarArvore();
            }
        });

        acoes.appendChild(addBtn);
        acoes.appendChild(delBtn);

        linha.appendChild(seta);
        linha.appendChild(label);
        linha.appendChild(acoes);

        linha.addEventListener("click", () => {
            if (item.type === "folder") {
                itemAberto[item.id] = !itemAberto[item.id];
                renderizarArvore();
            } else {
                abrirPagina(item.id);
            }
        });

        containerPai.appendChild(linha);

        if (item.type === "folder" && itemAberto[item.id]) {
            const filhosContainer = document.createElement("div");
            filhosContainer.className = "arvore-filhos";
            containerPai.appendChild(filhosContainer);
            renderizarNivel(item.id, filhosContainer);
        }
    });
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
        const titulo = document.getElementById("pageTitleInput").value || "Sem título";
        const conteudo = document.getElementById("pageContentArea").innerHTML;
        atualizarItem(paginaAtualId, { title: titulo, content: conteudo });
        renderizarArvore();
    }, 500);
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}