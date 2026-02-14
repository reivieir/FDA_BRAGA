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
  
  const [filtrosGrupos, setFiltrosGrupos] = useState<any>({ 0: 'Todos', 1: 'Todos', 2: 'Todos', 3: 'Todos', 4: 'Todos' });
  const [valoresLote, setValoresLote] = useState<any>({});
  const [valorSaida, setValorSaida] = useState('');
  const [descSaida, setDescSaida] = useState('');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [nomeDoc, setNomeDoc] = useState('');

  const hoje = new Date();
  const mesAtualBr = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(hoje);
  const mesAtual = mesAtualBr.charAt(0).toUpperCase() + mesAtualBr.slice(1);
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
    const { data: m } = await supabase.from('membros').select('*').order('nome');
    const { data: h } = await supabase.from('pagamentos_detalhes').select('*, membros(nome)');
    const { data: s } = await supabase.from('saidas_caixa').select('*').order('data_registro', { ascending: false });
    const { data: d } = await supabase.from('documentos_familia').select('*').order('data_upload', { ascending: false });
    if (m) setMembros(m); if (h) setHistorico(h); if (s) setSaidas(s); if (d) setDocs(d);
  };

  const handleUpload = async () => {
    if (!fileToUpload || !nomeDoc) return alert("Selecione o arquivo e dê um nome!");
    const fileName = `${Date.now()}_${fileToUpload.name}`;
    const { data: up, error: err } = await supabase.storage.from('documentos').upload(fileName, fileToUpload);
    if (err) return alert("Erro no upload: " + err.message);
    const { data: url } = supabase.storage.from('documentos').getPublicUrl(fileName);
    await supabase.from('documentos_familia').insert([{ nome_exibicao: nomeDoc, mes: mesGlobal, url_arquivo: url.publicUrl, tipo: 'extrato' }]);
    setFileToUpload(null); setNomeDoc(''); fetchAll();
  };

  const lancarPagamento = async (id: number, val: string) => {
    if (!val) return;
    await supabase.from('pagamentos_detalhes').insert([{ membro_id: id, valor: parseFloat(val), mes: mesGlobal }]);
    setValoresLote({ ...valoresLote, [id]: '' }); fetchAll();
  };

  const excluirItem = async (id: number, tabela: string) => {
    if (confirm("Excluir?")) { await supabase.from(tabela).delete().eq('id', id); fetchAll(); }
  };

  const totalArrecadado = historico.reduce((acc, h) => acc + Number(h.valor), 0);
  const totalSaidas = saidas.reduce((acc, s) => acc + Number(s.valor), 0);
  const saldoAtual = totalArrecadado - totalSaidas;

  // --- RENDERS ---

  if (selectedMonth) {
    const pags = historico.filter(p => p.mes === selectedMonth);
    return (
      <div className="min-h-screen bg-[#FDFCF0] p-6 font-sans">
        <button onClick={() => setSelectedMonth(null)} className="mb-8 font-black text-[#D4A373] uppercase text-xs">← Voltar</button>
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-black text-white p-8 rounded-[40px] text-center">
            <h2 className="text-4xl font-black uppercase italic">{selectedMonth}</h2>
            <p className="text-2xl font-black text-green-500 mt-2">Saldo R$ {(pags.reduce((a, b) => a + Number(b.valor), 0)).toLocaleString('pt-BR')}</p>
          </div>
          <div className="space-y-2">
            {pags.map(p => (
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
    const pago = pags.reduce((acc, h) => acc + Number(h.valor), 0);
    const meta = getMetaInd(m?.nome || '');
    return (
      <div className="min-h-screen bg-[#FDFCF0] p-6 font-sans">
        <button onClick={() => setSelectedMembroId(null)} className="mb-8 font-black text-[#D4A373] uppercase text-xs">← Voltar</button>
        <div className="max-w-xl mx-auto bg-white p-8 rounded-[40px] shadow-xl border-b-8 border-green-700">
          <h2 className="text-3xl font-black italic uppercase text-gray-800">{m?.nome}</h2>
          <div className="mt-4 p-4 rounded-2xl text-center font-black uppercase text-xs italic bg-blue-50 text-blue-500">
             Histórico de {m?.nome}
          </div>
          <div className="flex justify-between mt-8 text-sm font-bold">
            <span className="text-green-600 font-black text-xl">PAGO R$ {pago}</span>
            <span className="text-gray-400 pt-2 uppercase italic text-xs">Meta R$ {meta}</span>
          </div>
          <div className="mt-8 space-y-3">
            {pags.map(p => (
              <div key={p.id} className="flex justify-between p-4 bg-gray-50 rounded-2xl border text-xs">
                <span className="font-bold text-gray-600 uppercase italic">{p.mes}</span>
                <span className="font-black text-green-600">R$ {p.valor}</span>
              </div>
            ))}
            {pags.length === 0 && <p className="text-center text-gray-300 italic py-10">Nenhum pagamento registrado.</p>}
          </div>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="p-4 bg-gray-100 min-h-screen font-sans pb-20">
        <div className="flex justify-between items-center mb-6 max-w-2xl mx-auto">
           <button onClick={() => setIsAdmin(false)} className="text-blue-600 font-bold text-xs uppercase">← Sair</button>
           <select className="p-2 border rounded-xl text-xs font-bold" value={mesGlobal} onChange={e => setMesGlobal(e.target.value)}>
             {meses.map(m => <option key={m} value={m}>{m}</option>)}
           </select>
        </div>
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* UPLOAD */}
          <div className="bg-blue-900 text-white p-6 rounded-3xl shadow-lg border-b-4 border-blue-400">
            <h2 className="text-[10px] font-black uppercase mb-3 italic">Upload de Extrato</h2>
            <input type="text" placeholder="Nome Ex: extrato_fev-26" className="w-full p-3 rounded-xl text-black text-sm mb-3" value={nomeDoc} onChange={e => setNomeDoc(e.target.value)} />
            <input type="file" className="text-[10px] mb-3" onChange={e => setFileToUpload(e.target.files?.[0] || null)} />
            <button onClick={handleUpload} className="w-full bg-blue-500 font-black p-3 rounded-xl text-xs uppercase italic">Carregar Comprovante</button>
          </div>
          {/* GASTOS */}
          <div className="bg-black text-white p-6 rounded-3xl shadow-lg border-b-4 border-red-500">
             <h2 className="text-[10px] font-black uppercase mb-3 italic">Registrar Gasto</h2>
             <input type="text" placeholder="Descrição" className="w-full p-3 rounded-xl text-black text-sm mb-2" value={descSaida} onChange={e => setDescSaida(e.target.value)} />
             <div className="flex gap-2">
                <input type="number" placeholder="R$" className="w-1/2 p-3 rounded-xl text-black text-sm font-bold" value={valorSaida} onChange={e => setValorSaida(e.target.value)} />
                <button onClick={() => {
                  if (valorSaida && descSaida) {
                    supabase.from('saidas_caixa').insert([{ valor: parseFloat(valorSaida), mes: mesGlobal, descricao: descSaida }]).then(() => { setValorSaida(''); setDescSaida(''); fetchAll(); });
                  }
                }} className="w-1/2 bg-red-600 font-black rounded-xl text-xs uppercase">Confirmar Saída</button>
             </div>
          </div>
          {/* MEMBROS NO PAINEL */}
          {gruposDef.map((g, idx) => (
            <div key={idx} className="bg-white p-5 rounded-3xl shadow-sm border">
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 italic">{g.titulo}</h2>
              <div className="space-y-2">
                {g.nomes.map(nome => {
                  const m = membros.find(x => x.nome === nome);
                  if (!m) return <p key={nome} className="text-[8px] text-red-300">Erro: {nome} não encontrado no banco</p>;
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
        <h1 className="text-4xl md:text-7xl font-black text-[#D4A373] italic uppercase tracking-tighter italic">FAMILIA da <span className="text-green-700">ALEGRIA</span></h1>
        <p className="text-[10px] md:text-sm font-bold text-gray-400 tracking-[0.4em] mt-2 uppercase italic">NATAL 2026 BRAGANÇA CITY</p>
      </header>
      
      {/* DASHBOARD */}
      <div className="max-w-6xl mx-auto bg-black text-white p-8 rounded-[40px] shadow-2xl mb-12 border-b-8 border-green-700">
        <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
          <div className="text-left">
            <p className="text-[10px] text-[#D4A373] font-black uppercase tracking-widest italic">Saldo Disponível em Caixa</p>
            <div className="text-5xl md:text-7xl font-black italic text-green-500 italic">R$ {saldoAtual.toLocaleString('pt-BR')}</div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest italic">Meta Natal 2026</p>
            <div className="text-xl font-bold text-gray-400 italic">R$ {membros.reduce((acc, m) => acc + getMetaInd(m.nome), 0).toLocaleString('pt-BR')}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 border-t border-gray-800 pt-6">
          {meses.map(mes => {
            const sum = historico.filter(h => h.mes === mes).reduce((acc, h) => acc + Number(h.valor), 0);
            return sum > 0 ? (
              <div key={mes} onClick={() => setSelectedMonth(mes)} className="bg-gray-900/50 p-3 rounded-2xl border border-gray-800 cursor-pointer hover:bg-gray-800 transition-all text-center">
                <p className="text-[8px] font-black text-gray-500 uppercase italic">{mes}</p>
                <p className="text-sm font-black text-[#D4A373]">R$ {sum}</p>
              </div>
            ) : null;
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
        {/* GRUPOS RECOLHIDOS */}
        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 italic">Estrutura Familiar</h2>
          {gruposDef.map((g, gIdx) => (
            <div key={gIdx} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <button onClick={() => setExpandedGrupo(expandedGrupo === gIdx ? null : gIdx)} className="w-full p-5 flex justify-between items-center hover:bg-gray-50">
                <div className="text-left">
                  <h2 className="text-sm font-black text-gray-800 uppercase italic tracking-tighter italic">{g.titulo}</h2>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter italic">
                    {g.nomes.filter(n => historico.some(h => h.membros?.nome === n && h.mes === mesAtual)).length} de {g.nomes.length} PAGOS EM {mesAtual.toUpperCase()}
                  </p>
                </div>
                <span className="text-[#D4A373] font-black">{expandedGrupo === gIdx ? '−' : '+'}</span>
              </button>
              <div className={`transition-all duration-300 ${expandedGrupo === gIdx ? 'max-h-[600px] p-4' : 'max-h-0'} overflow-hidden`}>
                <div className="grid grid-cols-1 gap-2">
                  {g.nomes.map(nome => {
                    const m = membros.find(x => x.nome === nome);
                    const pago = m ? historico.filter(h => h.membro_id === m.id).reduce((acc, h) => acc + Number(h.valor), 0) : 0;
                    const meta = getMetaInd(nome);
                    return (
                      <div key={nome} onClick={() => m && setSelectedMembroId(m.id)} className="bg-[#FDFCF0]/50 p-3 rounded-2xl flex justify-between items-center cursor-pointer hover:bg-white border border-gray-100 transition-all">
                        <span className="font-black text-[10px] uppercase italic text-gray-700 italic">{nome}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-green-600 italic">R$ {pago}</span>
                          <div className={`h-1.5 w-1.5 rounded-full ${meta-pago <= 0 ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-400'}`}></div>
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
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 italic">Gastos em Bragança</h2>
          <div className="bg-white rounded-[40px] p-6 shadow-sm border border-gray-100 min-h-[150px] italic">
            {saidas.map(s => (
              <div key={s.id} className="mb-4 last:mb-0 border-b border-gray-50 pb-4 last:border-0 italic">
                <p className="text-[10px] font-bold text-gray-700 italic tracking-tighter leading-tight italic">{s.descricao}</p>
                <p className="text-xs font-black text-red-600 italic">- R$ {s.valor} <span className="text-[8px] text-gray-300 ml-2 uppercase italic">({s.mes})</span></p>
              </div>
            ))}
          </div>
        </div>

        {/* EXTRATOS */}
        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-4 italic tracking-widest">Auditoria e Extratos</h2>
          <div className="bg-blue-50/50 rounded-[40px] p-6 shadow-sm border border-blue-100 min-h-[150px] italic">
            {docs.map(d => (
              <a key={d.id} href={d.url_arquivo} download target="_blank" className="flex justify-between items-center p-4 mb-3 bg-white rounded-2xl shadow-sm border border-blue-50 hover:bg-blue-600 group transition-all">
                <span className="text-[10px] font-black text-gray-700 uppercase italic group-hover:text-white tracking-tighter italic">{d.nome_exibicao}</span>
                <span className="text-blue-600 font-black group-hover:text-white italic">↓</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      <footer className="mt-20 text-center pb-20 pt-10 border-t border-dashed border-gray-200">
        <input type="password" placeholder="Admin" className="p-2 border rounded-xl text-xs bg-white" onChange={e => setSenha(e.target.value)} />
        <button onClick={() => senha === 'FDA2026' && setIsAdmin(true)} className="ml-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black transition-colors italic">Acessar Painel</button>
      </footer>
    </div>
  );
};

const container = document.getElementById('root');
if (container) { createRoot(container).render(<App />); }
export default App;
