import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';

// Inicialização estável do ecossistema
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
  
  // Mapeamento Mobile vs Banco de Dados
  const mesesMap: { [key: string]: string } = {
    "Fev": "Fevereiro", "Mar": "Março", "Abr": "Abril", "Mai": "Maio", 
    "Jun": "Junho", "Jul": "Julho", "Ago": "Agosto", "Set": "Setembro", 
    "Out": "Outubro", "Nov": "Novembro", "Dez": "Dezembro"
  };
  const mesesAbbr = Object.keys(mesesMap);

  const mesAtualBr = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(hoje);
  const mesAtualFull = mesAtualBr.charAt(0).toUpperCase() + mesAtualBr.slice(1);
  const [mesGlobal, setMesGlobal] = useState(mesAtualFull);

  // REGRAS FINANCEIRAS CALIBRADAS
  const getMetaMensal = (mes: string) => (mes === "Fevereiro" || mes === "Fev") ? 1590 : 1850;
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
      setFileToUpload(null); setNomeDoc(''); fetchAll();
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
    setValorSaida(''); setDescSaida(''); fetchAll();
  };

  const excluirItem = async (id: number, tabela: string) => {
    if (window.confirm("Deseja realmente excluir este registro?")) {
      await supabase.from(tabela).delete().eq('id', id); fetchAll();
    }
  };

  const excluirDoc = async (id: number, url: string) => {
    if (window.confirm("Excluir comprovante permanentemente?")) {
      const fileName = url.split('/').pop();
      if (fileName) await supabase.storage.from('documentos').remove([fileName]);
      await supabase.from('documentos_familia').delete().eq('id', id); fetchAll();
    }
  };

  // BALANÇO ACUMULADO
  const totalArrecadado = historico.reduce((acc, h) => acc + Number(h.valor), 0);
  const totalSaidas = saidas.reduce((acc, s) => acc + Number(s.valor), 0);
  const saldoAtual = totalArrecadado - totalSaidas;

  // --- RENDERS CONDICIONAIS ---
  if (selectedMonth) {
    const mesDb = mesesMap[selectedMonth] || selectedMonth;
    const pagsMes = historico.filter(p => p.mes === mesDb);
    const arrecMes = pagsMes.reduce((acc, p) => acc + Number(p.valor), 0);
    const saidaMes = saidas.filter(s => s.mes === mesDb).reduce((acc, s) => acc + Number(s.valor), 0);
    const pagantesCount = new Set(pagsMes.map(p => p.membro_id)).size;

    return (
      <div className="min-h-screen bg-[#FDFCF0] p-6 font-sans text-gray-800 italic">
        <button onClick={() => setSelectedMonth(null)} className="mb-8 font-black text-[#D4A373] uppercase text-xs tracking-widest italic">← Voltar</button>
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-black text-white p-8 rounded-[40px] shadow-xl border-b-8 border-red-500 text-center italic">
            <h2 className="text-4xl font-black uppercase tracking-tighter italic">{selectedMonth}</h2>
            <div className="mt-4 border-t border-gray-800 pt-4 flex justify-between items-end italic">
              <div className="text-left italic">
                <p className="text-[10px] text-gray-500 uppercase italic">Saldo Mês</p>
                <p className="text-2xl font-black text-green-500 italic">R$ {(arrecMes - saidaMes).toLocaleString('pt-BR')}</p>
                <p className="text-[11px] text-[#D4A373] font-black uppercase mt-1 tracking-tighter italic">{pagantesCount} de 27 pagaram</p>
              </div>
              <div className="text-right italic">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest italic">Meta: R$ {getMetaMensal(mesDb)}</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {pagsMes.map(p => (
              <div key={p.id} className="bg-white p-4 rounded-2xl flex justify-between border italic shadow-sm">
                <span className="font-black text-gray-700 uppercase text-xs italic">{p.membros?.nome}</span>
                <span className="font-black text-green-600 text-xs italic">R$ {p.valor}</span>
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
        <div className="flex justify-between items-center mb-6 max-w-2xl mx-auto italic">
           <button onClick={() => setIsAdmin(false)} className="text-blue-600 font-bold text-xs uppercase tracking-widest italic">← Site</button>
           <select className="p-2 border rounded-xl text-xs font-bold bg-white italic" value={mesGlobal} onChange={e => setMesGlobal(e.target.value)}>
             {Object.values(mesesMap).map(m => <option key={m} value={m}>{m}</option>)}
           </select>
        </div>
        <div className="space-y-6 max-w-2xl mx-auto italic">
          {/* GESTÃO DE DOCUMENTOS COM EXCLUSÃO */}
          <div className="bg-blue-900 text-white p-6 rounded-3xl shadow-lg border-b-4 border-blue-400 italic">
            <h2 className="text-[10px] font-black uppercase mb-4 tracking-widest italic">1. Auditoria (Upload e Exclusão)</h2>
            <div className="flex gap-2 mb-4 italic">
              <input type="text" placeholder="Ex: Extrato Fev" className="flex-1 p-3 rounded-xl text-black text-xs italic" value={nomeDoc} onChange={e => setNomeDoc(e.target.value)} />
              <input type="file" className="w-24 text-[8px] pt-3" onChange={e => setFileToUpload(e.target.files?.[0] || null)} />
              <button onClick={handleUpload} className="bg-blue-500 px-4 rounded-xl text-[10px] font-black italic">SUBIR</button>
            </div>
            <div className="space-y-2 border-t border-blue-800 pt-3 italic">
              {docs.map(d => (
                <div key={d.id} className="flex justify-between items-center bg-blue-800/30 p-2 rounded-lg text-[9px] italic">
                  <span>{d.mes}: {d.nome_exibicao}</span>
                  <button onClick={() => excluirDoc(d.id, d.url_arquivo)} className="text-red-400 font-black italic">EXCLUIR</button>
                </div>
              ))}
            </div>
          </div>
          {/* LANÇAR E EXCLUIR GASTOS */}
          <div className="bg-black text-white p-6 rounded-3xl shadow-lg border-b-4 border-red-500 italic">
            <h2 className="text-[10px] font-black uppercase mb-4 tracking-widest italic">2. Lançar Gasto Bragança</h2>
            <input type="text" placeholder="Descrição" className="w-full p-3 rounded-xl text-black text-sm mb-3 italic" value={descSaida} onChange={e => setDescSaida(e.target.value)} />
            <div className="flex gap-2 italic">
                <input type="number" placeholder="R$" className="w-1/2 p-3 rounded-xl text-black text-sm font-bold italic" value={valorSaida} onChange={e => setValorSaida(e.target.value)} />
                <button onClick={lancarSaida} className="w-1/2 bg-red-600 font-black rounded-xl text-xs uppercase italic">Registrar</button>
            </div>
            <div className="mt-4 space-y-2 border-t border-gray-800 pt-4 italic">
               {saidas.slice(0, 5).map(s => (
                 <div key={s.id} className="flex justify-between items-center text-[9px] italic">
                   <span>{s.mes}: {s.descricao} (R$ {s.valor})</span>
                   <button onClick={() => excluirItem(s.id, 'saidas_caixa')} className="text-red-500 font-bold italic">X</button>
                 </div>
               ))}
            </div>
          </div>
          {/* LANÇAR PAGAMENTOS */}
          {gruposDef.map((g, idx) => (
            <div key={idx} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200 italic">
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 italic">{g.titulo}</h2>
              <select className="w-full p-3 border rounded-xl mb-4 bg-gray-50 text-sm font-bold italic" value={filtrosGrupos[idx]} onChange={e => setFiltrosGrupos({...filtrosGrupos, [idx]: e.target.value})}>
                <option value="Todos">Lançar Novo PIX</option>
                {g.nomes.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <div className="space-y-2 italic">
                {g.nomes.filter(n => filtrosGrupos[idx] === 'Todos' || filtrosGrupos[idx] === n).map(nome => {
                  const m = membros.find(x => x.nome === nome);
                  if (!m) return null;
                  if (filtrosGrupos[idx] === 'Todos') {
                    return (
                      <div key={m.id} className="flex items-center gap-2 border-t pt-2 border-gray-50 italic">
                        <span className="text-[10px] font-black w-24 truncate uppercase italic italic">{m.nome}</span>
                        <input type="number" className="flex-1 p-2 border rounded-lg text-xs font-bold italic" value={valoresLote[m.id] || ''} onChange={e => setValoresLote({...valoresLote, [m.id]: e.target.value})} />
                        <button onClick={() => lancarPagamento(m.id, valoresLote[m.id])} className="bg-green-600 text-white px-3 py-2 rounded-lg text-[10px] font-black italic">OK</button>
                      </div>
                    );
                  } else {
                    return historico.filter(h => h.membro_id === m.id).map(p => (
                      <div key={p.id} className="flex justify-between items-center p-3 bg-red-50/30 rounded-xl border border-red-100 italic">
                        <span className="text-[10px] font-bold italic italic">{p.mes}: R$ {p.valor}</span>
                        <button onClick={() => excluirItem(p.id, 'pagamentos_detalhes')} className="text-red-500 font-black text-[10px] uppercase italic">EXCLUIR</button>
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

  return (
    <div className="min-h-screen bg-[#0B0C10] p-4 md:p-8 font-sans text-white italic">
      {/* CABEÇALHO ACUMULADO REAL */}
      <div className="max-w-4xl mx-auto bg-[#121418] rounded-[40px] p-6 md:p-8 shadow-2xl border border-gray-800 mb-8 italic">
        <div className="flex flex-col md:flex-row justify-between gap-6 mb-8 italic">
          <div className="flex-1 italic">
            <p className="text-[10px] text-[#D4A373] font-black uppercase tracking-widest mb-1 italic">SALDO EM CAIXA (ACUMULADO)</p>
            <h1 className="text-4xl md:text-7xl font-black text-[#22c55e] italic tracking-tighter italic">R$ {saldoAtual.toLocaleString('pt-BR')}</h1>
          </div>
          <div className="bg-[#1A1D23] p-4 rounded-3xl border border-gray-800 self-start md:self-center italic">
            <p className="text-[8px] text-gray-500 font-black uppercase mb-1 italic italic">ARRECADADO TOTAL:</p>
            <p className="text-xl font-black italic italic italic">R$ {totalArrecadado.toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <div className="mb-8 italic">
           <div className="flex justify-between items-end mb-2 italic">
              <div>
                <p className="text-[9px] text-gray-500 font-black uppercase italic italic">META GLOBAL BRAGANÇA</p>
                <p className="text-xl font-black italic italic italic">R$ {metaGlobalBragança.toLocaleString('pt-BR')}</p>
              </div>
              <p className="text-xl font-black text-[#22c55e] italic italic italic">{( (totalArrecadado/metaGlobalBragança)*100 ).toFixed(1)}%</p>
           </div>
           <div className="w-full bg-[#1A1D23] h-3 rounded-full overflow-hidden border border-gray-800 italic">
              <div className="bg-[#22c55e] h-full transition-all duration-1000" style={{ width: `${(totalArrecadado/metaGlobalBragança)*100}%` }}></div>
           </div>
        </div>

        <div className="mt-8 italic">
           <h2 className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-4 italic italic italic">EVOLUÇÃO MENSAL</h2>
           <div className="overflow-x-auto -mx-6 px-6 italic">
             <table className="w-full text-left border-collapse min-w-[280px] italic">
               <thead>
                 <tr className="border-b border-gray-800 text-[8px] text-gray-600 font-black uppercase italic italic">
                   <th className="pb-3 italic italic italic">MÊS</th>
                   <th className="pb-3 text-green-500 italic italic italic">ARREC.</th>
                   <th className="pb-3 text-red-500 italic italic italic">SAÍDA</th>
                   <th className="pb-3 text-right italic italic italic">STATUS (%)</th>
                 </tr>
               </thead>
               <tbody className="text-[10px] font-bold italic">
                 {mesesAbbr.map(mesAbbr => {
                   const mesDb = mesesMap[mesAbbr];
                   const arrec = historico.filter(h => h.mes === mesDb).reduce((acc, h) => acc + Number(h.valor), 0);
                   const saidaMes = saidas.filter(s => s.mes === mesDb).reduce((acc, s) => acc + Number(s.valor), 0);
                   const meta = getMetaMensal(mesDb);
                   const perc = ((arrec/meta)*100).toFixed(0);
                   return (
                     <tr key={mesAbbr} onClick={() => setSelectedMonth(mesAbbr)} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-all cursor-pointer italic">
                       <td className="py-4 text-gray-300 italic italic italic">{mesAbbr}</td>
                       <td className="py-4 text-green-500 italic italic italic">{arrec > 0 ? `R$ ${arrec}` : '—'}</td>
                       <td className="py-4 text-red-400 italic italic italic">{saidaMes > 0 ? `R$ ${saidaMes}` : '—'}</td>
                       <td className={`py-4 text-right italic italic italic ${arrec >= meta ? 'text-[#22c55e]' : 'text-gray-600'}`}>
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

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24 italic">
        <div className="space-y-4 italic">
          <h2 className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-4 italic italic">Membros</h2>
          {gruposDef.map((g, gIdx) => (
            <div key={gIdx} className="bg-[#121418] rounded-3xl border border-gray-800 overflow-hidden shadow-sm italic italic">
              <button onClick={() => setExpandedGrupo(expandedGrupo === gIdx ? null : gIdx)} className="w-full p-4 flex justify-between items-center hover:bg-gray-800 transition-all italic italic">
                <div className="text-left italic italic">
                  <h2 className="text-xs font-black text-gray-300 uppercase italic italic italic">{g.titulo}</h2>
                  <p className="text-[7px] font-black text-gray-600 uppercase mt-1 italic italic italic">
                    {g.nomes.filter(n => historico.some(h => h.membros?.nome === n && h.mes === mesAtualFull)).length} de {g.nomes.length} QUITADOS
                  </p>
                </div>
                <span className="text-[#D4A373] text-sm font-black italic italic italic">{expandedGrupo === gIdx ? '−' : '+'}</span>
              </button>
              <div className={`transition-all duration-300 ${expandedGrupo === gIdx ? 'max-h-[800px] p-4' : 'max-h-0'} overflow-hidden italic`}>
                <div className="grid grid-cols-1 gap-2 italic">
                  {g.nomes.map(nome => {
                    const m = membros.find(x => x.nome === nome);
                    const pagoMembro = m ? historico.filter(h => h.membro_id === m.id).reduce((acc, h) => acc + Number(h.valor), 0) : 0;
                    const metaMembro = getMetaInd(nome);
                    return (
                      <div key={nome} onClick={() => m && setSelectedMembroId(m.id)} className="bg-[#1A1D23] p-3 rounded-xl flex justify-between items-center border border-gray-800 italic">
                        <span className="font-black text-[9px] uppercase text-gray-500 italic italic italic">{nome}</span>
                        <div className="flex items-center gap-2 italic italic">
                          <span className="text-[9px] font-black text-[#22c55e] italic italic italic">R$ {pagoMembro}</span>
                          <div className={`h-1 w-1 rounded-full italic italic ${pagoMembro >= metaMembro ? 'bg-[#22c55e]' : 'bg-red-900'}`}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* RESTAURADO: EXTRATOS DE DEPÓSITOS (ANEXOS) */}
        <div className="space-y-4 italic">
          <h2 className="text-[9px] font-black text-blue-900 uppercase tracking-widest ml-4 italic italic">Auditoria e Extratos</h2>
          <div className="bg-blue-950/10 rounded-[30px] p-6 border border-blue-900/30 min-h-[120px] italic">
            {docs.length > 0 ? docs.map(d => (
              <a key={d.id} href={d.url_arquivo} download target="_blank" className="flex justify-between items-center p-3 mb-2 bg-[#121418] rounded-xl border border-gray-800 italic italic italic hover:bg-blue-900/20 transition-all">
                <span className="text-[9px] font-black text-gray-500 uppercase truncate pr-2 italic italic italic">{d.nome_exibicao}</span>
                <span className="text-blue-900 font-black italic italic italic">↓</span>
              </a>
            )) : <p className="text-[8px] text-gray-600 text-center italic">Nenhum extrato disponível.</p>}
          </div>
        </div>

        {/* SAÍDAS DETALHADAS */}
        <div className="space-y-4 italic">
          <h2 className="text-[9px] font-black text-red-900 uppercase tracking-widest ml-4 italic italic">Saídas Registradas</h2>
          <div className="bg-[#121418] rounded-[30px] p-6 border border-gray-800 min-h-[120px] italic">
            {saidas.slice(0, 5).map(s => (
              <div key={s.id} className="mb-3 border-b border-gray-800 pb-3 last:border-0 italic">
                <div className="flex justify-between items-start mb-1 text-[7px] font-black italic italic italic">
                   <span className="bg-red-900/30 text-red-500 px-2 py-0.5 rounded-full uppercase italic">{s.mes}</span>
                   <span className="text-red-500 italic">R$ {s.valor}</span>
                </div>
                <p className="text-[9px] font-bold text-gray-400 italic italic">{s.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="mt-6 text-center pb-20 pt-6 border-t border-dashed border-gray-800 italic italic italic">
        <input type="password" placeholder="Admin" className="p-2 border border-gray-800 rounded-xl text-[10px] bg-[#121418] text-white focus:outline-none w-24 italic" onChange={e => setSenha(e.target.value)} />
        <button onClick={() => senha === 'FDA2026' && setIsAdmin(true)} className="ml-2 text-[9px] font-black text-gray-600 uppercase tracking-widest italic">Acessar Painel</button>
      </footer>
    </div>
  );
};

const container = document.getElementById('root');
if (container) { createRoot(container).render(<App />); }
export default App;
