import Mockup from "../../../../public/img/logoSZ.png" // substitua pela sua imagem

export default function GameEx() {
    return (
        <section id="inicio" className="pt-24 pb-16 text-center bg-gradient-to-b from-slate-900 to-slate-800">
            <div className="mt-2 flex justify-center">
                <img
                    src={Mockup}
                    alt="Mockup do jogo"
                    className="w-full max-w-md rounded-xl"
                />
            </div>
            <br />
            <br />
            <div className="flex items-center justify-center gap-4 mb-8">
                <a
                    href="#cards"
                    className="px-6 py-3 rounded-full bg-yellow-500 hover:bg-yellow-300 font-black transition"
                >
                    Jogar Agora 🎮
                </a>
            </div>
        </section >
    );
}
