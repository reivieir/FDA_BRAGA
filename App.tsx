import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';

// Inicialização segura das chaves
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
  
  const [valoresLote, setValoresLote] = useState<any>({});
  const [valorSaida, setValorSaida] = useState('');
  const [descSaida, setDescSaida] = useState('');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [nomeDoc, setNomeDoc] = useState('');

  // Lógica de Datas
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

  // Funções de Ação
  const handleUpload = async () => {
    if (!fileToUpload || !nomeDoc) return alert("Preencha o nome e o arquivo!");
    const fileName = `${Date.now()}_${fileToUpload.name.replace(/\s/g, '_')}`;
    const { data: up } = await supabase.storage.from('documentos').upload(fileName, fileToUpload);
    if (up) {
      const { data: url } = supabase.storage.from('documentos').getPublicUrl(fileName);
      await supabase.from('documentos_familia').insert([{ nome_exibicao: nomeDoc, mes: mesGlobal, url_arquivo: url.publicUrl, tipo: 'extrato' }]);
      setFileToUpload(null); setNomeDoc(''); fetchAll(); alert("Enviado!");
    }
  };

  const lancarPagamento = async (id: number, val: string) => {
    if (!val) return;
    await supabase.from('pagamentos_detalhes').insert([{ membro_id: id, valor: parseFloat(val), mes: mesGlobal }]);
    setValoresLote({ ...valoresLote, [id]: '' }); fetchAll();
  };

  const lancarSaida = async () => {
    if (!valorSaida || !descSaida) return;
    await supabase.from('saidas_caixa').insert([{ valor: parseFloat(valorSaida), mes: mesGlobal, descricao: descSaida }]);
    setValorSaida(''); setDescSaida(''); fetchAll();
  };

  const excluirItem = async (id: number, tabela: string) => {
    if (confirm("Excluir registro?")) { await supabase.from(tabela).delete().eq('id', id); fetchAll(); }
  };

  // CÁLCULOS DO DASHBOARD
  const totalArrecadado = historico.reduce((acc, h) => acc + Number(h.valor), 0);
  const totalSaidas = saidas.reduce((acc, s) => acc + Number(s.valor), 0);
  const saldoAtual = totalArrecadado - totalSaidas;
  const metaGeral = membros.reduce((acc, m) => acc + getMetaInd(m.nome), 0);

  // --- RENDER: DETALHES DO MÊS ---
  if (selectedMonth) {
    const pagsMes = historico.filter(p => p.mes === selectedMonth);
    const gastoMes = saidas.filter(s => s.mes === selectedMonth).reduce((acc, s) => acc + Number(s.valor), 0);
    return (
      <div className="min-h-screen bg-[#FDFCF0] p-6 font-sans">
        <button onClick={() => setSelectedMonth(null)} className="mb-8 font-black text-[#D4A373] uppercase text-xs">← Voltar</button>
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-black text-white p-8 rounded-[40px] shadow-xl border-b-8 border-red-500 text-center italic">
            <h2 className="text-4xl font-black uppercase tracking-tighter">{selectedMonth}</h2>
            <div className="mt-4 flex justify-between items-center text-left">
               <div>
                 <p className="text-[10px] text-gray-500 font-black uppercase">Saldo Mês</p>
                 <p className="text-2xl font-black text-green-500">R$ {(pagsMes.reduce((a, b) => a + Number(b.valor), 0) - gastoMes).toLocaleString('pt-BR')}</p>
               </div>
               <div className="text-right">
                 <p className="text-[10px] text-gray-500 font-black uppercase tracking-tighter">Gasto Mês: R$ {gastoMes}</p>
                 <p className="text-[10px] text-gray-400 font-black uppercase">Meta: R$ {metaMensalGrupo}</p>
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

  // --- RENDER: DETALHES MEMBRO E REGRA DO CALOTEIRO ---
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
                <span className="font-bold text-gray-600 uppercase tracking-widest">{p.mes}</span>
                <span className="font-black text-green-600">R$ {p.valor}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: PAINEL ADMIN ---
  if (isAdmin) {
    return (
      <div className="p-4 bg-gray-100 min-h-screen font-sans pb-20">
        <div className="flex justify-between items-center mb-6 max-w-2xl mx-auto">
           <button onClick={() => setIsAdmin(false)} className="text-blue-600 font-bold text-xs uppercase italic">← Site</button>
           <select className="p-2 border rounded-xl text-xs font-bold" value={mesGlobal} onChange={e => setMesGlobal(e.target.value)}>
             {meses.map(m => <option key={m} value={m}>{m}</option>)}
           </select>
        </div>
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* UPLOAD DOCUMENTO */}
          <div className="bg-blue-900 text-white p-6 rounded-3xl shadow-lg border-b-4 border-blue-400">
            <h2 className="text-[10px] font-black uppercase mb-3 italic">Upload de Auditoria</h2>
            <input type="text" placeholder="Nome Ex: extrato_fev-26" className="w-full p-3 rounded-xl text-black text-sm mb-3" value={nomeDoc} onChange={e => setNomeDoc(e.target.value)} />
            <input type="file" className="text-[10px] mb-3" onChange={e => setFileToUpload(e.target.files?.[0] || null)} />
            <button onClick={handleUpload} className="w-full bg-blue-500 font-black p-3 rounded-xl text-xs uppercase italic tracking-widest">Enviar Comprovante</button>
          </div>

          {/* LANÇAR GASTO */}
          <div className="bg-black text-white p-6 rounded-3xl shadow-lg border-b-4 border-red-500">
             <h2 className="text-[10px] font-black uppercase mb-3 italic">Registrar Gasto</h2>
             <input type="text" placeholder="Descrição" className="w-full p-3 rounded-xl text-black text-sm mb-2" value={descSaida} onChange={e => setDescSaida(e.target.value)} />
             <div className="flex gap-2">
                <input type="number" placeholder="Valor" className="w-1/2 p-3 rounded-xl text-black text-sm font-bold" value={valorSaida} onChange={e => setValorSaida(e.target.value)} />
                <button onClick={lancarSaida} className="w-1/2 bg-red-600 font-black rounded-xl text-xs uppercase italic">Lançar Saída</button>
             </div>
          </div>

          {/* LISTA MEMBROS */}
          {gruposDef.map((g, idx) => (
            <div key={idx} className="bg-white p-5 rounded-3xl shadow-sm border">
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 italic">{g.titulo}</h2>
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
          
          {/* GESTÃO DE EXCLUSÃO */}
          <div className="bg-white p-5 rounded-3xl border-2 border-dashed border-red-200">
            <h2 className="text-[10px] font-black text-red-500 uppercase mb-3 italic">Histórico de Gastos (Excluir)</h2>
            {saidas.map(s => (
              <div key={s.id} className="flex justify-between items-center p-2 border-b text-[10px] italic">
                <span>{s.mes}: {s.descricao} (R$ {s.valor})</span>
                <button onClick={() => excluirItem(s.id, 'saidas_caixa')} className="text-red-500 font-black">EXCLUIR</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: TELA INICIAL ---
  return (
    <div className="min-h-screen bg-[#FDFCF0] p-4 md:p-10 font-sans text-gray-800">
      <header className="text-center mb-12 italic">
        <h1 className="text-4xl md:text-7xl font-black text-[#D4A373] uppercase tracking-tighter">FAMILIA da <span className="text-green-700">ALEGRIA</span></h1>
        <p className="text-[10px] md:text-sm font-bold text-gray-400 tracking-[0.4em] mt-2 uppercase">NATAL 2026 BRAGANÇA CITY</p>
      </header>

      {/* DASHBOARD: SALDO ATUAL */}
      <div className="max-w-6xl mx-auto bg-black text-white p-8 rounded-[40px] shadow-2xl mb-12 border-b-8 border-green-700">
        <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
          <div className="text-left italic">
            <p className="text-[10px] text-[#D4A373] font-black uppercase tracking-widest">Saldo Disponível</p>
            <div className="text-5xl md:text-7xl font-black text-green-500">R$ {saldoAtual.toLocaleString('pt-BR')}</div>
            <p className="text-[10px] font-black uppercase opacity-50 mt-2 tracking-tighter italic">Arrecadado: R$ {totalArrecadado} | Saídas: R$ {totalSaidas}</p>
          </div>
          <div className="text-right italic">
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Meta Bragança</p>
            <div className="text-xl font-bold text-gray-400">R$ {metaGeral.toLocaleString('pt-BR')}</div>
          </div>
        </div>
        <div className="w-full bg-gray-800 h-4 rounded-full overflow-hidden mb-8">
          <div className="bg-green-500 h-full transition-all duration-1000 shadow-[0_0_20px_rgba(34,197,94,0.3)]" style={{ width: `${(totalArrecadado/metaGeral)*100}%` }}></div>
        </div>
        
        {/* CARDS MENSAIS CLICÁVEIS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 border-t border-gray-800 pt-6">
          {meses.map(mes => {
            const sum = historico.filter(h => h.mes === mes).reduce((acc, h) => acc + Number(h.valor), 0);
            return sum > 0 ? (
              <div key={mes} onClick={() => setSelectedMonth(mes)} className="bg-gray-900/50 p-3 rounded-2xl border border-gray-800 cursor-pointer hover:bg-gray-800 transition-all text-center group italic">
                <p className="text-[8px] font-black text-gray-500 uppercase">{mes}</p>
                <p className="text-sm font-black text-[#D4A373] group-hover:scale-110 transition-transform">R$ {sum}</p>
                <p className="text-[7px] font-bold text-gray-600 uppercase mt-1 tracking-tighter">Meta R$ {metaMensalGrupo}</p>
              </div>
            ) : null;
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20 italic">
        {/* GRUPOS RECOLHIDOS */}
        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Estrutura Familiar</h2>
          {gruposDef.map((g, gIdx) => (
            <div key={gIdx} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <button onClick={() => setExpandedGrupo(expandedGrupo === gIdx ? null : gIdx)} className="w-full p-5 flex justify-between items-center hover:bg-gray-50 transition-all">
                <div className="text-left">
                  <h2 className="text-sm font-black text-gray-800 uppercase tracking-tighter">{g.titulo}</h2>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">
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
                        <span className="font-black text-[10px] uppercase text-gray-700 group-hover:text-green-700">{nome}</span>
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

        {/* GASTOS */}
        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Gastos Bragança City</h2>
          <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 min-h-[150px]">
            {saidas.map(s => (
              <div key={s.id} className="mb-4 last:mb-0 border-b border-gray-50 pb-4 last:border-0">
                <div className="flex justify-between items-start mb-1">
                   <span className="text-[8px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase tracking-tighter">{s.mes}</span>
                   <span className="text-xs font-black text-red-600">- R$ {s.valor}</span>
                </div>
                <p className="text-[10px] font-bold text-gray-700 leading-snug">{s.descricao}</p>
              </div>
            ))}
            {saidas.length === 0 && <p className="text-center text-gray-300 text-[10px] py-10 uppercase tracking-widest">Nenhum gasto registrado.</p>}
          </div>
        </div>

        {/* EXTRATOS */}
        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-4">Auditoria e Extratos</h2>
          <div className="bg-blue-50/50 rounded-[40px] p-6 shadow-sm border border-blue-100 min-h-[150px]">
            {docs.map(d => (
              <a key={d.id} href={d.url_arquivo} download target="_blank" className="flex justify-between items-center p-4 mb-3 bg-white rounded-2xl shadow-sm border border-blue-50 hover:bg-blue-600 group transition-all">
                <span className="text-[10px] font-black text-gray-700 uppercase group-hover:text-white tracking-tighter">{d.nome_exibicao}</span>
                <span className="text-blue-600 font-black group-hover:text-white italic">↓</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      <footer className="mt-20 text-center pb-20 pt-10 border-t border-dashed border-gray-200">
        <input type="password" placeholder="Admin" className="p-3 border rounded-2xl text-xs bg-white shadow-sm focus:outline-none" onChange={e => setSenha(e.target.value)} />
        <button onClick={() => senha === 'FDA2026' && setIsAdmin(true)} className="ml-3 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors">Acessar Painel</button>
      </footer>
    </div>
  );
};

const container = document.getElementById('root');
if (container) { createRoot(container).render(<App />); }
