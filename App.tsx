import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const App = () => {
  const [membros, setMembros] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [saidas, setSaidas] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedMembroId, setSelectedMembroId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [expandedGrupo, setExpandedGrupo] = useState<number | null>(null);
  const [senha, setSenha] = useState('');
  
  const [filtrosGrupos, setFiltrosGrupos] = useState<any>({ 0: 'Todos', 1: 'Todos', 2: 'Todos', 3: 'Todos', 4: 'Todos' });
  const [valoresLote, setValoresLote] = useState<any>({});
  const [valorSaida, setValorSaida] = useState('');
  const [descSaida, setDescSaida] = useState('');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [nomeDoc, setNomeDoc] = useState('');

  const hoje = new Date();
  const diaDoMes = hoje.getDate();
  const mesAtualBr = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(hoje).replace('.', '');
  const mesAtual = mesAtualBr.charAt(0).toUpperCase() + mesAtualBr.slice(1);
  const [mesGlobal, setMesGlobal] = useState(mesAtual);

  // MESES ABREVIADOS PARA MOBILE
  const meses = ["Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  
  const getMetaMensal = (mes: string) => mes === "Fev" ? 1590 : 1850;
  const getMetaInd = (nome: string) => nome === 'Pablo' ? 330 : 760;
  const metaGlobalBragança = 20090;

  const gruposDef = [
    { titulo: "Grupo Adriana", nomes: ["Adriana", "Silvinho", "Adriano", "Angela", "Vini", "Stefany"] },
    { titulo: "Grupo Helena", nomes: ["Helena", "Antonio", "Paty", "Jair", "Giovana", "Manu", "Pablo"] },
    { titulo: "Grupo Clarice", nomes: ["Clarice", "Gilson", "Deia", "Helio", "Amanda", "Reinaldo"] },
    { titulo: "Grupo Katia", nomes: ["Katia", "Giovani", "Cintia", "Rafael", "Ju", "Bia"] },
    { titulo: "Grupo Julia", nomes: ["Julia", "Juan"] }
  ];

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const { data: m } = await supabase.from('membros').select('*').order('nome');
      const { data: p } = await supabase.from('pagamentos_detalhes').select('*, membros(nome)');
      const { data: s } = await supabase.from('saidas_caixa').select('*').order('data_registro', { ascending: false });
      const { data: d } = await supabase.from('documentos_familia').select('*').order('data_upload', { ascending: false });
      setMembros(m || []); setHistorico(p || []); setSaidas(s || []); setDocs(d || []);
    } catch (e) { console.error(e); }
  };

  // --- FUNÇÕES DE ADMIN ---
  const handleUpload = async () => {
    if (!fileToUpload || !nomeDoc) return alert("Preencha nome e arquivo!");
    const fileName = `${Date.now()}_${fileToUpload.name.replace(/\s/g, '_')}`;
    const { data: up } = await supabase.storage.from('documentos').upload(fileName, fileToUpload);
    if (up) {
      const { data: url } = supabase.storage.from('documentos').getPublicUrl(fileName);
      await supabase.from('documentos_familia').insert([{ nome_exibicao: nomeDoc, mes: mesGlobal, url_arquivo: url.publicUrl, tipo: 'extrato' }]);
      setFileToUpload(null); setNomeDoc(''); fetchAll(); alert("Doc Carregado!");
    }
  };

  const lancarPagamento = async (id: number, valor: string) => {
    if (!valor || parseFloat(valor) <= 0) return;
    await supabase.from('pagamentos_detalhes').insert([{ membro_id: id, valor: parseFloat(valor), mes: mesGlobal }]);
    setValoresLote({ ...valoresLote, [id]: '' }); fetchAll();
  };

  const lancarSaida = async () => {
    if (!valorSaida || !descSaida) return;
    await supabase.from('saidas_caixa').insert([{ valor: parseFloat(valorSaida), mes: mesGlobal, descricao: descSaida }]);
    setValorSaida(''); setDescSaida(''); fetchAll(); alert("Gasto Salvo!");
  };

  const excluirItem = async (id: number, tabela: string) => {
    if (window.confirm("Deseja realmente excluir?")) {
      await supabase.from(tabela).delete().eq('id', id); fetchAll();
    }
  };

  const totalArrecadado = historico.reduce((acc, h) => acc + Number(h.valor), 0);
  const totalSaidas = saidas.reduce((acc, s) => acc + Number(s.valor), 0);
  const saldoAtual = totalArrecadado - totalSaidas;

  // --- RENDERS CONDICIONAIS ---
  if (selectedMonth) {
    const pagsMes = historico.filter(p => p.mes === selectedMonth);
    const arrecMes = pagsMes.reduce((acc, p) => acc + Number(p.valor), 0);
    const saidaMes = saidas.filter(s => s.mes === selectedMonth).reduce((acc, s) => acc + Number(s.valor), 0);
    const pagantesCount = new Set(pagsMes.map(p => p.membro_id)).size;

    return (
      <div className="min-h-screen bg-[#FDFCF0] p-6 font-sans text-gray-800">
        <button onClick={() => setSelectedMonth(null)} className="mb-8 font-black text-[#D4A373] uppercase text-xs">← Voltar</button>
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-black text-white p-8 rounded-[40px] shadow-xl border-b-8 border-red-500 text-center italic">
            <h2 className="text-4xl font-black uppercase tracking-tighter">{selectedMonth}</h2>
            <div className="mt-4 border-t border-gray-800 pt-4 flex justify-between items-end">
              <div className="text-left">
                <p className="text-[10px] text-gray-500 uppercase">Saldo Mês</p>
                <p className="text-2xl font-black text-green-500 italic">R$ {(arrecMes - saidaMes).toLocaleString('pt-BR')}</p>
                <p className="text-[11px] text-[#D4A373] font-black uppercase mt-1">{pagantesCount} de 27 pagaram</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Saída: R$ {saidaMes}</p>
                <p className="text-sm font-bold text-gray-400">Meta: R$ {getMetaMensal(selectedMonth)}</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {pagsMes.map(p => (
              <div key={p.id} className="bg-white p-4 rounded-2xl flex justify-between border italic">
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
    const pagouMes = pags.some(p => p.mes === mesAtual);
    const statusText = pagouMes ? "✨ Parabens! Até que enfim pagou" : diaDoMes > 15 ? "⚠️ Paga o que deve caloteiro" : "⏳ Aguardando Pix até dia 15";
    const statusColor = pagouMes ? 'bg-green-100 text-green-700' : diaDoMes > 15 ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-500';
    return (
      <div className="min-h-screen bg-[#FDFCF0] p-6 font-sans text-gray-800">
        <button onClick={() => setSelectedMembroId(null)} className="mb-8 font-black text-[#D4A373] uppercase text-xs">← Voltar</button>
        <div className="max-w-xl mx-auto bg-white p-8 rounded-[40px] shadow-xl border-b-8 border-green-700">
          <h2 className="text-3xl font-black italic uppercase text-gray-800 tracking-tighter">{m?.nome}</h2>
          <div className={`mt-4 p-4 rounded-2xl text-center font-black uppercase text-xs italic ${statusColor}`}>{statusText}</div>
          <div className="flex justify-between mt-8 text-sm font-bold">
            <span className="text-green-600 font-black text-xl italic">R$ {calcPago(selectedMembroId)}</span>
            <span className="text-gray-400 pt-2 uppercase text-xs">Meta Natal R$ {getMetaInd(m?.nome || '')}</span>
          </div>
          <div className="mt-8 space-y-3">
            {pags.map(p => (
              <div key={p.id} className="flex justify-between p-4 bg-gray-50 rounded-2xl border italic text-xs">
                <span className="font-bold text-gray-600 uppercase">{p.mes}</span>
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
      <div className="p-4 bg-gray-100 min-h-screen font-sans pb-20 text-gray-800 italic">
        <div className="flex justify-between items-center mb-6 max-w-2xl mx-auto">
           <button onClick={() => setIsAdmin(false)} className="text-blue-600 font-bold text-xs uppercase tracking-widest">← Site</button>
           <select className="p-2 border rounded-xl text-xs font-bold bg-white" value={mesGlobal} onChange={e => setMesGlobal(e.target.value)}>
             {meses.map(m => <option key={m} value={m}>{m}</option>)}
           </select>
        </div>
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* UPLOAD DOCS */}
          <div className="bg-blue-900 text-white p-6 rounded-3xl shadow-lg border-b-4 border-blue-400 italic">
            <h2 className="text-[10px] font-black uppercase mb-4 tracking-widest">1. Auditoria</h2>
            <div className="flex gap-2 mb-4">
              <input type="text" placeholder="Nome do arquivo" className="flex-1 p-3 rounded-xl text-black text-xs" value={nomeDoc} onChange={e => setNomeDoc(e.target.value)} />
              <input type="file" className="w-24 text-[8px] pt-3" onChange={e => setFileToUpload(e.target.files?.[0] || null)} />
              <button onClick={handleUpload} className="bg-blue-500 px-4 rounded-xl text-[10px] font-black italic">SUBIR</button>
            </div>
            {docs.map(d => (
                <div key={d.id} className="flex justify-between items-center bg-blue-800/30 p-2 rounded-lg text-[9px] mb-2 italic">
                  <span>{d.mes}: {d.nome_exibicao}</span>
                  <button onClick={() => { const fileName = d.url_arquivo.split('/').pop(); if (fileName) supabase.storage.from('documentos').remove([fileName]).then(() => { supabase.from('documentos_familia').delete().eq('id', d.id).then(fetchAll); }); }} className="text-red-400 font-black">X</button>
                </div>
            ))}
          </div>
          {/* LANÇAR SAÍDA */}
          <div className="bg-black text-white p-6 rounded-3xl shadow-lg border-b-4 border-red-500 italic">
            <h2 className="text-[10px] font-black uppercase mb-4 tracking-widest">2. Lançar Gasto</h2>
            <input type="text" placeholder="Descrição" className="w-full p-3 rounded-xl text-black text-sm mb-3" value={descSaida} onChange={e => setDescSaida(e.target.value)} />
            <div className="flex gap-2">
                <input type="number" placeholder="R$" className="w-1/2 p-3 rounded-xl text-black text-sm font-bold" value={valorSaida} onChange={e => setValorSaida(e.target.value)} />
                <button onClick={lancarSaida} className="w-1/2 bg-red-600 font-black rounded-xl text-xs uppercase italic">Registrar</button>
            </div>
          </div>
          {/* FILTRO GRUPO */}
          {gruposDef.map((g, idx) => (
            <div key={idx} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200">
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 italic">{g.titulo}</h2>
              <select className="w-full p-3 border rounded-xl mb-4 bg-gray-50 text-sm font-bold" value={filtrosGrupos[idx]} onChange={e => setFiltrosGrupos({...filtrosGrupos, [idx]: e.target.value})}>
                <option value="Todos">Lançar Novo PIX</option>
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
                      <div key={p.id} className="flex justify-between items-center p-3 bg-red-50/30 rounded-xl border border-red-100 italic">
                        <span className="text-[10px] font-bold">{p.mes}: R$ {p.valor}</span>
                        <button onClick={() => { if (confirm("Excluir?")) { supabase.from('pagamentos_detalhes').delete().eq('id', p.id).then(fetchAll); } }} className="text-red-500 font-black text-[10px] uppercase">Excluir</button>
                      </div>
                    ));
                  }
                })}
              </div>
            </div>
          ))}
          {/* LISTA GASTOS */}
          <div className="bg-white p-5 rounded-3xl border border-red-200">
            <h2 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3 italic">3. Histórico de Gastos</h2>
            {saidas.map(s => (
              <div key={s.id} className="flex justify-between items-center p-3 border-b last:border-0 text-[10px] italic">
                <span className="flex-1"><b>{s.descricao}</b> ({s.mes})</span>
                <span className="text-red-500 font-black mr-4">R$ {s.valor}</span>
                <button onClick={() => { if (confirm("Excluir?")) { supabase.from('saidas_caixa').delete().eq('id', s.id).then(fetchAll); } }} className="text-red-500 font-black">X</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER PRINCIPAL (DESIGN MOBILE FIRST) ---
  return (
    <div className="min-h-screen bg-[#0B0C10] p-4 md:p-8 font-sans text-white">
      {/* CABEÇALHO COMPACTO */}
      <div className="max-w-4xl mx-auto bg-[#121418] rounded-[40px] p-6 md:p-8 shadow-2xl border border-gray-800 mb-8">
        <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
          <div className="flex-1">
            <p className="text-[10px] text-[#D4A373] font-black uppercase tracking-widest mb-1 italic">SALDO EM CAIXA</p>
            <h1 className="text-4xl md:text-7xl font-black text-[#22c55e] italic tracking-tighter">R$ {saldoAtual.toLocaleString('pt-BR')}</h1>
          </div>
          <div className="bg-[#1A1D23] p-4 rounded-3xl border border-gray-800 self-start md:self-center">
            <p className="text-[8px] text-gray-500 font-black uppercase mb-1 italic">ARRECADADO NO PERÍODO:</p>
            <p className="text-xl font-black italic">R$ {totalArrecadado.toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <div className="mb-8">
           <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-[9px] text-gray-500 font-black uppercase italic">META GLOBAL</p>
                <p className="text-xl font-black italic">R$ {metaGlobalBragança.toLocaleString('pt-BR')}</p>
              </div>
              <p className="text-xl font-black text-[#22c55e] italic">{( (totalArrecadado/metaGlobalBragança)*100 ).toFixed(1)}%</p>
           </div>
           <div className="w-full bg-[#1A1D23] h-3 rounded-full overflow-hidden border border-gray-800">
              <div className="bg-[#22c55e] h-full transition-all duration-1000" style={{ width: `${(totalArrecadado/metaGlobalBragança)*100}%` }}></div>
           </div>
        </div>

        {/* TABELA OTIMIZADA PARA SMARTPHONE */}
        <div className="mt-8">
           <h2 className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-4 italic">EVOLUÇÃO MENSAL</h2>
           <div className="overflow-x-auto -mx-6 px-6">
             <table className="w-full text-left border-collapse min-w-[320px]">
               <thead>
                 <tr className="border-b border-gray-800 text-[8px] text-gray-600 font-black uppercase italic">
                   <th className="pb-3">MÊS</th>
                   <th className="pb-3">META</th>
                   <th className="pb-3 text-green-500">ARREC.</th>
                   <th className="pb-3 text-red-500">SAÍDA</th>
                   <th className="pb-3 text-right">STATUS (%)</th>
                 </tr>
               </thead>
               <tbody className="text-[10px] font-bold italic">
                 {meses.map(mes => {
                   const arrec = historico.filter(h => h.mes === mes).reduce((acc, h) => acc + Number(h.valor), 0);
                   const meta = getMetaMensal(mes);
                   const saidaMes = saidas.filter(s => s.mes === mes).reduce((acc, s) => acc + Number(s.valor), 0);
                   const perc = ((arrec/meta)*100).toFixed(0);
                   const isMet = arrec >= meta;
                   
                   return (
                     <tr key={mes} onClick={() => setSelectedMonth(mes)} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-all cursor-pointer">
                       <td className="py-4 text-gray-300">{mes}</td>
                       <td className="py-4 text-gray-500">R$ {meta}</td>
                       <td className="py-4 text-green-500">{arrec > 0 ? `R$ ${arrec}` : '—'}</td>
                       <td className="py-4 text-red-400">{saidaMes > 0 ? `R$ ${saidaMes}` : '—'}</td>
                       <td className={`py-4 text-right ${isMet ? 'text-[#22c55e]' : 'text-gray-600'}`}>
                         {arrec > 0 ? `${perc}%` : '—'}
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           </div>
        </div>
      </div>

      {/* FAMILIARES */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24 italic">
        <div className="space-y-4">
          <h2 className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-4">Membros</h2>
          {gruposDef.map((g, gIdx) => (
            <div key={gIdx} className="bg-[#121418] rounded-3xl border border-gray-800 overflow-hidden shadow-sm">
              <button onClick={() => setExpandedGrupo(expandedGrupo === gIdx ? null : gIdx)} className="w-full p-4 flex justify-between items-center hover:bg-gray-800 transition-all">
                <div className="text-left">
                  <h2 className="text-xs font-black text-gray-300 uppercase italic">{g.titulo}</h2>
                  <p className="text-[7px] font-black text-gray-600 uppercase mt-1">
                    {g.nomes.filter(n => historico.some(h => h.membros?.nome === n && h.mes === mesAtual)).length} de {g.nomes.length} QUITADOS
                  </p>
                </div>
                <span className="text-[#D4A373] text-sm font-black">{expandedGrupo === gIdx ? '−' : '+'}</span>
              </button>
              <div className={`transition-all duration-300 ${expandedGrupo === gIdx ? 'max-h-[800px] p-4' : 'max-h-0'} overflow-hidden`}>
                <div className="grid grid-cols-1 gap-2">
                  {g.nomes.map(nome => {
                    const m = membros.find(x => x.nome === nome);
                    const pagoMembro = m ? historico.filter(h => h.membro_id === m.id).reduce((acc, h) => acc + Number(h.valor), 0) : 0;
                    const metaMembro = getMetaInd(nome);
                    return (
                      <div key={nome} onClick={() => m && setSelectedMembroId(m.id)} className="bg-[#1A1D23] p-3 rounded-xl flex justify-between items-center border border-gray-800">
                        <span className="font-black text-[9px] uppercase text-gray-500">{nome}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-[#22c55e]">R$ {pagoMembro}</span>
                          <div className={`h-1 w-1 rounded-full ${pagoMembro >= metaMembro ? 'bg-[#22c55e]' : 'bg-red-900'}`}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-4">Saídas</h2>
          <div className="bg-[#121418] rounded-[30px] p-6 border border-gray-800 min-h-[120px]">
            {saidas.slice(0, 8).map(s => (
              <div key={s.id} className="mb-3 border-b border-gray-800 pb-3 last:border-0 italic">
                <div className="flex justify-between items-start mb-1 text-[7px] font-black italic">
                   <span className="bg-red-900/30 text-red-500 px-2 py-0.5 rounded-full uppercase">{s.mes}</span>
                   <span className="text-red-500">R$ {s.valor}</span>
                </div>
                <p className="text-[9px] font-bold text-gray-400">{s.descricao}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-[9px] font-black text-blue-900 uppercase tracking-widest ml-4">Extratos</h2>
          <div className="bg-blue-950/10 rounded-[30px] p-6 border border-blue-900/30 min-h-[120px]">
            {docs.map(d => (
              <a key={d.id} href={d.url_arquivo} download target="_blank" className="flex justify-between items-center p-3 mb-2 bg-[#121418] rounded-xl border border-gray-800 italic">
                <span className="text-[9px] font-black text-gray-500 uppercase truncate pr-2">{d.nome_exibicao}</span>
                <span className="text-blue-900 font-black">↓</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      <footer className="mt-6 text-center pb-20 pt-6 border-t border-dashed border-gray-800 italic">
        <input type="password" placeholder="Admin" className="p-2 border border-gray-800 rounded-xl text-[10px] bg-[#121418] text-white focus:outline-none w-24" onChange={e => setSenha(e.target.value)} />
        <button onClick={() => senha === 'FDA2026' && setIsAdmin(true)} className="ml-2 text-[9px] font-black text-gray-600 uppercase tracking-widest">Painel</button>
      </footer>
    </div>
  );
};

const container = document.getElementById('root');
if (container) { createRoot(container).render(<App />); }
export default App;
