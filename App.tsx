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
  
  // Controles de Telas e Modais
  const [selectedMembroId, setSelectedMembroId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null); 
  const [activeModal, setActiveModal] = useState<string | null>(null); 
  const [expandedGrupo, setExpandedGrupo] = useState<number | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [senha, setSenha] = useState('');
  
  // Contador de Acessos
  const [acessos, setAcessos] = useState<number | null>(null);
  
  // Controles de Formulário Admin
  const [filtrosGrupos, setFiltrosGrupos] = useState<any>({ 0: 'Todos', 1: 'Todos', 2: 'Todos', 3: 'Todos', 4: 'Todos' });
  const [valoresLote, setValoresLote] = useState<any>({});
  const [valorSaida, setValorSaida] = useState('');
  const [descSaida, setDescSaida] = useState('');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [nomeDoc, setNomeDoc] = useState('');
  const [tipoFluxo, setTipoFluxo] = useState('saida'); 

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

  useEffect(() => { 
    fetchAll(); 
    
    // Incrementa e busca o contador de acessos silenciosamente
    fetch('https://api.counterapi.dev/v1/familia_alegria_braganca_2026/acessos/up')
      .then(res => res.json())
      .then(data => setAcessos(data.count))
      .catch(() => {}); // Falha silenciosa se houver erro de rede
  }, []);

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

  // ==========================================
  // TELA 1: DETALHAMENTO DO MÊS
  // ==========================================
  if (selectedMonth) {
    const mesDb = mesesMap[selectedMonth] || selectedMonth;
    const pagsMes = historico.filter(p => (p.mes_caixa || p.mes) === mesDb);
    const arrecMes = pagsMes.reduce((acc, p) => acc + Number(p.valor), 0);
    const rendMes = rendimentosConta.filter(r => r.mes === mesDb).reduce((acc, r) => acc + Number(r.valor), 0);
    const saidaMes = saidasReais.filter(s => s.mes === mesDb).reduce((acc, s) => acc + Number(s.valor), 0);
    const pagantesUnicosCount = new Set(pagsMes.map(p => p.membro_id)).size;
    const totalEsperadoMes = isManuActive(mesDb) ? 27 : 26; 

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#061B30]/90 backdrop-blur-sm">
        <div className="bg-white w-full max-w-md p-6 md:p-8 rounded-[30px] shadow-2xl relative max-h-[90vh] flex flex-col">
          <button onClick={() => setSelectedMonth(null)} className="absolute top-6 right-6 text-gray-400 hover:text-[#061B30] font-black text-2xl leading-none transition-colors z-10">×</button>
          
          <div className="flex flex-col items-center mb-6 pt-2 border-b border-gray-100 pb-6 shrink-0">
             <h2 className="text-3xl font-black uppercase text-[#061B30] tracking-widest text-center mb-3">{selectedMonth}</h2>
             
             <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full bg-[#0D6B8C]/10 text-[#0D6B8C] mb-5 border border-[#0D6B8C]/20">
               {pagantesUnicosCount} depósitos (de {totalEsperadoMes})
             </div>

             <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Saldo Fechamento</p>
             <span className="font-black text-4xl text-[#0D6B8C]">R$ {(arrecMes + rendMes - saidaMes).toLocaleString('pt-BR')}</span>

             <div className="flex gap-6 mt-5 w-full justify-center">
                <div className="text-center">
                  <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest mb-1">Rendimentos</p>
                  <p className="text-xs font-black text-[#061B30]">R$ {rendMes.toLocaleString('pt-BR')}</p>
                </div>
                <div className="border-l border-gray-200 pl-6 text-center">
                  <p className="text-[9px] text-red-500 font-black uppercase tracking-widest mb-1">Saídas</p>
                  <p className="text-xs font-black text-[#061B30]">R$ {saidaMes.toLocaleString('pt-BR')}</p>
                </div>
             </div>
             
             <p className="text-[9px] text-[#CBAA61] font-black uppercase tracking-widest mt-5 bg-[#CBAA61]/10 px-4 py-1.5 rounded-full">
                Meta Arrecadação: R$ {getMetaMensal(mesDb)}
             </p>
          </div>

          <div className="overflow-y-auto pr-2 space-y-3 flex-1 scrollbar-hide">
            <p className="text-[10px] font-black text-[#CBAA61] uppercase tracking-widest mb-3 pt-2">Lançamentos no Mês</p>
            {pagsMes.map(p => (
              <div key={p.id} className="flex justify-between items-center p-4 bg-[#F4F5F7] border border-gray-100 rounded-2xl shadow-sm">
                <div className="flex flex-col gap-1">
                  <span className="font-black text-[#061B30] uppercase text-[11px] tracking-widest">{p.membros?.nome}</span>
                  {p.mes !== mesDb && <span className="text-[9px] text-red-500 font-bold uppercase tracking-widest">Ref. parcela de {p.mes}</span>}
                </div>
                <span className="font-black text-[#0D6B8C] text-sm">R$ {p.valor}</span>
              </div>
            ))}
            {pagsMes.length === 0 && <p className="text-xs text-gray-400 text-center font-bold italic py-4">Nenhum pagamento registrado neste mês.</p>}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // TELA 2: DETALHE DO MEMBRO
  // ==========================================
  if (selectedMembroId) {
    const m = membros.find(x => x.id === selectedMembroId);
    const pags = historico.filter(h => h.membro_id === selectedMembroId);
    const pagoAcumulado = calcPago(selectedMembroId);
    const metaMembro = getMetaInd(m?.nome || '');
    const pagouMes = pags.some(p => p.mes === mesAtualFull);
    const statusText = pagouMes ? "QUITADO" : diaDoMes > 15 ? "ATRASADO" : "PENDENTE";
    const statusColor = pagouMes ? 'bg-[#0F4A3F] text-[#4ADE80]' : diaDoMes > 15 ? 'bg-red-900/40 text-red-400' : 'bg-[#CBAA61]/20 text-[#CBAA61]';

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#061B30]/90 backdrop-blur-sm">
        <div className="bg-white w-full max-w-md p-6 md:p-8 rounded-[30px] shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-hide">
          <button onClick={() => setSelectedMembroId(null)} className="absolute top-6 right-6 text-gray-400 hover:text-[#061B30] font-black text-2xl leading-none transition-colors">×</button>
          
          <div className="flex flex-col items-center mb-6 pt-4">
             <div className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full mb-4 ${statusColor}`}>{statusText}</div>
             <h2 className="text-2xl font-black uppercase text-[#061B30] tracking-widest text-center">{m?.nome}</h2>
          </div>
          
          <div className="bg-[#F4F5F7] p-6 rounded-3xl border border-gray-100 flex flex-col items-center">
             <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Contribuído</span>
             <span className="font-black text-4xl text-[#0D6B8C] mb-4">R$ {pagoAcumulado}</span>
             
             <div className="w-full">
               <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                 <span>Progresso</span>
                 <span>Meta: R$ {metaMembro}</span>
               </div>
               <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                 <div className="bg-gradient-to-r from-[#0D6B8C] to-[#0A1A2F] h-full transition-all duration-1000" style={{ width: `${Math.min((pagoAcumulado/metaMembro)*100, 100)}%` }}></div>
               </div>
             </div>
          </div>
          
          <div className="mt-8 space-y-3">
            <p className="text-[10px] font-black text-[#CBAA61] uppercase tracking-widest mb-4 border-b border-gray-100 pb-2">Histórico de Pix</p>
            {pags.map(p => (
              <div key={p.id} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                <div className="flex flex-col gap-1">
                  <span className="font-black text-[#061B30] uppercase text-xs tracking-widest">Ref: {p.mes}</span>
                  {(p.mes_caixa && p.mes_caixa !== p.mes) && <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Pago em: {p.mes_caixa}</span>}
                </div>
                <span className="font-black text-[#0D6B8C] text-lg">R$ {p.valor}</span>
              </div>
            ))}
            {pags.length === 0 && <p className="text-xs text-gray-400 text-center font-bold italic py-4">Nenhum pagamento registrado.</p>}
          </div>
        </div>
      </div>
    );
  }

  // TELA ADMIN 
  if (isAdmin) {
    return (
      <div className="p-4 md:p-6 bg-[#F4F5F7] min-h-screen font-sans pb-20 text-[#061B30]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 max-w-5xl mx-auto border-b border-gray-200 pb-6">
           <button onClick={() => setIsAdmin(false)} className="font-black text-[#0D6B8C] uppercase text-xs tracking-widest hover:text-[#061B30] transition-colors bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">← Voltar ao App</button>
           
           <div className="flex gap-4 w-full md:w-auto bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
             <div className="flex flex-col flex-1 md:flex-none">
                <span className="text-[9px] text-gray-500 font-black uppercase mb-1 tracking-widest">Referente a (Dívida)</span>
                <select className="p-2 border border-gray-200 text-xs font-bold bg-[#F4F5F7] text-[#061B30] outline-none focus:border-[#CBAA61] rounded-xl" value={mesGlobal} onChange={e => setMesGlobal(e.target.value)}>
                  {Object.values(mesesMap).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
             </div>
             <div className="flex flex-col flex-1 md:flex-none">
                <span className="text-[9px] text-[#0D6B8C] font-black uppercase mb-1 tracking-widest">Caiu no banco em</span>
                <select className="p-2 border border-[#0D6B8C]/30 text-xs font-bold bg-[#0D6B8C]/5 text-[#0D6B8C] outline-none focus:border-[#0D6B8C] rounded-xl" value={mesCaixaGlobal} onChange={e => setMesCaixaGlobal(e.target.value)}>
                  {Object.values(mesesMap).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
             </div>
           </div>
        </div>

        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Box Auditoria */}
             <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-md">
               <h2 className="text-[10px] font-black uppercase mb-5 tracking-widest text-[#0D6B8C]">1. Subir Extrato</h2>
               <div className="flex flex-col gap-3 mb-4">
                 <input type="text" placeholder="Nome do arquivo" className="w-full p-3 rounded-xl bg-[#F4F5F7] border border-gray-200 text-[#061B30] text-xs font-bold outline-none focus:border-[#CBAA61]" value={nomeDoc} onChange={e => setNomeDoc(e.target.value)} />
                 <div className="flex gap-2">
                   <input type="file" className="flex-1 text-[9px] text-gray-500 file:mr-2 file:py-2 file:px-3 file:border-0 file:rounded-xl file:text-[9px] file:font-black file:bg-[#061B30] file:text-white hover:file:bg-[#0D6B8C] cursor-pointer" onChange={e => setFileToUpload(e.target.files?.[0] || null)} />
                   <button onClick={handleUpload} className="bg-[#CBAA61] text-[#061B30] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#BCA15D] transition-colors">Subir</button>
                 </div>
               </div>
               <div className="space-y-2 mt-4 pt-4 border-t border-gray-100 max-h-[150px] overflow-y-auto pr-2">
                 {docs.map(d => (
                   <div key={d.id} className="flex justify-between items-center bg-[#F4F5F7] p-3 rounded-xl text-[10px] border border-gray-200 uppercase tracking-wider">
                     <span className="text-gray-500">{d.mes}: <span className="text-[#061B30] font-black ml-1">{d.nome_exibicao}</span></span>
                     <button onClick={() => excluirDoc(d.id, d.url_arquivo)} className="text-red-500 font-black px-2 hover:text-red-600">X</button>
                   </div>
                 ))}
               </div>
             </div>

             {/* Box Movimentação */}
             <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-md">
               <h2 className="text-[10px] font-black uppercase mb-5 tracking-widest text-[#061B30]">2. Fluxo Bancário</h2>
               
               <div className="flex gap-2 mb-4">
                 <button onClick={() => setTipoFluxo('saida')} className={`flex-1 p-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors border ${tipoFluxo === 'saida' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-[#F4F5F7] text-gray-400 border-gray-200'}`}>Saída</button>
                 <button onClick={() => setTipoFluxo('rendimento')} className={`flex-1 p-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors border ${tipoFluxo === 'rendimento' ? 'bg-[#0D6B8C]/10 text-[#0D6B8C] border-[#0D6B8C]/30' : 'bg-[#F4F5F7] text-gray-400 border-gray-200'}`}>Rend.</button>
               </div>

               <div className="flex flex-col gap-3">
                 <input type="text" placeholder="Descrição (ex: Rendimento CDB)" className="w-full p-3 rounded-xl bg-[#F4F5F7] border border-gray-200 text-[#061B30] text-xs font-bold outline-none focus:border-[#CBAA61]" value={descSaida} onChange={e => setDescSaida(e.target.value)} />
                 <div className="flex gap-2">
                     <input type="number" placeholder="R$ Valor" className="w-1/2 p-3 rounded-xl bg-[#F4F5F7] border border-gray-200 text-[#061B30] text-xs font-black outline-none focus:border-[#CBAA61]" value={valorSaida} onChange={e => setValorSaida(e.target.value)} />
                     <button onClick={lancarMovimentacao} className="w-1/2 bg-[#061B30] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#0D6B8C] transition-colors">Registrar</button>
                 </div>
               </div>
               
               <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 max-h-[150px] overflow-y-auto pr-2">
                  {saidas.map(s => (
                    <div key={s.id} className="flex justify-between items-center text-[10px] bg-[#F4F5F7] p-3 rounded-xl border border-gray-200 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${s.tipo === 'rendimento' ? 'bg-[#0D6B8C]/10 text-[#0D6B8C]' : 'bg-red-100 text-red-600'}`}>
                          {s.tipo === 'rendimento' ? 'IN' : 'OUT'}
                        </span>
                        <span className="text-gray-500 font-bold">{s.mes} • {s.descricao}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-[#061B30]">R$ {s.valor}</span>
                        <button onClick={() => excluirItem(s.id, 'saidas_caixa')} className="text-red-500 font-black hover:text-red-600">X</button>
                      </div>
                    </div>
                  ))}
               </div>
             </div>
          </div>

          {/* Box Grupos */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-md mt-6">
             <h2 className="text-[10px] font-black uppercase mb-6 tracking-widest text-[#CBAA61]">3. Lançamento de PIX</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gruposDef.map((g, idx) => (
                  <div key={idx} className="bg-[#F4F5F7] p-5 rounded-2xl border border-gray-200">
                    <h2 className="text-[11px] font-black text-[#061B30] uppercase tracking-widest mb-4">{g.titulo}</h2>
                    <select className="w-full p-3 rounded-xl border border-gray-300 mb-4 bg-white text-gray-500 text-xs font-bold outline-none focus:border-[#0D6B8C] uppercase tracking-wider" value={filtrosGrupos[idx]} onChange={e => setFiltrosGrupos({...filtrosGrupos, [idx]: e.target.value})}>
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
                            <div key={m.id} className="flex items-center gap-2 border-t border-gray-200 pt-3">
                              <span className="text-[10px] font-black w-20 truncate uppercase text-gray-500 tracking-wider">{m.nome}</span>
                              <input type="number" placeholder="R$" className="flex-1 p-2.5 rounded-xl bg-white border border-gray-300 text-xs font-black text-[#061B30] outline-none focus:border-[#CBAA61]" value={valoresLote[m.id] || ''} onChange={e => setValoresLote({...valoresLote, [m.id]: e.target.value})} />
                              <button onClick={() => lancarPagamento(m.id, valoresLote[m.id])} className="bg-[#0D6B8C] text-white rounded-xl px-3 py-2.5 text-[9px] font-black uppercase tracking-widest hover:bg-[#061B30] transition-colors">OK</button>
                            </div>
                          );
                        } else {
                          return historico.filter(h => h.membro_id === m.id).map(p => (
                            <div key={p.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-gray-200 mt-2 shadow-sm">
                              <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-black text-gray-600 tracking-widest uppercase">Ref: {p.mes}</span>
                                {(p.mes_caixa && p.mes_caixa !== p.mes) && <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Caixa: {p.mes_caixa}</span>}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[11px] font-black text-[#0D6B8C]">R$ {p.valor}</span>
                                <button onClick={() => excluirItem(p.id, 'pagamentos_detalhes')} className="text-red-500 hover:text-red-600 font-black text-[10px] uppercase bg-red-50 w-6 h-6 rounded-full flex items-center justify-center">X</button>
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

  // --- PRÉ-CÁLCULOS PRINCIPAIS ---
  let saldoAcumuladoLoop = 0;
  const evolucaoCompleta = mesesAbbr.map(mesAbbr => {
    const mesDb = mesesMap[mesAbbr];
    const arrec = historico.filter(h => (h.mes_caixa || h.mes) === mesDb).reduce((acc, h) => acc + Number(h.valor), 0);
    const rendM = rendimentosConta.filter(r => r.mes === mesDb).reduce((acc, r) => acc + Number(r.valor), 0);
    const saidaM = saidasReais.filter(s => s.mes === mesDb).reduce((acc, s) => acc + Number(s.valor), 0);
    const meta = getMetaMensal(mesDb);
    saldoAcumuladoLoop = saldoAcumuladoLoop + arrec + rendM - saidaM;
    return { mesAbbr, arrec, rendM, saidaM, saldo: saldoAcumuladoLoop, meta };
  });

  const dadosEvolucao = evolucaoCompleta.filter(item => item.arrec > 0 || item.rendM > 0 || item.saidaM > 0).reverse();

  // --- APP PRINCIPAL (Estilo Fintech Bank Card) ---
  return (
    <div className="min-h-screen bg-[#F4F5F7] font-sans text-[#061B30] selection:bg-[#CBAA61] selection:text-white pb-10">
      
      <div className="max-w-xl mx-auto pt-6 px-4">
        
        {/* CARTÃO PRINCIPAL (Degradê Azul) */}
        <div className="bg-gradient-to-br from-[#061B30] to-[#0D6B8C] rounded-[40px] p-8 shadow-2xl relative overflow-hidden text-white">
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          
          {/* TOPO: Título e Login Admin */}
          <div className="flex justify-between items-start mb-8 relative z-10">
            <div>
              <p className="text-[9px] uppercase tracking-[0.3em] text-[#CBAA61] font-black mb-1">Olá,</p>
              <h1 className="text-xl font-black tracking-widest uppercase text-white">Família da Alegria</h1>
            </div>
            
            <div className="relative">
              {!showLogin ? (
                 <button onClick={() => setShowLogin(true)} className="text-white/60 hover:text-[#CBAA61] transition-colors p-2 bg-white/10 rounded-full backdrop-blur-md" title="Acesso Restrito">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z"></path></svg>
                 </button>
              ) : (
                 <div className="absolute top-0 right-0 flex items-center bg-[#061B30] border border-[#CBAA61] rounded-2xl overflow-hidden shadow-2xl z-50">
                    <input type="password" placeholder="SENHA" className="p-3 w-32 bg-transparent text-[10px] uppercase tracking-widest font-black text-white outline-none placeholder:text-gray-500" value={senha} onChange={e => {
                       setSenha(e.target.value);
                       if (e.target.value === '041252') { setIsAdmin(true); setShowLogin(false); setSenha(''); }
                    }} autoFocus />
                    <button onClick={() => setShowLogin(false)} className="text-[#CBAA61] hover:text-white font-black px-4 py-3 text-xs transition-colors bg-white/5">X</button>
                 </div>
              )}
            </div>
          </div>

          {/* CAIXA INTERNA DOURADA: Entradas e Rendimentos */}
          <div className="border border-[#CBAA61]/50 rounded-3xl p-5 mb-8 flex justify-between items-center bg-black/10 backdrop-blur-sm relative z-10">
            <div className="flex items-center gap-4">
               <div className="grid grid-cols-2 gap-1 opacity-80">
                 <div className="w-3 h-3 border-2 border-[#CBAA61] rounded-sm"></div>
                 <div className="w-3 h-3 border-2 border-[#CBAA61] rounded-sm"></div>
                 <div className="w-3 h-3 border-2 border-[#CBAA61] rounded-sm"></div>
                 <div className="w-3 h-3 border-2 border-[#CBAA61] rounded-sm"></div>
               </div>
               <div>
                  <p className="text-[8px] text-[#CBAA61] font-black uppercase tracking-widest mb-1">Arrecadado</p>
                  <p className="text-sm font-black tracking-wide">R$ {totalArrecadado.toLocaleString('pt-BR')}</p>
               </div>
            </div>
            
            <div className="text-right">
              <p className="text-[8px] text-[#CBAA61] font-black uppercase tracking-widest mb-1">Rendimentos</p>
              <p className="text-sm font-black tracking-wide text-emerald-300">+ R$ {totalRendimentos.toLocaleString('pt-BR')}</p>
            </div>
          </div>

          {/* SALDO PRINCIPAL */}
          <div className="relative z-10 mb-8">
            <p className="text-[10px] text-white/60 font-black uppercase tracking-widest mb-2">Meu Saldo</p>
            <h1 className="text-5xl font-black tracking-tighter">R$ {saldoAtual.toLocaleString('pt-BR')}</h1>
          </div>

          {/* META BRAGANÇA & PROGRESSO */}
          <div className="relative z-10 pt-6 border-t border-white/10">
             <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-[8px] text-[#CBAA61] font-black uppercase tracking-widest mb-1">Meta Global Bragança</p>
                  <p className="text-xs font-bold text-white/80">R$ {metaGlobalBragança.toLocaleString('pt-BR')}</p>
                </div>
                <p className="text-sm font-black text-white">{( (totalArrecadado/metaGlobalBragança)*100 ).toFixed(1)}%</p>
             </div>
             <div className="w-full bg-black/30 h-2 rounded-full overflow-hidden">
                <div className="bg-[#CBAA61] h-full transition-all duration-1000 relative" style={{ width: `${(totalArrecadado/metaGlobalBragança)*100}%` }}>
                  <div className="absolute inset-0 bg-white/30 w-full h-full animate-pulse"></div>
                </div>
             </div>
          </div>
        </div>

        {/* MÓDULOS DE AÇÃO (GRID DE 6 BOTÕES) */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-8">
          
          <button onClick={() => setActiveModal('pagamento')} className="bg-[#CBAA61] hover:bg-[#BCA15D] text-[#061B30] rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center gap-2 sm:gap-3 transition-transform hover:-translate-y-1 shadow-md">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-center leading-tight">Dados PIX</span>
          </button>

          <button onClick={() => setActiveModal('chacara')} className="bg-[#CBAA61] hover:bg-[#BCA15D] text-[#061B30] rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center gap-2 sm:gap-3 transition-transform hover:-translate-y-1 shadow-md">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-center leading-tight">A Chácara</span>
          </button>

          <button onClick={() => setActiveModal('evolucao')} className="bg-[#CBAA61] hover:bg-[#BCA15D] text-[#061B30] rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center gap-2 sm:gap-3 transition-transform hover:-translate-y-1 shadow-md">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-center leading-tight">Evolução</span>
          </button>

          <button onClick={() => setActiveModal('membros')} className="bg-[#CBAA61] hover:bg-[#BCA15D] text-[#061B30] rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center gap-2 sm:gap-3 transition-transform hover:-translate-y-1 shadow-md">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-center leading-tight">Membros</span>
          </button>

          <button onClick={() => setActiveModal('docs')} className="bg-[#CBAA61] hover:bg-[#BCA15D] text-[#061B30] rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center gap-2 sm:gap-3 transition-transform hover:-translate-y-1 shadow-md">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-center leading-tight">Extratos</span>
          </button>

          <button onClick={() => setActiveModal('fluxo')} className="bg-[#CBAA61] hover:bg-[#BCA15D] text-[#061B30] rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center gap-2 sm:gap-3 transition-transform hover:-translate-y-1 shadow-md">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
            <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-center leading-tight">Fluxo</span>
          </button>

        </div>
        
        {/* CONTADOR DE ACESSOS DISCRETO NO RODAPÉ */}
        {acessos !== null && (
          <div className="mt-12 text-center">
            <p className="text-[9px] text-gray-400/60 font-black uppercase tracking-widest flex justify-center items-center gap-1.5 hover:text-gray-400 transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
              {acessos} acessos
            </p>
          </div>
        )}

      </div>

      {/* ============================================================ */}
      {/* MODAL 1: EVOLUÇÃO MENSAL (Tabela Compacta sem barra lateral) */}
      {/* ============================================================ */}
      {activeModal === 'evolucao' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#061B30]/80 backdrop-blur-sm">
          <div className="bg-white rounded-[30px] w-full max-w-4xl p-5 md:p-8 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 shrink-0">
              <div>
                 <h2 className="text-xl md:text-2xl font-black text-[#061B30] uppercase tracking-widest">Evolução Mensal</h2>
                 <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 font-bold">Histórico de Performance</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-red-500 font-black text-3xl leading-none transition-colors">×</button>
            </div>
            
            <div className="overflow-x-hidden overflow-y-auto flex-1 scrollbar-hide w-full">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="border-b-2 border-[#061B30] text-[8px] sm:text-[9px] text-gray-500 font-black uppercase tracking-tighter">
                   <th className="pb-3 text-[#061B30]">Mês</th>
                   <th className="pb-3 text-[#0D6B8C]">Fam.</th>
                   <th className="pb-3 text-emerald-600">Rend.</th>
                   <th className="pb-3 text-red-500">Saída</th>
                   <th className="pb-3 text-[#CBAA61]">Caixa</th>
                   <th className="pb-3 text-right">%</th>
                 </tr>
               </thead>
               <tbody className="text-[9px] sm:text-[10px] font-black text-[#061B30]">
                 {dadosEvolucao.map(item => (
                   <tr key={item.mesAbbr} onClick={() => { setSelectedMonth(item.mesAbbr); setActiveModal(null); }} className="border-b border-gray-100 hover:bg-[#F4F5F7] transition-colors cursor-pointer">
                     <td className="py-4 pr-1 text-gray-500 tracking-tighter">{item.mesAbbr}</td>
                     <td className="py-4 pr-1 text-[#0D6B8C]">{item.arrec > 0 ? item.arrec.toLocaleString('pt-BR') : '—'}</td>
                     <td className="py-4 pr-1 text-emerald-600">{item.rendM > 0 ? `+${item.rendM.toLocaleString('pt-BR')}` : '—'}</td>
                     <td className="py-4 pr-1 text-red-500">{item.saidaM > 0 ? `-${item.saidaM.toLocaleString('pt-BR')}` : '—'}</td>
                     <td className="py-4 pr-1 text-[#CBAA61]">R$ {item.saldo.toLocaleString('pt-BR')}</td>
                     <td className={`py-4 text-right ${item.arrec >= item.meta ? 'text-emerald-500' : 'text-gray-400'}`}>
                       {item.arrec > 0 ? `${((item.arrec/item.meta)*100).toFixed(0)}%` : '0%'}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL 2: MEMBROS E METAS                  */}
      {/* ========================================= */}
      {activeModal === 'membros' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061B30]/80 backdrop-blur-sm">
          <div className="bg-white rounded-[30px] w-full max-w-2xl p-6 md:p-8 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <div>
                 <h2 className="text-xl md:text-2xl font-black text-[#061B30] uppercase tracking-widest">Membros e Metas</h2>
                 <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 font-bold">Acompanhamento do Grupo</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-red-500 font-black text-3xl leading-none transition-colors">×</button>
            </div>
            
            <div className="overflow-y-auto flex-1 pr-2 space-y-4 scrollbar-hide">
              {gruposDef.map((g, gIdx) => {
                const expectCount = g.nomes.filter(n => n !== 'Manu' || isManuActive(mesAtualFull)).length;
                const paidCount = g.nomes.filter(n => historico.some(h => h.membros?.nome === n && h.mes === mesAtualFull)).length;
                return (
                  <div key={gIdx} className="bg-[#F4F5F7] border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    <button onClick={() => setExpandedGrupo(expandedGrupo === gIdx ? null : gIdx)} className="w-full p-4 flex justify-between items-center hover:bg-gray-100 transition-colors">
                      <div className="text-left">
                        <h2 className="text-[11px] font-black uppercase tracking-widest text-[#061B30]">{g.titulo}</h2>
                        <p className={`text-[8px] font-bold uppercase mt-1 tracking-widest ${paidCount === expectCount ? 'text-emerald-600' : 'text-gray-500'}`}>
                          {paidCount} de {expectCount} pagos
                        </p>
                      </div>
                      <span className="text-[#CBAA61] font-black text-xl">{expandedGrupo === gIdx ? '−' : '+'}</span>
                    </button>
                    <div className={`transition-all duration-300 ${expandedGrupo === gIdx ? 'max-h-[800px]' : 'max-h-0'} overflow-hidden`}>
                      <div className="p-4 pt-0 space-y-2 border-t border-gray-200 mx-4">
                        {g.nomes.map(nome => {
                          const m = membros.find(x => x.nome === nome);
                          const pg = m ? calcPago(m.id) : 0;
                          const meta = getMetaInd(nome);
                          return (
                            <div key={nome} onClick={() => { setSelectedMembroId(m?.id || null); setActiveModal(null); }} className="py-2 flex justify-between items-center border-b border-gray-200/50 last:border-0 cursor-pointer hover:pl-2 transition-all">
                              <span className="font-bold text-[10px] uppercase text-gray-600 tracking-wider">{nome}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-[#0D6B8C]">R$ {pg}</span>
                                <div className={`h-2 w-2 rounded-full ${pg >= meta ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
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
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL 3: EXTRATOS E DOCS                  */}
      {/* ========================================= */}
      {activeModal === 'docs' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061B30]/80 backdrop-blur-sm">
          <div className="bg-white rounded-[30px] w-full max-w-md p-6 md:p-8 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <div>
                 <h2 className="text-xl md:text-2xl font-black text-[#061B30] uppercase tracking-widest">Documentação</h2>
                 <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 font-bold">Acervo de Extratos</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-red-500 font-black text-3xl leading-none transition-colors">×</button>
            </div>
            
            <div className="overflow-y-auto flex-1 pr-2 space-y-3 scrollbar-hide">
              {docs.map(d => (
                <a key={d.id} href={d.url_arquivo} download target="_blank" className="flex justify-between items-center p-4 bg-[#F4F5F7] rounded-xl border border-gray-200 hover:border-[#0D6B8C]/50 transition-all group">
                  <div className="flex flex-col gap-1">
                     <span className="text-[10px] font-black text-[#061B30] uppercase truncate tracking-widest group-hover:text-[#0D6B8C] transition-colors">{d.nome_exibicao}</span>
                     <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Ref: {d.mes}</span>
                  </div>
                  <span className="text-[#CBAA61] font-black text-lg pl-4 transition-transform group-hover:translate-y-1">↓</span>
                </a>
              ))}
              {docs.length === 0 && <p className="text-xs text-gray-400 text-center font-bold italic py-8">Nenhum documento anexado.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL 4: FLUXO DE CAIXA                   */}
      {/* ========================================= */}
      {activeModal === 'fluxo' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061B30]/80 backdrop-blur-sm">
          <div className="bg-white rounded-[30px] w-full max-w-md p-6 md:p-8 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <div>
                 <h2 className="text-xl md:text-2xl font-black text-[#061B30] uppercase tracking-widest">Fluxo de Caixa</h2>
                 <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 font-bold">Saídas e Rendimentos</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-red-500 font-black text-3xl leading-none transition-colors">×</button>
            </div>
            
            <div className="overflow-y-auto flex-1 pr-2 space-y-4 scrollbar-hide">
              {saidas.map(s => (
                <div key={s.id} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start mb-2">
                     <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${s.tipo === 'rendimento' ? 'bg-[#0D6B8C]/10 text-[#0D6B8C]' : 'bg-red-50 text-red-500'}`}>
                       {s.mes} • {s.tipo === 'rendimento' ? 'ENTRADA' : 'SAÍDA'}
                     </span>
                     <span className={`text-sm font-black ${s.tipo === 'rendimento' ? 'text-[#0D6B8C]' : 'text-red-500'}`}>
                       {s.tipo === 'rendimento' ? '+' : '-'} R$ {s.valor}
                     </span>
                  </div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{s.descricao}</p>
                </div>
              ))}
              {saidas.length === 0 && <p className="text-xs text-gray-400 text-center font-bold italic py-8">Nenhuma movimentação registrada.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL 5: DADOS PIX                          */}
      {/* ========================================= */}
      {activeModal === 'pagamento' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061B30]/80 backdrop-blur-sm">
          <div className="bg-white rounded-[30px] w-full max-w-md p-6 md:p-8 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <div>
                 <h2 className="text-xl md:text-2xl font-black text-[#061B30] uppercase tracking-widest">Dados PIX</h2>
                 <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 font-bold">Informações de Pagamento</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-red-500 font-black text-3xl leading-none transition-colors">×</button>
            </div>
            
            <div className="overflow-y-auto flex-1 pr-2 space-y-4 scrollbar-hide">
               <div className="bg-[#F4F5F7] p-4 rounded-2xl border border-gray-200 text-center cursor-copy group">
                 <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Chave PIX (E-mail)</p>
                 <p className="text-base font-black text-[#0D6B8C] select-all group-hover:text-[#061B30] transition-colors">reinaldo.paulo@gmail.com</p>
               </div>
               
               <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                 <p className="text-[9px] font-black text-[#CBAA61] uppercase tracking-widest mb-4">Mensalidade Geral</p>
                 <div className="flex justify-between items-center">
                   <span className="text-[11px] font-bold text-[#061B30] uppercase tracking-wider">Março a Dezembro</span>
                   <span className="font-black text-[#0D6B8C] text-sm">R$ 70,00</span>
                 </div>
                 <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fevereiro (Exceção)</span>
                   <span className="font-black text-gray-400">R$ 60,00</span>
                 </div>
               </div>

               <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                 <p className="text-[9px] font-black text-[#CBAA61] uppercase tracking-widest mb-4">Mensalidade Pablito</p>
                 <div className="flex justify-between items-center">
                   <span className="text-[11px] font-bold text-[#061B30] uppercase tracking-wider">Março a Dezembro</span>
                   <span className="font-black text-[#0D6B8C] text-sm">R$ 35,00</span>
                 </div>
                 <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fevereiro (Exceção)</span>
                   <span className="font-black text-gray-400">R$ 30,00</span>
                 </div>
               </div>
               
               <div className="text-center mt-6">
                 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Período de Arrecadação</p>
                 <p className="text-[10px] font-black text-[#061B30] uppercase tracking-widest mt-1">Fevereiro 2026 a Dezembro 2026</p>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODAL 6: A CHÁCARA                          */}
      {/* ========================================= */}
      {activeModal === 'chacara' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#061B30]/80 backdrop-blur-sm">
          <div className="bg-white rounded-[30px] w-full max-w-md p-6 md:p-8 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <div>
                 <h2 className="text-xl md:text-2xl font-black text-[#061B30] uppercase tracking-widest">A Chácara</h2>
                 <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 font-bold">Local e Informações</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-red-500 font-black text-3xl leading-none transition-colors">×</button>
            </div>
            
            <div className="overflow-y-auto flex-1 pr-2 space-y-4 scrollbar-hide">
               <div className="bg-[#F4F5F7] p-5 rounded-2xl border border-gray-200">
                 <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Endereço do Local</p>
                 <p className="text-xs font-black text-[#061B30] leading-relaxed uppercase tracking-wide">
                   Rua Andre Sanches Cuenca, nº 620<br/>
                   Bairro Curitibanos<br/>
                   Bragança Paulista / SP
                 </p>
               </div>
               
               <div className="grid grid-cols-2 gap-3">
                 <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                   <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Check-in</p>
                   <p className="text-sm font-black text-[#061B30]">23/12</p>
                   <p className="text-[10px] font-bold text-gray-500 mt-1">às 14:00h</p>
                 </div>
                 <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                   <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Check-out</p>
                   <p className="text-sm font-black text-[#061B30]">27/12</p>
                   <p className="text-[10px] font-bold text-gray-500 mt-1">às 18:00h</p>
                 </div>
               </div>

               <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center">
                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Limite Máximo</p>
                 <p className="text-lg font-black text-[#061B30] uppercase tracking-widest">30 Pessoas</p>
               </div>

               <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                 <p className="text-[9px] font-black text-[#CBAA61] uppercase tracking-widest mb-4 text-center border-b border-gray-100 pb-2">Contrato de Aluguel</p>
                 <div className="flex justify-between items-center mb-3">
                   <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Valor Total</span>
                   <span className="font-black text-[#0D6B8C] text-sm">R$ 14.500,00</span>
                 </div>
                 <div className="flex justify-between items-center py-2 border-t border-gray-100">
                   <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Março a Julho</span>
                   <span className="font-black text-gray-500 text-[10px]">R$ 1.500,00/mês</span>
                 </div>
                 <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                   <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Em 15 de Dezembro</span>
                   <span className="font-black text-gray-500 text-[10px]">R$ 7.000,00</span>
                 </div>
               </div>
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
