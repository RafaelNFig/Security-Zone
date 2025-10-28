import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Lógica de login aqui
    navigate("/"); // redireciona para a página inicial após login
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      <div className="relative bg-slate-900/90 border border-yellow-500 rounded-2xl p-8 w-full max-w-md shadow-[0_0_25px_rgba(255,215,0,0.3)]">

        <h2 className="text-2xl font-bold text-center text-yellow-400 mb-6">
          ENTRAR NA CONTA
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
            Entrar
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-6">
          Ainda não tem conta?{" "}
          <button
            onClick={() => navigate("/register")}
            className="text-yellow-400 hover:underline"
          >
            Cadastre-se
          </button>
        </p>
      </div>
    </div>
  );
}
