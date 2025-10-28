import { useNavigate } from "react-router-dom";

export default function ModalAuth({ onClose }) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 font-sans">
      <div className="relative bg-slate-900 border border-yellow-400 rounded-md p-10 max-w-2xl w-full mx-4 shadow-[0_0_25px_rgba(0,0,0,0.8)]">

        <h2 className="text-2xl font-bold mb-10 text-center text-yellow-400 tracking-wider">
          • CADASTRE-SE PARA JOGAR •
        </h2>

        <div className="flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex flex-col items-center gap-4 flex-1">
            <p className="text-gray-300 text-center text-sm">
              Ainda não tenho uma conta
            </p>
            <button
              onClick={() => navigate("/register")}
              className="bg-yellow-400 text-slate-900 font-bold py-3 px-8 rounded-sm shadow-[0_3px_0_rgba(0,0,0,0.5)] hover:bg-yellow-300 transition-all"
            >
              CRIAR CONTA
            </button>
          </div>

          <div className="flex flex-col items-center gap-4 flex-1">
            <p className="text-gray-300 text-center text-sm">
              Eu tenho uma conta
            </p>
            <button
              onClick={() => navigate("/login")}
              className="border border-yellow-400 text-yellow-400 font-semibold py-3 px-8 rounded-sm shadow-[inset_0_0_8px_rgba(250,204,21,0.2)] hover:bg-yellow-500/10 transition-all"
            >
              ENTRAR
            </button>
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <div className="w-2/3 h-[1px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent"></div>
        </div>

        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-300 hover:text-yellow-400 text-xl transition-all"
        >
          ✖
        </button>
      </div>
    </div>
  );
}
