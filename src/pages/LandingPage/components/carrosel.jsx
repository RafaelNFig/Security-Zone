import { useState } from "react";

const cards = [
  { id: 1, title: "💀 Malware", desc: "Carta de ameaça que reduz sua vida digital." },
  { id: 2, title: "🛡️ Firewall", desc: "Defesa poderosa contra ataques cibernéticos." },
  { id: 3, title: "⚡ Atualização de Software", desc: "Especial que restaura segurança e bloqueia ataques." },
];

export default function Carrosel() {
  const [index, setIndex] = useState(0);

  const next = () => setIndex((index + 1) % cards.length);
  const prev = () => setIndex((index - 1 + cards.length) % cards.length);

  return (
    <section id="cards" className="py-20 bg-slate-900 text-center">
      <h2 className="text-4xl font-bold text-cyan-400 mb-10">Cartas em Destaque</h2>

      <div className="max-w-xl mx-auto p-6 bg-slate-800 rounded-xl shadow-xl">
        <h3 className="text-2xl font-semibold mb-3">{cards[index].title}</h3>
        <p className="text-slate-300 mb-6">{cards[index].desc}</p>

        <div className="flex justify-center gap-6">
          <button onClick={prev} className="px-4 py-2 rounded-full bg-slate-700 hover:bg-slate-600">←</button>
          <button onClick={next} className="px-4 py-2 rounded-full bg-slate-700 hover:bg-slate-600">→</button>
        </div>
      </div>
    </section>
  );
}
