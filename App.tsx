import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL || '', import.meta.env.VITE_SUPABASE_ANON_KEY || '');

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

  const meses = ["Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const mesAtual = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date()).replace(/^\w/, c => c.toUpperCase());
  const [mesGlobal, setMesGlobal] = useState(mesAtual);

  const gruposDef = [
    { titulo: "Grupo Adriana", nomes: ["Adriana", "Silvinho", "Adriano", "Angela", "Vini", "Stefany"] },
    { titulo: "Grupo Helena", nomes: ["Helena", "Antonio", "Paty", "Jair", "Giovana", "Manu", "Pablo"] },
    { titulo: "Grupo Clarice", nomes: ["Clarice", "Gilson", "Deia", "Helio", "Amanda", "Reinaldo"] },
    { titulo: "Grupo Katia", nomes: ["Katia", "Giovani", "Cintia", "Rafael", "Ju", "Bia"] },
    { titulo: "Grupo Julia", nomes: ["Julia", "Juan"] }
  ];

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const { data: m } = await supabase.from('membros').select('*').order('nome');
    const { data: h } = await supabase.from('pagamentos_detalhes').select('*, membros(nome)');
    const { data: s } = await supabase.from('saidas_caixa').select('*').order('data_registro', { ascending: false });
    const { data: d } = await supabase.from('documentos_familia').select('*').order('data_upload', { ascending: false });
    if (m) setMembros(m); if (h) setHistorico(h); if (s) setSaidas(s); if (d) setDocs(d);
  };

  const handleUpload = async () => {
    if (!fileToUpload || !nomeDoc) return alert("Preencha o nome e selecione um arquivo!");
    const fileName = `${Date.now()}_${fileToUpload.name.replace(/\s/g, '_')}`;
    const { data: up, error: err } = await supabase.storage.from('documentos').upload(fileName, fileToUpload);
    
    if (err) return alert("Erro no upload: " + err.message);
    
    const { data: url } = supabase.storage.from('documentos').getPublicUrl(fileName);
    await supabase.from('documentos_familia').insert([{ nome_exibicao: nomeDoc, mes: mesGlobal, url_arquivo: url.publicUrl, tipo: 'extrato' }]);
    setFileToUpload(null); setNomeDoc(''); fetchAll();
    alert("Documento carregado com sucesso!");
  };

  const lancarPagamento = async (id: number, val: string) => {
    if (!val) return;
    await supabase.from('pagamentos_detalhes').insert([{ membro_id: id, valor: parseFloat(val), mes: mesGlobal }]);
    setValoresLote({ ...valoresLote, [id]: '' }); fetchAll();
  };

  const totalArrecadado = historico.reduce((acc, h) => acc + Number(h.valor), 0);
  const totalSaidas = saidas.reduce((acc, s) => acc + Number(s.valor), 0);
  const saldoAtual = totalArrecadado - totalSaidas;

  // --- RENDERS ---

  if (selectedMembroId) {
    const m = membros.find(x => x.id === selectedMembroId);
    const pags = historico.filter(h => h.membro_id === selectedMembroId);
    return (
      <div className="min-h-screen bg-[#FDFCF0] p-6 font-sans">
        <button onClick={() => setSelectedMembroId(null)} className="mb-8 font-black text-[#D4A373] uppercase text-xs">← Voltar</button>
        <div className="max-w-xl mx-auto bg-white p-8 rounded-[40px] shadow-xl border-b-8 border-green-700">
          <h2 className="text-3xl font-black italic uppercase text-gray-800">{m?.nome || "Membro"}</h2>
          <div className="mt-8 space-y-3">
            {pags.length > 0 ? pags.map(p => (
              <div key={p.id} className="flex justify-between p-4 bg-gray-50 rounded-2xl border text-xs italic">
                <span className="font-bold text-gray-600 uppercase">{p.mes}</span>
                <span className="font-black text-green-600">R$ {p.valor}</span>
              </div>
            )) : <p className="text-center text-gray-300 py-10 uppercase text-[10px] font-black italic tracking-widest">Nenhum pagamento registrado ainda.</p>}
          </div>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="p-4 bg-gray-100 min-h-screen font-sans pb-20">
        <div className="flex justify-between items-center mb-6 max-w-2xl mx-auto">
           <button onClick={() => setIsAdmin(false)} className="text-blue-600 font-bold text-xs uppercase tracking-widest">← Site</button>
           <select className="p-2 border rounded-xl text-xs font-bold" value={mesGlobal} onChange={e => setMesGlobal(e.target.value)}>
             {meses.map(m => <option key={m} value={m}>{m}</option>)}
           </select>
        </div>
        <div className="space-y-6 max-w-2xl mx-auto">
          <div className="bg-blue-900 text-white p-6 rounded-3xl shadow-lg border-b-4 border-blue-400">
            <h2 className="text-[10px] font-black uppercase mb-3 italic tracking-widest">Upload de Auditoria</h2>
            <input type="text" placeholder="Nome do Extrato (ex: Extrato_Fev)" className="w-full p-3 rounded-xl text-black text-sm mb-3" value={nomeDoc} onChange={e => setNomeDoc(e.target.value)} />
            <input type="file" className="text-[10px] mb-3" onChange={e => setFileToUpload(e.target.files?.[0] || null)} />
            <button onClick={handleUpload} className="w-full bg-blue-500 font-black p-3 rounded-xl text-xs uppercase italic">Carregar Documento</button>
          </div>
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF0] p-4 md:p-10 font-sans text-gray-800">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-7xl font-black text-[#D4A373] italic uppercase tracking-tighter">FAMILIA da <span className="text-green-700">ALEGRIA</span></h1>
        <p className="text-[10px] md:text-sm font-bold text-gray-400 tracking-[0.4em] mt-2 uppercase italic">NATAL 2026 BRAGANÇA CITY</p>
      </header>
      
      <div className="max-w-6xl mx-auto bg-black text-white p-8 rounded-[40px] shadow-2xl mb-12 border-b-8 border-green-700">
        <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
          <div className="text-left">
            <p className="text-[10px] text-[#D4A373] font-black uppercase tracking-widest italic">Saldo Disponível em Caixa</p>
            <div className="text-5xl md:text-7xl font-black italic text-green-500">R$ {saldoAtual.toLocaleString('pt-BR')}</div>
          </div>
          <div className="text-right">
             <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Status Bragança City</p>
             <div className="text-xl font-bold text-gray-400 italic">R$ {totalArrecadado} Arrecadado</div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 italic">Estrutura Familiar</h2>
          {gruposDef.map((g, gIdx) => (
            <div key={gIdx} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <button onClick={() => setExpandedGrupo(expandedGrupo === gIdx ? null : gIdx)} className="w-full p-5 flex justify-between items-center hover:bg-gray-50">
                <div className="text-left">
                  <h2 className="text-sm font-black text-gray-800 uppercase italic tracking-tighter italic">{g.titulo}</h2>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic tracking-tighter">
                    {g.nomes.filter(n => historico.some(h => h.membros?.nome === n && h.mes === mesAtual)).length} de {g.nomes.length} QUITADOS NO MÊS
                  </p>
                </div>
                <span className="text-[#D4A373] font-black">{expandedGrupo === gIdx ? '−' : '+'}</span>
              </button>
              <div className={`transition-all duration-300 ${expandedGrupo === gIdx ? 'max-h-[800px] p-4' : 'max-h-0'} overflow-hidden`}>
                <div className="grid grid-cols-1 gap-2">
                  {g.nomes.map(nome => {
                    const m = membros.find(x => x.nome === nome);
                    const pago = m ? historico.filter(h => h.membro_id === m.id).reduce((acc, h) => acc + Number(h.valor), 0) : 0;
                    return (
                      <div key={nome} onClick={() => m && setSelectedMembroId(m.id)} className="bg-[#FDFCF0]/50 p-3 rounded-2xl flex justify-between items-center cursor-pointer hover:bg-white border transition-all">
                        <span className="font-black text-[10px] uppercase italic text-gray-700">{nome}</span>
                        <span className="text-[10px] font-black text-green-600 italic">R$ {pago}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 italic">Gastos Bragança</h2>
          <div className="bg-white rounded-[40px] p-6 shadow-sm border border-gray-100 min-h-[150px] italic">
            {saidas.map(s => (
              <div key={s.id} className="mb-4 last:mb-0 border-b border-gray-50 pb-4 last:border-0 italic">
                <p className="text-[10px] font-bold text-gray-700 italic tracking-tighter leading-tight">{s.descricao}</p>
                <p className="text-xs font-black text-red-600">- R$ {s.valor} <span className="text-[8px] text-gray-300 ml-2 uppercase">({s.mes})</span></p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-4 italic">Auditoria e Extratos</h2>
          <div className="bg-blue-50/50 rounded-[40px] p-6 shadow-sm border border-blue-100 min-h-[150px] italic">
            {docs.map(d => (
              <a key={d.id} href={d.url_arquivo} download target="_blank" className="flex justify-between items-center p-4 mb-3 bg-white rounded-2xl shadow-sm border border-blue-50 hover:bg-blue-600 group transition-all">
                <span className="text-[10px] font-black text-gray-700 uppercase italic group-hover:text-white tracking-tighter">{d.nome_exibicao}</span>
                <span className="text-blue-600 font-black group-hover:text-white">↓</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      <footer className="mt-20 text-center pb-20 pt-10 border-t border-dashed border-gray-200">
        <input type="password" placeholder="Admin" className="p-2 border rounded-xl text-xs bg-white" onChange={e => setSenha(e.target.value)} />
        <button onClick={() => senha === 'FDA2026' && setIsAdmin(true)} className="ml-2 text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Acessar Painel</button>
      </footer>
    </div>
  );
};

const container = document.getElementById('root');
if (container) { createRoot(container).render(<App />); }
