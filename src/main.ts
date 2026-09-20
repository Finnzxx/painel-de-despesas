import './style.css';
import { categorias, type Categoria, type Despesa } from './types';

const chaveArmazenamento = 'painel-de-despesas';
const chaveSalario = 'painel-de-despesas-salario';
const intervaloAvisoPrivacidade = 10 * 60 * 1000;
let despesas: Despesa[] = carregarDespesas();
let salario = carregarSalario();
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
const salarioInput = document.getElementById('salario') as HTMLInputElement;
const saldoDisponivel = document.getElementById('saldo-disponivel') as HTMLElement;
const contadorDespesas = document.getElementById('contador-despesas') as HTMLElement;
const mensagemErro = document.getElementById('mensagem-erro') as HTMLElement;
const atualizarListaButton = document.getElementById('atualizar-lista') as HTMLButtonElement;
const privacidadePopup = document.getElementById('privacidade-popup') as HTMLElement;
const fecharPrivacidadeButton = document.getElementById('fechar-privacidade') as HTMLButtonElement;

function mostrarAvisoPrivacidade(): void {
    privacidadePopup.hidden = false;
}

function formatarMoeda(valor: number): string {
    return moeda.format(valor);
}

function gerarId(): string {
    return crypto.randomUUID();
}

function categoriaValida(valor: string): valor is Categoria {
    return categorias.includes(valor as Categoria);
}

function carregarSalario(): number {
    const valorSalvo = Number(localStorage.getItem(chaveSalario));
    return Number.isFinite(valorSalvo) && valorSalvo >= 0 ? valorSalvo : 0;
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

function salvarSalario(): void {
    localStorage.setItem(chaveSalario, String(salario));
}

function salvarTudo(): void {
    salvarDespesas();
    salvarSalario();
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
    const saldo = salario - total;

    totalGeral.textContent = formatarMoeda(total);
    saldoDisponivel.textContent = formatarMoeda(saldo);
    saldoDisponivel.classList.toggle('balance-negative', saldo < 0);
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
    tituloInput.removeAttribute('aria-invalid');
    valorInput.removeAttribute('aria-invalid');
    categoriaInput.removeAttribute('aria-invalid');
}

function focarCampoComErro(campo: HTMLInputElement | HTMLSelectElement, mensagem: string): void {
    mostrarErro(mensagem);
    campo.setAttribute('aria-invalid', 'true');
    campo.focus();
}

function converterValorDespesa(valorDigitado: string): number | null {
    const valorLimpo = valorDigitado.trim();

    if (!/^\d+(?:[.,]\d{1,2})?$/.test(valorLimpo)) {
        return null;
    }

    const valor = Number(valorLimpo.replace(',', '.'));
    return Number.isFinite(valor) ? valor : null;
}

form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    limparErro();

    const titulo = tituloInput.value.trim();
    const valorDigitado = valorInput.value.trim();
    const valor = converterValorDespesa(valorDigitado);
    const categoria = categoriaInput.value;

    if (!titulo) {
        focarCampoComErro(tituloInput, 'Digite um nome para a despesa, como “Mercado” ou “Internet”.');
        return;
    }

    if (!/\p{L}/u.test(titulo)) {
        focarCampoComErro(tituloInput, 'O nome da despesa precisa ser um texto, não apenas números.');
        return;
    }

    if (!valorDigitado) {
        focarCampoComErro(valorInput, 'Digite o valor da despesa usando apenas números.');
        return;
    }

    if (valor === null) {
        focarCampoComErro(valorInput, 'O valor deve conter apenas números. Exemplo: 49,90.');
        return;
    }

    if (valor <= 0) {
        focarCampoComErro(valorInput, 'Digite um valor maior que zero. Exemplo: 10,00.');
        return;
    }

    if (!categoriaValida(categoria)) {
        focarCampoComErro(categoriaInput, 'Escolha uma categoria para continuar.');
        return;
    }

    despesas.push({ id: gerarId(), titulo, valor, categoria, pago: false });
    salvarDespesas();
    atualizarLista();
    atualizarResumo();
    form.reset();
    tituloInput.focus();
});

[tituloInput, valorInput, categoriaInput].forEach((campo) => {
    campo.addEventListener('input', limparErro);
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

salarioInput.addEventListener('input', () => {
    const valor = Number(salarioInput.value);
    salario = Number.isFinite(valor) && valor >= 0 ? valor : 0;
    salvarSalario();
    atualizarResumo();
});

atualizarListaButton.addEventListener('click', () => {
    despesas = carregarDespesas();
    salario = carregarSalario();
    salarioInput.value = salario > 0 ? String(salario) : '';
    atualizarLista();
    atualizarResumo();
});

window.addEventListener('pagehide', salvarTudo);

fecharPrivacidadeButton.addEventListener('click', () => {
    privacidadePopup.hidden = true;
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        salvarTudo();
    }
});

atualizarLista();
salarioInput.value = salario > 0 ? String(salario) : '';
salvarTudo();
atualizarResumo();
mostrarAvisoPrivacidade();
window.setInterval(mostrarAvisoPrivacidade, intervaloAvisoPrivacidade);
