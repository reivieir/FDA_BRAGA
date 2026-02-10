// Exemplo de como você vai organizar os dados
const participantes = [
    { nome: "Amanda", pago: 120 }, // Exemplo: pagou 2 meses
    { nome: "Reinaldo", pago: 60 },
    { nome: "Thomas", pago: 0 },
    // Adicione os outros 24 nomes aqui...
];

const metaTotal = 17820; // 27 pessoas * 60 reais * 11 meses

function atualizarDashboard() {
    const tabela = document.getElementById('tabela-corpo');
    let totalArrecadado = 0;

    participantes.forEach(p => {
        totalArrecadado += p.pago;
        const row = `<tr>
            <td>${p.nome}</td>
            <td><span class="status ${p.pago > 0 ? 'pago' : 'pendente'}">${p.pago > 0 ? 'PAGOU ALGO' : 'PENDENTE'}</span></td>
            <td>R$ ${p.pago.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
        </tr>`;
        tabela.innerHTML += row;
    });

    document.getElementById('arrecadado').innerText = `R$ ${totalArrecadado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    
    const porcentagem = (totalArrecadado / metaTotal) * 100;
    document.getElementById('barra-progresso').style.width = porcentagem + '%';
    document.getElementById('barra-progresso').innerText = Math.round(porcentagem) + '%';
}

atualizarDashboard();
