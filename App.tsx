import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

const App = () => {
  const [membros, setMembros] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedMembroId, setSelectedMembroId] = useState<number | null>(null);
  const [senha, setSenha] = useState('');
  
  const [filtrosGrupos, setFiltrosGrupos] = useState<any>({ 0: 'Todos', 1: 'Todos', 2: 'Todos', 3: 'Todos', 4: 'Todos' });
  const [valoresLote, setValoresLote] = useState<any>({});
  
  // Lógica para pegar o mês atual dinamicamente
  const mesAtualBr = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date());
  const mesAtual = mesAtualBr.charAt(0).toUpperCase() + mesAtualBr.slice(1);
  const [mesGlobal, setMesGlobal] = useState(mesAtual);

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

  // --- TELA ADMIN ---
  if (isAdmin) {
    return (
      <div className="p-4 bg-gray-100 min-h-screen font-sans pb-20">
        <div className="flex justify-between items-center mb-6 max-w-2xl mx-auto">
           <button onClick={() => setIsAdmin(false)} className="text-blue-600 font-bold text-xs uppercase">← Sair do Painel</button>
           <select className="p-2 border rounded-xl text-xs font-bold" value={mesGlobal} onChange={e => setMesGlobal(e.target.value)}>
             {meses.map(m => <option key={m} value={m}>{m}</option>)}
           </select>
        </div>
        <div className="space-y-6 max-w-2xl mx-auto">
          {gruposDef.map((g, idx) => {
            const selecao = filtrosGrupos[idx];
            return (
              <div key={idx} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200">
                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{g.titulo}</h2>
                <select className="w-full p-3 border rounded-xl mb-4 bg-gray-50 text-sm font-bold" value={selecao} onChange={e => setFiltrosGrupos({...filtrosGrupos, [idx]: e.target.value})}>
                  <option value="Todos">Todos</option>
                  {g.nomes.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <div className="space-y-2">
                  {g.nomes.filter(n => selecao === 'Todos' || selecao === n).map(nome => {
                    const m = membros.find(x => x.nome === nome);
                    if (!m) return null;
                    if (selecao === 'Todos') {
                      return (
                        <div key={m.id} className="flex items-center gap-2 border-t pt-2 border-gray-50">
                          <span className="text-[10px] font-black w-24 truncate">{m.nome}</span>
                          <input type="number" placeholder="Valor" className="flex-1 p-2 border rounded-lg text-xs" value={valoresLote[m.id] || ''} onChange={e => setValoresLote({...valoresLote, [m.id]: e.target.value})} />
                          <button onClick={() => lancarPagamento(m.id, valoresLote[m.id])} className="bg-green-600 text-white px-3 py-2 rounded-lg text-[10px] font-black">OK</button>
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

  // --- TELA DETALHES COM AS MENSAGENS ENGRAÇADAS ---
  if (selectedMembroId) {
    const m = membros.find(x => x.id === selectedMembroId);
    const pagamentos = historico.filter(h => h.membro_id === selectedMembroId);
    const pago = calcPago(selectedMembroId);
    const meta = getMeta(m?.nome || '');
    
    // Lógica da mensagem personalizada
    const pagouMesAtual = pagamentos.some(p => p.mes === mesAtual);

    return (
      <div className="min-h-screen bg-[#FDFCF0] p-6 font-sans">
        <button onClick={() => setSelectedMembroId(null)} className="mb-8 font-black text-[#D4A373] uppercase text-xs">← Voltar</button>
        <div className="max-w-xl mx-auto bg-white p-8 rounded-[40px] shadow-xl border-b-8 border-green-700">
          <h2 className="text-3xl font-black italic uppercase text-gray-800">{m?.nome}</h2>
          
          {/* MENSAGEM DINÂMICA DE COBRANÇA/ELOGIO */}
          <div className={`mt-4 p-4 rounded-2xl text-center font-black uppercase text-xs italic ${pagouMesAtual ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {pagouMesAtual 
              ? "✨ parabens, até que em fim pagou" 
              : "⚠️ Paga o que deve caloteiro"}
          </div>

          <div className="flex justify-between mt-8 text-sm font-bold">
            <span className="text-green-600">JÁ PAGO: R$ {pago}</span>
            <span className="text-gray-400">META: R$ {meta}</span>
          </div>
          <div className="w-full bg-gray-100 h-3 rounded-full mt-2 overflow-hidden">
            <div className="bg-green-500 h-full" style={{ width: `${Math.min((pago/meta)*100, 100)}%` }}></div>
          </div>
          <div className="mt-8 space-y-3">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Histórico de Depósitos</h3>
            {pagamentos.map(p => (
              <div key={p.id} className="flex justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
                <span className="font-bold text-gray-600 uppercase">{p.mes}</span>
                <span className="font-black text-green-600">R$ {p.valor}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- TELA PRINCIPAL ---
  return (
    <div className="min-h-screen bg-[#FDFCF0] p-4 md:p-10 font-sans text-gray-800">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-black text-[#D4A373] italic uppercase tracking-tighter italic">Família <span className="text-green-700">FDA</span></h1>
        <p className="text-[10px] font-bold text-gray-400 tracking-[0.4em] mt-2 italic">Controle de Arrecadação 2026</p>
      </header>

      <div className="max-w-6xl mx-auto bg-black text-white p-8 rounded-[40px] shadow-2xl mb-12 border-b-8 border-green-700">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-[10px] text-[#D4A373] font-black uppercase">Arrecadado</p>
            <div className="text-5xl md:text-7xl font-black italic">R$ {totalGeral.toLocaleString('pt-BR')}</div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 font-black uppercase">Meta Geral</p>
            <div className="text-lg font-bold text-gray-400 tracking-tighter">R$ {metaGeral.toLocaleString('pt-BR')}</div>
          </div>
        </div>
        <div className="w-full bg-gray-800 h-4 rounded-full overflow-hidden">
          <div className="bg-green-500 h-full transition-all duration-1000 shadow-[0_0_20px_rgba(34,197,94,0.3)]" style={{ width: `${(totalGeral/metaGeral)*100}%` }}></div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {gruposDef.map((g, gIdx) => (
          <div key={gIdx} className="space-y-3">
            <h2 className="text-[9px] font-black text-gray-300 uppercase tracking-widest border-b pb-2 italic">{g.titulo}</h2>
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

      <footer className="mt-20 text-center pb-20 pt-10 border-t border-dashed border-gray-200">
        <input type="password" placeholder="Admin" className="p-2 border rounded-xl text-xs bg-white" onChange={e => setSenha(e.target.value)} />
        <button onClick={() => senha === 'FDA2026' && setIsAdmin(true)} className="ml-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Painel Admin</button>
      </footer>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

export default App;
