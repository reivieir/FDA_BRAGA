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

  // --- RENDERS ---

  // TELA 1: DETALHE DO MÊS
  if (selectedMonth) {
    const mesDb = mesesMap[selectedMonth] || selectedMonth;
    const pagsMes = historico.filter(p => (p.mes_caixa || p.mes) === mesDb);
    const arrecMes = pagsMes.reduce((acc, p) => acc + Number(p.valor), 0);
    const rendMes = rendimentosConta.filter(r => r.mes === mesDb).reduce((acc, r) => acc + Number(r.valor), 0);
    const saidaMes = saidasReais.filter(s => s.mes === mesDb).reduce((acc, s) => acc + Number(s.valor), 0);
    const pagantesUnicosCount = new Set(pagsMes.map(p => p.membro_id)).size;
    const totalEsperadoMes = isManuActive(mesDb) ? 27 : 26; 

    return (
      <div className="min-h-screen bg-[#09090B] p-6 font-sans text-zinc-100">
        <button onClick={() => setSelectedMonth(null)} className="mb-8 font-bold text-[#E5B582] uppercase text-xs tracking-widest hover:text-white transition-colors">← Voltar</button>
        <div className="max-w-xl mx-auto bg-[#18181B] p-8 rounded-3xl shadow-xl border border-white/5 border-b-4 border-b-rose-500 text-center">
          <h2 className="text-4xl font-black uppercase tracking-tighter text-zinc-100">{selectedMonth}</h2>
          <div className="mt-6 border-t border-white/10 pt-6 flex justify-between items-end">
            <div className="text-left">
              <p className="text-[11px] text-zinc-400 uppercase font-bold tracking-wider mb-1">Saldo Período</p>
              <p className="text-2xl font-black text-emerald-400">R$ {(arrecMes + rendMes - saidaMes).toLocaleString('pt-BR')}</p>
              <p className="text-xs text-[#E5B582] font-bold uppercase mt-1">
                {pagantesUnicosCount} PIXs (de {totalEsperadoMes})
              </p>
            </div>
            <div className="text-right flex flex-col gap-1">
              <p className="text-xs text-emerald-400 font-bold uppercase">Rendimentos: R$ {rendMes}</p>
              <p className="text-xs text-rose-400 font-bold uppercase">Saída: R$ {saidaMes}</p>
              <p className="text-xs font-bold text-zinc-400 mt-2">Meta Caixa: R$ {getMetaMensal(mesDb)}</p>
            </div>
          </div>
        </div>
        <div className="max-w-xl mx-auto mt-6 space-y-3">
            {pagsMes.map(p => (
              <div key={p.id} className="bg-[#18181B] p-5 rounded-2xl flex justify-between items-center border border-white/5 shadow-sm">
                <div>
                  <span className="font-bold text-zinc-200 uppercase text-sm block">{p.membros?.nome}</span>
                  {p.mes !== mesDb && <span className="text-[10px] text-rose-400 uppercase font-bold tracking-wider">Ref. parcela de {p.mes}</span>}
                </div>
                <span className="font-black text-emerald-400 text-base">R$ {p.valor}</span>
              </div>
            ))}
        </div>
      </div>
    );
  }

  // TELA 2: DETALHE DO MEMBRO
  if (selectedMembroId) {
    const m = membros.find(x => x.id === selectedMembroId);
    const pags = historico.filter(h => h.membro_id === selectedMembroId);
    const pagoAcumulado = calcPago(selectedMembroId);
    const metaMembro = getMetaInd(m?.nome || '');
    const pagouMes = pags.some(p => p.mes === mesAtualFull);
    const statusText = pagouMes ? "✨ Até que enfim pagou" : diaDoMes > 15 ? "⚠️ Paga o que deve caloteiro" : "⏳ Aguardando Pix até dia 15";
    const statusColor = pagouMes ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : diaDoMes > 15 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-sky-500/10 text-sky-400 border border-sky-500/20';

    return (
      <div className="min-h-screen bg-[#09090B] p-6 font-sans text-zinc-100">
        <button onClick={() => setSelectedMembroId(null)} className="mb-8 font-bold text-[#E5B582] uppercase text-xs tracking-widest hover:text-white transition-colors">← Voltar</button>
        <div className="max-w-xl mx-auto bg-[#18181B] p-8 rounded-3xl shadow-xl border border-white/5 border-b-4 border-b-emerald-500">
          <h2 className="text-3xl font-black uppercase text-zinc-100 tracking-tighter">{m?.nome}</h2>
          <div className={`mt-4 p-4 rounded-xl text-center font-bold uppercase text-xs tracking-wider ${statusColor}`}>{statusText}</div>
          <div className="flex justify-between mt-8 text-sm font-bold">
            <span className="text-emerald-400 font-black text-2xl">R$ {pagoAcumulado}</span>
            <span className="text-zinc-400 pt-2 uppercase text-xs tracking-wide">Meta Natal R$ {metaMembro}</span>
          </div>
          <div className="w-full bg-[#27272A] h-3 rounded-full mt-3 overflow-hidden">
             <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${Math.min((pagoAcumulado/metaMembro)*100, 100)}%` }}></div>
          </div>
          <div className="mt-8 space-y-3">
            {pags.map(p => (
              <div key={p.id} className="flex justify-between items-center p-5 bg-[#27272A] rounded-2xl border border-white/5">
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-zinc-300 uppercase text-sm tracking-wide">Ref: {p.mes}</span>
                  {(p.mes_caixa && p.mes_caixa !== p.mes) && <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Pago em: {p.mes_caixa}</span>}
                </div>
                <span className="font-black text-emerald-400 text-base">R$ {p.valor}</span>
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
      <div className="p-4 bg-[#09090B] min-h-screen font-sans pb-20 text-zinc-100">
        <div className="flex justify-between items-center mb-8 max-w-2xl mx-auto">
           <button onClick={() => setIsAdmin(false)} className="text-[#E5B582] font-bold text-xs uppercase tracking-widest hover:text-white transition-colors">← Voltar ao Site</button>
           
           <div className="flex gap-3">
             <div className="flex flex-col text-right">
                <span className="text-[9px] text-zinc-500 font-black uppercase mb-1 tracking-wider">Referente a (Dívida)</span>
                <select className="p-2 border border-[#27272A] rounded-xl text-xs font-bold bg-[#18181B] text-zinc-200 outline-none focus:border-[#E5B582]" value={mesGlobal} onChange={e => setMesGlobal(e.target.value)}>
                  {Object.values(mesesMap).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
             </div>
             <div className="flex flex-col text-right">
                <span className="text-[9px] text-emerald-500 font-black uppercase mb-1 tracking-wider">Caiu no banco em</span>
                <select className="p-2 border border-emerald-500/50 rounded-xl text-xs font-bold bg-[#18181B] text-zinc-200 outline-none focus:border-emerald-500" value={mesCaixaGlobal} onChange={e => setMesCaixaGlobal(e.target.value)}>
                  {Object.values(mesesMap).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
             </div>
           </div>
        </div>

        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Box Auditoria */}
          <div className="bg-[#18181B] p-6 rounded-3xl shadow-xl border border-white/5 border-b-4 border-b-sky-500">
            <h2 className="text-xs font-black uppercase mb-5 tracking-widest text-sky-400">1. Subir Extrato Banco</h2>
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <input type="text" placeholder="Nome do arquivo" className="flex-1 p-3 rounded-xl bg-[#09090B] border border-[#27272A] text-zinc-200 text-xs outline-none focus:border-sky-500" value={nomeDoc} onChange={e => setNomeDoc(e.target.value)} />
              <input type="file" className="w-full md:w-auto text-xs pt-3 text-zinc-400" onChange={e => setFileToUpload(e.target.files?.[0] || null)} />
              <button onClick={handleUpload} className="bg-sky-600 hover:bg-sky-500 text-white px-6 py-3 rounded-xl text-xs font-black tracking-wider transition-colors">SUBIR</button>
            </div>
            {docs.map(d => (
              <div key={d.id} className="flex justify-between items-center bg-[#27272A] p-3 rounded-xl text-[11px] mb-2 font-bold text-zinc-300">
                <span>{d.mes}: <span className="text-zinc-100">{d.nome_exibicao}</span></span>
                <button onClick={() => excluirDoc(d.id, d.url_arquivo)} className="text-rose-400 hover:text-rose-300 font-black px-2">X</button>
              </div>
            ))}
          </div>

          {/* Box Movimentação */}
          <div className="bg-[#18181B] p-6 rounded-3xl shadow-xl border border-white/5 border-b-4 border-b-rose-500">
            <h2 className="text-xs font-black uppercase mb-5 tracking-widest text-zinc-200">2. Fluxo da Conta Bancária</h2>
            
            <div className="flex gap-2 mb-4">
              <button onClick={() => setTipoFluxo('saida')} className={`flex-1 p-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors ${tipoFluxo === 'saida' ? 'bg-rose-500 text-white' : 'bg-[#27272A] text-zinc-400 hover:bg-[#3f3f46]'}`}>Saída (Gasto)</button>
              <button onClick={() => setTipoFluxo('rendimento')} className={`flex-1 p-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors ${tipoFluxo === 'rendimento' ? 'bg-emerald-500 text-white' : 'bg-[#27272A] text-zinc-400 hover:bg-[#3f3f46]'}`}>Rendimento</button>
            </div>

            <input type="text" placeholder="Descrição (ex: Rendimento CDB)" className="w-full p-3 rounded-xl bg-[#09090B] border border-[#27272A] text-zinc-200 text-sm mb-3 outline-none focus:border-zinc-500" value={descSaida} onChange={e => setDescSaida(e.target.value)} />
            <div className="flex gap-2">
                <input type="number" placeholder="R$ Valor" className="w-1/2 p-3 rounded-xl bg-[#09090B] border border-[#27272A] text-zinc-200 text-sm font-bold outline-none focus:border-zinc-500" value={valorSaida} onChange={e => setValorSaida(e.target.value)} />
                <button onClick={lancarMovimentacao} className="w-1/2 bg-[#E5B582] hover:bg-[#D4A373] text-[#09090B] font-black rounded-xl text-xs uppercase tracking-wider transition-colors">Registrar</button>
            </div>
            
            <div className="mt-6 space-y-2 border-t border-white/10 pt-4 max-h-[250px] overflow-y-auto pr-2">
               {saidas.map(s => (
                 <div key={s.id} className="flex justify-between items-center text-[11px] bg-[#09090B] p-3 rounded-xl border border-white/5">
                   <div className="flex items-center gap-3">
                     <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider ${s.tipo === 'rendimento' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                       {s.tipo === 'rendimento' ? 'ENTRADA' : 'SAÍDA'}
                     </span>
                     <span className="text-zinc-300 font-bold">{s.mes} • {s.descricao}</span>
                   </div>
                   <div className="flex items-center gap-3">
                     <span className={`font-black ${s.tipo === 'rendimento' ? 'text-emerald-400' : 'text-rose-400'}`}>R$ {s.valor}</span>
                     <button onClick={() => excluirItem(s.id, 'saidas_caixa')} className="text-rose-500 hover:text-rose-400 font-black">X</button>
                   </div>
                 </div>
               ))}
            </div>
          </div>

          {/* Box Grupos */}
          {gruposDef.map((g, idx) => (
            <div key={idx} className="bg-[#18181B] p-6 rounded-3xl shadow-xl border border-white/5">
              <h2 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">{g.titulo}</h2>
              <select className="w-full p-3 border border-[#27272A] rounded-xl mb-5 bg-[#09090B] text-zinc-200 text-sm font-bold outline-none focus:border-[#E5B582]" value={filtrosGrupos[idx]} onChange={e => setFiltrosGrupos({...filtrosGrupos, [idx]: e.target.value})}>
                <option value="Todos">Lançar Novo PIX...</option>
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
                      <div key={m.id} className="flex items-center gap-3 border-t border-white/5 pt-3">
                        <span className="text-[11px] font-black w-24 truncate uppercase text-zinc-300 tracking-wider">{m.nome}</span>
                        <input type="number" placeholder="R$" className="flex-1 p-3 bg-[#09090B] border border-[#27272A] rounded-xl text-xs font-bold text-zinc-200 outline-none focus:border-emerald-500" value={valoresLote[m.id] || ''} onChange={e => setValoresLote({...valoresLote, [m.id]: e.target.value})} />
                        <button onClick={() => lancarPagamento(m.id, valoresLote[m.id])} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl text-[10px] font-black tracking-wider transition-colors">OK</button>
                      </div>
                    );
                  } else {
                    return historico.filter(h => h.membro_id === m.id).map(p => (
                      <div key={p.id} className="flex justify-between items-center p-4 bg-[#27272A] rounded-xl border border-white/5 mt-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-bold text-zinc-200 tracking-wider uppercase">Ref: {p.mes}</span>
                          {(p.mes_caixa && p.mes_caixa !== p.mes) && <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Caiu em: {p.mes_caixa}</span>}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-black text-emerald-400">R$ {p.valor}</span>
                          <button onClick={() => excluirItem(p.id, 'pagamentos_detalhes')} className="text-rose-500 hover:text-rose-400 font-black text-xs uppercase tracking-wider">Excluir</button>
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
    <div className="min-h-screen bg-[#09090B] p-4 md:p-8 font-sans text-zinc-100 relative selection:bg-[#E5B582] selection:text-black">
      
      {/* NOVO LOGIN (CADEADO) NO CANTO SUPERIOR DIREITO */}
      <div className="absolute top-4 right-4 md:top-8 md:right-8 z-40">
        {!showLogin ? (
           <button onClick={() => setShowLogin(true)} className="text-zinc-500 hover:text-[#E5B582] transition-colors p-3 bg-[#18181B] rounded-full border border-white/5 hover:border-[#E5B582]/30" title="Acesso Admin">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z"></path></svg>
           </button>
        ) : (
           <div className="flex items-center gap-3 bg-[#18181B] p-2 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md">
              <input type="password" placeholder="Senha" className="p-3 w-32 border border-[#27272A] bg-[#09090B] text-xs font-bold rounded-xl text-white focus:outline-none focus:border-[#E5B582] transition-colors" value={senha} onChange={e => {
                 setSenha(e.target.value);
                 if (e.target.value === '041252') { setIsAdmin(true); setShowLogin(false); setSenha(''); }
              }} autoFocus />
              <button onClick={() => setShowLogin(false)} className="text-zinc-500 hover:text-rose-400 font-black px-2 text-sm transition-colors">X</button>
           </div>
        )}
      </div>

      {/* CABEÇALHO */}
      <header className="text-center mb-10 pt-6 md:pt-2">
        <h1 className="text-4xl md:text-5xl font-black text-[#E5B582] uppercase tracking-tighter mb-2">
          Família da Alegria
        </h1>
        <p className="text-[10px] md:text-xs font-black tracking-[0.4em] uppercase text-zinc-500">
          <span className="text-emerald-400">Natal</span> Bragança City
        </p>
      </header>

      {/* BLOCO PRINCIPAL: SALDOS E META */}
      <div className="max-w-4xl mx-auto bg-[#18181B] rounded-[40px] p-8 shadow-2xl border border-white/5 mb-8">
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
          <div className="flex-1">
            <p className="text-[11px] text-[#E5B582] font-black uppercase tracking-widest mb-2">Saldo em Caixa Atual</p>
            <h1 className="text-5xl md:text-7xl font-black text-emerald-400 tracking-tighter">R$ {saldoAtual.toLocaleString('pt-BR')}</h1>
          </div>
          <div className="bg-[#27272A] p-5 rounded-3xl border border-white/5 self-start md:self-center flex flex-col sm:flex-row gap-6">
            <div>
              <p className="text-[9px] text-zinc-400 font-black uppercase mb-1 tracking-wider">Arrecadado Família</p>
              <p className="text-xl font-black text-zinc-100">R$ {totalArrecadado.toLocaleString('pt-BR')}</p>
            </div>
            <div className="border-t sm:border-t-0 sm:border-l border-white/10 pt-4 sm:pt-0 sm:pl-6">
              <p className="text-[9px] text-emerald-500 font-black uppercase mb-1 tracking-wider">Rendimento Bancário</p>
              <p className="text-xl font-black text-emerald-400">+ R$ {totalRendimentos.toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </div>

        <div className="mb-10">
           <div className="flex justify-between items-end mb-3">
              <div>
                <p className="text-[10px] text-zinc-400 font-black uppercase tracking-wider mb-1">Meta Global Bragança</p>
                <p className="text-2xl font-black text-zinc-200">R$ {metaGlobalBragança.toLocaleString('pt-BR')}</p>
              </div>
              <p className="text-2xl font-black text-emerald-400">{( (totalArrecadado/metaGlobalBragança)*100 ).toFixed(1)}%</p>
           </div>
           <div className="w-full bg-[#09090B] h-4 rounded-full overflow-hidden border border-white/5">
              <div className="bg-emerald-400 h-full transition-all duration-1000 relative overflow-hidden" style={{ width: `${(totalArrecadado/metaGlobalBragança)*100}%` }}>
                <div className="absolute inset-0 bg-white/20 w-full h-full animate-pulse"></div>
              </div>
           </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-8">
           <h2 className="text-[11px] text-zinc-400 font-black uppercase tracking-widest mb-6">Evolução Mensal</h2>
           <div className="overflow-x-auto -mx-8 px-8">
             <table className="w-full text-left border-collapse min-w-[400px]">
               <thead>
                 <tr className="border-b border-[#27272A] text-[10px] text-zinc-500 font-black uppercase tracking-wider">
                   <th className="pb-4 pl-2">Mês</th>
                   <th className="pb-4 text-zinc-300">Família</th>
                   <th className="pb-4 text-emerald-500">Rendimento</th>
                   <th className="pb-4 text-rose-400">Saída</th>
                   <th className="pb-4 text-sky-400">Caixa Mês</th>
                   <th className="pb-4 text-right pr-2">Status (%)</th>
                 </tr>
               </thead>
               <tbody className="text-[12px] font-bold text-zinc-200">
                 {dadosEvolucao.map(item => (
                   <tr key={item.mesAbbr} onClick={() => setSelectedMonth(item.mesAbbr)} className="border-b border-[#27272A]/50 hover:bg-white/5 transition-colors cursor-pointer">
                     <td className="py-5 pl-2 text-zinc-400 tracking-wide">{item.mesAbbr}</td>
                     <td className="py-5 text-emerald-400">{item.arrec > 0 ? `R$ ${item.arrec.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '—'}</td>
                     <td className="py-5 text-emerald-600">{item.rendM > 0 ? `+ R$ ${item.rendM.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '—'}</td>
                     <td className="py-5 text-rose-400">{item.saidaM > 0 ? `- R$ ${item.saidaM.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '—'}</td>
                     <td className="py-5 text-sky-400">R$ {item.saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                     <td className={`py-5 text-right pr-2 ${item.arrec >= item.meta ? 'text-emerald-400' : 'text-zinc-500'}`}>
                       {item.arrec > 0 ? `${((item.arrec/item.meta)*100).toFixed(0)}%` : '—'}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24">
        
        {/* COLUNA 1: MEMBROS E METAS */}
        <div className="space-y-4">
          <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest ml-2">Membros e Metas</h2>
          {gruposDef.map((g, gIdx) => {
            const expectCount = g.nomes.filter(n => n !== 'Manu' || isManuActive(mesAtualFull)).length;
            return (
              <div key={gIdx} className="bg-[#18181B] rounded-3xl border border-white/5 overflow-hidden shadow-lg transition-all">
                <button onClick={() => setExpandedGrupo(expandedGrupo === gIdx ? null : gIdx)} className="w-full p-5 flex justify-between items-center hover:bg-white/5 transition-colors">
                  <div className="text-left">
                    <h2 className="text-sm font-black text-zinc-200 uppercase tracking-wide">{g.titulo}</h2>
                    <p className="text-[9px] font-bold text-zinc-500 uppercase mt-1 tracking-widest">
                      {g.nomes.filter(n => historico.some(h => h.membros?.nome === n && h.mes === mesAtualFull)).length} de {expectCount} pagos no mês
                    </p>
                  </div>
                  <span className="text-[#E5B582] text-xl font-light">{expandedGrupo === gIdx ? '−' : '+'}</span>
                </button>
                <div className={`transition-all duration-300 ${expandedGrupo === gIdx ? 'max-h-[800px] p-5 pt-0' : 'max-h-0'} overflow-hidden`}>
                  <div className="grid grid-cols-1 gap-2 pt-2 border-t border-white/5">
                    {g.nomes.map(nome => {
                      const m = membros.find(x => x.nome === nome);
                      const pg = m ? calcPago(m.id) : 0;
                      const meta = getMetaInd(nome);
                      return (
                        <div key={nome} onClick={() => m && setSelectedMembroId(m.id)} className="bg-[#09090B] p-4 rounded-xl flex justify-between items-center border border-white/5 hover:border-white/10 cursor-pointer transition-colors">
                          <span className="font-bold text-[11px] uppercase text-zinc-300 tracking-wider">{nome}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-black text-emerald-400">R$ {pg}</span>
                            <div className={`h-2 w-2 rounded-full ${pg >= meta ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-[#27272A]'}`}></div>
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
          <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest ml-2">Auditoria e Extratos</h2>
          <div className="bg-[#18181B] rounded-[30px] p-6 border border-white/5 min-h-[120px] flex flex-col justify-between shadow-lg">
            <div>
              {docs.slice(0, 5).map(d => (
                <a key={d.id} href={d.url_arquivo} download target="_blank" className="flex justify-between items-center p-4 mb-2 bg-[#09090B] rounded-xl border border-white/5 hover:bg-white/5 transition-colors group">
                  <span className="text-[11px] font-bold text-zinc-300 uppercase truncate pr-4 tracking-wider group-hover:text-sky-400 transition-colors">{d.nome_exibicao}</span>
                  <span className="text-sky-500 font-black text-lg">↓</span>
                </a>
              ))}
            </div>
            
            {docs.length > 5 && (
              <button onClick={() => setShowAllDocs(true)} className="w-full mt-4 py-3 border border-sky-500/30 rounded-xl text-[10px] font-black text-sky-400 uppercase tracking-widest hover:bg-sky-500/10 transition-colors">
                Ver Todos os Extratos ({docs.length})
              </button>
            )}
          </div>
        </div>

        {/* COLUNA 3: MOVIMENTAÇÕES */}
        <div className="space-y-4">
          <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest ml-2">Fluxo da Conta</h2>
          <div className="bg-[#18181B] rounded-[30px] p-6 border border-white/5 min-h-[120px] flex flex-col justify-between shadow-lg">
            <div>
              {saidas.slice(0, 5).map(s => (
                <div key={s.id} className="mb-4 border-b border-[#27272A] pb-4 last:border-0 last:mb-0 last:pb-0">
                  <div className="flex justify-between items-start mb-2">
                     <span className={`${s.tipo === 'rendimento' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'} px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-wider`}>
                       {s.mes} • {s.tipo === 'rendimento' ? 'ENTRADA' : 'SAÍDA'}
                     </span>
                     <span className={`text-xs font-black ${s.tipo === 'rendimento' ? 'text-emerald-400' : 'text-rose-400'}`}>
                       {s.tipo === 'rendimento' ? '+' : '-'} R$ {s.valor}
                     </span>
                  </div>
                  <p className="text-[11px] font-bold text-zinc-400 leading-snug">{s.descricao}</p>
                </div>
              ))}
            </div>
            
            {saidas.length > 5 && (
              <button onClick={() => setShowAllMovimentacoes(true)} className="w-full mt-5 py-3 border border-white/10 rounded-xl text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:bg-white/5 hover:text-zinc-200 transition-colors">
                Ver Histórico Completo ({saidas.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* POP-UP (MODAL) DO HISTÓRICO DE MOVIMENTAÇÕES */}
      {showAllMovimentacoes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-[#18181B] border border-white/10 rounded-[30px] w-full max-w-md p-8 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
              <h2 className="text-[11px] font-black text-zinc-200 uppercase tracking-widest">Histórico da Conta</h2>
              <button onClick={() => setShowAllMovimentacoes(false)} className="text-zinc-500 hover:text-rose-400 font-black text-2xl leading-none transition-colors">×</button>
            </div>
            
            <div className="overflow-y-auto pr-3 space-y-5 flex-1 scrollbar-hide">
              {saidas.map(s => (
                <div key={s.id} className="border-b border-[#27272A] pb-4 last:border-0">
                  <div className="flex justify-between items-start mb-2">
                     <span className={`${s.tipo === 'rendimento' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'} border px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-wider`}>
                       {s.mes} • {s.tipo === 'rendimento' ? 'ENTRADA' : 'SAÍDA'}
                     </span>
                     <span className={`text-sm font-black ${s.tipo === 'rendimento' ? 'text-emerald-400' : 'text-rose-400'}`}>
                       {s.tipo === 'rendimento' ? '+' : '-'} R$ {s.valor}
                     </span>
                  </div>
                  <p className="text-[12px] font-bold text-zinc-300">{s.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* POP-UP (MODAL) DE TODOS OS EXTRATOS */}
      {showAllDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-[#18181B] border border-white/10 rounded-[30px] w-full max-w-md p-8 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
              <h2 className="text-[11px] font-black text-sky-400 uppercase tracking-widest">Todos os Extratos</h2>
              <button onClick={() => setShowAllDocs(false)} className="text-zinc-500 hover:text-rose-400 font-black text-2xl leading-none transition-colors">×</button>
            </div>
            
            <div className="overflow-y-auto pr-3 space-y-3 flex-1 scrollbar-hide">
              {docs.map(d => (
                <a key={d.id} href={d.url_arquivo} download target="_blank" className="flex justify-between items-center p-4 bg-[#09090B] rounded-2xl border border-white/5 hover:border-sky-500/30 hover:bg-sky-500/5 transition-all group">
                  <div className="flex flex-col gap-1">
                     <span className="text-xs font-bold text-zinc-200 uppercase truncate tracking-wide group-hover:text-sky-400 transition-colors">{d.nome_exibicao}</span>
                     <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Ref: {d.mes}</span>
                  </div>
                  <span className="text-sky-500 font-black text-xl pl-4 group-hover:-translate-y-1 transition-transform">↓</span>
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
