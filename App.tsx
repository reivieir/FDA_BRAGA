import React, { useState, useEffect } from 'react';

const App = () => {
  const [dados, setDados] = useState<any>(null);

  useEffect(() => {
    fetch('/pagamentos.json')
      .then(res => res.json())
      .then(json => setDados(json))
      .catch(err => console.error("Erro ao ler JSON:", err));
  }, []);

  if (!dados) return <div className="p-10 font-bold">A carregar lista da Família FDA...</div>;

  const pagos = dados.membros.filter((m: any) => m.pago).length;
  const total = pagos * dados.config.valorPorPessoa;

  return (
    <div className="min-h-screen bg-[#FDFCF0] p-6 font-sans">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-black text-[#D4A373] italic uppercase">Família FDA</h1>
        <p className="text-[10px] font-bold text-gray-400 tracking-[0.3em]">CONTROLE FIM DE ANO 2026</p>
      </header>

      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-black text-white p-6 rounded-3xl shadow-xl">
          <p className="text-[10px] text-[#D4A373] font-bold uppercase mb-1">Total Arrecadado</p>
          <div className="text-3xl font-black">R$ {total}</div>
          <div className="mt-4 w-full bg-gray-800 h-2 rounded-full overflow-hidden">
            <div className="bg-[#D4A373] h-full" style={{ width: `${(total/dados.config.metaTotal)*100}%` }}></div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
          {dados.membros.map((m: any, i: number) => (
            <div key={i} className="flex justify-between items-center p-4 border-b border-gray-50 hover:bg-gray-50">
              <span className="font-bold text-gray-700">{i + 1}. {m.nome}</span>
              <span className={`text-[9px] font-black px-2 py-1 rounded ${m.pago ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-400'}`}>
                {m.pago ? 'PAGO' : 'PENDENTE'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
