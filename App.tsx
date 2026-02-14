import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

const App = () => {
  const [membros, setMembros] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [senha, setSenha] = useState('');
  
  const [selectedMembro, setSelectedMembro] = useState('');
  const [valorInput, setValorInput] = useState('');
  const [mesInput, setMesInput] = useState('Fevereiro');

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  // Função para definir a meta individual
  const getMetaIndividual = (nome: string) => nome === 'Pablo' ? 330 : 660;

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: m } = await supabase.from('membros').select('*').order('nome');
    const { data: p } = await supabase.from('pagamentos_detalhes').select('*, membros(nome)');
    if (m) setMembros(m);
    if (p) setHistorico(p);
  };

  const registrarPagamento = async () => {
    if (!selectedMembro || !valorInput) return;
    await supabase.from('pagamentos_detalhes').insert([
      { membro_id: selectedMembro, valor: parseFloat(valorInput), mes: mesInput }
    ]);
    setValorInput('');
    fetchData();
  };

  const calcularPago = (id: number) => historico.filter(p => p.membro_id === id).reduce((acc, p) => acc + p.valor, 0);
  
  // Cálculo da Meta Total Dinâmica
  const metaTotalGeral = membros.reduce((acc, m) => acc + getMetaIndividual(m.nome), 0);
  const totalArrecadadoGeral = historico.reduce((acc, p) => acc + p.valor, 0);

  if (isAdmin) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen font-sans">
        <button onClick={() => setIsAdmin(false)} className="text-blue-600 font-bold mb-4 uppercase text-xs">← Voltar ao Site</button>
        <h1 className="text-2xl font-black mb-6">LANÇAMENTOS - REINALDO</h1>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm mb-8 space-y-4 border border-gray-200">
          <select className="w-full p-3 border rounded-xl font-bold" onChange={e => setSelectedMembro(e.target.value)}>
            <option value="">Selecione o Familiar</option>
            {membros.map(m => <option key={m.id} value={m.id}>{m.nome} (Meta: R${getMetaIndividual(m.nome)})</option>)}
          </select>
          <div className="flex gap-2">
            <input type="number" placeholder="Valor R$" className="w-1/2 p-3 border rounded-xl" value={valorInput} onChange={e => setValorInput(e.target.value)} />
            <select className="w-1/2 p-3 border rounded-xl" value={mesInput} onChange={e => setMesInput(e.target.value)}>
              {meses.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button onClick={registrarPagamento} className="w-full bg-green-600 text-white font-black p-4 rounded-xl shadow-lg active:scale-95 transition-transform">CONFIRMAR RECEBIMENTO</button>
        </div>

        <h2 className="font-black text-gray-400 text-xs uppercase mb-4 tracking-widest">Histórico Recente</h2>
        <div className="space-y-2">
          {historico.slice().reverse().map(p => (
            <div key={p.id} className="bg-white p-4 rounded-2xl flex justify-between shadow-sm text-sm border-l-4 border-green-500">
              <span className="font-bold">{p.membros?.nome}</span>
              <span className="text-gray-500 font-black">R$ {p.valor} <span className="text-[10px] text-gray-300">({p.mes})</span></span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF0] p-6 font-sans text-gray-800">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-black text-[#D4A373] italic uppercase tracking-tighter">Família <span className="text-green-700">FDA</span></h1>
        <p className="text-[10px] font-bold text-gray-400 tracking-[0.3em]">CONTROLE DE ARRECADAÇÃO 2026</p>
      </header>

      {/* Card de Progresso Geral */}
      <div className="max-w-md mx-auto bg-black text-white p-6 rounded-3xl shadow-2xl mb-8">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-[10px] text-[#D4A373] font-black uppercase">Total da Festa</p>
            <div className="text-3xl font-black">R$ {totalArrecadadoGeral}</div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 font-black uppercase">Meta Final</p>
            <div className="text-sm font-bold text-gray-400">R$ {metaTotalGeral}</div>
          </div>
        </div>
        <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden">
          <div className="bg-green-500 h-full transition-all duration-1000" style={{ width: `${(totalArrecadadoGeral/metaTotalGeral)*100}%` }}></div>
        </div>
      </div>

      {/* Lista Individual */}
      <section className="max-w-md mx-auto space-y-3">
        {membros.map(m => {
          const pago = calcularPago(m.id);
          const metaInd = getMetaIndividual(m.nome);
          const aPagar = metaInd - pago;
          return (
            <div key={m.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <span className="font-black text-gray-700 uppercase italic text-sm">{m.nome}</span>
                <span className={`text-[10px] font-black px-3 py-1 rounded-full ${aPagar <= 0 ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>
                  {aPagar <= 0 ? 'QUITADO' : `FALTA R$ ${aPagar}`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex gap-4">
                  <div>
                    <p className="text-[8px] font-bold text-gray-400 uppercase">Pago</p>
                    <p className="font-black text-xs text-green-600">R$ {pago}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-gray-400 uppercase">Meta</p>
                    <p className="font-black text-xs text-gray-400">R$ {metaInd}</p>
                  </div>
                </div>
                {/* Barrinha de progresso individual */}
                <div className="w-24 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                   <div className="bg-[#D4A373] h-full" style={{ width: `${Math.min((pago/metaInd)*100, 100)}%` }}></div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <footer className="mt-20 text-center pb-10">
        <div className="inline-block p-4 border-t border-dashed border-gray-200">
          <input type="password" placeholder="Senha Admin" className="p-2 border rounded-xl text-xs bg-white" onChange={e => setSenha(e.target.value)} />
          <button onClick={() => senha === 'FDA2026' && setIsAdmin(true)} className="ml-2 text-[10px] font-black text-gray-400 uppercase hover:text-black">Acessar Painel</button>
        </div>
      </footer>
    </div>
  );
};

const container = document.getElementById('root');
if (container) { createRoot(container).render(<App />); }
export default App;
