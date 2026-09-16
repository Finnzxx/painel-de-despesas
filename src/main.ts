import './style.css';
import { categorias, type Categoria, type Despesa } from './types';

const chaveArmazenamento = 'painel-de-despesas';
let despesas: Despesa[] = carregarDespesas();
const moeda = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

const form = document.getElementById('form-despesa') as HTMLFormElement;
const tituloInput = document.getElementById('titulo') as HTMLInputElement;
const valorInput = document.getElementById('valor') as HTMLInputElement;
const categoriaInput = document.getElementById('categoria') as HTMLSelectElement;
const lista = document.getElementById('lista-despesas') as HTMLUListElement;
const listaVazia = document.getElementById('lista-vazia') as HTMLParagraphElement;
const totalGeral = document.getElementById('total-geral') as HTMLElement;
const contadorDespesas = document.getElementById('contador-despesas') as HTMLElement;
const mensagemErro = document.getElementById('mensagem-erro') as HTMLElement;
const atualizarListaButton = document.getElementById('atualizar-lista') as HTMLButtonElement;

function formatarMoeda(valor: number): string {
    return moeda.format(valor);
}

function gerarId(): string {
    return crypto.randomUUID();
}

function categoriaValida(valor: string): valor is Categoria {
    return categorias.includes(valor as Categoria);
}

function carregarDespesas(): Despesa[] {
    const dadosSalvos = localStorage.getItem(chaveArmazenamento);

    if (!dadosSalvos) {
        return [];
    }

    try {
        const despesasSalvas: unknown = JSON.parse(dadosSalvos);

        if (!Array.isArray(despesasSalvas)) {
            return [];
        }

        return despesasSalvas.filter((despesa): despesa is Despesa => {
            if (!despesa || typeof despesa !== 'object') {
                return false;
            }

            const item = despesa as Partial<Despesa>;
            return typeof item.id === 'string'
                && typeof item.titulo === 'string'
                && typeof item.valor === 'number'
                && Number.isFinite(item.valor)
                && categoriaValida(item.categoria ?? '')
                && (typeof item.pago === 'boolean' || typeof item.pago === 'undefined');
        }).map((despesa) => ({ ...despesa, pago: despesa.pago ?? false }));
    } catch {
        return [];
    }
}

function salvarDespesas(): void {
    localStorage.setItem(chaveArmazenamento, JSON.stringify(despesas));
}

function obterTotaisPorCategoria(): Record<Categoria, number> {
    const totais = Object.fromEntries(categorias.map((categoria) => [categoria, 0])) as Record<Categoria, number>;

    despesas.forEach((despesa) => {
        if (!despesa.pago) {
            totais[despesa.categoria] += despesa.valor;
        }
    });

    return totais;
}

function atualizarResumo(): void {
    const total = despesas.reduce((soma, despesa) => soma + (despesa.pago ? 0 : despesa.valor), 0);
    const totaisPorCategoria = obterTotaisPorCategoria();

    totalGeral.textContent = formatarMoeda(total);
    const despesasPendentes = despesas.filter((despesa) => !despesa.pago).length;
    contadorDespesas.textContent = `${despesas.length} ${despesas.length === 1 ? 'despesa' : 'despesas'} · ${despesasPendentes} em aberto`;

    categorias.forEach((categoria) => {
        const elemento = document.querySelector(`[data-category-total="${categoria}"]`);
        if (elemento) {
            elemento.textContent = formatarMoeda(totaisPorCategoria[categoria]);
        }
    });
}

function criarItemDespesa(despesa: Despesa): HTMLLIElement {
    const item = document.createElement('li');
    item.className = 'expense-item';

    const detalhes = document.createElement('div');
    detalhes.className = 'expense-details';

    const titulo = document.createElement('strong');
    titulo.textContent = despesa.titulo;

    const categoria = document.createElement('span');
    categoria.className = `category-badge category-${despesa.categoria}`;
    categoria.textContent = despesa.categoria;

    const valor = document.createElement('strong');
    valor.className = `expense-value${despesa.pago ? ' paid' : ''}`;
    valor.textContent = formatarMoeda(despesa.valor);

    const status = document.createElement('span');
    status.className = 'expense-status';
    status.textContent = despesa.pago ? 'Paga' : 'Em aberto';

    const botaoPagamento = document.createElement('button');
    botaoPagamento.type = 'button';
    botaoPagamento.className = `payment-button${despesa.pago ? ' paid' : ''}`;
    botaoPagamento.dataset.id = despesa.id;
    botaoPagamento.setAttribute('aria-pressed', String(despesa.pago));
    botaoPagamento.textContent = despesa.pago ? 'Desmarcar paga' : 'Marcar como paga';

    const botaoExcluir = document.createElement('button');
    botaoExcluir.type = 'button';
    botaoExcluir.className = 'delete-button';
    botaoExcluir.dataset.id = despesa.id;
    botaoExcluir.textContent = 'Excluir';

    detalhes.append(titulo, categoria);
    const acoes = document.createElement('div');
    acoes.className = 'expense-actions';
    acoes.append(status, valor, botaoPagamento, botaoExcluir);
    item.append(detalhes, acoes);
    return item;
}

function atualizarLista(): void {
    lista.replaceChildren(...despesas.map(criarItemDespesa));
    listaVazia.hidden = despesas.length > 0;
}

function mostrarErro(mensagem: string): void {
    mensagemErro.textContent = mensagem;
    mensagemErro.hidden = false;
}

function limparErro(): void {
    mensagemErro.textContent = '';
    mensagemErro.hidden = true;
}

form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    limparErro();

    const titulo = tituloInput.value.trim();
    const valor = Number(valorInput.value);
    const categoria = categoriaInput.value;

    if (!titulo) {
        mostrarErro('Informe um título para a despesa.');
        tituloInput.focus();
        return;
    }

    if (!Number.isFinite(valor) || valor <= 0) {
        mostrarErro('Informe um valor maior que zero.');
        valorInput.focus();
        return;
    }

    if (!categoriaValida(categoria)) {
        mostrarErro('Selecione uma categoria.');
        categoriaInput.focus();
        return;
    }

    despesas.push({ id: gerarId(), titulo, valor, categoria, pago: false });
    salvarDespesas();
    atualizarLista();
    atualizarResumo();
    form.reset();
    tituloInput.focus();
});

lista.addEventListener('click', (evento) => {
    const alvo = evento.target;

    if (!(alvo instanceof HTMLButtonElement) || !alvo.dataset.id) {
        return;
    }

    const despesa = despesas.find((item) => item.id === alvo.dataset.id);

    if (!despesa) {
        return;
    }

    if (alvo.classList.contains('delete-button')) {
        const confirmarExclusao = window.confirm(`Excluir a despesa "${despesa.titulo}"?`);

        if (!confirmarExclusao) {
            return;
        }

        despesas = despesas.filter((item) => item.id !== despesa.id);
    } else {
        despesa.pago = !despesa.pago;
    }

    salvarDespesas();
    atualizarLista();
    atualizarResumo();
});

atualizarListaButton.addEventListener('click', () => {
    despesas = carregarDespesas();
    atualizarLista();
    atualizarResumo();
});

atualizarLista();
atualizarResumo();
