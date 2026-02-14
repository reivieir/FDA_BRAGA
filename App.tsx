import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

const App = () => {
  const [membros, setMembros] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [senha, setSenha] = useState('');
  
  // Estados para o formulário de pagamento
  const [selectedMembro, setSelectedMembro] = useState('');
  const [valorInput, setValorInput] = useState('');
  const [mesInput, setMesInput] = useState('Fevereiro');

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const metaIndividual = 150; //

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

  if (isAdmin) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen font-sans">
        <button onClick={() => setIsAdmin(false)} className="text-blue-600 font-bold mb-4">← Voltar</button>
        <h1 className="text-2xl font-black mb-6">PAINEL DE LANÇAMENTOS</h1>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm mb-8 space-y-4 border border-gray-200">
          <select className="w-full p-3 border rounded-xl" onChange={e => setSelectedMembro(e.target.value)}>
            <option value="">Selecione o Familiar</option>
            {membros.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="number" placeholder="Valor R$" className="w-1/2 p-3 border rounded-xl" value={valorInput} onChange={e => setValorInput(e.target.value)} />
            <select className="w-1/2 p-3 border rounded-xl" value={mesInput} onChange={e => setMesInput(e.target.value)}>
              {meses.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button onClick={registrarPagamento} className="w-full bg-green-600 text-white font-black p-4 rounded-xl shadow-lg">CONFIRMAR DEPÓSITO</button>
        </div>

        <h2 className="font-black text-gray-400 text-xs uppercase mb-4 tracking-widest">Últimos Lançamentos</h2>
        <div className="space-y-2">
          {historico.slice().reverse().map(p => (
            <div key={p.id} className="bg-white p-4 rounded-2xl flex justify-between shadow-sm text-sm">
              <span className="font-bold">{p.membros?.nome}</span>
              <span className="text-green-600 font-black">R$ {p.valor} ({p.mes})</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF0] p-6 font-sans text-gray-800">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-black text-[#D4A373] italic uppercase">Família FDA</h1>
        <p className="text-[10px] font-bold text-gray-400 tracking-[0.3em]">CONTROLE FINANCEIRO 2026</p>
      </header>

      {/* Resumo por Mês */}
      <section className="mb-10 overflow-x-auto flex gap-4 pb-4">
        {meses.filter(mes => historico.some(p => p.mes === mes)).map(mes => (
          <div key={mes} className="bg-white p-4 rounded-3xl shadow-md min-w-[150px] border-b-4 border-[#D4A373]">
            <p className="text-[10px] font-black text-gray-400 uppercase">{mes}</p>
            <p className="text-xl font-black">R$ {historico.filter(p => p.mes === mes).reduce((acc, p) => acc + p.valor, 0)}</p>
          </div>
        ))}
      </section>

      {/* Lista de Membros com Saldo Devedor */}
      <section className="max-w-md mx-auto space-y-3">
        <h2 className="text-xs font-black text-center text-gray-400 uppercase tracking-widest mb-6">Situação Individual</h2>
        {membros.map(m => {
          const pago = calcularPago(m.id);
          const aPagar = metaIndividual - pago;
          return (
            <div key={m.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <span className="font-black text-gray-700">{m.nome}</span>
                <span className={`text-[10px] font-black px-3 py-1 rounded-full ${aPagar <= 0 ? 'bg-green-100 text-green-700' : 'bg-orange-50 text-orange-600'}`}>
                  {aPagar <= 0 ? 'QUITADO' : `FALTA R$ ${aPagar}`}
                </span>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                <span>Pago: R$ {pago}</span>
                <span>Meta: R$ {metaIndividual}</span>
              </div>
            </div>
          );
        })}
      </section>

      <footer className="mt-20 text-center">
        <input type="password" placeholder="Admin" className="p-2 border rounded-lg text-xs" onChange={e => setSenha(e.target.value)} />
        <button onClick={() => senha === 'FDA2026' && setIsAdmin(true)} className="ml-2 text-[10px] font-black text-gray-400 uppercase">Painel</button>
      </footer>
    </div>
  );
};

const container = document.getElementById('root');
if (container) { createRoot(container).render(<App />); }
export default App;
