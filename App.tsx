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
      <div className="min-h-screen bg-[#FAFAFA] p-6 font-sans text-black">
        <button onClick={() => setSelectedMonth(null)} className="mb-8 font-bold text-gray-400 uppercase text-xs tracking-widest hover:text-black transition-colors flex items-center gap-2">
          <span className="text-lg leading-none mb-1">←</span> Voltar
        </button>
        <div className="max-w-xl mx-auto bg-white p-8 md:p-12 border border-black shadow-sm relative">
          <div className="absolute -inset-2 border border-gray-200 -z-10 hidden md:block"></div>
          <h2 className="text-4xl font-light uppercase tracking-widest text-black mb-8">{selectedMonth}</h2>
          <div className="border-t border-black pt-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="text-left w-full">
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Saldo Período</p>
              <p className="text-3xl font-light text-black">R$ {(arrecMes + rendMes - saidaMes).toLocaleString('pt-BR')}</p>
              <p className="text-xs text-gray-400 uppercase tracking-widest mt-2 border-l-2 border-black pl-2">
                {pagantesUnicosCount} PIXs (de {totalEsperadoMes})
              </p>
            </div>
            <div className="text-left md:text-right flex flex-col gap-2 w-full md:w-auto border-t md:border-t-0 border-gray-200 pt-4 md:pt-0">
              <p className="text-xs text-green-700 uppercase tracking-wider"><span className="text-gray-400 mr-2">Rendimentos</span> R$ {rendMes}</p>
              <p className="text-xs text-red-600 uppercase tracking-wider"><span className="text-gray-400 mr-2">Saída</span> R$ {saidaMes}</p>
              <p className="text-xs font-bold text-black uppercase tracking-wider mt-2">Meta: R$ {getMetaMensal(mesDb)}</p>
            </div>
          </div>
        </div>
        <div className="max-w-xl mx-auto mt-12 space-y-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Detalhamento dos Lançamentos</p>
            {pagsMes.map(p => (
              <div key={p.id} className="bg-white p-5 flex justify-between items-center border border-gray-200 hover:border-black transition-colors">
                <div>
                  <span className="font-bold text-black uppercase text-xs tracking-widest block">{p.membros?.nome}</span>
                  {p.mes !== mesDb && <span className="text-[9px] text-red-500 uppercase tracking-widest mt-1 block">Ref. parcela de {p.mes}</span>}
                </div>
                <span className="font-light text-black text-lg">R$ {p.valor}</span>
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
    const statusColor = pagouMes ? 'bg-black text-white' : diaDoMes > 15 ? 'bg-red-600 text-white' : 'bg-gray-200 text-black';

    return (
      <div className="min-h-screen bg-[#FAFAFA] p-6 font-sans text-black">
        <button onClick={() => setSelectedMembroId(null)} className="mb-8 font-bold text-gray-400 uppercase text-xs tracking-widest hover:text-black transition-colors flex items-center gap-2">
          <span className="text-lg leading-none mb-1">←</span> Voltar
        </button>
        <div className="max-w-xl mx-auto bg-white p-8 md:p-12 border border-black relative">
          <div className="absolute -inset-2 border border-gray-200 -z-10 hidden md:block"></div>
          <div className="flex justify-between items-start mb-8">
             <h2 className="text-3xl font-light uppercase text-black tracking-widest">{m?.nome}</h2>
             <div className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest ${statusColor}`}>{statusText}</div>
          </div>
          
          <div className="border-t border-black pt-6 flex justify-between items-end">
            <div>
               <span className="text-[10px] text-gray-400 uppercase tracking-widest block mb-2">Total Contribuído</span>
               <span className="font-light text-4xl text-black">R$ {pagoAcumulado}</span>
            </div>
            <span className="text-xs uppercase tracking-widest text-gray-500 font-bold border-l-2 border-gray-200 pl-3 pb-1">Meta: R$ {metaMembro}</span>
          </div>
          
          <div className="w-full bg-gray-100 h-[2px] mt-8 overflow-hidden">
             <div className="bg-black h-full transition-all duration-1000" style={{ width: `${Math.min((pagoAcumulado/metaMembro)*100, 100)}%` }}></div>
          </div>
          
          <div className="mt-12 space-y-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Histórico de Pagamentos</p>
            {pags.map(p => (
              <div key={p.id} className="flex justify-between items-center p-5 bg-white border border-gray-200 hover:border-black transition-colors">
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-black uppercase text-xs tracking-widest">Ref: {p.mes}</span>
                  {(p.mes_caixa && p.mes_caixa !== p.mes) && <span className="text-[9px] text-gray-500 uppercase tracking-widest">Pago em: {p.mes_caixa}</span>}
                </div>
                <span className="font-light text-black text-lg">R$ {p.valor}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // TELA 3: ADMIN (Refinada para o estilo minimalista)
  if (isAdmin) {
    return (
      <div className="p-6 bg-[#FAFAFA] min-h-screen font-sans pb-20 text-black">
        <div className="flex justify-between items-center mb-12 max-w-4xl mx-auto border-b border-black pb-6">
           <button onClick={() => setIsAdmin(false)} className="font-bold text-gray-500 uppercase text-xs tracking-widest hover:text-black transition-colors flex items-center gap-2">
             <span className="text-lg leading-none mb-1">←</span> Sair
           </button>
           
           <div className="flex gap-4">
             <div className="flex flex-col text-right">
                <span className="text-[9px] text-gray-500 font-bold uppercase mb-2 tracking-widest">Referente a (Dívida)</span>
                <select className="p-2 border border-gray-300 text-xs font-bold bg-white text-black outline-none focus:border-black rounded-none" value={mesGlobal} onChange={e => setMesGlobal(e.target.value)}>
                  {Object.values(mesesMap).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
             </div>
             <div className="flex flex-col text-right">
                <span className="text-[9px] text-gray-500 font-bold uppercase mb-2 tracking-widest">Caiu no banco em</span>
                <select className="p-2 border border-gray-300 text-xs font-bold bg-white text-black outline-none focus:border-black rounded-none" value={mesCaixaGlobal} onChange={e => setMesCaixaGlobal(e.target.value)}>
                  {Object.values(mesesMap).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
             </div>
           </div>
        </div>

        <div className="space-y-12 max-w-4xl mx-auto">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
             {/* Box Auditoria */}
             <div className="bg-white p-8 border border-black relative">
               <h2 className="text-[10px] font-bold uppercase mb-8 tracking-widest text-gray-400">01. Subir Extrato</h2>
               <div className="flex flex-col gap-4 mb-6">
                 <input type="text" placeholder="Nome do arquivo" className="w-full p-3 border border-gray-200 text-black text-xs outline-none focus:border-black" value={nomeDoc} onChange={e => setNomeDoc(e.target.value)} />
                 <input type="file" className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-black hover:file:bg-gray-200 cursor-pointer" onChange={e => setFileToUpload(e.target.files?.[0] || null)} />
                 <button onClick={handleUpload} className="bg-black text-white px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors w-full mt-2">Enviar Documento</button>
               </div>
               <div className="space-y-2 mt-8 pt-6 border-t border-gray-100">
                 {docs.map(d => (
                   <div key={d.id} className="flex justify-between items-center bg-gray-50 p-3 text-[10px] border border-gray-100 uppercase tracking-wider">
                     <span className="text-gray-500">{d.mes}: <span className="text-black font-bold ml-1">{d.nome_exibicao}</span></span>
                     <button onClick={() => excluirDoc(d.id, d.url_arquivo)} className="text-red-500 font-bold px-2 hover:text-red-700">X</button>
                   </div>
                 ))}
               </div>
             </div>

             {/* Box Movimentação */}
             <div className="bg-white p-8 border border-black relative">
               <h2 className="text-[10px] font-bold uppercase mb-8 tracking-widest text-gray-400">02. Fluxo da Conta</h2>
               
               <div className="flex gap-2 mb-6">
                 <button onClick={() => setTipoFluxo('saida')} className={`flex-1 p-3 text-[9px] font-bold uppercase tracking-widest transition-colors border ${tipoFluxo === 'saida' ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'}`}>Saída</button>
                 <button onClick={() => setTipoFluxo('rendimento')} className={`flex-1 p-3 text-[9px] font-bold uppercase tracking-widest transition-colors border ${tipoFluxo === 'rendimento' ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'}`}>Rendimento</button>
               </div>

               <input type="text" placeholder="Descrição do lançamento" className="w-full p-3 bg-white border border-gray-200 text-black text-xs mb-4 outline-none focus:border-black" value={descSaida} onChange={e => setDescSaida(e.target.value)} />
               <div className="flex gap-2">
                   <input type="number" placeholder="R$ Valor" className="w-1/2 p-3 bg-white border border-gray-200 text-black text-xs font-bold outline-none focus:border-black" value={valorSaida} onChange={e => setValorSaida(e.target.value)} />
                   <button onClick={lancarMovimentacao} className="w-1/2 bg-black text-white font-bold text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-colors">Registrar</button>
               </div>
               
               <div className="mt-8 space-y-2 border-t border-gray-100 pt-6 max-h-[200px] overflow-y-auto pr-2">
                  {saidas.map(s => (
                    <div key={s.id} className="flex justify-between items-center text-[10px] bg-white p-3 border border-gray-100 uppercase tracking-wider">
                      <div className="flex items-center gap-3">
                        <span className={`font-bold ${s.tipo === 'rendimento' ? 'text-green-600' : 'text-red-500'}`}>
                          {s.tipo === 'rendimento' ? 'IN' : 'OUT'}
                        </span>
                        <span className="text-gray-500">{s.mes} • {s.descricao}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-black">R$ {s.valor}</span>
                        <button onClick={() => excluirItem(s.id, 'saidas_caixa')} className="text-red-500 font-bold hover:text-red-700">X</button>
                      </div>
                    </div>
                  ))}
               </div>
             </div>
          </div>

          {/* Box Grupos */}
          <div className="border-t border-black pt-12">
             <h2 className="text-[10px] font-bold uppercase mb-8 tracking-widest text-gray-400">03. Lançamento de PIX (Membros)</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gruposDef.map((g, idx) => (
                  <div key={idx} className="bg-white p-6 border border-gray-200">
                    <h2 className="text-xs font-bold text-black uppercase tracking-widest mb-6">{g.titulo}</h2>
                    <select className="w-full p-3 border border-gray-200 mb-6 bg-white text-gray-600 text-xs font-bold outline-none focus:border-black rounded-none uppercase tracking-wider" value={filtrosGrupos[idx]} onChange={e => setFiltrosGrupos({...filtrosGrupos, [idx]: e.target.value})}>
                      <option value="Todos">Selecionar Membro...</option>
                      {g.nomes.filter(n => n !== 'Manu' || isManuActive(mesGlobal)).map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <div className="space-y-4">
                      {g.nomes
                        .filter(n => n !== 'Manu' || isManuActive(mesGlobal))
                        .filter(n => filtrosGrupos[idx] === 'Todos' || filtrosGrupos[idx] === n)
                        .map(nome => {
                        const m = membros.find(x => x.nome === nome);
                        if (!m) return null;
                        if (filtrosGrupos[idx] === 'Todos') {
                          return (
                            <div key={m.id} className="flex items-center gap-2 border-t border-gray-100 pt-4">
                              <span className="text-[10px] font-bold w-20 truncate uppercase text-gray-500 tracking-wider">{m.nome}</span>
                              <input type="number" placeholder="R$" className="flex-1 p-2 bg-white border border-gray-200 text-xs font-bold text-black outline-none focus:border-black" value={valoresLote[m.id] || ''} onChange={e => setValoresLote({...valoresLote, [m.id]: e.target.value})} />
                              <button onClick={() => lancarPagamento(m.id, valoresLote[m.id])} className="bg-black text-white px-4 py-2 text-[9px] font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors">OK</button>
                            </div>
                          );
                        } else {
                          return historico.filter(h => h.membro_id === m.id).map(p => (
                            <div key={p.id} className="flex justify-between items-center p-4 bg-gray-50 border border-gray-200 mt-2">
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-black tracking-widest uppercase">Ref: {p.mes}</span>
                                {(p.mes_caixa && p.mes_caixa !== p.mes) && <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Caixa: {p.mes_caixa}</span>}
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-xs font-bold text-black">R$ {p.valor}</span>
                                <button onClick={() => excluirItem(p.id, 'pagamentos_detalhes')} className="text-red-500 hover:text-red-700 font-black text-xs uppercase tracking-wider">X</button>
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
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-black selection:bg-black selection:text-white pb-24">
      
      {/* NOVO LOGIN MINIMALISTA NO TOPO DIREITO */}
      <div className="absolute top-6 right-6 md:top-10 md:right-10 z-40">
        {!showLogin ? (
           <button onClick={() => setShowLogin(true)} className="text-gray-400 hover:text-black transition-colors" title="Acesso Restrito">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z"></path></svg>
           </button>
        ) : (
           <div className="flex items-center gap-0 bg-white border border-black shadow-sm">
              <input type="password" placeholder="SENHA" className="p-3 w-32 bg-transparent text-[10px] uppercase tracking-widest font-bold text-black outline-none placeholder:text-gray-300" value={senha} onChange={e => {
                 setSenha(e.target.value);
                 if (e.target.value === '041252') { setIsAdmin(true); setShowLogin(false); setSenha(''); }
              }} autoFocus />
              <button onClick={() => setShowLogin(false)} className="text-gray-400 hover:text-black font-bold px-4 text-xs transition-colors border-l border-gray-100">X</button>
           </div>
        )}
      </div>

      {/* CABEÇALHO EDITORIAL */}
      <header className="pt-16 pb-12 px-6 max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-end justify-between border-b border-black">
        <div>
           <p className="text-[9px] tracking-[0.4em] uppercase text-gray-400 mb-4">Dezembro 2026</p>
           <h1 className="text-4xl md:text-6xl font-light tracking-tighter text-black uppercase">Família da Alegria</h1>
        </div>
        <div className="text-left md:text-right mt-6 md:mt-0 flex flex-col gap-1 border-l-2 md:border-l-0 border-black pl-4 md:pl-0">
           <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Projeto Natal</p>
           <p className="text-sm uppercase tracking-widest text-black font-light">Bragança City</p>
        </div>
      </header>

      {/* BLOCO PRINCIPAL: SALDOS E META */}
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
        
        {/* Painel Principal de Saldo */}
        <div className="lg:col-span-2 relative group">
          <div className="absolute -top-3 -left-3 w-full h-full border border-gray-200 -z-10 hidden md:block transition-transform group-hover:translate-x-1 group-hover:translate-y-1"></div>
          <div className="bg-white border border-black p-8 md:p-14">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4">Saldo em Caixa Atual</p>
            <h1 className="text-5xl md:text-7xl font-light text-black tracking-tighter">R$ {saldoAtual.toLocaleString('pt-BR')}</h1>
            
            <div className="mt-16 pt-8 border-t border-gray-100">
               <div className="flex justify-between items-end mb-4">
                  <div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Meta Global Bragança</p>
                    <p className="text-xl font-light text-black">R$ {metaGlobalBragança.toLocaleString('pt-BR')}</p>
                  </div>
                  <p className="text-2xl font-light text-black">{( (totalArrecadado/metaGlobalBragança)*100 ).toFixed(1)}%</p>
               </div>
               <div className="w-full bg-gray-100 h-[2px] overflow-hidden relative">
                  <div className="bg-black h-full transition-all duration-1000" style={{ width: `${(totalArrecadado/metaGlobalBragança)*100}%` }}></div>
               </div>
            </div>
          </div>
        </div>

        {/* Caixas Secundárias */}
        <div className="flex flex-col gap-6 justify-between">
          <div className="bg-white border border-black p-8 flex-1 flex flex-col justify-center relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            </div>
            <p className="text-[9px] text-gray-500 font-bold uppercase mb-2 tracking-widest">Arrecadado Família</p>
            <p className="text-3xl font-light text-black">R$ {totalArrecadado.toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-white border border-black p-8 flex-1 flex flex-col justify-center border-l-4 border-l-black relative">
            <p className="text-[9px] text-gray-500 font-bold uppercase mb-2 tracking-widest">Rendimento Bancário</p>
            <p className="text-3xl font-light text-black">+ R$ {totalRendimentos.toLocaleString('pt-BR')}</p>
          </div>
        </div>
      </div>

      {/* EVOLUÇÃO MENSAL (AGORA EM CARDS RESPONSIVOS - Fim da Tabela que precisa arrastar) */}
      <div className="max-w-6xl mx-auto px-6 py-12">
         <div className="flex items-center gap-6 mb-10">
            <h2 className="text-[10px] text-gray-400 font-bold uppercase tracking-widest whitespace-nowrap">Evolução Mensal</h2>
            <div className="h-[1px] bg-gray-200 w-full"></div>
         </div>
         
         {/* GRID INTELIGENTE: 1 Coluna no Celular, 2 no Tablet, 3 no PC */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {dadosEvolucao.map(item => (
             <div key={item.mesAbbr} onClick={() => setSelectedMonth(item.mesAbbr)} className="bg-white border border-black p-6 cursor-pointer hover:-translate-y-1 transition-transform group relative">
               <div className="absolute top-0 left-0 w-1 h-0 bg-black transition-all group-hover:h-full"></div>
               
               <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                 <span className="text-xl font-light uppercase tracking-widest text-black">{item.mesAbbr}</span>
                 <span className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1 ${item.arrec >= item.meta ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>
                   {item.arrec > 0 ? `${((item.arrec/item.meta)*100).toFixed(0)}%` : '0%'}
                 </span>
               </div>
               
               <div className="space-y-3 mb-6">
                 <div className="flex justify-between items-center text-xs">
                   <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px]">Família</span>
                   <span className="font-light text-black">{item.arrec > 0 ? `R$ ${item.arrec.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '—'}</span>
                 </div>
                 <div className="flex justify-between items-center text-xs">
                   <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px]">Rendimento</span>
                   <span className="font-light text-green-700">{item.rendM > 0 ? `+ R$ ${item.rendM.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '—'}</span>
                 </div>
                 <div className="flex justify-between items-center text-xs">
                   <span className="text-gray-500 font-bold uppercase tracking-wider text-[9px]">Saídas</span>
                   <span className="font-light text-red-600">{item.saidaM > 0 ? `- R$ ${item.saidaM.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '—'}</span>
                 </div>
               </div>
               
               <div className="pt-4 border-t border-black flex justify-between items-end">
                 <span className="text-[9px] uppercase tracking-widest text-black font-bold">Caixa Mês</span>
                 <span className="text-xl font-light text-black">R$ {item.saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
               </div>
             </div>
           ))}
         </div>
      </div>

      {/* TERCEIRA SEÇÃO: BLOCOS DE ADMINISTRAÇÃO E DADOS */}
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8 border-t border-gray-200 mt-8">
        
        {/* COLUNA 1: MEMBROS E METAS */}
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-[10px] font-bold text-black uppercase tracking-widest">Acompanhamento</h2>
            <div className="h-[1px] bg-black w-8"></div>
          </div>
          
          {gruposDef.map((g, gIdx) => {
            const expectCount = g.nomes.filter(n => n !== 'Manu' || isManuActive(mesAtualFull)).length;
            const paidCount = g.nomes.filter(n => historico.some(h => h.membros?.nome === n && h.mes === mesAtualFull)).length;
            
            return (
              <div key={gIdx} className="bg-transparent border border-black overflow-hidden group">
                <button onClick={() => setExpandedGrupo(expandedGrupo === gIdx ? null : gIdx)} className={`w-full p-6 flex justify-between items-center transition-colors ${expandedGrupo === gIdx ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'}`}>
                  <div className="text-left">
                    <h2 className="text-xs font-bold uppercase tracking-widest">{g.titulo}</h2>
                    <p className={`text-[8px] font-bold uppercase mt-2 tracking-widest ${expandedGrupo === gIdx ? 'text-gray-400' : 'text-gray-500'}`}>
                      {paidCount} de {expectCount} confirmados
                    </p>
                  </div>
                  <span className="text-xl font-light">{expandedGrupo === gIdx ? '−' : '+'}</span>
                </button>
                <div className={`transition-all duration-500 ${expandedGrupo === gIdx ? 'max-h-[800px] bg-white' : 'max-h-0'} overflow-hidden`}>
                  <div className="p-6 pt-2 space-y-1">
                    {g.nomes.map(nome => {
                      const m = membros.find(x => x.nome === nome);
                      const pg = m ? calcPago(m.id) : 0;
                      const meta = getMetaInd(nome);
                      return (
                        <div key={nome} onClick={() => m && setSelectedMembroId(m.id)} className="py-3 flex justify-between items-center border-b border-gray-100 last:border-0 cursor-pointer group/item hover:pl-2 transition-all">
                          <span className="font-bold text-[10px] uppercase text-gray-500 tracking-widest group-hover/item:text-black">{nome}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-light text-black">R$ {pg}</span>
                            <div className={`h-[4px] w-[4px] rotate-45 ${pg >= meta ? 'bg-black' : 'bg-gray-200'}`}></div>
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
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-[10px] font-bold text-black uppercase tracking-widest">Documentação</h2>
            <div className="h-[1px] bg-black w-8"></div>
          </div>
          
          <div className="bg-white border border-black p-8 min-h-[120px] flex flex-col justify-between relative">
            <div className="absolute top-0 right-0 w-8 h-8 border-b border-l border-gray-100"></div>
            <div>
              {docs.slice(0, 5).map(d => (
                <a key={d.id} href={d.url_arquivo} download target="_blank" className="flex justify-between items-center py-4 border-b border-gray-100 last:border-0 group">
                  <span className="text-[10px] font-bold text-gray-500 uppercase truncate pr-4 tracking-widest group-hover:text-black transition-colors">{d.nome_exibicao}</span>
                  <span className="text-black font-light text-lg transition-transform group-hover:translate-y-1">↓</span>
                </a>
              ))}
            </div>
            
            {docs.length > 5 && (
              <button onClick={() => setShowAllDocs(true)} className="w-full mt-8 pt-4 border-t border-black text-[9px] font-bold text-black uppercase tracking-widest text-left hover:text-gray-500 transition-colors flex justify-between items-center">
                <span>Ver Todos os Extratos</span>
                <span>({docs.length}) →</span>
              </button>
            )}
          </div>
        </div>

        {/* COLUNA 3: MOVIMENTAÇÕES */}
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-[10px] font-bold text-black uppercase tracking-widest">Histórico de Caixa</h2>
            <div className="h-[1px] bg-black w-8"></div>
          </div>

          <div className="bg-white border border-black p-8 min-h-[120px] flex flex-col justify-between">
            <div>
              {saidas.slice(0, 4).map(s => (
                <div key={s.id} className="mb-6 last:mb-0">
                  <div className="flex justify-between items-start mb-2">
                     <span className={`border px-2 py-1 text-[8px] font-bold uppercase tracking-widest ${s.tipo === 'rendimento' ? 'border-gray-200 text-gray-500' : 'border-black text-black'}`}>
                       {s.mes} • {s.tipo === 'rendimento' ? 'IN' : 'OUT'}
                     </span>
                     <span className={`text-xs font-light ${s.tipo === 'rendimento' ? 'text-black' : 'text-gray-500'}`}>
                       {s.tipo === 'rendimento' ? '+' : '-'} R$ {s.valor}
                     </span>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">{s.descricao}</p>
                </div>
              ))}
            </div>
            
            {saidas.length > 4 && (
               <button onClick={() => setShowAllMovimentacoes(true)} className="w-full mt-8 pt-4 border-t border-black text-[9px] font-bold text-black uppercase tracking-widest text-left hover:text-gray-500 transition-colors flex justify-between items-center">
                 <span>Registro Completo</span>
                 <span>({saidas.length}) →</span>
               </button>
            )}
          </div>
        </div>
      </div>

      {/* MODAL MOVIMENTAÇÕES */}
      {showAllMovimentacoes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-white/90 backdrop-blur-sm">
          <div className="bg-white border border-black w-full max-w-lg p-8 md:p-12 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start mb-10">
              <div>
                 <h2 className="text-xs font-bold text-black uppercase tracking-widest mb-1">Registro Completo</h2>
                 <p className="text-[9px] text-gray-400 uppercase tracking-widest">Fluxo de Caixa Bancário</p>
              </div>
              <button onClick={() => setShowAllMovimentacoes(false)} className="text-black hover:text-gray-400 font-light text-4xl leading-none transition-colors -mt-2">×</button>
            </div>
            
            <div className="overflow-y-auto pr-4 space-y-6 flex-1 scrollbar-hide border-t border-black pt-8">
              {saidas.map(s => (
                <div key={s.id} className="pb-6 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start mb-2">
                     <span className={`border px-2 py-1 text-[8px] font-bold uppercase tracking-widest ${s.tipo === 'rendimento' ? 'border-gray-200 text-gray-500' : 'border-black text-black'}`}>
                       {s.mes} • {s.tipo === 'rendimento' ? 'IN' : 'OUT'}
                     </span>
                     <span className={`text-sm font-light ${s.tipo === 'rendimento' ? 'text-black' : 'text-gray-500'}`}>
                       {s.tipo === 'rendimento' ? '+' : '-'} R$ {s.valor}
                     </span>
                  </div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{s.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXTRATOS */}
      {showAllDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-white/90 backdrop-blur-sm">
          <div className="bg-white border border-black w-full max-w-lg p-8 md:p-12 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start mb-10">
              <div>
                 <h2 className="text-xs font-bold text-black uppercase tracking-widest mb-1">Acervo Digital</h2>
                 <p className="text-[9px] text-gray-400 uppercase tracking-widest">Extratos e Comprovantes</p>
              </div>
              <button onClick={() => setShowAllDocs(false)} className="text-black hover:text-gray-400 font-light text-4xl leading-none transition-colors -mt-2">×</button>
            </div>
            
            <div className="overflow-y-auto pr-4 space-y-4 flex-1 scrollbar-hide border-t border-black pt-8">
              {docs.map(d => (
                <a key={d.id} href={d.url_arquivo} download target="_blank" className="flex justify-between items-center p-5 bg-white border border-gray-200 hover:border-black transition-all group">
                  <div className="flex flex-col gap-1">
                     <span className="text-[11px] font-bold text-black uppercase truncate tracking-widest">{d.nome_exibicao}</span>
                     <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Ref: {d.mes}</span>
                  </div>
                  <span className="text-black font-light text-xl pl-4 transition-transform group-hover:translate-y-1">↓</span>
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
