import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL || '', import.meta.env.VITE_SUPABASE_ANON_KEY || '');

const App = () => {
  const [membros, setMembros] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [saidas, setSaidas] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]); // Novo estado para documentos
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedMembroId, setSelectedMembroId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [expandedGrupo, setExpandedGrupo] = useState<number | null>(null);
  const [senha, setSenha] = useState('');
  
  const [filtrosGrupos, setFiltrosGrupos] = useState<any>({ 0: 'Todos', 1: 'Todos', 2: 'Todos', 3: 'Todos', 4: 'Todos' });
  const [valoresLote, setValoresLote] = useState<any>({});
  const [valorSaida, setValorSaida] = useState('');
  const [descSaida, setDescSaida] = useState('');
  
  // Estados para Upload
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [nomeDoc, setNomeDoc] = useState('');
  const [tipoDoc, setTipoDoc] = useState('extrato');

  const hoje = new Date();
  const diaDoMes = hoje.getDate();
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

  const getMeta = (nome: string) => nome === 'Pablo' ? 330 : 660;

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
    if (!fileToUpload || !nomeDoc) return;
    const fileName = `${Date.now()}_${fileToUpload.name}`;
    const { data: upData, error: upError } = await supabase.storage.from('documentos').upload(fileName, fileToUpload);
    
    if (upData) {
      const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(fileName);
      await supabase.from('documentos_familia').insert([{ nome_exibicao: nomeDoc, mes: mesGlobal, url_arquivo: urlData.publicUrl, tipo: tipoDoc }]);
      setFileToUpload(null); setNomeDoc('');
      fetchAll();
    }
  };

  const excluirDoc = async (id: number, url: string) => {
    if (window.confirm("Excluir documento permanentemente?")) {
      const fileName = url.split('/').pop();
      if (fileName) await supabase.storage.from('documentos').remove([fileName]);
      await supabase.from('documentos_familia').delete().eq('id', id);
      fetchAll();
    }
  };

  const lancarPagamento = async (id: number, valor: string) => {
    if (!valor || parseFloat(valor) <= 0) return;
    await supabase.from('pagamentos_detalhes').insert([{ membro_id: id, valor: parseFloat(valor), mes: mesGlobal }]);
    setValoresLote({ ...valoresLote, [id]: '' });
    fetchAll();
  };

  const lancarSaida = async () => {
    if (!valorSaida || !descSaida) return;
    await supabase.from('saidas_caixa').insert([{ valor: parseFloat(valorSaida), mes: mesGlobal, descricao: descSaida }]);
    setValorSaida(''); setDescSaida('');
    fetchAll();
  };

  const excluirItem = async (id: number, tabela: string) => {
    if (window.confirm("Excluir registro?")) {
      await supabase.from(tabela).delete().eq('id', id);
      fetchAll();
    }
  };

  const calcPago = (id: number) => historico.filter(h => h.membro_id === id).reduce((acc, h) => acc + Number(h.valor), 0);
  const totalArrecadado = historico.reduce((acc, h) => acc + Number(h.valor), 0);
  const totalSaidas = saidas.reduce((acc, s) => acc + Number(s.valor), 0);
  const saldoAtual = totalArrecadado - totalSaidas;
  const metaGeral = membros.reduce((acc, m) => acc + getMeta(m.nome), 0);

  // --- RENDERS ---

  if (isAdmin) {
    return (
      <div className="p-4 bg-gray-100 min-h-screen font-sans pb-20">
        <div className="flex justify-between items-center mb-6 max-w-2xl mx-auto">
           <button onClick={() => setIsAdmin(false)} className="text-blue-600 font-bold text-xs uppercase">← Site</button>
           <select className="p-2 border rounded-xl text-xs font-bold" value={mesGlobal} onChange={e => setMesGlobal(e.target.value)}>
             {meses.map(m => <option key={m} value={m}>{m}</option>)}
           </select>
        </div>

        <div className="space-y-6 max-w-2xl mx-auto">
          {/* UPLOAD DE DOCUMENTOS */}
          <div className="bg-blue-900 text-white p-6 rounded-3xl shadow-lg border-b-4 border-blue-400">
            <h2 className="text-[10px] font-black uppercase tracking-widest mb-4 italic">Upload de Extratos/Comprovantes</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Ex: Extrato_Fev-26" className="w-full p-3 rounded-xl text-black text-sm" value={nomeDoc} onChange={e => setNomeDoc(e.target.value)} />
              <div className="flex gap-2">
                <select className="w-1/2 p-3 rounded-xl text-black text-xs font-bold" value={tipoDoc} onChange={e => setTipoDoc(e.target.value)}>
                  <option value="extrato">Extrato Bancário</option>
                  <option value="comprovante">Comprovante Saída</option>
                </select>
                <input type="file" className="w-1/2 text-[10px] pt-3" onChange={e => setFileToUpload(e.target.files?.[0] || null)} />
              </div>
              <button onClick={handleUpload} className="w-full bg-blue-500 font-black rounded-xl p-3 text-xs uppercase tracking-widest italic">Carregar Documento</button>
            </div>
          </div>

          {/* LANÇAMENTO DE GASTO */}
          <div className="bg-black text-white p-6 rounded-3xl shadow-lg border-b-4 border-red-500">
            <h2 className="text-[10px] font-black uppercase tracking-widest mb-4 italic">Registrar Gasto</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Descrição" className="w-full p-3 rounded-xl text-black text-sm" value={descSaida} onChange={e => setDescSaida(e.target.value)} />
              <div className="flex gap-2">
                <input type="number" placeholder="R$" className="w-1/2 p-3 rounded-xl text-black text-sm" value={valorSaida} onChange={e => setValorSaida(e.target.value)} />
                <button onClick={lancarSaida} className="w-1/2 bg-red-600 font-black rounded-xl text-xs uppercase">Confirmar Saída</button>
              </div>
            </div>
          </div>

          {/* LISTA DE DOCS PARA EXCLUIR */}
          <div className="bg-white p-5 rounded-3xl border border-blue-200">
            <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 italic">Gestão de Documentos</h2>
            {docs.map(d => (
              <div key={d.id} className="flex justify-between items-center p-2 border-b text-[10px] italic uppercase">
                <span>{d.mes}: <b>{d.nome_exibicao}</b></span>
                <button onClick={() => excluirDoc(d.id, d.url_arquivo)} className="text-red-500 font-black">EXCLUIR</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // TELA PRINCIPAL (COM SEÇÃO DE DOCUMENTOS)
  return (
    <div className="min-h-screen bg-[#FDFCF0] p-4 md:p-10 font-sans text-gray-800">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-7xl font-black text-[#D4A373] italic uppercase tracking-tighter">FAMILIA da <span className="text-green-700">ALEGRIA</span></h1>
        <p className="text-[10px] md:text-sm font-bold text-gray-400 tracking-[0.4em] mt-2 uppercase italic">NATAL 2026 BRAGANÇA CITY</p>
      </header>

      {/* DASHBOARD */}
      <div className="max-w-6xl mx-auto bg-black text-white p-8 rounded-[40px] shadow-2xl mb-12 border-b-8 border-green-700">
        <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
          <div className="text-left">
            <p className="text-[10px] text-[#D4A373] font-black uppercase tracking-widest italic">Saldo Disponível</p>
            <div className="text-5xl md:text-7xl font-black italic text-green-500">R$ {saldoAtual.toLocaleString('pt-BR')}</div>
            <p className="text-[10px] font-black uppercase opacity-50 mt-2 italic">Arrecadado: R$ {totalArrecadado} | Saídas: R$ {totalSaidas}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Meta Bragança</p>
            <div className="text-xl font-bold text-gray-400 italic">R$ {metaGeral.toLocaleString('pt-BR')}</div>
          </div>
        </div>
        <div className="w-full bg-gray-800 h-4 rounded-full overflow-hidden mb-8">
          <div className="bg-green-500 h-full transition-all duration-1000 shadow-[0_0_20px_rgba(34,197,94,0.3)]" style={{ width: `${(totalArrecadado/metaGeral)*100}%` }}></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 border-t border-gray-800 pt-6">
          {meses.map(mes => {
            const sum = historico.filter(h => h.mes === mes).reduce((acc, h) => acc + Number(h.valor), 0);
            return sum > 0 ? (
              <div key={mes} onClick={() => setSelectedMonth(mes)} className="bg-gray-900/50 p-3 rounded-2xl border border-gray-800 cursor-pointer hover:bg-gray-800 transition-all text-center">
                <p className="text-[8px] font-black text-gray-500 uppercase italic">{mes}</p>
                <p className="text-sm font-black text-[#D4A373]">R$ {sum}</p>
                <p className="text-[7px] font-bold text-gray-600 uppercase mt-1 italic tracking-widest">Meta R$ {metaMensalGrupo}</p>
              </div>
            ) : null;
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* COLUNA 1: Grupos Expandíveis */}
          <div className="space-y-4">
              <h2 className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-4 mb-2 italic">Familiares</h2>
              {gruposDef.map((g, gIdx) => (
                <div key={gIdx} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                  <button onClick={() => setExpandedGrupo(expandedGrupo === gIdx ? null : gIdx)} className="w-full p-5 flex justify-between items-center hover:bg-gray-50">
                    <div className="text-left">
                      <h2 className="text-sm font-black text-gray-800 uppercase italic tracking-tighter">{g.titulo}</h2>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter italic">
                        {g.nomes.filter(n => historico.some(h => h.membros?.nome === n && h.mes === mesAtual)).length} de {g.nomes.length} QUITADOS NO MÊS
                      </p>
                    </div>
                    <span className="text-[#D4A373] font-black">{expandedGrupo === gIdx ? '−' : '+'}</span>
                  </button>
                  <div className={`transition-all duration-300 ${expandedGrupo === gIdx ? 'max-h-[600px] p-3' : 'max-h-0'} overflow-hidden`}>
                    {/* Lista de nomes (igual aos códigos anteriores) */}
                  </div>
                </div>
              ))}
          </div>

          {/* COLUNA 2: Gastos Bragança City */}
          <div className="space-y-4">
              <h2 className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-4 mb-2 italic">Gastos Bragança</h2>
              <div className="bg-white rounded-[40px] p-6 shadow-sm border border-gray-100 min-h-[300px]">
                {saidas.map(s => (
                  <div key={s.id} className="mb-4 last:mb-0 border-b border-gray-50 pb-4 last:border-0 italic">
                    <p className="text-[10px] font-bold text-gray-700 italic tracking-tighter leading-tight">{s.descricao}</p>
                    <p className="text-xs font-black text-red-600 italic">- R$ {s.valor} <span className="text-[8px] text-gray-300 ml-2 uppercase italic">({s.mes})</span></p>
                  </div>
                ))}
              </div>
          </div>

          {/* COLUNA 3: DOCUMENTOS E AUDITORIA */}
          <div className="space-y-4">
              <h2 className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-4 mb-2 italic">Documentos e Auditoria</h2>
              <div className="bg-blue-50/50 rounded-[40px] p-8 shadow-sm border border-blue-100 min-h-[300px]">
                {docs.length > 0 ? docs.map(d => (
                  <a key={d.id} href={d.url_arquivo} download target="_blank" className="flex items-center justify-between p-4 mb-3 bg-white rounded-2xl shadow-sm border border-blue-50 hover:bg-blue-600 group transition-all">
                    <div className="text-left">
                        <p className="text-[7px] font-black text-blue-400 uppercase group-hover:text-white">{d.tipo === 'extrato' ? 'Extrato Bancário' : 'Comprovante'}</p>
                        <p className="text-[11px] font-black text-gray-700 uppercase italic group-hover:text-white tracking-tighter">{d.nome_exibicao}</p>
                    </div>
                    <span className="text-blue-600 font-black group-hover:text-white">↓</span>
                  </a>
                )) : (
                  <p className="text-center text-gray-300 text-[9px] italic py-20 uppercase tracking-widest">Nenhum extrato carregado.</p>
                )}
              </div>
          </div>
      </div>

      <footer className="mt-24 text-center pb-20 pt-10 border-t border-dashed border-gray-200">
        <input type="password" placeholder="Admin" className="p-3 border rounded-2xl text-xs bg-white shadow-sm" onChange={e => setSenha(e.target.value)} />
        <button onClick={() => senha === 'FDA2026' && setIsAdmin(true)} className="ml-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Acessar Painel</button>
      </footer>
    </div>
  );
};

const container = document.getElementById('root');
if (container) { createRoot(container).render(<App />); }
export default App;
