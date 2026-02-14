import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Configuração do Banco (As chaves você pega no painel do Supabase)
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL, 
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const App = () => {
  const [membros, setMembros] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState('');

  const metaTotal = 4050; // 27 pessoas * 150

  useEffect(() => { fetchMembros(); }, []);

  const fetchMembros = async () => {
    const { data } = await supabase.from('membros').select('*').order('nome');
    if (data) setMembros(data);
  };

  const togglePagamento = async (id: number, statusAtual: boolean) => {
    await supabase.from('membros').update({ pago: !statusAtual }).eq('id', id);
    fetchMembros();
  };

  const arrecadado = membros.reduce((acc, m) => acc + (m.pago ? 150 : 0), 0);

  if (isAdmin) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen">
        <button onClick={() => setIsAdmin(false)} className="mb-4 text-xs font-bold uppercase text-blue-600">← Voltar ao Site</button>
        <h1 className="text-xl font-black mb-6">PAINEL DO REINALDO</h1>
        <div className="space-y-2">
          {membros.map(m => (
            <div key={m.id} className="bg-white p-4 rounded-xl flex justify-between items-center shadow-sm">
              <span className="font-bold">{m.nome}</span>
              <button 
                onClick={() => togglePagamento(m.id, m.pago)}
                className={`px-4 py-2 rounded-lg text-xs font-black ${m.pago ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}
              >
                {m.pago ? 'PAGO' : 'MARCAR PAGO'}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF0] p-6 font-sans">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-black text-[#D4A373] italic uppercase">Família FDA</h1>
        <p className="text-[10px] font-bold text-gray-400 tracking-[0.3em]">CONTROLE FIM DE ANO 2026</p>
      </header>

      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-black text-white p-6 rounded-3xl shadow-xl">
          <p className="text-[10px] text-[#D4A373] font-bold uppercase mb-1">Total Arrecadado</p>
          <div className="text-3xl font-black">R$ {arrecadado}</div>
          <div className="mt-4 w-full bg-gray-800 h-2 rounded-full overflow-hidden">
            <div className="bg-[#D4A373] h-full" style={{ width: `${(arrecadado/metaTotal)*100}%` }}></div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
          {membros.map((m, i) => (
            <div key={m.id} className="flex justify-between items-center p-4 border-b border-gray-50">
              <span className="font-bold text-gray-700">{i + 1}. {m.nome}</span>
              <span className={`text-[9px] font-black px-2 py-1 rounded ${m.pago ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-400'}`}>
                {m.pago ? 'PAGO' : 'PENDENTE'}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-10 p-4 border-t border-dashed border-gray-200 text-center">
          <input 
            type="password" 
            placeholder="Senha Admin" 
            className="text-xs p-2 border rounded-lg mr-2"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button 
            onClick={() => password === 'FDA2026' && setIsAdmin(true)}
            className="text-[10px] font-bold text-gray-400 uppercase"
          >
            Acessar Painel
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
import { createRoot } from 'react-dom/client';
const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
