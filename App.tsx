import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

const App = () => {
  const [membros, setMembros] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedMembroId, setSelectedMembroId] = useState<number | null>(null);
  const [senha, setSenha] = useState('');
  
  // Estados do Admin revisados
  const [filtrosGrupos, setFiltrosGrupos] = useState<any>({ 0: 'Todos', 1: 'Todos', 2: 'Todos', 3: 'Todos', 4: 'Todos' });
  const [valoresLote, setValoresLote] = useState<any>({});
  const [mesGlobal, setMesGlobal] = useState('Fevereiro');

  const gruposDef = [
    { titulo: "Grupo Adriana", nomes: ["Adriana", "Silvinho", "Adriano", "Angela", "Vini", "Stefany"] },
    { titulo: "Grupo Helena", nomes: ["Helena", "Antonio", "Paty", "Jair", "Giovana", "Manu", "Pablo"] },
    { titulo: "Grupo Clarice", nomes: ["Clarice", "Gilson", "Deia", "Helio", "Amanda", "Reinaldo"] },
    { titulo: "Grupo Katia", nomes: ["Katia", "Giovani", "Cintia", "Rafael", "Ju", "Bia"] },
    { titulo: "Grupo Julia", nomes: ["Julia", "Juan"] }
  ];

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const getMeta = (nome: string) => nome === 'Pablo' ? 330 : 660;

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const { data: m } = await supabase.from('membros').select('*').order('nome');
    const { data: p } = await supabase.from('pagamentos_detalhes').select('*, membros(nome)');
    if (m) setMembros(m);
    if (p) setHistorico(p);
  };

  const lancarPagamento = async (id: number, valor: string) => {
    if (!valor || parseFloat(valor) <= 0) return;
    await supabase.from('pagamentos_detalhes').insert([
      { membro_id: id, valor: parseFloat(valor), mes: mesGlobal }
    ]);
    setValoresLote({ ...valoresLote, [id]: '' });
    fetchAll();
  };

  const excluirPagamento = async (id: number) => {
    if (confirm("Deseja realmente excluir este pagamento?")) {
      await supabase.from('pagamentos_detalhes').delete().eq('id', id);
      fetchAll();
    }
  };

  const calcPago = (id: number) => historico.filter(h => h.membro_id === id).reduce((acc, h) => acc + Number(h.valor), 0);
  const totalGeral = historico.reduce((acc, h) => acc + Number(h.valor), 0);
  const metaGeral = membros.reduce((acc, m) => acc + getMeta(m.nome), 0);

  // --- TELA ADMIN ---
  if (isAdmin) {
    return (
      <div className="p-4 bg-gray-100 min-h-screen font-sans">
        <div className="flex justify-between items-center mb-6">
           <button onClick={() => setIsAdmin(false)} className="text-blue-600 font-bold text-xs uppercase">← Site</button>
           <select className="p-2 border rounded-xl text-xs font-bold" value={mesGlobal} onChange={e => setMesGlobal(e.target.value)}>
             {meses.map(m => <option key={m} value={m}>{m}</option>)}
           </select>
        </div>

        <div className="space-y-6 max-w-2xl mx-auto">
          {gruposDef.map((g, idx) => {
            const selecao = filtrosGrupos[idx];
            return (
              <div key={idx} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200">
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">{g.titulo}</h2>
                <select 
                  className="w-full p-3 border rounded-xl mb-4 bg-gray-50 text-sm font-bold"
                  value={selecao}
                  onChange={e => setFiltrosGrupos({...filtrosGrupos, [idx]: e.target.value})}
                >
                  <option value="Todos">Todos os Membros</option>
                  {g.nomes.map(n => <option key={n} value={n}>{n}</option>)}
                </select>

                <div className="space-y-3">
                  {g.nomes.filter(n => selecao === 'Todos' || selecao === n).map(nome => {
                    const m = membros.find(x => x.nome === nome);
                    if (!m) return null;

                    if (selecao === 'Todos') {
                      return (
                        <div key={m.id} className="flex items-center gap-2 border-t pt-2 border-gray-50">
                          <span className="text-[10px] font-black w-24 truncate">{m.nome}</span>
                          <input 
                            type="number" placeholder="Valor" 
                            className="flex-1 p-2 border rounded-lg text-xs"
                            value={valoresLote[m.id] || ''}
                            onChange={e => setValoresLote({...valoresLote, [m.id]: e.target.value})}
                          />
                          <button onClick={() => lancarPagamento(m.id, valoresLote[m.id])} className="bg-green-600 text-white p-2 rounded-lg text-[10px] font-black">OK</button>
                        </div>
                      );
                    } else {
                      // Visão Individual: Mostra pagamentos e opção de excluir
                      const pags = historico.filter(h => h.membro_id === m.id);
                      return (
                        <div key={m.id} className="space-y-2">
                          <p className="text-[10px] font-bold text-gray-400 italic">Histórico de {m.nome}:</p>
                          {pags.map(p => (
                            <div key={p.id} className="flex justify-between items-center p-3 bg-red-50/30 rounded-xl border border-red-100">
                              <span className="text-[10px] font-bold">{p.mes}: R$ {p.valor}</span>
                              <button onClick={() => excluirPagamento(p.id)} className="text-red-500 font-black text-[10px] uppercase">Excluir</button>
                            </div>
                          ))}
                          {pags.length === 0 && <p className="text-[10px] text-gray-400 italic">Nenhum pagamento.</p>}
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- TELA DETALHES (EXTRA) ---
  if (selectedMembroId) {
    const m = membros.find(x => x.id === selectedMembroId);
    const pagamentos = historico.filter(h => h.membro_id === selectedMembroId);
    const pago = calcularPago(selectedMembroId);
    const meta = getMeta(m?.nome || '');

    return (
      <div className="min-h-screen bg-[#FDFCF0] p-6 font-sans">
        <button onClick={() => setSelectedMembroId(null)} className="mb-8 font-black text-[#D4A373] uppercase text-xs">← Voltar</button>
        <div className="max-w-xl mx-auto bg-white p-8 rounded-[40px] shadow-xl border-b-8 border-green-700">
          <h2 className="text-3xl font-black italic uppercase text-gray-800">{m?.nome}</h2>
          <div className="flex justify-between mt-6 text-sm font-bold">
            <span className="text-green-600 font-black text-xl">R$ {pago}</span>
            <span className="text-gray-400 pt-2">FALTA: R$ {Math.max(0, meta - pago)}</span>
          </div>
          <div className="w-full bg-gray-100 h-3 rounded-full mt-2 overflow-hidden">
            <div className="bg-green-500 h-full" style={{ width: `${(pago/meta)*100}%` }}></div>
          </div>
          <div className="mt-8 space-y-3">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Registros Confirmados</h3>
            {pagamentos.map(p => (
              <div key={p.id} className="flex justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="font-bold text-gray-600">{p.mes}</span>
                <span className="font-black text-green-600 uppercase">R$ {p.valor}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- TELA PRINCIPAL ---
  return (
    <div className="min-h-screen bg-[#FDFCF0] p-4 md:p-10 font-sans text-gray-800">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-black text-[#D4A373] italic uppercase tracking-tighter italic">Família <span className="text-green-700">FDA</span></h1>
        <p className="text-[10px] font-bold text-gray-400 tracking-[0.4em] mt-2 italic">Controle Axiocrata 2026</p>
      </header>

      <div className="max-w-6xl mx-auto bg-black text-white p-8 rounded-[40px] shadow-2
