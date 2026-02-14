// ... (mantenha os imports e a configuração do supabase do código anterior)

  return (
    <div className="min-h-screen bg-[#FDFCF0] p-4 md:p-10 font-sans text-gray-800">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-black text-[#D4A373] italic uppercase tracking-tighter">
          FAMILIA da <span className="text-green-700">ALEGRIA</span>
        </h1>
        <p className="text-[10px] md:text-sm font-bold text-gray-400 tracking-[0.4em] mt-2 uppercase">
          NATAL 2026 BRAGANÇA CITY
        </p>
      </header>

      {/* Card de Arrecadação Total */}
      <div className="max-w-6xl mx-auto bg-black text-white p-8 rounded-[40px] shadow-2xl mb-12 border-b-8 border-green-700">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="text-center md:text-left">
            <p className="text-[10px] text-[#D4A373] font-black uppercase tracking-widest">Fundo Natalino</p>
            <div className="text-5xl md:text-7xl font-black italic">R$ {totalGeral.toLocaleString('pt-BR')}</div>
          </div>
          <div className="text-center md:text-right">
            <p className="text-[10px] text-gray-500 font-black uppercase">Meta Bragança City</p>
            <div className="text-lg font-bold text-gray-400 tracking-tighter">R$ {metaGeral.toLocaleString('pt-BR')}</div>
          </div>
        </div>
        <div className="w-full bg-gray-800 h-4 rounded-full overflow-hidden">
          <div className="bg-green-500 h-full transition-all duration-1000 shadow-[0_0_20px_rgba(34,197,94,0.3)]" style={{ width: `${(totalGeral/metaGeral)*100}%` }}></div>
        </div>
      </div>

      {/* Grade de 5 Grupos com os nomes Adriana, Helena, Clarice, Katia e Julia */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {gruposDef.map((g, gIdx) => (
          <div key={gIdx} className="space-y-3">
            <h2 className="text-[9px] font-black text-gray-300 uppercase tracking-widest border-b pb-2 italic">{g.titulo}</h2>
            {g.nomes.map(nome => {
              const m = membros.find(x => x.nome === nome);
              const pago = m ? calcPago(m.id) : 0;
              const meta = getMeta(nome);
              const falta = meta - pago;
              return (
                <div key={nome} onClick={() => m && setSelectedMembroId(m.id)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:scale-[1.03] transition-all group">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-black text-[11px] uppercase italic text-gray-700 group-hover:text-green-700">{nome}</span>
                    <div className={`h-2 w-2 rounded-full ${falta <= 0 ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-400'}`}></div>
                  </div>
                  <div className="flex justify-between text-[10px] font-black italic">
                    <span className="text-gray-300">FALTA R$ {Math.max(0, falta)}</span>
                    <span className="text-green-600 font-black">R$ {pago}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </main>

      {/* ... (mantenha o restante do código incluindo o Footer e a Tela Detalhada) */}
