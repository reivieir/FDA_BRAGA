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

  // CORREÇÃO: Mês atual com a primeira letra maiúscula para bater com a lista
  const mesAtualNome = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date());
  const mesFormatado = mesAtualNome.charAt(0).toUpperCase() + mesAtualNome.slice(1);
  const [mesInput, setMesInput] = useState(mesFormatado);

  const grupos = [
    ["Adriana", "Silvinho", "Adriano", "Angela", "Vini", "Stefany"],
    ["Helena", "Antonio", "Paty", "Jair", "Giovana", "Manu", "Pablo"],
    ["Clarice", "Gilson", "Deia", "Helio", "Amanda", "Reinaldo"],
    ["Katia", "Giovani", "Cintia", "Rafael", "Ju", "Bia"],
    ["Julia", "Juan"]
  ];

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const getMetaIndividual = (nome: string) => nome === 'Pablo' ? 330 : 660;

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data: m } = await supabase.from('membros').select('*').order('nome');
      const { data: p } = await supabase.from('pagamentos_detalhes').select('*, membros(nome)');
      if (m) setMembros(m);
      if (p) setHistorico(p);
    } catch (e) { console.error("Erro ao carregar dados:", e); }
  };

  const registrarPagamento = async () => {
    if (!selectedMembro || !valorInput) return;
    await supabase.from('pagamentos_detalhes').insert([
      { membro_id: parseInt(selectedMembro), valor: parseFloat(valorInput), mes: mesInput }
    ]);
    setValorInput('');
    fetchData();
  };

  const calcularPago = (id: number) => historico.filter(p => p.membro_id === id).reduce((acc, p) => acc + Number(p.valor), 0);
  
  const metaTotalGeral = membros.reduce((acc, m) => acc + getMetaIndividual(m.nome), 0);
  const totalArrecadadoGeral = historico.reduce((acc, p) => acc + Number(p.valor), 0);

  if (isAdmin) {
    return (
      <div className="p-4 bg-gray-100 min-h-screen font-sans">
        <button onClick={() => setIsAdmin(false)} className="mb-4 text-xs font-bold text-blue-600 uppercase">← Voltar</button>
        <h1 className="text-xl font-black mb-6 italic">PAINEL DO REINALDO</h1>
        <div className="bg-white p-6 rounded-3xl shadow-sm mb-6 space-y-3">
          <select className="w-full p-3 border rounded-xl font-bold bg-gray-50" onChange={e => setSelectedMembro(e.target.value)}>
            <option value="">Selecione o Familiar</option>
            {membros.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="number" placeholder="Valor R$" className="w-1/2 p-3 border rounded-xl" value={valorInput} onChange={e => setValorInput(e.target.value)} />
            <select className="w-1/2 p-3 border rounded-xl" value={mesInput} onChange={e => setMesInput(e.target.value)}>
              {meses.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button onClick={registrarPagamento} className="w-full bg-green-600 text-white font-black p-4 rounded-xl shadow-lg">LANÇAR PIX</button>
        </div>
        <div className="space-y-2">
          {historico.slice().reverse().map(p => (
            <div key={p.id} className="bg-white p-3 rounded-xl flex justify-between shadow-sm text-xs border-l-4 border-green-500">
              <span className="font-bold">{p.membros?.nome}</span>
              <span className="text-gray-500 font-black text-right">R$ {p.valor} <br/><span className="text-[10px] text-gray-300">({p.mes})</span></span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF0] p-4 md:p-10 font-sans text-gray-800">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-black text-[#D4A373] italic uppercase tracking-tighter">Família <span className="text-green-700">FDA</span></h1>
        <p className="text-[10px] font-bold text-gray-400 tracking-[0.4em] mt-2 italic">Axiocracia Familiar 2026</p>
      </header>

      <div className="max-w-6xl mx-auto bg-black text-white p-8 rounded-[40px] shadow-2xl mb-12 border-b-8 border-green-700">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="text-center md:text-left">
            <p className="text-[10px] text-[#D4A373] font-black uppercase tracking-widest">Arrecadação Total</p>
            <div className="text-5xl md:text-7xl font-black">R$ {totalArrecadadoGeral.toLocaleString('pt-BR')}</div>
          </div>
          <div className="text-center md:text-right">
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Meta Final</p>
            <div className="text-xl font-bold text-gray-400">R$ {metaTotalGeral.toLocaleString('pt-BR')}</div>
          </div>
        </div>
        <div className="w-full bg-gray-800 h-4 rounded-full overflow-hidden mb-6">
          <div className="bg-green-500 h-full transition-all duration-1000" style={{ width: `${(totalArrecadadoGeral/metaTotalGeral)*100}%` }}></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 border-t border-gray-800 pt-6">
          {meses.map(mes => {
            const totalMes = historico.filter(p => p.mes === mes).reduce((acc, p) => acc + Number(p.valor), 0);
            if (totalMes === 0) return null;
            return (
              <div key={mes} className="text-center p-2 rounded-2xl bg-gray-900/50">
                <p className="text-[8px] font-black text-gray-500 uppercase">{mes}</p>
                <p className="text-xs font-black text-[#D4A373]">R$ {totalMes}</p>
              </div>
            );
          })}
        </div>
      </div>

      <main className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {grupos.map((grupo, gIdx) => (
          <div key={gIdx} className="space-y-3">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 border-b border-gray-200 pb-2">Grupo {gIdx + 1}</h2>
            {grupo.map(nome => {
              const membro = membros.find(m => m.nome === nome);
              const pago = membro ? calcularPago(membro.id) : 0;
              const metaInd = getMetaIndividual(nome);
              const aPagar = metaInd - pago;
              return (
                <div key={nome} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-black text-xs text-gray-700 uppercase italic truncate">{nome}</span>
                    <div className={`h-2 w-2 rounded-full ${aPagar <= 0 ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-400'}`}></div>
                  </div>
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-[8px] font-bold text-gray-300 uppercase">Recebido</p>
                      <p className={`text-xs font-black ${pago > 0 ? 'text-green-600' : 'text-gray-400'}`}>R$ {pago}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-bold text-gray-300 uppercase">Falta</p>
                      <p className={`text-xs font-black ${aPagar <= 0 ? 'text-green-600' : 'text-red-500'}`}>{aPagar <= 0 ? 'QUITADO' : `R$ ${aPagar}`}</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-50 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${aPagar <= 0 ? 'bg-green-500' : 'bg-[#D4A373]'}`} style={{ width: `${Math.min((pago/metaInd)*100, 100)}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </main>

      <footer className="mt-24 text-center pb-20 pt-10 border-t border-dashed border-gray-200">
        <input type="password" placeholder="Admin" className="p-3 border rounded-2xl text-xs" onChange={e => setSenha(e.target.value)} />
        <button onClick={() => senha === 'FDA2026' && setIsAdmin(true)} className="ml-3 text-[10px] font-black text-gray-400 uppercase">Painel</button>
      </footer>
    </div>
  );
};

const container = document.getElementById('root');
if (container) { createRoot(container).render(<App />); }
export default App;
