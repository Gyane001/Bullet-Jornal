"use strict";

const STORAGE_KEY = "meuPlannerItens";

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
        content: "",
        createdAt: new Date().toISOString() // <-- novo
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
    function coletarDescendentes(itemId) {
        const filhos = itens.filter(i => i.parentId === itemId);
        let ids = [itemId];
        filhos.forEach(f => { ids = ids.concat(coletarDescendentes(f.id)); });
        return ids;
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

function duplicarItem(id) {
    const itens = carregarItens();
    const original = itens.find(i => i.id === id);
    if (!original) return null;

    const copia = criarItem({
        parentId: original.parentId,
        type: original.type,
        title: original.title + " (cópia)",
        icon: original.icon
    });
    atualizarItem(copia.id, { content: original.content });
    return copia;
}

function moverParaRaiz(id) {
    atualizarItem(id, { parentId: null });
}