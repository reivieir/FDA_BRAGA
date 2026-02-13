import React, { useState, useEffect } from 'react';

const App = () => {
  const [dados, setDados] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Busca o arquivo JSON na pasta public
    fetch('/pagamentos.json')
      .then(res => res.json())
      .then(json => {
        setDados(json);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center font-bold">Carregando lista da Família...</div>;

  const totalPago = dados.membros.filter((m: any) => m.pago).length;
  const arrecadado = totalPago * dados.config.valorPorPessoa;
  const porcentagem = (arrecadado / dados.config.metaTotal) * 100;

  return (
    <div className="min-h-screen bg-[#FDFCF0] p-6 font-sans text-[#4A4A4A]">
      {/* Cabeçalho Festivo */}
      <header className="max-w-4xl mx-auto text-center mb-10">
        <h1 className="text-4xl font-black text-[#D4A373] uppercase tracking-tighter italic mb-2">Família <span className="text-green-700">FDA</span></h1>
        <p className="text-sm font-bold uppercase tracking-widest text-gray-400">Controle da Festa de Fim de Ano</p>
      </header>

      <main className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card de Resumo Financeiro */}
        <section className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-xl border-b-4 border-[#D4A373]">
            <h2 className="text-xs font-black uppercase text-gray-400 mb-4">Progresso da Arrecadação</h2>
            <div className="text-3xl font-black text-gray-900 mb-1">R$ {arrecadado}</div>
            <p className="text-[10px] text-gray-400 uppercase font-bold mb-4">Meta: R$ {dados.config.metaTotal}</p>
            
            <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden">
              <div className="bg-green-600 h-full transition-all duration-1000" style={{ width: `${porcentagem}%` }}></div>
            </div>
            <p className="text-right text-[10px] font-black mt-2 text-green-700">{porcentagem.toFixed(1)}% CONCLUÍDO</p>
          </div>

          <div className="bg-black text-white p-6 rounded-3xl shadow-xl border-b-4 border-green-700">
            <h2 className="text-[10px] font-black uppercase text-[#D4A373] mb-2">Status da Lista</h2>
            <div className="flex justify-between items-end">
              <div>
                <span className="text-4xl font-black">{totalPago}</span>
                <span className="text-gray-500 text-sm ml-2">Pagos</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-red-500">{dados.membros.length - totalPago}</span>
                <p className="text-[10px] text-gray-500 uppercase">Pendentes</p>
              </div>
            </div>
          </div>
        </section>

        {/* Lista de Membros */}
        <section className="md:col-span-2 bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-black uppercase text-xs tracking-widest">Lista de Convidados ({dados.membros.length})</h3>
            <span className="text-[10px] bg-[#D4A373]/20 text-[#D4A373] px-2 py-1 rounded-full font-bold italic">Fim de Ano 2026</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-100">
            {dados.membros.map((m: any, i: number) => (
              <div key={i} className="bg-white p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <span className={`font-bold text-sm ${m.pago ? 'text-gray-900' : 'text-gray-400'}`}>
                  {i + 1}. {m.nome}
                </span>
                {m.pago ? (
                  <span className="text-[9px] bg-green-100 text-green-700 px-2 py-1 rounded-lg font-black uppercase">Recebido</span>
                ) : (
                  <span className="text-[9px] bg-red-50 text-red-400 px-2 py-1 rounded-lg font-black uppercase">Pendente</span>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="max-w-4xl mx-auto mt-12 text-center text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em]">
        Organização Dionatas FDA • Atualizado via JSON
      </footer>
    </div>
  );
};

export default App;
