import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Lógica de cadastro aqui
    navigate("/login"); // redireciona para o login após cadastrar
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      <div className="relative bg-slate-900/90 border border-yellow-500 rounded-2xl p-8 w-full max-w-md shadow-[0_0_25px_rgba(255,215,0,0.3)]">

        <h2 className="text-2xl font-bold text-center text-yellow-400 mb-6">
          CRIAR CONTA
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-gray-300 mb-2 text-sm">Nome de usuário</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-yellow-400/40 text-white focus:border-yellow-400 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2 text-sm">E-mail</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-yellow-400/40 text-white focus:border-yellow-400 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2 text-sm">Senha</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-yellow-400/40 text-white focus:border-yellow-400 outline-none transition"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-yellow-400 text-slate-900 font-bold hover:bg-yellow-300 transition"
          >
            Cadastrar
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-6">
          Já possui conta?{" "}
          <button
            onClick={() => navigate("/login")}
            className="text-yellow-400 hover:underline"
          >
            Entrar
          </button>
        </p>
      </div>
    </div>
  );
}
