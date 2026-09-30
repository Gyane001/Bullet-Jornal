"use strict";

// ---- "Banco de dados" simples usando localStorage ----

const STORAGE_KEY = "meuPlannerItens";

// Estrutura de cada item:
// { id, parentId, type: "folder" | "page", title, icon, order, content }

function gerarId() {
    return "id-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
}

function carregarItens() {
    const dados = localStorage.getItem(STORAGE_KEY);
    return dados ? JSON.parse(dados) : [];
}

function salvarItens(itens) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(itens));
}

function criarItem({ parentId = null, type = "page", title = "Sem título", icon = "📄" }) {
    const itens = carregarItens();
    const novo = {
        id: gerarId(),
        parentId,
        type,
        title,
        icon,
        order: itens.length,
        content: "" // vamos usar isso na etapa 3 (editor)
    };
    itens.push(novo);
    salvarItens(itens);
    return novo;
}

function atualizarItem(id, dadosNovos) {
    const itens = carregarItens();
    const index = itens.findIndex(i => i.id === id);
    if (index === -1) return;
    itens[index] = { ...itens[index], ...dadosNovos };
    salvarItens(itens);
}

function excluirItem(id) {
    let itens = carregarItens();
    // Remove o item e também tudo que estiver "dentro" dele (recursivo)
    function coletarDescendentes(itemId) {
        const filhos = itens.filter(i => i.parentId === itemId);
        let idsParaRemover = [itemId];
        filhos.forEach(f => {
            idsParaRemover = idsParaRemover.concat(coletarDescendentes(f.id));
        });
        return idsParaRemover;
    }
    const idsRemover = coletarDescendentes(id);
    itens = itens.filter(i => !idsRemover.includes(i.id));
    salvarItens(itens);
}

function obterFilhos(parentId) {
    return carregarItens()
        .filter(i => i.parentId === parentId)
        .sort((a, b) => a.order - b.order);
}