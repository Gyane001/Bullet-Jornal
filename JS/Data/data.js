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
        type, // "folder" ou "page"
        title,
        icon,
        order: itens.length,
        content: "",
        createdAt: new Date().toISOString()
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

// Verifica se "possivelDescendenteId" está dentro da árvore de "raizId"
// (usado para impedir arrastar uma pasta para dentro dela mesma)
function ehDescendente(raizId, possivelDescendenteId) {
    const todos = carregarItens();
    function coletar(itemId) {
        const filhos = todos.filter(i => i.parentId === itemId);
        let ids = filhos.map(f => f.id);
        filhos.forEach(f => { ids = ids.concat(coletar(f.id)); });
        return ids;
    }
    return coletar(raizId).includes(possivelDescendenteId);
}

// Move um item para um novo pai (novoParentId pode ser null = raiz),
// posicionando-o no índice "indiceDestino" entre os irmãos do destino.
function moverItem(id, novoParentId, indiceDestino) {
    if (id === novoParentId) return;
    if (novoParentId && ehDescendente(id, novoParentId)) return; // evita loop (pasta dentro de si mesma)

    const todos = carregarItens();
    const item = todos.find(i => i.id === id);
    if (!item) return;

    item.parentId = novoParentId;

    const irmaos = todos.filter(i => i.parentId === novoParentId && i.id !== id);
    irmaos.sort((a, b) => a.order - b.order);
    irmaos.splice(indiceDestino, 0, item);
    irmaos.forEach((it, idx) => { it.order = idx; });

    salvarItens(todos);
}