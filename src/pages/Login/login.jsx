import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { playerService } from "../../services/api";
import { authUtils } from "../../utils/auth";
import { useAuth } from "../../firebase/auth";

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Firebase Auth
  const { 
    loading: googleLoading, 
    loginWithGoogle, 
    isAuthenticated 
  } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Login tradicional com email/senha
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await playerService.login(formData);

    if (result.success) {
      authUtils.setAuthData(result.data.token, result.data.player);
      alert("Login realizado com sucesso! 🎮");
      navigate("/gamehome"); // Redireciona para o GameHome
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  // Login com Google
  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      alert("Login com Google realizado com sucesso! 🎮");
      navigate("/gamehome"); // Redireciona para o GameHome
    } catch (error) {
      console.error("Erro no login com Google:", error);
      setError("Erro ao fazer login com Google. Tente novamente.");
    }
  };

  // Se já estiver logado via Firebase, redireciona
  if (isAuthenticated) {
    navigate("/gamehome");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      <div className="relative bg-slate-900/90 border border-yellow-500 rounded-2xl p-8 w-full max-w-md shadow-[0_0_25px_rgba(255,215,0,0.3)]">

        <h2 className="text-2xl font-bold text-center text-yellow-400 mb-6">
          ENTRAR NA CONTA
        </h2>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Botão de Login com Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-lg bg-white text-slate-900 font-bold hover:bg-gray-100 transition mb-6 disabled:opacity-50"
        >
          <img 
            src="https://www.google.com/favicon.ico" 
            alt="Google" 
            className="w-5 h-5"
          />
          {googleLoading ? "Carregando..." : "Entrar com Google"}
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-600"></div>
          <span className="text-gray-400 text-sm">ou</span>
          <div className="flex-1 h-px bg-gray-600"></div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label htmlFor="email" className="block text-gray-300 mb-2 text-sm">E-mail</label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-yellow-400/40 text-white focus:border-yellow-400 outline-none transition"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-gray-300 mb-2 text-sm">Senha</label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-yellow-400/40 text-white focus:border-yellow-400 outline-none transition"
              placeholder="Sua senha"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-yellow-400 text-slate-900 font-bold hover:bg-yellow-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Entrando..." : "Entrar"}
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