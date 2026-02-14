import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';

// Inicialização com Fallback para evitar erro de build
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const App = () => {
  const [membros, setMembros] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [saidas, setSaidas] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedMembroId, setSelectedMembroId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [expandedGrupo, setExpandedGrupo] = useState<number | null>(null);
  const [senha, setSenha] = useState('');
  
  const [filtrosGrupos, setFiltrosGrupos] = useState<any>({ 0: 'Todos', 1: 'Todos', 2: 'Todos', 3: 'Todos', 4: 'Todos' });
  const [valoresLote, setValoresLote] = useState<any>({});
  const [valorSaida, setValorSaida] = useState('');
  const [descSaida, setDescSaida] = useState('');
  
  const hoje = new Date();
  const diaDoMes = hoje.getDate();
  const mesAtualBr = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(hoje);
  const mesAtual = mesAtualBr.charAt(0).toUpperCase() + mesAtualBr.slice(1);
  const [mesGlobal, setMesGlobal] = useState(mesAtual);

  const meses = ["Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const metaMensalGrupo = 1590;

  const gruposDef = [
    { titulo: "Grupo Adriana", nomes: ["Adriana", "Silvinho", "Adriano", "Angela", "Vini", "Stefany"] },
    { titulo: "Grupo Helena", nomes: ["Helena", "Antonio", "Paty", "Jair", "Giovana", "Manu", "Pablo"] },
    { titulo: "Grupo Clarice", nomes: ["Clarice", "Gilson", "Deia", "Helio", "Amanda", "Reinaldo"] },
    { titulo: "Grupo Katia", nomes: ["Katia", "Giovani", "Cintia", "Rafael", "Ju", "Bia"] },
    { titulo: "Grupo Julia", nomes: ["Julia", "Juan"] }
  ];

  const getMeta = (nome: string) => nome === 'Pablo' ? 330 : 660;

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const { data: m } = await supabase.from('membros').select('*').order('nome');
      const { data: p } = await supabase.from('pagamentos_detalhes').select('*, membros(nome)');
      const { data: s } = await supabase.from('saidas_caixa').select('*').order('data_registro', { ascending: false });
      setMembros(m || []);
      setHistorico(p || []);
      setSaidas(s || []);
    } catch (e) { console.error("Erro ao carregar dados:", e); }
  };

  const lancarPagamento = async (id: number, valor: string) => {
    if (!valor || parseFloat(valor) <= 0) return;
    await supabase.from('pagamentos_detalhes').insert([{ membro_id: id, valor: parseFloat(valor), mes: mesGlobal }]);
    setValoresLote({ ...valoresLote, [id]: '' });
    fetchAll();
  };

  const lancarSaida = async () => {
    if (!valorSaida || !descSaida) return;
    await supabase.from('saidas_caixa').insert([{ valor: parseFloat(valorSaida), mes: mesGlobal, descricao: descSaida }]);
    setValorSaida(''); setDescSaida('');
    fetchAll();
  };

  const excluirItem = async (id: number, tabela: string) => {
    if (window.confirm("Deseja realmente excluir?")) {
      await supabase.from(tabela).delete().eq('id', id);
      fetchAll();
    }
  };

  const calcPago = (id: number) => historico.filter(h => h.membro_id === id).reduce((acc, h) => acc + Number(h.valor), 0);
  const totalArrecadado = historico.reduce((acc, h) => acc + Number(h.valor), 0);
  const totalSaidas = saidas.reduce((acc, s) => acc + Number(s.valor), 0);
  const saldoAtual = totalArrecadado - totalSaidas;
  const metaGeral = membros.reduce((acc, m) => acc + getMeta(m.nome), 0);

  // --- RENDERS CONDICIONAIS ---
  if (selectedMonth) {
    const pagsMes = historico.filter(p => p.mes === selectedMonth);
    const gastoNoMes = saidas.filter(s => s.mes === selectedMonth).reduce((acc, s) => acc + Number(s.valor), 0);
    return (
      <div className="min-h-screen bg-[#FDFCF0] p-6 font-sans">
        <button onClick={() => setSelectedMonth(null)} className="mb-8 font-black text-[#D4A373] uppercase text-xs">← Voltar</button>
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-black text-white p-8 rounded-[40px] shadow-xl border-b-8 border-red-500 text-center">
            <h2 className="text-4xl font-black uppercase italic">{selectedMonth}</h2>
            <p className="text-2xl font-black text-green-500 mt-2">R$ {(pagsMes.reduce((acc, p) => acc + Number(p.valor), 0) - gastoNoMes).toLocaleString('pt-BR')}</p>
          </div>
          <div className="space-y-2">
            {pagsMes.map(p => (
              <div key={p.id} className="bg-white p-4 rounded-2xl flex justify-between border border-gray-100 italic">
                <span className="font-black text-gray-700 uppercase text-xs">{p.membros?.nome}</span>
                <span className="font-black text-green-600 text-xs">R$ {p.valor}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (selectedMembroId) {
    const m = membros.find(x => x.id === selectedMembroId);
    const pags = historico.filter(h => h.membro_id === selectedMembroId);
    const pago = calcPago(selectedMembroId);
    const meta = getMeta(m?.nome || '');
    return (
      <div className="min-h-screen bg-[#FDFCF0] p-6 font-sans">
        <button onClick={() => setSelectedMembroId(null)} className="mb-8 font-black text-[#D4A373] uppercase text-xs">← Voltar</button>
        <div className="max-w-xl mx-auto bg-white p-8 rounded-[40px] shadow-xl border-b-8 border-green-700">
          <h2 className="text-3xl font-black italic uppercase text-gray-800">{m?.nome}</h2>
          <div className={`mt-4 p-4 rounded-2xl text-center font-black uppercase text-xs italic ${pags.some(p => p.mes === mesAtual) ? 'bg-green-100 text-green-700' : diaDoMes > 15 ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-500'}`}>
            {pags.some(p => p.mes === mesAtual) ? "✨ parabens, até que em fim pagou" : diaDoMes > 15 ? "⚠️ Paga o que deve caloteiro" : "⏳ Aguardando Pix até dia 15"}
          </div>
          <div className="flex justify-between mt-8 text-sm font-bold">
            <span className="text-green-600 font-black text-xl">R$ {pago}</span>
            <span className="text-gray-400 pt-2 uppercase italic">Meta R$ {meta}</span>
          </div>
          <div className="w-full bg-gray-100 h-3 rounded-full mt-2 overflow-hidden">
            <div className="bg-green-500 h-full transition-all duration-1000" style={{ width: `${Math.min((pago/meta)*100, 100)}%` }}></div>
          </div>
          <div className="mt-8 space-y-3">
            {pags.map(p => (
              <div key={p.id} className="flex justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 italic">
                <span className="font-bold text-gray-600 uppercase text-xs">{p.mes}</span>
                <span className="font-black text-green-600">R$ {p.valor}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="p-4 bg-gray-100 min-h-screen font-sans pb-20">
        <div className="flex justify-between items-center mb-6 max-w-2xl mx-auto">
           <button onClick={() => setIsAdmin(false)} className="text-blue-600 font-bold text-xs uppercase">← Site</button>
           <select className="p-2 border rounded-xl text-xs font-bold bg-white" value={mesGlobal} onChange={e => setMesGlobal(e.target.value)}>
             {meses.map(m => <option key={m} value={m}>{m}</option>)}
           </select>
        </div>

        <div className="space-y-6 max-w-2xl mx-auto">
          <div className="bg-black text-white p-6 rounded-3xl shadow-lg border-b-4 border-red-500">
            <h2 className="text-[10px] font-black uppercase tracking-widest mb-4">Lançar Saída</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Descrição" className="w-full p-3 rounded-xl text-black text-sm" value={descSaida} onChange={e => setDescSaida(e.target.value)} />
              <div className="flex gap-2">
                <input type="number" placeholder="R$" className="w-1/2 p-3 rounded-xl text-black text-sm" value={valorSaida} onChange={e => setValorSaida(e.target.value)} />
                <button onClick={lancarSaida} className="w-1/2 bg-red-600 font-black rounded-xl text-xs uppercase">Confirmar Gasto</button>
              </div>
            </div>
          </div>

          {gruposDef.map((g, idx) => (
            <div key={idx} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200">
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 italic">{g.titulo}</h2>
              <select className="w-full p-3 border rounded-xl mb-4 bg-gray-50 text-sm font-bold" value={filtrosGrupos[idx]} onChange={e => setFiltrosGrupos({...filtrosGrupos, [idx]: e.target.value})}>
                <option value="Todos">Todos</option>
                {g.nomes.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <div className="space-y-2">
                {g.nomes.filter(n => filtrosGrupos[idx] === 'Todos' || filtrosGrupos[idx] === n).map(nome => {
                  const m = membros.find(x => x.nome === nome);
                  if (!m) return null;
                  if (filtrosGrupos[idx] === 'Todos') {
                    return (
                      <div key={m.id} className="flex items-center gap-2 border-t pt-2 border-gray-50">
                        <span className="text-[10px] font-black w-24 truncate uppercase italic">{m.nome}</span>
                        <input type="number" className="flex-1 p-2 border rounded-lg text-xs" value={valoresLote[m.id] || ''} onChange={e => setValoresLote({...valoresLote, [m.id]: e.target.value})} />
                        <button onClick={() => lancarPagamento(m.id, valoresLote[m.id])} className="bg-green-600 text-white px-3 py-2 rounded-lg text-[10px] font-black">OK</button>
                      </div>
                    );
                  } else {
                    return historico.filter(h => h.membro_id === m.id).map(p => (
                      <div key={p.id} className="flex justify-between items-center p-3 bg-red-50/30 rounded-xl border border-red-100">
                        <span className="text-[10px] font-bold">{p.mes}: R$ {p.valor}</span>
                        <button onClick={() => excluirItem(p.id, 'pagamentos_detalhes')} className="text-red-500 font-black text-[10px] uppercase">Excluir</button>
                      </div>
                    ));
                  }
                })}
              </div>
            </div>
          ))}

          <div className="bg-white p-5 rounded-3xl border border-red-200">
            <h2 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3 italic">Excluir Saídas</h2>
            {saidas.map(s => (
              <div key={s.id} className="flex justify-between items-center p-3 border-b last:border-0 text-[10px]">
                <span className="flex-1"><b>{s.descricao}</b> ({s.mes})</span>
                <span className="text-red-500 font-black mr-4">R$ {s.valor}</span>
                <button onClick={() => excluirItem(s.id, 'saidas_caixa')} className="text-red-500 font-black">X</button>
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
        <h1 className="text-4xl md:text-7xl font-black text-[#D4A373] italic uppercase tracking-tighter italic">FAMILIA da <span className="text-green-700">ALEGRIA</span></h1>
        <p className="text-[10px] md:text-sm font-bold text-gray-400 tracking-[0.4em] mt-2 uppercase italic">NATAL 2026 BRAGANÇA CITY</p>
      </header>

      <div className="max-w-6xl mx-auto bg-black text-white p-8 rounded-[40px] shadow-2xl mb-12 border-b-8 border-green-700">
        <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
          <div className="text-left">
            <p className="text-[10px] text-[#D4A373] font-black uppercase tracking-widest">Saldo Atual</p>
            <div className="text-5xl md:text-7xl font-black italic text-green-500">R$ {saldoAtual.toLocaleString('pt-BR')}</div>
            <p className="text-[10px] font-black uppercase opacity-50 mt-2">Arrecadado: R$ {totalArrecadado} | Saídas: R$ {totalSaidas}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 font-black uppercase">Meta Final</p>
            <div className="text-xl font-bold text-gray-400 italic">R$ {metaGeral.toLocaleString('pt-BR')}</div>
          </div>
        </div>
        <div className="w-full bg-gray-800 h-4 rounded-full overflow-hidden mb-8">
          <div className="bg-green-500 h-full transition-all duration-1000" style={{ width: `${(totalArrecadado/metaGeral)*100}%` }}></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 border-t border-gray-800 pt-6">
          {meses.map(mes => {
            const sum = historico.filter(h => h.mes === mes).reduce((acc, h) => acc + Number(h.valor), 0);
            return sum > 0 ? (
              <div key={mes} onClick={() => setSelectedMonth(mes)} className="bg-gray-900/50 p-3 rounded-2xl border border-gray-800 cursor-pointer hover:bg-gray-800 transition-all text-center">
                <p className="text-[8px] font-black text-gray-500 uppercase italic">{mes}</p>
                <p className="text-sm font-black text-[#D4A373]">R$ {sum}</p>
                <p className="text-[7px] font-bold text-gray-600 uppercase mt-1 italic tracking-tighter">Meta R$ {metaMensalGrupo}</p>
              </div>
            ) : null;
          })}
        </div>
      </div>

      <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-6 pb-20">
          <div className="flex-1 space-y-4">
              {gruposDef.map((g, gIdx) => (
                <div key={gIdx} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  <button onClick={() => setExpandedGrupo(expandedGrupo === gIdx ? null : gIdx)} className="w-full p-5 flex justify-between items-center hover:bg-gray-50">
                    <div className="text-left">
                      <h2 className="text-sm font-black text-gray-800 uppercase italic tracking-tighter italic">{g.titulo}</h2>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter italic">
                        {g.nomes.filter(n => historico.some(h => h.membros?.nome === n && h.mes === mesAtual)).length} de {g.nomes.length} QUITADOS NO MÊS
                      </p>
                    </div>
                    <span className="text-[#D4A373] font-black">{expandedGrupo === gIdx ? '−' : '+'}</span>
                  </button>
                  <div className={`transition-all duration-300 ${expandedGrupo === gIdx ? 'max-h-[600px] p-3' : 'max-h-0'} overflow-hidden`}>
                    <div className="grid grid-cols-1 gap-2">
                        {g.nomes.map(nome => {
                            const m = membros.find(x => x.nome === nome);
                            const pago = m ? calcPago(m.id) : 0;
                            const meta = getMeta(nome);
                            return (
                                <div key={nome} onClick={() => m && setSelectedMembroId(m.id)} className="bg-[#FDFCF0]/50 p-3 rounded-xl flex justify-between items-center cursor-pointer hover:bg-white transition-all">
                                    <span className="font-black text-[10px] uppercase italic text-gray-700 italic">{nome}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black text-green-600 italic">R$ {pago}</span>
                                        <div className={`h-1.5 w-1.5 rounded-full ${meta-pago <= 0 ? 'bg-green-500' : 'bg-red-400'}`}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <div className="w-full md:w-80 space-y-4">
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 italic">PGTOS LOCAÇÃO CHÁCARA</h2>
              <div className="bg-white rounded-[40px] p-6 shadow-sm border border-gray-100">
                {saidas.map(s => (
                  <div key={s.id} className="mb-4 last:mb-0 border-b border-gray-50 pb-4 last:border-0">
                    <p className="text-[10px] font-bold text-gray-700 italic">{s.descricao}</p>
                    <p className="text-xs font-black text-red-600 italic">- R$ {s.valor} <span className="text-[8px] text-gray-300 ml-2 uppercase italic">({s.mes})</span></p>
                  </div>
                ))}
              </div>
          </div>
      </div>

      <footer className="mt-20 text-center pb-20 pt-10 border-t border-dashed border-gray-200">
        <input type="password" placeholder="Senha" className="p-2 border rounded-xl text-xs bg-white" onChange={e => setSenha(e.target.value)} />
        <button onClick={() => senha === 'FDA2026' && setIsAdmin(true)} className="ml-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Painel Admin</button>
      </footer>
    </div>
  );
};

const container = document.getElementById('root');
if (container) { createRoot(container).render(<App />); }
export default App;
