import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL || '', import.meta.env.VITE_SUPABASE_ANON_KEY || '');

const App = () => {
  const [membros, setMembros] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [saidas, setSaidas] = useState<any[]>([]); // Novo estado
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedMembroId, setSelectedMembroId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [expandedGrupo, setExpandedGrupo] = useState<number | null>(null);
  const [senha, setSenha] = useState('');
  
  // Estados Admin revisados
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
      if (m) setMembros(m);
      if (p) setHistorico(p);
      if (s) setSaidas(s);
    } catch (e) { console.error(e); }
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

  const excluirLote = async (id: number, tabela: string) => {
    if (window.confirm("Excluir este lançamento?")) {
      await supabase.from(tabela).delete().eq('id', id);
      fetchAll();
    }
  };

  const calcPago = (id: number) => historico.filter(h => h.membro_id === id).reduce((acc, h) => acc + Number(h.valor), 0);
  const totalArrecadado = historico.reduce((acc, h) => acc + Number(h.valor), 0);
  const totalSaidas = saidas.reduce((acc, s) => acc + Number(s.valor), 0);
  const saldoAtual = totalArrecadado - totalSaidas;
  const metaGeral = membros.reduce((acc, m) => acc + getMeta(m.nome), 0);

  // --- TELA ADMIN (COM SEÇÃO DE SAÍDAS) ---
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
          {/* LANÇAMENTO DE SAÍDA */}
          <div className="bg-black text-white p-6 rounded-3xl shadow-lg border-b-4 border-red-500">
            <h2 className="text-xs font-black uppercase tracking-widest mb-4 italic">Lançar Saída de Caixa</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Descrição (ex: Aluguel Chácara)" className="w-full p-3 rounded-xl text-black text-sm" value={descSaida} onChange={e => setDescSaida(e.target.value)} />
              <div className="flex gap-2">
                <input type="number" placeholder="Valor R$" className="w-1/2 p-3 rounded-xl text-black text-sm font-bold" value={valorSaida} onChange={e => setValorSaida(e.target.value)} />
                <button onClick={lancarSaida} className="w-1/2 bg-red-600 font-black rounded-xl text-xs uppercase">Registrar Gasto</button>
              </div>
            </div>
          </div>

          {/* CHECKLIST DE ENTRADA (Membros) */}
          {gruposDef.map((g, idx) => (
            <div key={idx} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200">
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 italic">{g.titulo}</h2>
              <select className="w-full p-3 border rounded-xl mb-4 bg-gray-50 text-sm font-bold" value={filtrosGrupos[idx]} onChange={e => setFiltrosGrupos({...filtrosGrupos, [idx]: e.target.value})}>
                <option value="Todos">Todos os Membros</option>
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
                        <input type="number" placeholder="R$" className="flex-1 p-2 border rounded-lg text-xs" value={valoresLote[m.id] || ''} onChange={e => setValoresLote({...valoresLote, [m.id]: e.target.value})} />
                        <button onClick={() => lancarPagamento(m.id, valoresLote[m.id])} className="bg-green-600 text-white px-3 py-2 rounded-lg text-[10px] font-black">OK</button>
                      </div>
                    );
                  } else {
                    return historico.filter(h => h.membro_id === m.id).map(p => (
                      <div key={p.id} className="flex justify-between items-center p-3 bg-red-50/30 rounded-xl border border-red-100">
                        <span className="text-[10px] font-bold italic">{p.mes}: R$ {p.valor}</span>
                        <button onClick={() => excluirLote(p.id, 'pagamentos_detalhes')} className="text-red-500 font-black text-[10px] uppercase">Excluir</button>
                      </div>
                    ));
                  }
                })}
              </div>
            </div>
          ))}

          {/* LISTA DE SAÍDAS PARA EXCLUSÃO */}
          <div className="bg-white p-5 rounded-3xl border-2 border-dashed border-gray-200">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Histórico de Gastos</h2>
            {saidas.map(s => (
              <div key={s.id} className="flex justify-between items-center p-2 border-b text-[10px]">
                <span>{s.mes}: <b>{s.descricao}</b></span>
                <div className="flex items-center gap-3">
                  <span className="text-red-500 font-black">R$ {s.valor}</span>
                  <button onClick={() => excluirLote(s.id, 'saidas_caixa')} className="text-gray-300">X</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERS CONDICIONAIS (MÊS E MEMBRO MANTIDOS) ---
  if (selectedMonth) {
    const pagsMes = historico.filter(p => p.mes === selectedMonth);
    const gastoNoMes = saidas.filter(s => s.mes === selectedMonth).reduce((acc, s) => acc + Number(s.valor), 0);
    return (
      <div className="min-h-screen bg-[#FDFCF0] p-6 font-sans">
        <button onClick={() => setSelectedMonth(null)} className="mb-8 font-black text-[#D4A373] uppercase text-xs">← Voltar</button>
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-black text-white p-8 rounded-[40px] shadow-xl border-b-8 border-red-500">
            <h2 className="text-4xl font-black uppercase italic">{selectedMonth}</h2>
            <div className="mt-4 flex justify-between items-end italic">
                <div>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Saldo do Mês</p>
                    <p className="text-2xl font-black text-green-500 italic">R$ {(pagsMes.reduce((acc, p) => acc + Number(p.valor), 0) - gastoNoMes).toLocaleString('pt-BR')}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-red-400 font-black uppercase tracking-tighter italic">Gastos: R$ {gastoNoMes}</p>
                </div>
            </div>
          </div>
          <div className="space-y-3">
            {pagsMes.map(p => (
              <div key={p.id} className="bg-white p-5 rounded-3xl shadow-sm flex justify-between border border-gray-100 italic">
                <span className="font-black text-gray-700 uppercase italic text-sm">{p.membros?.nome}</span>
                <span className="font-black text-green-600">R$ {p.valor}</span>
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
          <div className="flex justify-between mt-8 text-sm font-bold italic tracking-tighter">
            <span className="text-green-600 font-black text-xl">R$ {pago}</span>
            <span className="text-gray-400 pt-2 uppercase tracking-tighter italic">Meta R$ {meta}</span>
          </div>
          <div className="w-full bg-gray-100 h-3 rounded-full mt-2 overflow-hidden">
            <div className="bg-green-500 h-full transition-all duration-1000" style={{ width: `${Math.min((pago/meta)*100, 100)}%` }}></div>
          </div>
          <div className="mt-8 space-y-3">
            {pags.map(p => (
              <div key={p.id} className="flex justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="font-bold text-gray-600 uppercase text-xs">{p.mes}</span>
                <span className="font-black text-green-600">R$ {p.valor}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- TELA PRINCIPAL (COM DASHBOARD DE SAÍDAS) ---
  return (
    <div className="min-h-screen bg-[#FDFCF0] p-4 md:p-10 font-sans text-gray-800">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-7xl font-black text-[#D4A373] italic uppercase tracking-tighter">FAMILIA da <span className="text-green-700">ALEGRIA</span></h1>
        <p className="text-[10px] md:text-sm font-bold text-gray-400 tracking-[0.4em] mt-2 uppercase italic">NATAL 2026 BRAGANÇA CITY</p>
      </header>

      {/* DASHBOARD FINANCEIRO ATUALIZADO */}
      <div className="max-w-6xl mx-auto bg-black text-white p-8 rounded-[40px] shadow-2xl mb-12 border-b-8 border-green-700">
        <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
          <div className="text-left">
            <p className="text-[10px] text-[#D4A373] font-black uppercase tracking-widest italic">Saldo Disponível</p>
            <div className="text-5xl md:text-7xl font-black italic text-green-500">R$ {saldoAtual.toLocaleString('pt-BR')}</div>
            <div className="flex gap-4 mt-2 text-[10px] font-black uppercase tracking-tighter opacity-50">
                <span>Arrecadado: R$ {totalArrecadado}</span>
                <span className="text-red-400">Saídas: R$ {totalSaidas}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest italic">Meta Natal 2026</p>
            <div className="text-xl font-bold text-gray-400 italic italic">R$ {metaGeral.toLocaleString('pt-BR')}</div>
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
                <p className="text-[8px] font-black text-gray-500 uppercase">{mes}</p>
                <p className="text-sm font-black text-[#D4A373]">R$ {sum}</p>
                <p className="text-[7px] font-bold text-gray-600 uppercase mt-1 italic tracking-tighter">Meta R$ {metaMensalGrupo}</p>
              </div>
            ) : null;
          })}
        </div>
      </div>

      <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-6">
          {/* COLUNA 1: Grupos Expandíveis */}
          <div className="flex-1 space-y-4">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4 mb-2">Familiares</h2>
              {gruposDef.map((g, gIdx) => (
                <div key={gIdx} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  <button onClick={() => setExpandedGrupo(expandedGrupo === gIdx ? null : gIdx)} className="w-full p-4 flex justify-between items-center hover:bg-gray-50">
                    <div className="text-left">
                      <h2 className="text-sm font-black text-gray-800 uppercase italic tracking-tighter italic">{g.titulo}</h2>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">
                        {g.nomes.filter(n => {
                            const m = membros.find(x => x.nome === n);
                            return m && historico.some(h => h.membro_id === m.id && h.mes === mesAtual);
                        }).length} de {g.nomes.length} QUITADOS NO MÊS
                      </p>
                    </div>
                    <span className="text-[#D4A373] font-black">{expandedGrupo === gIdx ? '−' : '+'}</span>
                  </button>
                  <div className={`transition-all duration-300 ${expandedGrupo === gIdx ? 'max-h-[500px] p-3' : 'max-h-0'} overflow-hidden`}>
                    <div className="grid grid-cols-1 gap-2">
                        {g.nomes.map(nome => {
                            const m = membros.find(x => x.nome === nome);
                            const pago = m ? calcPago(m.id) : 0;
                            const meta = getMeta(nome);
                            return (
                                <div key={nome} onClick={() => m && setSelectedMembroId(m.id)} className="bg-[#FDFCF0]/50 p-3 rounded-xl flex justify-between items-center cursor-pointer hover:bg-white transition-all">
                                    <span className="font-black text-[10px] uppercase italic text-gray-700">{nome}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black text-green-600">R$ {pago}</span>
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

          {/* COLUNA 2: Saídas de Caixa */}
          <div className="w-full md:w-80 space-y-4">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4 mb-2">Gastos Bragança City</h2>
              <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 min-h-[200px]">
                {saidas.length > 0 ? saidas.map(s => (
                  <div key={s.id} className="mb-4 last:mb-0 border-b border-gray-50 pb-4 last:border-0">
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-[8px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase">{s.mes}</span>
                        <span className="text-xs font-black text-red-600">- R$ {s.valor}</span>
                    </div>
                    <p className="text-[10px] font-bold text-gray-700 italic leading-tight">{s.descricao}</p>
                    <p className="text-[7px] text-gray-300 font-black mt-1 uppercase">Pago por Reinaldo em {new Date(s.data_registro).toLocaleDateString('pt-BR')}</p>
                  </div>
                )) : (
                  <p className="text-center text-gray-300 text-[10px] italic py-10 uppercase tracking-widest">Nenhum gasto registrado ainda.</p>
                )}
              </div>
          </div>
      </div>

      <footer className="mt-24 text-center pb-20 pt-10 border-t border-dashed border-gray-200">
        <input type="password" placeholder="Admin" className="p-3 border rounded-2xl text-xs bg-white shadow-sm focus:outline-none" onChange={e => setSenha(e.target.value)} />
        <button onClick={() => senha === 'FDA2026' && setIsAdmin(true)} className="ml-3 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors">Acessar Painel</button>
      </footer>
    </div>
  );
};

const container = document.getElementById('root');
if (container) { createRoot(container).render(<App />); }
export default App;
