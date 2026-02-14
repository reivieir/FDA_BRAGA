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
  
  const [selectedMembroInput, setSelectedMembroInput] = useState('');
  const [valorInput, setValorInput] = useState('');
  const [mesInput, setMesInput] = useState('Fevereiro');

  const grupos = [
    ["Adriana", "Silvinho", "Adriano", "Angela", "Vini", "Stefany"],
    ["Helena", "Antonio", "Paty", "Jair", "Giovana", "Manu", "Pablo"],
    ["Clarice", "Gilson", "Deia", "Helio", "Amanda", "Reinaldo"],
    ["Katia", "Giovani", "Cintia", "Rafael", "Ju", "Bia"],
    ["Julia", "Juan"]
  ];

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const getMetaIndividual = (nome: string) => nome === 'Pablo' ? 330 : 660;

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: m } = await supabase.from('membros').select('*').order('nome');
    const { data: p } = await supabase.from('pagamentos_detalhes').select('*, membros(nome)');
    if (m) setMembros(m);
    if (p) setHistorico(p);
  };

  const registrarPagamento = async () => {
    if (!selectedMembroInput || !valorInput) return;
    await supabase.from('pagamentos_detalhes').insert([
      { membro_id: parseInt(selectedMembroInput), valor: parseFloat(valorInput), mes: mesInput }
    ]);
    setValorInput('');
    fetchData();
  };

  const calcularPago = (id: number) => historico.filter(p => p.membro_id === id).reduce((acc, p) => acc + Number(p.valor), 0);
  const metaTotalGeral = membros.reduce((acc, m) => acc + getMetaIndividual(m.nome), 0);
  const totalArrecadadoGeral = historico.reduce((acc, p) => acc + Number(p.valor), 0);

  // --- TELA DE ADMINISTRAÇÃO ---
  if (isAdmin) {
    return (
      <div className="p-4 bg-gray-100 min-h-screen font-sans">
        <button onClick={() => setIsAdmin(false)} className="mb-4 text-xs font-bold text-blue-600 uppercase">← Voltar</button>
        <h1 className="text-xl font-black mb-6 italic text-gray-700">PAINEL ADMINISTRATIVO</h1>
        <div className="bg-white p-6 rounded-3xl shadow-sm mb-6 space-y-3 border border-gray-200">
          <select className="w-full p-3 border rounded-xl font-bold bg-gray-50" onChange={e => setSelectedMembroInput(e.target.value)}>
            <option value="">Selecione o Familiar</option>
            {membros.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="number" placeholder="Valor R$" className="w-1/2 p-3 border rounded-xl" value={valorInput} onChange={e => setValorInput(e.target.value)} />
            <select className="w-1/2 p-3 border rounded-xl" value={mesInput} onChange={e => setMesInput(e.target.value)}>
              {meses.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button onClick={registrarPagamento} className="w-full bg-green-600 text-white font-black p-4 rounded-xl shadow-lg active:scale-95 transition-all">LANÇAR PIX</button>
        </div>
        <div className="space-y-2">
          {historico.slice().reverse().map(p => (
            <div key={p.id} className="bg-white p-3 rounded-xl flex justify-between shadow-sm text-xs border-l-4 border-green-500">
              <span className="font-bold">{p.membros?.
