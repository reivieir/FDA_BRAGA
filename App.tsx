import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';

// Inicialização segura do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const App = () => {
  const [membros, setMembros] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedMembroId, setSelectedMembroId] = useState<number | null>(null);
  const [senha, setSenha] = useState('');
  
  // Estados do Admin
  const [membroInput, setMembroInput] = useState('');
  const [valorInput, setValorInput] = useState('');
  const [mesInput, setMesInput] = useState('Fevereiro');

  // Definição exata dos grupos
  const grupos = [
    ["Adriana", "Silvinho", "Adriano", "Angela", "Vini", "Stefany"],
    ["Helena", "Antonio", "Paty", "Jair", "Giovana", "Manu", "Pablo"],
    ["Clarice", "Gilson", "Deia", "Helio", "Amanda", "Reinaldo"],
    ["Katia", "Giovani", "Cintia", "Rafael", "Ju", "Bia"],
    ["Julia", "Juan"]
  ];

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  // Regra de Metas
  const getMeta = (nome: string) => nome === 'Pablo' ? 330 : 660;

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const { data: m } = await supabase.from('membros').select('*').order('nome');
    const { data: p } = await supabase.from('pagamentos_detalhes').select('*, membros(nome)');
    if (m) setMembros(m);
    if (p) setHistorico(p);
  };

  const lancar = async () => {
    if (!membroInput || !valorInput) return;
    await supabase.from('pagamentos_detalhes').insert([
      { membro_id: parseInt(membroInput), valor: parseFloat(valorInput), mes: mesInput }
    ]);
    setValorInput('');
    fetchAll();
  };

  const calcPago = (id: number) => historico.filter(h => h.membro_id === id).reduce((acc, h) => acc + Number(h.valor), 0);
  const totalGeral = historico.reduce((acc, h) => acc + Number(h.valor), 0);
  const metaGeral = membros.reduce((acc, m) => acc + getMeta(m.nome), 0);

  // --- TELA DETALHADA POR MEMBRO ---
  if (selectedMembroId) {
    const m = membros.find(x => x.id === selectedMembroId);
    const pagamentos = historico.filter(h => h.membro_id === selectedMembroId);
    const pago = calcPago(selectedMembroId);
    const meta = getMeta(m?.nome || '');

    return (
      <div className="min-h-screen bg-[#FDFCF0] p-6 font-sans">
        <button onClick={() => setSelectedMembroId(null)} className="mb-8 font-black text-[#D4A373] uppercase text-xs">← Voltar para Geral</button>
        <div className="max-w-xl mx-auto bg-white p-8 rounded-[40px] shadow-xl border-b-8 border-green-700">
          <h2 className="text-3xl font-black italic uppercase text-gray-800">{m?.nome}</h2>
          <div className="flex justify-between mt-6 text-sm font-bold">
            <span className="text-green-600">PAGO: R$ {pago}</span>
            <span className="text-gray-400">META: R$ {meta}</span>
          </div>
          <div className="w-full bg-gray-100 h-3 rounded-full mt-2 overflow-hidden">
            <div className="bg-green-500 h-full" style={{ width: `${(pago/meta)*100}%` }}></div>
          </div>
          <div className="mt-8 space-y-3">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Histórico de Depósitos</h3>
            {pagamentos.map(p => (
              <div key={p.id} className="flex justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="font-bold text-gray-600">{p.mes}</span>
                <span className="font-black text-green-600">R$ {p.valor}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- TELA ADMIN ---
  if (isAdmin) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen font-sans">
        <button onClick={() => setIsAdmin(false)} className="text-blue-600 font-bold text-xs uppercase mb-6">← Sair do Painel</button>
        <div className="bg-white p-6 rounded-3xl shadow-lg space-y-4 max-w-lg mx-auto">
          <h2 className="font-black italic">LANÇAR PIX - REINALDO</h2>
          <select className="w-full p-3 border rounded-xl" onChange={e => setMembroInput(e.target.value)}>
            <option value="">Escolha o familiar</option>
            {membros.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="number" placeholder="R$" className="w-1/2 p-3 border rounded-xl" value={valorInput} onChange={e => setValorInput(e.target.value)} />
            <select className="w-1/2 p-3 border rounded-xl" value={mesInput} onChange={e => setMesInput(e.target.value)}>
              {meses.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button onClick={lancar} className="w-full bg-green-600 text-white font-black p-4 rounded-2xl">CONFIRMAR LANÇAMENTO</button>
        </div>
      </div>
    );
  }

  // --- TELA PRINCIPAL ---
  return (
    <div className="min-h-screen bg-[#FDFCF0] p-4 md:p-10 font-sans text-gray-800">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-black text-[#D4A373] italic uppercase tracking-tighter">Família <span className="text-green-700">FDA</span></h1>
        <p className="text-[10px] font-bold text-gray-400 tracking-[0.4em] mt-2 italic">Dashboard de Arrecadação 2026</p>
      </header>

      {/* Resumo Geral */}
      <div className="max-w-6xl mx-auto bg-black text-white p-8 rounded-[40px] shadow-2xl mb-12 border-b-8 border-green-700">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-[10px] text-[#D4A373] font-black uppercase">Arrecadado</p>
            <div className="text-4xl md:text-6xl font-black italic">R$ {totalGeral.toLocaleString('pt-BR')}</div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 font-black uppercase">Meta Final</p>
            <div className="text-lg font-bold text-gray-400 tracking-tighter">R$ {metaGeral.toLocaleString('pt-BR')}</div>
          </div>
        </div>
        
        {/* Resumo por Mês */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 border-t border-gray-800 pt-6">
          {meses.map(mes => {
            const sum = historico.filter(h => h.mes === mes).reduce((acc, h) => acc + Number(h.valor), 0);
            return sum > 0 ? (
              <div key={mes} className="bg-gray-900 p-2 rounded-xl text-center">
                <p className="text-[7px] font-black text-gray-500 uppercase">{mes}</p>
                <p className="text-xs font-black text-[#D4A373]">R$ {sum}</p>
              </div>
            ) : null;
          })}
        </div>
      </div>

      {/* Grade de 5 Colunas */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {grupos.map((grupo, gIdx) => (
          <div key={gIdx} className="space-y-3">
            <h2 className="text-[9px] font-black text-gray-300 uppercase tracking-widest border-b pb-2">Grupo {gIdx + 1}</h2>
            {grupo.map(nome => {
              const m = membros.find(x => x.nome === nome);
              const pago = m ? calcPago(m.id) : 0;
              const meta = getMeta(nome);
              const falta = meta - pago;

              return (
                <div 
                  key={nome} 
                  onClick={() => m && setSelectedMembroId(m.id)}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:scale-[1.03] transition-all"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-black text-[11px] uppercase italic text-gray-700">{nome}</span>
                    <div className={`h-2 w-2 rounded-full ${falta <= 0 ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-400'}`}></div>
                  </div>
                  <div className="flex justify-between text-[10px] font-black">
                    <span className="text-gray-300">FALTA R$ {Math.max(0, falta)}</span>
                    <span className="text-green-600">R$ {pago}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </main>

      <footer className="mt-20 text-center pb-10">
        <input type="password" placeholder="Admin" className="p-2 border rounded-xl text-xs" onChange={e => setSenha(e.target.value)} />
        <button onClick={() => senha === 'FDA2026' && setIsAdmin(true)} className="ml-2 text-[10px] font-black text-gray-400 uppercase">Acessar Painel</button>
      </footer>
    </div>
  );
};

// Montagem do App
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

export default App;
