import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';

// Inicialização segura do ecossistema
const supabaseUrl = 'https://jqpdampcglodtmfmeivk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxcGRhbXBjZ2xvZHRtZm1laXZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMTE1MjYsImV4cCI6MjA4NjU4NzUyNn0.yjEPWO1bEq0LxCW5gECXOyIwsO9ol3IS_1KfueHdEKs';
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

  const [tipoFluxo, setTipoFluxo] = useState('saida'); 
  const [showAllMovimentacoes, setShowAllMovimentacoes] = useState(false);
  const [showAllDocs, setShowAllDocs] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const hoje = new Date();
  const diaDoMes = hoje.getDate();
  
  const mesesMap: { [key: string]: string } = {
    "Fev": "Fevereiro", "Mar": "Março", "Abr": "Abril", "Mai": "Maio", 
    "Jun": "Junho", "Jul": "Julho", "Ago": "Agosto", "Set": "Setembro", 
    "Out": "Outubro", "Nov": "Novembro", "Dez": "Dezembro"
  };
  const mesesAbbr = Object.keys(mesesMap);

  const mesAtualBr = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(hoje);
  const mesAtualFull = mesAtualBr.charAt(0).toUpperCase() + mesAtualBr.slice(1);
  
  const [mesGlobal, setMesGlobal] = useState(mesAtualFull);
  const [mesCaixaGlobal, setMesCaixaGlobal] = useState(mesAtualFull);

  // REGRAS FINANCEIRAS E MANU
  const isManuActive = (mes: string) => ["Fevereiro", "Março", "Fev", "Mar"].includes(mes);

  const getMetaMensal = (mes: string) => {
    if (mes === "Fevereiro" || mes === "Fev") return 1590;
    if (mes === "Março" || mes === "Mar") return 1855;
    return 1785; 
  };
  
  const getMetaInd = (nome: string) => {
    if (nome === 'Pablo') return 380;
    if (nome === 'Manu') return 130; 
    return 760;
  };
  
  const metaGlobalBragança = 19510;

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

  const handleUpload = async () => {
    if (!fileToUpload || !nomeDoc) return alert("Preencha nome e arquivo!");
    const fileName = `${Date.now()}_${fileToUpload.name.replace(/\s/g, '_')}`;
    const { data: up } = await supabase.storage.from('documentos').upload(fileName, fileToUpload);
    if (up) {
      const { data: url } = supabase.storage.from('documentos').getPublicUrl(fileName);
      await supabase.from('documentos_familia').insert([{ nome_exibicao: nomeDoc, mes: mesGlobal, url_arquivo: url.publicUrl, tipo: 'extrato' }]);
      setFileToUpload(null); setNomeDoc(''); fetchAll();
    }
  };

  const lancarPagamento = async (id: number, valor: string) => {
    if (!valor || parseFloat(valor) <= 0) return;
    await supabase.from('pagamentos_detalhes').insert([{ membro_id: id, valor: parseFloat(valor), mes: mesGlobal, mes_caixa: mesCaixaGlobal }]);
    setValoresLote({ ...valoresLote, [id]: '' }); fetchAll();
  };

  const lancarMovimentacao = async () => {
    if (!valorSaida || !descSaida) return;
    await supabase.from('saidas_caixa').insert([{ valor: parseFloat(valorSaida), mes: mesCaixaGlobal, descricao: descSaida, tipo: tipoFluxo }]);
    setValorSaida(''); setDescSaida(''); fetchAll();
  };

  const excluirItem = async (id: number, tabela: string) => {
    if (window.confirm("Excluir este registro?")) { await supabase.from(tabela).delete().eq('id', id); fetchAll(); }
  };

  const excluirDoc = async (id: number, url: string) => {
    if (window.confirm("Apagar comprovante?")) {
      const fileName = url.split('/').pop();
      if (fileName) await supabase.storage.from('documentos').remove([fileName]);
      await supabase.from('documentos_familia').delete().eq('id', id); fetchAll();
    }
  };

  const rendimentosConta = saidas.filter(s => s.tipo === 'rendimento');
  const saidasReais = saidas.filter(s => s.tipo !== 'rendimento');

  const calcPago = (id: number) => historico.filter(h => h.membro_id === id).reduce((acc, h) => acc + Number(h.valor), 0);
  const totalArrecadado = historico.reduce((acc, h) => acc + Number(h.valor), 0);
  const totalRendimentos = rendimentosConta.reduce((acc, r) => acc + Number(r.valor), 0);
  const totalSaidas = saidasReais.reduce((acc, s) => acc + Number(s.valor), 0);
  
  const saldoAtual = totalArrecadado + totalRendimentos - totalSaidas;

  // --- RENDERS DAS TELAS SECUNDÁRIAS ---

  if (selectedMonth) {
    const mesDb = mesesMap[selectedMonth] || selectedMonth;
    const pagsMes = historico.filter(p => (p.mes_caixa || p.mes) === mesDb);
    const arrecMes = pagsMes.reduce((acc, p) => acc + Number(p.valor), 0);
    const rendMes = rendimentosConta.filter(r => r.mes === mesDb).reduce((acc, r) => acc + Number(r.valor), 0);
    const saidaMes = saidasReais.filter(s => s.mes === mesDb).reduce((acc, s) => acc + Number(s.valor), 0);
    const pagantesUnicosCount = new Set(pagsMes.map(p => p.membro_id)).size;
    const totalEsperadoMes = isManuActive(mesDb) ? 27 : 26; 

    return (
      <div className="min-h-screen bg-[#0B0C10] p-6 font-sans text-white">
        <button onClick={() => setSelectedMonth(null)} className="mb-6 font-black text-[#D4A373] uppercase text-xs tracking-widest hover:text-white transition-colors">← Voltar</button>
        <div className="max-w-xl mx-auto bg-[#121418] p-6 rounded-3xl shadow-2xl border border-gray-800 border-b-4 border-b-sky-500">
          <h2 className="text-3xl font-black uppercase tracking-tighter text-white mb-4">{selectedMonth}</h2>
          <div className="border-t border-gray-800 pt-4 flex justify-between items-end">
            <div className="text-left">
              <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Saldo Período</p>
              <p className="text-3xl font-black text-sky-400">R$ {(arrecMes + rendMes - saidaMes).toLocaleString('pt-BR')}</p>
              <p className="text-[10px] text-[#D4A373] font-black uppercase tracking-widest mt-1">
                {pagantesUnicosCount} PIXs (de {totalEsperadoMes})
              </p>
            </div>
            <div className="text-right flex flex-col gap-1">
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Rend.: + R$ {rendMes}</p>
              <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">Saída: - R$ {saidaMes}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Meta: R$ {getMetaMensal(mesDb)}</p>
            </div>
          </div>
        </div>
        <div className="max-w-xl mx-auto mt-6 space-y-3">
            {pagsMes.map(p => (
              <div key={p.id} className="bg-[#1A1D23] p-4 rounded-xl flex justify-between items-center border border-gray-800 shadow-sm">
                <div>
                  <span className="font-black text-white uppercase text-xs tracking-widest block">{p.membros?.nome}</span>
                  {p.mes !== mesDb && <span className="text-[9px] text-rose-400 uppercase font-bold tracking-widest mt-1 block">Ref. parcela de {p.mes}</span>}
                </div>
                <span className="font-black text-emerald-400 text-lg">R$ {p.valor}</span>
              </div>
            ))}
        </div>
      </div>
    );
  }

  if (selectedMembroId) {
    const m = membros.find(x => x.id === selectedMembroId);
    const pags = historico.filter(h => h.membro_id === selectedMembroId);
    const pagoAcumulado = calcPago(selectedMembroId);
    const metaMembro = getMetaInd(m?.nome || '');
    const pagouMes = pags.some(p => p.mes === mesAtualFull);
    const statusText = pagouMes ? "QUITADO" : diaDoMes > 15 ? "ATRASADO" : "PENDENTE";
    const statusColor = pagouMes ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : diaDoMes > 15 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-gray-800 text-gray-400 border border-gray-700';

    return (
      <div className="min-h-screen bg-[#0B0C10] p-6 font-sans text-white">
        <button onClick={() => setSelectedMembroId(null)} className="mb-6 font-black text-[#D4A373] uppercase text-xs tracking-widest hover:text-white transition-colors">← Voltar</button>
        <div className="max-w-xl mx-auto bg-[#121418] p-6 rounded-3xl shadow-2xl border border-gray-800">
          <div className="flex justify-between items-start mb-6">
             <h2 className="text-2xl font-black uppercase text-white tracking-widest">{m?.nome}</h2>
             <div className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg ${statusColor}`}>{statusText}</div>
          </div>
          
          <div className="border-t border-gray-800 pt-4 flex justify-between items-end">
            <div>
               <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Total Contribuído</span>
               <span className="font-black text-3xl text-emerald-400">R$ {pagoAcumulado}</span>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold border-l-2 border-gray-800 pl-3 pb-1">Meta: R$ {metaMembro}</span>
          </div>
          
          <div className="w-full bg-[#1A1D23] h-2 rounded-full mt-4 overflow-hidden">
             <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${Math.min((pagoAcumulado/metaMembro)*100, 100)}%` }}></div>
          </div>
          
          <div className="mt-8 space-y-3">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Histórico de Pagamentos</p>
            {pags.map(p => (
              <div key={p.id} className="flex justify-between items-center p-4 bg-[#1A1D23] rounded-xl border border-gray-800">
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-white uppercase text-xs tracking-widest">Ref: {p.mes}</span>
                  {(p.mes_caixa && p.mes_caixa !== p.mes) && <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Pago em: {p.mes_caixa}</span>}
                </div>
                <span className="font-black text-emerald-400 text-lg">R$ {p.valor}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // TELA 3: ADMIN
  if (isAdmin) {
    return (
      <div className="p-4 md:p-6 bg-[#0B0C10] min-h-screen font-sans pb-20 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 max-w-5xl mx-auto border-b border-gray-800 pb-4">
           <button onClick={() => setIsAdmin(false)} className="font-black text-sky-400 uppercase text-xs tracking-widest hover:text-white transition-colors">← Voltar ao Site</button>
           
           <div className="flex gap-4 w-full md:w-auto">
             <div className="flex flex-col flex-1 md:flex-none">
                <span className="text-[9px] text-gray-500 font-black uppercase mb-1 tracking-widest">Referente a (Dívida)</span>
                <select className="p-2 border border-gray-700 text-xs font-bold bg-[#121418] text-white outline-none focus:border-sky-500 rounded-xl" value={mesGlobal} onChange={e => setMesGlobal(e.target.value)}>
                  {Object.values(mesesMap).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
             </div>
             <div className="flex flex-col flex-1 md:flex-none">
                <span className="text-[9px] text-emerald-500 font-black uppercase mb-1 tracking-widest">Caiu no banco em</span>
                <select className="p-2 border border-emerald-500/50 text-xs font-bold bg-[#121418] text-white outline-none focus:border-emerald-500 rounded-xl" value={mesCaixaGlobal} onChange={e => setMesCaixaGlobal(e.target.value)}>
                  {Object.values(mesesMap).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
             </div>
           </div>
        </div>

        <div className="space-y-6 max-w-5xl mx-auto">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Box Auditoria */}
             <div className="bg-[#121418] p-6 rounded-3xl border border-gray-800 border-b-4 border-b-sky-500 shadow-xl">
               <h2 className="text-[10px] font-black uppercase mb-5 tracking-widest text-sky-400">1. Subir Extrato</h2>
               <div className="flex flex-col gap-3 mb-4">
                 <input type="text" placeholder="Nome do arquivo" className="w-full p-3 rounded-xl bg-[#0B0C10] border border-gray-800 text-white text-xs outline-none focus:border-sky-500" value={nomeDoc} onChange={e => setNomeDoc(e.target.value)} />
                 <div className="flex gap-2">
                   <input type="file" className="flex-1 text-[9px] text-gray-400 file:mr-2 file:py-2 file:px-3 file:border-0 file:rounded-lg file:text-[9px] file:font-black file:bg-gray-800 file:text-white hover:file:bg-gray-700 cursor-pointer" onChange={e => setFileToUpload(e.target.files?.[0] || null)} />
                   <button onClick={handleUpload} className="bg-sky-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-400 transition-colors">Subir</button>
                 </div>
               </div>
               <div className="space-y-2 mt-4 pt-4 border-t border-gray-800 max-h-[150px] overflow-y-auto pr-2">
                 {docs.map(d => (
                   <div key={d.id} className="flex justify-between items-center bg-[#1A1D23] p-3 rounded-xl text-[10px] border border-gray-800 uppercase tracking-wider">
                     <span className="text-gray-400">{d.mes}: <span className="text-white font-bold ml-1">{d.nome_exibicao}</span></span>
                     <button onClick={() => excluirDoc(d.id, d.url_arquivo)} className="text-rose-500 font-black px-2 hover:text-rose-400">X</button>
                   </div>
                 ))}
               </div>
             </div>

             {/* Box Movimentação */}
             <div className="bg-[#121418] p-6 rounded-3xl border border-gray-800 border-b-4 border-b-rose-500 shadow-xl">
               <h2 className="text-[10px] font-black uppercase mb-5 tracking-widest text-white">2. Fluxo Bancário</h2>
               
               <div className="flex gap-2 mb-4">
                 <button onClick={() => setTipoFluxo('saida')} className={`flex-1 p-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors border ${tipoFluxo === 'saida' ? 'bg-rose-500/20 text-rose-400 border-rose-500/50' : 'bg-[#1A1D23] text-gray-500 border-gray-800'}`}>Saída</button>
                 <button onClick={() => setTipoFluxo('rendimento')} className={`flex-1 p-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors border ${tipoFluxo === 'rendimento' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-[#1A1D23] text-gray-500 border-gray-800'}`}>Rend.</button>
               </div>

               <div className="flex flex-col gap-3">
                 <input type="text" placeholder="Descrição (ex: Rendimento)" className="w-full p-3 rounded-xl bg-[#0B0C10] border border-gray-800 text-white text-xs outline-none focus:border-gray-500" value={descSaida} onChange={e => setDescSaida(e.target.value)} />
                 <div className="flex gap-2">
                     <input type="number" placeholder="R$ Valor" className="w-1/2 p-3 rounded-xl bg-[#0B0C10] border border-gray-800 text-white text-xs font-bold outline-none focus:border-gray-500" value={valorSaida} onChange={e => setValorSaida(e.target.value)} />
                     <button onClick={lancarMovimentacao} className="w-1/2 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-colors">Registrar</button>
                 </div>
               </div>
               
               <div className="mt-4 space-y-2 border-t border-gray-800 pt-4 max-h-[150px] overflow-y-auto pr-2">
                  {saidas.map(s => (
                    <div key={s.id} className="flex justify-between items-center text-[10px] bg-[#1A1D23] p-3 rounded-xl border border-gray-800 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${s.tipo === 'rendimento' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {s.tipo === 'rendimento' ? 'IN' : 'OUT'}
                        </span>
                        <span className="text-gray-400">{s.mes} • {s.descricao}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">R$ {s.valor}</span>
                        <button onClick={() => excluirItem(s.id, 'saidas_caixa')} className="text-rose-500 font-black hover:text-rose-400">X</button>
                      </div>
                    </div>
                  ))}
               </div>
             </div>
          </div>

          {/* Box Grupos */}
          <div className="bg-[#121418] p-6 rounded-3xl border border-gray-800 shadow-xl mt-6">
             <h2 className="text-[10px] font-black uppercase mb-6 tracking-widest text-gray-500">3. Lançamento de PIX</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gruposDef.map((g, idx) => (
                  <div key={idx} className="bg-[#1A1D23] p-5 rounded-2xl border border-gray-800">
                    <h2 className="text-[11px] font-black text-white uppercase tracking-widest mb-4">{g.titulo}</h2>
                    <select className="w-full p-2.5 rounded-xl border border-gray-700 mb-4 bg-[#0B0C10] text-gray-400 text-xs font-bold outline-none focus:border-white uppercase tracking-wider" value={filtrosGrupos[idx]} onChange={e => setFiltrosGrupos({...filtrosGrupos, [idx]: e.target.value})}>
                      <option value="Todos">Selecionar Membro...</option>
                      {g.nomes.filter(n => n !== 'Manu' || isManuActive(mesGlobal)).map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <div className="space-y-3">
                      {g.nomes
                        .filter(n => n !== 'Manu' || isManuActive(mesGlobal))
                        .filter(n => filtrosGrupos[idx] === 'Todos' || filtrosGrupos[idx] === n)
                        .map(nome => {
                        const m = membros.find(x => x.nome === nome);
                        if (!m) return null;
                        if (filtrosGrupos[idx] === 'Todos') {
                          return (
                            <div key={m.id} className="flex items-center gap-2 border-t border-gray-800 pt-3">
                              <span className="text-[10px] font-bold w-20 truncate uppercase text-gray-400 tracking-wider">{m.nome}</span>
                              <input type="number" placeholder="R$" className="flex-1 p-2 rounded-xl bg-[#0B0C10] border border-gray-700 text-xs font-bold text-white outline-none focus:border-emerald-500" value={valoresLote[m.id] || ''} onChange={e => setValoresLote({...valoresLote, [m.id]: e.target.value})} />
                              <button onClick={() => lancarPagamento(m.id, valoresLote[m.id])} className="bg-emerald-500 text-[#0B0C10] rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-colors">OK</button>
                            </div>
                          );
                        } else {
                          return historico.filter(h => h.membro_id === m.id).map(p => (
                            <div key={p.id} className="flex justify-between items-center p-3 bg-[#0B0C10] rounded-xl border border-gray-800 mt-2">
                              <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-bold text-gray-300 tracking-widest uppercase">Ref: {p.mes}</span>
                                {(p.mes_caixa && p.mes_caixa !== p.mes) && <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Caixa: {p.mes_caixa}</span>}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[11px] font-black text-emerald-400">R$ {p.valor}</span>
                                <button onClick={() => excluirItem(p.id, 'pagamentos_detalhes')} className="text-rose-500 hover:text-rose-400 font-black text-[10px] uppercase">X</button>
                              </div>
                            </div>
                          ));
                        }
                      })}
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER PRINCIPAL ---
  
  let saldoAcumuladoLoop = 0;
  const dadosEvolucao = mesesAbbr.map(mesAbbr => {
    const mesDb = mesesMap[mesAbbr];
    const arrec = historico.filter(h => (h.mes_caixa || h.mes) === mesDb).reduce((acc, h) => acc + Number(h.valor), 0);
    const rendM = rendimentosConta.filter(r => r.mes === mesDb).reduce((acc, r) => acc + Number(r.valor), 0);
    const saidaM = saidasReais.filter(s => s.mes === mesDb).reduce((acc, s) => acc + Number(s.valor), 0);
    const meta = getMetaMensal(mesDb);
    
    saldoAcumuladoLoop = saldoAcumuladoLoop + arrec + rendM - saidaM;
    return { mesAbbr, arrec, rendM, saidaM, saldo: saldoAcumuladoLoop, meta };
  });

  return (
    <div className="min-h-screen bg-[#0B0C10] font-sans text-white selection:bg-[#D4A373] selection:text-black pb-24">
      
      {/* LOGIN MINIMALISTA NO TOPO DIREITO */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-40">
        {!showLogin ? (
           <button onClick={() => setShowLogin(true)} className="text-gray-600 hover:text-[#D4A373] transition-colors p-2 bg-[#121418] rounded-full border border-gray-800" title="Acesso Restrito">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z"></path></svg>
           </button>
        ) : (
           <div className="flex items-center bg-[#121418] border border-gray-700 rounded-xl overflow-hidden shadow-2xl">
              <input type="password" placeholder="SENHA" className="p-2 w-28 bg-transparent text-[10px] uppercase tracking-widest font-bold text-white outline-none placeholder:text-gray-600" value={senha} onChange={e => {
                 setSenha(e.target.value);
                 if (e.target.value === '041252') { setIsAdmin(true); setShowLogin(false); setSenha(''); }
              }} autoFocus />
              <button onClick={() => setShowLogin(false)} className="text-gray-500 hover:text-white font-black px-3 py-2 text-xs transition-colors bg-gray-800/50">X</button>
           </div>
        )}
      </div>

      {/* CABEÇALHO */}
      <header className="pt-10 pb-8 px-4 text-center">
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-[#D4A373] uppercase mb-1">Família da Alegria</h1>
        <p className="text-[9px] uppercase tracking-[0.3em] text-gray-500 font-bold">
           <span className="text-emerald-500">Natal</span> Bragança City
        </p>
      </header>

      {/* BLOCO PRINCIPAL: SALDOS E META (COMPACTO) */}
      <div className="max-w-5xl mx-auto px-4 mb-6">
        <div className="bg-[#121418] rounded-[30px] p-6 shadow-2xl border border-gray-800">
          
          <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-6 mb-6">
            <div className="text-center md:text-left w-full md:w-auto">
              <p className="text-[10px] text-[#D4A373] font-black uppercase tracking-widest mb-1">Saldo em Caixa Atual</p>
              <h1 className="text-4xl md:text-5xl font-black text-emerald-400 tracking-tighter">R$ {saldoAtual.toLocaleString('pt-BR')}</h1>
            </div>
            
            <div className="bg-[#1A1D23] p-4 rounded-2xl border border-gray-800 flex flex-row gap-4 w-full md:w-auto justify-center md:justify-start">
              <div className="text-center md:text-left">
                <p className="text-[8px] text-gray-500 font-black uppercase mb-1 tracking-widest">Arrecadado</p>
                <p className="text-lg font-black text-white">R$ {totalArrecadado.toLocaleString('pt-BR')}</p>
              </div>
              <div className="border-l border-gray-700 pl-4 text-center md:text-left">
                <p className="text-[8px] text-emerald-600 font-black uppercase mb-1 tracking-widest">Rendimento</p>
                <p className="text-lg font-black text-emerald-500">+ R$ {totalRendimentos.toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-800">
             <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-0.5">Meta Bragança</p>
                  <p className="text-sm font-bold text-gray-300">R$ {metaGlobalBragança.toLocaleString('pt-BR')}</p>
                </div>
                <p className="text-lg font-black text-emerald-400">{( (totalArrecadado/metaGlobalBragança)*100 ).toFixed(1)}%</p>
             </div>
             <div className="w-full bg-[#0B0C10] h-2 rounded-full overflow-hidden border border-gray-800">
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full transition-all duration-1000" style={{ width: `${(totalArrecadado/metaGlobalBragança)*100}%` }}></div>
             </div>
          </div>
        </div>
      </div>

      {/* EVOLUÇÃO MENSAL: CARDS RESPONSIVOS E COLORIDOS */}
      <div className="max-w-5xl mx-auto px-4 mb-8">
         <div className="flex items-center gap-4 mb-4 ml-2">
            <h2 className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Evolução Mensal</h2>
            <div className="h-[1px] bg-gray-800 flex-1"></div>
         </div>
         
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
           {dadosEvolucao.map(item => (
             <div key={item.mesAbbr} onClick={() => setSelectedMonth(item.mesAbbr)} className="bg-[#121418] border border-gray-800 p-4 rounded-2xl cursor-pointer hover:border-gray-600 transition-colors group">
               
               <div className="flex justify-between items-center mb-3 border-b border-gray-800 pb-2">
                 <span className="text-lg font-black uppercase tracking-widest text-gray-200 group-hover:text-white transition-colors">{item.mesAbbr}</span>
                 <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${item.arrec >= item.meta ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[#1A1D23] text-gray-500 border border-gray-800'}`}>
                   {item.arrec > 0 ? `${((item.arrec/item.meta)*100).toFixed(0)}%` : '0%'}
                 </span>
               </div>
               
               <div className="space-y-1.5 mb-3">
                 <div className="flex justify-between items-center text-[10px]">
                   <span className="text-gray-500 font-bold uppercase tracking-wider">Família</span>
                   <span className="font-black text-white">{item.arrec > 0 ? `R$ ${item.arrec.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '—'}</span>
                 </div>
                 <div className="flex justify-between items-center text-[10px]">
                   <span className="text-gray-500 font-bold uppercase tracking-wider">Rend.</span>
                   <span className="font-black text-emerald-500">{item.rendM > 0 ? `+ R$ ${item.rendM.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '—'}</span>
                 </div>
                 <div className="flex justify-between items-center text-[10px]">
                   <span className="text-gray-500 font-bold uppercase tracking-wider">Saídas</span>
                   <span className="font-black text-rose-500">{item.saidaM > 0 ? `- R$ ${item.saidaM.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '—'}</span>
                 </div>
               </div>
               
               <div className="pt-2 border-t border-gray-800 flex justify-between items-end">
                 <span className="text-[9px] uppercase tracking-widest text-sky-500 font-black">Caixa Mês</span>
                 <span className="text-sm font-black text-sky-400">R$ {item.saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
               </div>
             </div>
           ))}
         </div>
      </div>

      {/* BLOCOS INFERIORES: MEMBROS, EXTRATOS, FLUXO */}
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA 1: MEMBROS */}
        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Membros & Metas</h2>
          {gruposDef.map((g, gIdx) => {
            const expectCount = g.nomes.filter(n => n !== 'Manu' || isManuActive(mesAtualFull)).length;
            const paidCount = g.nomes.filter(n => historico.some(h => h.membros?.nome === n && h.mes === mesAtualFull)).length;
            
            return (
              <div key={gIdx} className="bg-[#121418] border border-gray-800 rounded-2xl overflow-hidden">
                <button onClick={() => setExpandedGrupo(expandedGrupo === gIdx ? null : gIdx)} className="w-full p-4 flex justify-between items-center hover:bg-[#1A1D23] transition-colors">
                  <div className="text-left">
                    <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-200">{g.titulo}</h2>
                    <p className={`text-[8px] font-bold uppercase mt-1 tracking-widest ${paidCount === expectCount ? 'text-emerald-500' : 'text-gray-500'}`}>
                      {paidCount} de {expectCount} pagos
                    </p>
                  </div>
                  <span className="text-[#D4A373] font-light text-xl">{expandedGrupo === gIdx ? '−' : '+'}</span>
                </button>
                <div className={`transition-all duration-300 ${expandedGrupo === gIdx ? 'max-h-[800px]' : 'max-h-0'} overflow-hidden`}>
                  <div className="p-4 pt-0 space-y-2 border-t border-gray-800 mx-4">
                    {g.nomes.map(nome => {
                      const m = membros.find(x => x.nome === nome);
                      const pg = m ? calcPago(m.id) : 0;
                      const meta = getMetaInd(nome);
                      return (
                        <div key={nome} onClick={() => m && setSelectedMembroId(m.id)} className="py-2 flex justify-between items-center border-b border-gray-800/50 last:border-0 cursor-pointer hover:pl-1 transition-all">
                          <span className="font-bold text-[10px] uppercase text-gray-400 tracking-wider">{nome}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-white">R$ {pg}</span>
                            <div className={`h-[6px] w-[6px] rounded-full ${pg >= meta ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-gray-700'}`}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* COLUNA 2: EXTRATOS */}
        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Documentos</h2>
          <div className="bg-[#121418] border border-gray-800 rounded-2xl p-5 min-h-[120px] flex flex-col justify-between">
            <div className="space-y-2">
              {docs.slice(0, 5).map(d => (
                <a key={d.id} href={d.url_arquivo} download target="_blank" className="flex justify-between items-center p-3 bg-[#1A1D23] rounded-xl border border-gray-800 hover:border-sky-500/30 transition-colors group">
                  <span className="text-[9px] font-bold text-gray-300 uppercase truncate pr-2 tracking-widest group-hover:text-white">{d.nome_exibicao}</span>
                  <span className="text-sky-400 font-black text-sm">↓</span>
                </a>
              ))}
            </div>
            
            {docs.length > 5 && (
              <button onClick={() => setShowAllDocs(true)} className="w-full mt-4 py-2.5 bg-[#1A1D23] rounded-xl border border-gray-800 text-[9px] font-black text-sky-400 uppercase tracking-widest hover:bg-gray-800 transition-colors">
                Ver Todos ({docs.length})
              </button>
            )}
          </div>
        </div>

        {/* COLUNA 3: MOVIMENTAÇÕES */}
        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Fluxo de Caixa</h2>
          <div className="bg-[#121418] border border-gray-800 rounded-2xl p-5 min-h-[120px] flex flex-col justify-between">
            <div className="space-y-3">
              {saidas.slice(0, 4).map(s => (
                <div key={s.id} className="pb-3 border-b border-gray-800 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start mb-1.5">
                     <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest ${s.tipo === 'rendimento' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                       {s.mes} • {s.tipo === 'rendimento' ? 'IN' : 'OUT'}
                     </span>
                     <span className={`text-[10px] font-black ${s.tipo === 'rendimento' ? 'text-emerald-400' : 'text-rose-400'}`}>
                       {s.tipo === 'rendimento' ? '+' : '-'} R$ {s.valor}
                     </span>
                  </div>
                  <p className="text-[9px] font-bold text-gray-400 tracking-wider uppercase truncate">{s.descricao}</p>
                </div>
              ))}
            </div>
            
            {saidas.length > 4 && (
               <button onClick={() => setShowAllMovimentacoes(true)} className="w-full mt-4 py-2.5 bg-[#1A1D23] rounded-xl border border-gray-800 text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-white hover:bg-gray-800 transition-colors">
                 Registro Completo ({saidas.length})
               </button>
            )}
          </div>
        </div>
      </div>

      {/* MODAL MOVIMENTAÇÕES */}
      {showAllMovimentacoes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121418] border border-gray-800 rounded-[30px] w-full max-w-md p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <div>
                 <h2 className="text-[11px] font-black text-white uppercase tracking-widest">Fluxo de Caixa</h2>
                 <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-1">Registro Completo</p>
              </div>
              <button onClick={() => setShowAllMovimentacoes(false)} className="text-gray-600 hover:text-rose-500 font-black text-2xl leading-none transition-colors">×</button>
            </div>
            
            <div className="overflow-y-auto pr-2 space-y-4 flex-1 scrollbar-hide">
              {saidas.map(s => (
                <div key={s.id} className="pb-3 border-b border-gray-800 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start mb-1.5">
                     <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${s.tipo === 'rendimento' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                       {s.mes} • {s.tipo === 'rendimento' ? 'IN' : 'OUT'}
                     </span>
                     <span className={`text-[11px] font-black ${s.tipo === 'rendimento' ? 'text-emerald-400' : 'text-rose-400'}`}>
                       {s.tipo === 'rendimento' ? '+' : '-'} R$ {s.valor}
                     </span>
                  </div>
                  <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">{s.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXTRATOS */}
      {showAllDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121418] border border-gray-800 rounded-[30px] w-full max-w-md p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <div>
                 <h2 className="text-[11px] font-black text-sky-400 uppercase tracking-widest">Documentação</h2>
                 <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-1">Todos os Extratos</p>
              </div>
              <button onClick={() => setShowAllDocs(false)} className="text-gray-600 hover:text-rose-500 font-black text-2xl leading-none transition-colors">×</button>
            </div>
            
            <div className="overflow-y-auto pr-2 space-y-2 flex-1 scrollbar-hide">
              {docs.map(d => (
                <a key={d.id} href={d.url_arquivo} download target="_blank" className="flex justify-between items-center p-4 bg-[#1A1D23] rounded-xl border border-gray-800 hover:border-sky-500/50 transition-all group">
                  <div className="flex flex-col gap-1">
                     <span className="text-[10px] font-bold text-white uppercase truncate tracking-widest group-hover:text-sky-400 transition-colors">{d.nome_exibicao}</span>
                     <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Ref: {d.mes}</span>
                  </div>
                  <span className="text-sky-500 font-black text-lg pl-4 transition-transform group-hover:translate-y-1">↓</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const container = document.getElementById('root');
if (container) { createRoot(container).render(<App />); }
export default App;
