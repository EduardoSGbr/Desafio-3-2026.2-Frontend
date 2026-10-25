// ==========================================
// Seleção de Elementos do DOM
// ==========================================
const regiaoBtn = document.getElementById('accordion-regiao-btn');
const regiaoList = document.getElementById('accordion-regiao-list');
const regiaoText = document.getElementById('accordion-regiao-text');
const regiaoIcon = document.getElementById('accordion-regiao-icon');

const ufBtn = document.getElementById('accordion-uf-btn');
const ufList = document.getElementById('accordion-uf-list');
const ufText = document.getElementById('accordion-uf-text');
const ufIcon = document.getElementById('accordion-uf-icon');

const inputBusca = document.getElementById('input-busca');
const tabelaMunicipios = document.getElementById('tabela-municipios');
const kpiTotal = document.getElementById('kpi-total');
const kpiIdUf = document.getElementById('kpi-id-uf');

const containerGrafico = document.getElementById('container-grafico');
let graficoAtual = null;

let municipiosCarregados = [];
let siglaUfAtual = '';

// ==========================================
// Funções de Requisição à API (IBGE)
// ==========================================

async function carregarRegioes() {
    try {
        const resposta = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/regioes?orderBy=nome');
        const regioes = await resposta.json();

        regiaoList.innerHTML = '';

        // Opção para ver todas as regiões / limpar filtro
        const itemTodas = document.createElement('div');
        itemTodas.className = 'px-4 py-2 hover:bg-orange-50 hover:text-orange-600 cursor-pointer text-left font-medium transition-colors';
        itemTodas.textContent = 'Todas as Regiões';
        itemTodas.addEventListener('click', () => {
            regiaoText.textContent = 'Todas as Regiões';
            fecharTodosAccordions();
            carregarTodosEstados();
        });
        regiaoList.appendChild(itemTodas);

        regioes.forEach(regiao => {
            const item = document.createElement('div');
            item.className = 'px-4 py-2 hover:bg-orange-50 hover:text-orange-600 cursor-pointer text-left font-medium transition-colors';
            item.textContent = regiao.nome;
            
            item.addEventListener('click', () => {
                regiaoText.textContent = regiao.nome;
                fecharTodosAccordions();
                carregarEstadosDaRegiao(regiao.id);
            });

            regiaoList.appendChild(item);
        });

        // Carrega todos os estados inicialmente no outro accordion
        carregarTodosEstados();

    } catch (erro) {
        console.error("Erro ao carregar as regiões:", erro);
    }
}

async function carregarTodosEstados() {
    ufText.textContent = 'Carregando Estados...';
    ufBtn.disabled = true;
    ufBtn.classList.add('opacity-60');
    limparDadosEstadoAnterior();

    try {
        const resposta = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
        const estados = await resposta.json();
        popularListaEstados(estados);
    } catch (erro) {
        console.error("Erro ao carregar todos os estados:", erro);
    }
}

async function carregarEstadosDaRegiao(idRegiao) {
    ufText.textContent = 'Carregando Estados...';
    ufBtn.disabled = true;
    ufBtn.classList.add('opacity-60');
    limparDadosEstadoAnterior();

    try {
        const resposta = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/regioes/${idRegiao}/estados?orderBy=nome`);
        const estados = await resposta.json();
        popularListaEstados(estados);
    } catch (erro) {
        console.error("Erro ao carregar estados da região:", erro);
    }
}

function popularListaEstados(estados) {
    ufList.innerHTML = '';
    ufText.textContent = 'Selecione uma UF';
    ufBtn.disabled = false;
    ufBtn.classList.remove('opacity-60');

    estados.forEach(estado => {
        const item = document.createElement('div');
        item.className = 'px-4 py-2 hover:bg-orange-50 hover:text-orange-600 cursor-pointer text-left font-medium transition-colors';
        item.textContent = `${estado.nome} (${estado.sigla})`;
        
        item.addEventListener('click', () => {
            ufText.textContent = `${estado.nome} (${estado.sigla})`;
            fecharTodosAccordions();
            buscarMunicipios(estado.sigla, estado.id);
        });

        ufList.appendChild(item);
    });
}

async function buscarMunicipios(siglaUf, idUf) {
    limparDadosEstadoAnterior();
    siglaUfAtual = siglaUf;

    kpiIdUf.textContent = `ID da UF: ${idUf}`;
    tabelaMunicipios.innerHTML = '<div class="col-span-1 md:col-span-3 py-5 text-gray-500 font-semibold">Carregando municípios...</div>';

    try {
        const resposta = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${siglaUf}/municipios?orderBy=nome`);
        municipiosCarregados = await resposta.json();

        kpiTotal.textContent = `Total de cidades encontradas: ${municipiosCarregados.length}`;
        inputBusca.disabled = false;
        inputBusca.placeholder = "Pesquisar cidade...";

        renderizarMunicipios(municipiosCarregados);
        gerarGrafico(municipiosCarregados);

    } catch (erro) {
        console.error("Erro ao buscar os municípios:", erro);
        tabelaMunicipios.innerHTML = '<div class="col-span-1 md:col-span-3 py-5 text-red-500">Erro ao carregar os dados.</div>';
    }
}

// ==========================================
// Funções de Interface e Lógica
// ==========================================

function fecharTodosAccordions() {
    regiaoList.classList.add('hidden');
    regiaoIcon.textContent = '🔽';
    ufList.classList.add('hidden');
    ufIcon.textContent = '🔽';
}

function gerarGrafico(listaMunicipios) {
    if (listaMunicipios.length === 0) {
        containerGrafico.classList.add('hidden');
        return;
    }

    containerGrafico.classList.remove('hidden');

    const contagem = {};
    listaMunicipios.forEach(mun => {
        const mesorregiao = mun.microrregiao.mesorregiao.nome;
        contagem[mesorregiao] = (contagem[mesorregiao] || 0) + 1;
    });

    const labels = Object.keys(contagem);
    const dados = Object.values(contagem);

    if (graficoAtual) {
        graficoAtual.destroy();
    }

    const ctx = document.getElementById('graficoMesorregioes').getContext('2d');
    graficoAtual = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Número de Cidades',
                data: dados,
                backgroundColor: '#f97316',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function renderizarMunicipios(listaMunicipios) {
    tabelaMunicipios.innerHTML = '';

    if (listaMunicipios.length === 0) {
        tabelaMunicipios.innerHTML = '<div class="col-span-1 md:col-span-3 py-5 text-gray-500">Nenhum município corresponde à pesquisa.</div>';
        return;
    }

    listaMunicipios.forEach(municipio => {
        const celula = document.createElement('div');
        celula.className = 'py-3 px-2 text-gray-700 text-sm md:text-base cursor-pointer hover:text-orange-600 hover:bg-orange-50 transition-colors font-medium truncate';
        celula.textContent = municipio.nome;

        celula.addEventListener('click', () => {
            const termoBusca = encodeURIComponent(`${municipio.nome}, ${siglaUfAtual}, Brasil`);
            const urlMaps = `https://www.google.com/maps/search/?api=1&query=${termoBusca}`;
            window.open(urlMaps, '_blank');
        });

        tabelaMunicipios.appendChild(celula);
    });
}

function limparDadosEstadoAnterior() {
    municipiosCarregados = [];
    tabelaMunicipios.innerHTML = '';
    kpiTotal.textContent = 'Total de cidades encontradas: 0';
    kpiIdUf.textContent = 'ID da UF: -';
    inputBusca.value = '';
    inputBusca.disabled = true;
    inputBusca.placeholder = "Aguardando UF...";
    
    containerGrafico.classList.add('hidden');
    if (graficoAtual) {
        graficoAtual.destroy();
        graficoAtual = null;
    }
}

// ==========================================
// Event Listeners (Gatilhos)
// ==========================================

window.addEventListener('DOMContentLoaded', carregarRegioes);

// Região Accordion Click
regiaoBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !regiaoList.classList.contains('hidden');
    fecharTodosAccordions();
    if (!isOpen) {
        regiaoList.classList.remove('hidden');
        regiaoIcon.textContent = '🔼';
    }
});

// UF Accordion Click
ufBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (ufBtn.disabled) return;
    const isOpen = !ufList.classList.contains('hidden');
    fecharTodosAccordions();
    if (!isOpen) {
        ufList.classList.remove('hidden');
        ufIcon.textContent = '🔼';
    }
});

// Fechar accordions ao clicar fora
window.addEventListener('click', () => {
    fecharTodosAccordions();
});

// Filtrar municípios localmente
inputBusca.addEventListener('input', (evento) => {
    const textoPesquisa = evento.target.value.toLowerCase();
    
    const municipiosFiltrados = municipiosCarregados.filter(municipio => 
        municipio.nome.toLowerCase().includes(textoPesquisa)
    );
    
    renderizarMunicipios(municipiosFiltrados);
    kpiTotal.textContent = `Total de cidades encontradas: ${municipiosFiltrados.length}`;
    gerarGrafico(municipiosFiltrados);
});