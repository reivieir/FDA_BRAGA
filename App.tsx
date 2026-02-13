import React, { useState, useEffect } from 'react';

const App: React.FC = () => {
  const [dados, setDados] = useState<any>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    // O fetch busca direto na raiz porque o arquivo está na public
    fetch('/pagamentos.json')
      .then(res => {
        if (!res.ok) throw new Error("Erro ao carregar JSON");
        return res.json();
      })
      .then(json => setDados(json))
      .catch(() => setErro(true));
  }, []);

  if (erro) return <div className="p-10 text-red-500 font-bold">Erro: Ficheiro pagamentos.json não encontrado na pasta public!</div>;
  if (!dados) return <div className="p-10 font-bold italic">A carregar lista da Família FDA...</div>;

  const totalPago = dados.membros.filter((m: any) => m.pago).length;

  return (
    <div className="min-h-screen bg-[#FDFCF0] p-6">
      <h1 className="text-3xl font-black text-[#D4A373] mb-8 uppercase italic">Família FDA</h1>
      
      <div className="bg-white p-6 rounded-2xl shadow-lg border-b-4 border-green-600 mb-6">
        <p className="text-xs font-bold text-gray-400 uppercase">Arrecadado</p>
        <div className="text-2xl font-black">R$ {totalPago * dados.config.valorPorPessoa}</div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {dados.membros.map((m: any, i: number) => (
          <div key={i} className="bg-white p-3 rounded-lg shadow-sm flex justify-between items-center border border-gray-100">
            <span className="font-bold text-gray-700">{m.nome}</span>
            <span className={`text-[10px] font-black px-2 py-1 rounded ${m.pago ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-400'}`}>
              {m.pago ? 'PAGO' : 'PENDENTE'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
