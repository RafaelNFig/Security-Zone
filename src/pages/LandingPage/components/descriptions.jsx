export default function Descriptions() {
  return (
    <section id="sobre" className="py-20 bg-slate-800 text-center">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="text-4xl font-bold mb-6 text-cyan-400">Por que jogar Security Zone?</h2>
        <p className="text-lg text-slate-300 leading-relaxed">
          Security Zone é mais do que um jogo — é uma aventura educativa que ensina você a se proteger nas redes.
          Cada carta representa uma ameaça ou uma defesa digital, trazendo aprendizado prático com diversão.
        </p>
        <div className="grid md:grid-cols-3 gap-8 mt-10">
          <div className="p-6 bg-slate-700 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold mb-2 text-cyan-300">🧠 Aprenda Jogando</h3>
            <p>Entenda os perigos reais da internet de um jeito leve e interativo.</p>
          </div>
          <div className="p-6 bg-slate-700 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold mb-2 text-cyan-300">⚔️ Estratégia</h3>
            <p>Use especiais e cartas de defesa para proteger sua Vida Digital!</p>
          </div>
          <div className="p-6 bg-slate-700 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold mb-2 text-cyan-300">👥 Multiplayer</h3>
            <p>Desafie seus amigos (modo 1x1 será adicionado em breve).</p>
          </div>
        </div>
      </div>
    </section>
  );
}
