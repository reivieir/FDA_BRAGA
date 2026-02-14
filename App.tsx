import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';

// Configuração de ambiente segura
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
  
  // Estados de controle e filtros
  const [valoresLote, setValoresLote] = useState<any>({});
  const [filtroExclusaoMembro, setFiltroExclusaoMembro] = useState<string>('Todos');
  const [valorSaida, setValorSaida] = useState('');
  const [descSaida, setDescSaida] = useState('');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [nomeDoc, setNomeDoc] = useState('');

  const hoje = new Date();
  const diaDoMes = hoje.getDate();
  const mesAtual = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(hoje).replace(/^\w/, c => c.toUpperCase());
  const [mesGlobal, setMesGlobal] = useState(mesAtual);

  const meses = ["Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const metaMensalGrupo = 1530;

  const gruposDef = [
    { titulo: "Grupo Adriana", nomes: ["Adriana", "Silvinho", "Adriano", "Angela", "Vini", "Stefany"] },
    { titulo: "Grupo Helena", nomes: ["Helena", "Antonio", "Paty", "Jair", "Giovana", "Manu", "Pablo"] },
    { titulo: "Grupo Clarice", nomes: ["Clarice", "Gilson", "Deia", "Helio", "Amanda", "Reinaldo"] },
    { titulo: "Grupo Katia", nomes: ["Katia", "Giovani", "Cintia", "Rafael", "Ju", "Bia"] },
    { titulo: "Grupo Julia", nomes: ["Julia", "Juan"] }
  ];

  const getMetaInd = (nome: string) => nome === 'Pablo' ? 330 : 660;

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const { data: m } = await supabase.from('membros').select('*').order('nome');
      const { data: h } = await supabase.from('pagamentos_detalhes').select('*, membros(nome)');
      const { data: s } = await supabase.from('saidas_caixa').select('*').order('data_registro', { ascending: false });
      const { data: d } = await supabase.from('documentos_familia').select('*').order('data_upload', { ascending: false });
      setMembros(m || []); setHistorico(h || []); setSaidas(s || []); setDocs(d || []);
    } catch (e) { console.error(e); }
  };

  // --- FUNÇÕES DE EXCLUSÃO E GESTÃO ---

  const excluirDocumento = async (id: number, url: string) => {
    if (window.confirm("Deseja apagar este extrato permanentemente?")) {
      const fileName = url.split('/').pop();
      if (fileName) await supabase.storage.from('documentos').remove([fileName]);
      await supabase.from('documentos_familia').delete().eq('id', id);
      fetchAll();
    }
  };

  const lancarPagamento = async (id: number, val: string) => {
    if (!val) return;
    await supabase.from('pagamentos_detalhes').insert([{ membro_id: id, valor: parseFloat(val), mes: mesGlobal }]);
    setValoresLote({ ...valoresLote, [id]: '' }); fetchAll();
  };

  const excluirLançamento = async (id: number, tabela: string) => {
    if (window.confirm("Confirmar exclusão deste registro?")) {
      await supabase.from(tabela).delete().eq('id', id);
      fetchAll();
    }
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

  // CÁLCULOS DO DASHBOARD
  const totalArrecadado = historico.reduce((acc, h) => acc + Number(h.valor), 0);
  const totalSaidas = saidas.reduce((acc, s) => acc + Number(s.valor), 0);
  const saldoAtual = totalArrecadado - totalSaidas;
  const metaGeral = membros.reduce((acc, m) => acc + getMetaInd(m.nome), 0);

  // --- RENDERS CONDICIONAIS (MES E MEMBRO) ---
  if (selectedMonth) {
    const pagsMes = historico.filter(p => p.mes === selectedMonth);
    const gastoMes = saidas.filter(s => s.mes === selectedMonth).reduce((acc, s) => acc + Number(s.valor), 0);
    return (
      <div className="min-h-screen bg-[#FDFCF0] p-6 font-sans">
        <button onClick={() => setSelectedMonth(null)} className="mb-8 font-black text-[#D4A373] uppercase text-xs">← Voltar</button>
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-black text-white p-8 rounded-[40px] shadow-xl border-b-8 border-red-500 text-center italic">
            <h2 className="text-4xl font-black uppercase tracking-tighter">{selectedMonth}</h2>
            <p className="text-2xl font-black text-green-500 mt-2">Saldo Mês R$ {(pagsMes.reduce((a, b) => a + Number(b.valor), 0) - gastoMes).toLocaleString('pt-BR')}</p>
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
    const pagsMembro = historico.filter(h => h.membro_id === selectedMembroId);
    const pagouMesAtual = pagsMembro.some(h => h.mes === mesAtual);
    const statusText = pagouMesAtual ? "✨ parabens, até que em fim pagou" : diaDoMes > 15 ? "⚠️ Paga o que deve caloteiro" : "⏳ Aguardando Pix até dia 15";
    const statusColor = pagouMesAtual ? "bg-green-100 text-green-700" : diaDoMes > 15 ? "bg-red-100 text-red-600" : "bg-blue-50 text-blue-500";
    
    const pagoTotal = pagsMembro.reduce((acc, h) => acc + Number(h.valor), 0);
    const metaMembro = getMetaInd(m?.nome || '');

    return (
      <div className="min-h-screen bg-[#FDFCF0] p-6 font-sans">
        <button onClick={() => setSelectedMembroId(null)} className="mb-8 font-black text-[#D4A373] uppercase text-xs">← Voltar</button>
        <div className="max-w-xl mx-auto bg-white p-8 rounded-[40px] shadow-xl border-b-8 border-green-700">
          <h2 className="text-3xl font-black italic uppercase text-gray-800 tracking-tighter">{m?.nome}</h2>
          <div className={`mt-4 p-4 rounded-2xl text-center font-black uppercase text-xs italic ${statusColor}`}>
            {statusText}
          </div>
          <div className="flex justify-between mt-8 text-sm font-bold italic tracking-tighter">
            <span className="text-green-600 font-black text-xl">R$ {pagoTotal}</span>
            <span className="text-gray-400 pt-2 uppercase">Meta R$ {metaMembro}</span>
          </div>
          <div className="w-full bg-gray-100 h-3 rounded-full mt-2 overflow-hidden">
            <div className="bg-green-500 h-full transition-all duration-1000" style={{ width: `${Math.min((pagoTotal/metaMembro)*100, 100)}%` }}></div>
          </div>
          <div className="mt-8 space-y-3">
            {pagsMembro.map(p => (
              <div key={p.id} className="flex justify-between p-4 bg-gray-50 rounded-2xl border text-xs italic">
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
      <div className="p-4 bg-gray-100 min-h-screen font-sans pb-20">
        <div className="flex justify-between items-center mb-6 max-w-2xl mx-auto">
           <button onClick={() => setIsAdmin(false)} className="text-blue-600 font-bold text-xs uppercase italic tracking-widest">← Site</button>
           <select className="p-2 border rounded-xl text-xs font-bold" value={mesGlobal} onChange={e => setMesGlobal(e.target.value)}>
             {meses.map(m => <option key={m} value={m}>{m}</option>)}
           </select>
        </div>
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* 1. DOCUMENTOS E EXCLUSÃO */}
          <div className="bg-blue-900 text-white p-6 rounded-3xl shadow-lg border-b-4 border-blue-400">
            <h2 className="text-[10px] font-black uppercase mb-4 italic tracking-widest">Gestão de Auditoria</h2>
            <div className="flex gap-2 mb-4">
               <input type="text" placeholder="Nome do Extrato" className="flex-1 p-3 rounded-xl text-black text-sm" value={nomeDoc} onChange={e => setNomeDoc(e.target.value)} />
               <input type="file" className="w-24 text-[8px] pt-3" onChange={e => setFileToUpload(e.target.files?.[0] || null)} />
               <button onClick={handleUpload} className="bg-blue-500 px-4 rounded-xl text-[10px] font-black italic">SUBIR</button>
            </div>
            <div className="space-y-2 border-t border-blue-800 pt-4">
               {docs.map(d => (
                 <div key={d.id} className="flex justify-between items-center bg-blue-800/30 p-2 rounded-xl text-[10px] italic">
                   <span>{d.mes}: {d.nome_exibicao}</span>
                   <button onClick={() => excluirDocumento(d.id, d.url_arquivo)} className="text-red-400 font-black">X</button>
                 </div>
               ))}
            </div>
          </div>

          {/* 2. REGISTRAR GASTO */}
          <div className="bg-black text-white p-6 rounded-3xl shadow-lg border-b-4 border-red-500">
             <h2 className="text-[10px] font-black uppercase mb-3 italic">Registrar Saída</h2>
             <input type="text" placeholder="Descrição" className="w-full p-3 rounded-xl text-black text-sm mb-2" value={descSaida} onChange={e => setDescSaida(e.target.value)} />
             <div className="flex gap-2">
                <input type="number" placeholder="R$" className="w-1/2 p-3 rounded-xl text-black text-sm font-bold" value={valorSaida} onChange={e => setValorSaida(e.target.value)} />
                <button onClick={() => {
                  if (valorSaida && descSaida) {
                    supabase.from('saidas_caixa').insert([{ valor: parseFloat(valorSaida), mes: mesGlobal, descricao: descSaida }]).then(() => { setValorSaida(''); setDescSaida(''); fetchAll(); });
                  }
                }} className="w-1/2 bg-red-600 font-black rounded-xl text-xs uppercase italic tracking-widest">Registrar</button>
             </div>
          </div>

          {/* 3. FILTRO PARA EXCLUIR LANÇAMENTO (PIX) */}
          <div className="bg-white p-6 rounded-3xl border-2 border-green-100">
             <h2 className="text-[10px] font-black text-green-700 uppercase mb-4 italic tracking-widest">Excluir Lançamento (PIX)</h2>
             <select className="w-full p-3 border rounded-xl mb-4 bg-gray-50 text-xs font-bold" value={filtroExclusaoMembro} onChange={e => setFiltroExclusaoMembro(e.target.value)}>
                <option value="Todos">Selecione o Familiar</option>
                {membros.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
             </select>
             <div className="space-y-2">
                {historico.filter(h => h.membros?.nome === filtroExclusaoMembro || filtroExclusaoMembro === 'Todos').slice(0, 10).map(p => (
                  <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border text-[10px] italic">
                    <span><b>{p.membros?.nome}</b> - {p.mes}: R$ {p.valor}</span>
                    <button onClick={() => excluirLançamento(p.id, 'pagamentos_detalhes')} className="text-red-500 font-black uppercase">Excluir</button>
                  </div>
                ))}
             </div>
          </div>

          {/* 4. GRADE DE LANÇAMENTO RÁPIDO */}
          {gruposDef.map((g, idx) => (
            <div key={idx} className="bg-white p-5 rounded-3xl shadow-sm border">
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 italic">Lançar PIX - {g.titulo}</h2>
              <div className="space-y-2">
                {g.nomes.map(nome => {
                  const m = membros.find(x => x.nome === nome);
                  if (!m) return null;
                  return (
                    <div key={m.id} className="flex items-center gap-2 border-t pt-2 border-gray-50">
                      <span className="text-[10px] font-black w-24 truncate uppercase italic">{m.nome}</span>
                      <input type="number" placeholder="R$" className="flex-1 p-2 border rounded-lg text-xs" value={valoresLote[m.id] || ''} onChange={e => setValoresLote({...valoresLote, [m.id]: e.target.value})} />
                      <button onClick={() => lancarPagamento(m.id, valoresLote[m.id])} className="bg-green-600 text-white px-3 py-2 rounded-lg text-[10px] font-black">OK</button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF0] p-4 md:p-10 font-sans text-gray-800">
      <header className="text-center mb-12 italic">
        <h1 className="text-4xl md:text-7xl font-black text-[#D4A373] uppercase tracking-tighter">FAMILIA da <span className="text-green-700">ALEGRIA</span></h1>
        <p className="text-[10px] md:text-sm font-bold text-gray-400 tracking-[0.4em] mt-2 uppercase">NATAL 2026 BRAGANÇA CITY</p>
      </header>

      <div className="max-w-6xl mx-auto bg-black text-white p-8 rounded-[40px] shadow-2xl mb-12 border-b-8 border-green-700">
        <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6 italic">
          <div className="text-left">
            <p className="text-[10px] text-[#D4A373] font-black uppercase tracking-widest">Saldo em Caixa</p>
            <div className="text-5xl md:text-7xl font-black text-green-500">R$ {saldoAtual.toLocaleString('pt-BR')}</div>
            <p className="text-[10px] font-black uppercase opacity-50 mt-2 tracking-tighter">Arrecadado: R$ {totalArrecadado} | Saídas: R$ {totalSaidas}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Meta Bragança</p>
            <div className="text-xl font-bold text-gray-400">R$ {metaGeral.toLocaleString('pt-BR')}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 border-t border-gray-800 pt-6">
          {meses.map(mes => {
            const sum = historico.filter(h => h.mes === mes).reduce((acc, h) => acc + Number(h.valor), 0);
            return sum > 0 ? (
              <div key={mes} onClick={() => setSelectedMonth(mes)} className="bg-gray-900/50 p-3 rounded-2xl border border-gray-800 cursor-pointer hover:bg-gray-800 transition-all text-center group">
                <p className="text-[8px] font-black text-gray-500 uppercase italic">{mes}</p>
                <p className="text-sm font-black text-[#D4A373] group-hover:scale-110 transition-transform">R$ {sum}</p>
              </div>
            ) : null;
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20 italic">
        {/* COLUNA 1: FAMILIARES */}
        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 italic">Estrutura Familiar</h2>
          {gruposDef.map((g, gIdx) => (
            <div key={gIdx} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <button onClick={() => setExpandedGrupo(expandedGrupo === gIdx ? null : gIdx)} className="w-full p-5 flex justify-between items-center hover:bg-gray-50 transition-all">
                <div className="text-left">
                  <h2 className="text-sm font-black text-gray-800 uppercase italic tracking-tighter">{g.titulo}</h2>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter italic">
                    {g.nomes.filter(n => historico.some(h => h.membros?.nome === n && h.mes === mesAtual)).length} de {g.nomes.length} PAGOS EM {mesAtual.toUpperCase()}
                  </p>
                </div>
                <span className="text-[#D4A373] font-black">{expandedGrupo === gIdx ? '−' : '+'}</span>
              </button>
              <div className={`transition-all duration-300 ${expandedGrupo === gIdx ? 'max-h-[800px] p-4' : 'max-h-0'} overflow-hidden`}>
                <div className="grid grid-cols-1 gap-2">
                  {g.nomes.map(nome => {
                    const m = membros.find(x => x.nome === nome);
                    const pagoMembroTotal = m ? historico.filter(h => h.membro_id === m.id).reduce((acc, h) => acc + Number(h.valor), 0) : 0;
                    const metaMembro = getMetaInd(nome);
                    return (
                      <div key={nome} onClick={() => m && setSelectedMembroId(m.id)} className="bg-[#FDFCF0]/50 p-3 rounded-xl flex justify-between items-center cursor-pointer hover:bg-white border border-gray-100 transition-all group">
                        <span className="font-black text-[10px] uppercase text-gray-700 group-hover:text-green-700 italic">{nome}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-green-600">R$ {pagoMembroTotal}</span>
                          <div className={`h-2 w-2 rounded-full ${metaMembro-pagoMembroTotal <= 0 ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-400'}`}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* COLUNA 2: GASTOS */}
        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 italic">Gastos em Bragança</h2>
          <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 min-h-[150px]">
            {saidas.map(s => (
              <div key={s.id} className="mb-4 last:mb-0 border-b border-gray-50 pb-4 last:border-0 italic">
                <div className="flex justify-between items-start mb-1">
                   <span className="text-[8px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase tracking-tighter">{s.mes}</span>
                   <span className="text-xs font-black text-red-600">- R$ {s.valor}</span>
                </div>
                <p className="text-[10px] font-bold text-gray-700 leading-snug">{s.descricao}</p>
              </div>
            ))}
          </div>
        </div>

        {/* COLUNA 3: AUDITORIA */}
        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-4 italic">Auditoria e Extratos</h2>
          <div className="bg-blue-50/50 rounded-[40px] p-6 shadow-sm border border-blue-100 min-h-[150px] italic">
            {docs.map(d => (
              <a key={d.id} href={d.url_arquivo} download target="_blank" className="flex justify-between items-center p-4 mb-3 bg-white rounded-2xl shadow-sm border border-blue-50 hover:bg-blue-600 group transition-all">
                <span className="text-[10px] font-black text-gray-700 uppercase group-hover:text-white tracking-tighter">{d.nome_exibicao}</span>
                <span className="text-blue-600 font-black group-hover:text-white">↓</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      <footer className="mt-20 text-center pb-20 pt-10 border-t border-dashed border-gray-200">
        <input type="password" placeholder="Admin" className="p-3 border rounded-2xl text-xs bg-white shadow-sm focus:outline-none" onChange={e => setSenha(e.target.value)} />
        <button onClick={() => senha === 'FDA2026' && setIsAdmin(true)} className="ml-3 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors italic">Acessar Painel</button>
      </footer>
    </div>
  );
};

const container = document.getElementById('root');
if (container) { createRoot(container).render(<App />); }
