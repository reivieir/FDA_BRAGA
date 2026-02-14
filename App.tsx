import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';

// Inicialização com Verificação (Evita erro de Build se a chave sumir)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const App = () => {
  const [membros, setMembros] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedMembroId, setSelectedMembroId] = useState<number | null>(null);
  const [senha, setSenha] = useState('');
  
  const [filtrosGrupos, setFiltrosGrupos] = useState<any>({ 0: 'Todos', 1: 'Todos', 2: 'Todos', 3: 'Todos', 4: 'Todos' });
  const [valoresLote, setValoresLote] = useState<any>({});
  const [mesGlobal, setMesGlobal] = useState('Fevereiro');

  const gruposDef = [
    { titulo: "Grupo Adriana", nomes: ["Adriana", "Silvinho", "Adriano", "Angela", "Vini", "Stefany"] },
    { titulo: "Grupo Helena", nomes: ["Helena", "Antonio", "Paty", "Jair", "Giovana", "Manu", "Pablo"] },
    { titulo: "Grupo Clarice", nomes: ["Clarice", "Gilson", "Deia", "Helio", "Amanda", "Reinaldo"] },
    { titulo: "Grupo Katia", nomes: ["Katia", "Giovani", "Cintia", "Rafael", "Ju", "Bia"] },
    { titulo: "Grupo Julia", nomes: ["Julia", "Juan"] }
  ];

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const getMeta = (nome: string) => nome === 'Pablo' ? 330 : 660;

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const { data: m } = await supabase.from('membros').select('*').order('nome');
      const { data: p } = await supabase.from('pagamentos_detalhes').select('*, membros(nome)');
      if (m) setMembros(m);
      if (p) setHistorico(p);
    } catch (e) { console.error(e); }
  };

  const lancarPagamento = async (id: number, valor: string) => {
    if (!valor || parseFloat(valor) <= 0) return;
    await supabase.from('pagamentos_detalhes').insert([
      { membro_id: id, valor: parseFloat(valor), mes: mesGlobal }
    ]);
    setValoresLote({ ...valoresLote, [id]: '' });
    fetchAll();
  };

  const excluirPagamento = async (id: number) => {
    if (window.confirm("Deseja realmente excluir este pagamento?")) {
      await supabase.from('pagamentos_detalhes').delete().eq('id', id);
      fetchAll();
    }
  };

  const calcPago = (id: number) => historico.filter(h => h.membro_id === id).reduce((acc, h) => acc + Number(h.valor), 0);
  const totalGeral = historico.reduce((acc, h) => acc + Number(h.valor), 0);
  const metaGeral = membros.reduce((acc, m) => acc + getMeta(m.nome), 0);

  // --- RENDERS ---
  if (isAdmin) {
    return (
      <div className="p-4 bg-gray-100 min-h-screen font-sans">
        <div className="flex justify-between items-center mb-6 max-w-2xl mx-auto">
           <button onClick={() => setIsAdmin(false)} className="text-blue-600 font-bold text-xs uppercase">← Sair</button>
           <select className="p-2 border rounded-xl text-xs font-bold" value={mesGlobal} onChange={e => setMesGlobal(e.target.value)}>
             {meses.map(m => <option key={m} value={m}>{m}</option>)}
           </select>
        </div>
        <div className="space-y-6 max-w-2xl mx-auto pb-20">
          {gruposDef.map((g, idx) => {
            const selecao = filtrosGrupos[idx];
            return (
              <div key={idx} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200">
                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{g.titulo}</h2>
                <select className="w-full p-3 border rounded-xl mb-4 bg-gray-50 text-sm font-bold" value={selecao} onChange={e => setFiltrosGrupos({...filtrosGrupos, [idx]: e.target.value})}>
                  <option value="Todos">Todos</option>
                  {g.nomes.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <div className="space-y-3">
                  {g.nomes.filter(n => selecao === 'Todos' || selecao === n).map(nome => {
                    const m = membros.find(x => x.nome === nome);
                    if (!m) return null;
                    if (selecao === 'Todos') {
                      return (
                        <div key={m.id} className="flex items-center gap-2 border-t pt-2 border-gray-50">
                          <span className="text-[10px] font-black w-24 truncate">{m.nome}</span>
                          <input type="number" placeholder="R$" className="flex-1 p-2 border rounded-lg text-xs" value={valoresLote[m.id] || ''} onChange={e => setValoresLote({...valoresLote, [m.id]: e.target.value})} />
                          <button onClick={() => lancarPagamento(m.id, valoresLote[m.id])} className="bg-green-600 text-white p-2 rounded-lg text-[10px] font-black">OK</button>
                        </div>
                      );
                    } else {
                      const pags = historico.filter(h => h.membro_id === m.id);
                      return (
                        <div key={m.id} className="space-y-2">
                          {pags.map(p => (
                            <div key={p.id} className="flex justify-between items-center p-3 bg-red-50/30 rounded-xl border border-red-100">
                              <span className="text-[10px] font-bold">{p.mes}: R$ {p.valor}</span>
                              <button onClick={() => excluirPagamento(p.id)} className="text-red-500 font-black text-[10px] uppercase">Excluir</button>
                            </div>
                          ))}
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (selectedMembroId) {
    const m = membros.find(x => x.id === selectedMembroId);
    const pagamentos = historico.filter(h => h.membro_id === selectedMembroId);
    const pago = calcPago(selectedMembroId);
    const meta = getMeta(m?.nome || '');
    return (
      <div className="min-h-screen bg-[#FDFCF0] p-6">
        <button onClick={() => setSelectedMembroId(null)} className="mb-8 font-black text-[#D4A373] uppercase text-xs">← Voltar</button>
        <div className="max-w-xl mx-auto bg-white p-8 rounded-[40px] shadow-xl border-b-8 border-green-700">
          <h2 className="text-3xl font-black italic uppercase text-gray-800">{m?.nome}</h2>
          <div className="flex justify-between mt-6 text-sm font-bold">
            <span className="text-green-600 font-black text-xl">R$ {pago}</span>
            <span className="text-gray-400 pt-2">FALTA: R$ {Math.max(0, meta - pago)}</span>
          </div>
          <div className="w-full bg-gray-100 h-3 rounded-full mt-2 overflow-hidden">
            <div className="bg-green-500 h-full" style={{ width: `${(pago/meta)*100}%` }}></div>
          </div>
          <div className="mt-8 space-y-3">
            {pagamentos.map(p => (
              <div key={p.id} className="flex justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 italic">
                <span className="font-bold text-gray-600">{p.mes}</span>
                <span className="font-black text-green-600">R$ {p.valor}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF0] p-4 md:p-10 font-sans text-gray-800">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-black text-[#D4A373] italic uppercase tracking-tighter">Família <span className="text-green-700">FDA</span></h1>
        <p className="text-[10px] font-bold text-gray-400 tracking-[0.4em] mt-2 italic">Controle Axiocrata 2026</p>
      </header>

      <div className="max-w-6xl mx-auto bg-black text-white p-8 rounded-[40px] shadow-2xl mb-12 border-b-8 border-green-700">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-[10px] text-[#D4A373] font-black uppercase tracking-widest">Recebido</p>
            <div className="text-5xl md:text-7xl font-black italic">R$ {totalGeral.toLocaleString('pt-BR')}</div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Meta</p>
            <div className="text-xl font-bold text-gray-400 tracking-tighter italic">R$ {metaGeral.toLocaleString('pt-BR')}</div>
          </div>
        </div>
        <div className="w-full bg-gray-800 h-4 rounded-full overflow-hidden">
          <div className="bg-green-500 h-full transition-all duration-1000" style={{ width: `${(totalGeral/metaGeral)*100}%` }}></div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {gruposDef.map((g, gIdx) => (
          <div key={gIdx} className="space-y-3">
            <h2 className="text-[9px] font-black text-gray-300 uppercase tracking-widest border-b pb-2">{g.titulo}</h2>
            {g.nomes.map(nome => {
              const m = membros.find(x => x.nome === nome);
              const pago = m ? calcPago(m.id) : 0;
              const meta = getMeta(nome);
              const falta = meta - pago;
              return (
                <div key={nome} onClick={() => m && setSelectedMembroId(m.id)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:scale-[1.03] transition-all group">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-black text-[11px] uppercase italic text-gray-700 group-hover:text-green-700">{nome}</span>
                    <div className={`h-2 w-2 rounded-full ${falta <= 0 ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-400'}`}></div>
                  </div>
                  <div className="flex justify-between text-[10px] font-black italic">
                    <span className="text-gray-300">FALTA R$ {Math.max(0, falta)}</span>
                    <span className="text-green-600">R$ {pago}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </main>

      <footer className="mt-20 text-center pb-20">
        <input type="password" placeholder="Admin" className="p-2 border rounded-xl text-xs" onChange={e => setSenha(e.target.value)} />
        <button onClick={() => senha === 'FDA2026' && setIsAdmin(true)} className="ml-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Painel</button>
      </footer>
    </div>
  );
};

const container = document.getElementById('root');
if (container) { createRoot(container).render(<App />); }

export default App;
