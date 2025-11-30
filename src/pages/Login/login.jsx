import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { playerService } from "../../services/api";
import { authUtils } from "../../utils/auth";
import { useAuth } from "../../firebase/auth";

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { loading: googleLoading, loginWithGoogle } = useAuth();

  // 🔥 CORREÇÃO: Verificar autenticação em useEffect
  useEffect(() => {
    if (authUtils.getToken()) {
      navigate("/gamehome");
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  /* ===============================
        LOGIN TRADICIONAL
  ================================ */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      console.log("🔐 Iniciando login...");
      const result = await playerService.login(formData);
      console.log("🔐 Resultado do login:", result);

      if (result.success) {
        console.log("🔐 Token recebido:", result.token);
        console.log("🔐 Player recebido:", result.player);

        // 🔥 SOLUÇÃO IMEDIATA: Salvar manualmente garantindo que o token seja persistido
        console.log("💾 Salvando dados manualmente no localStorage...");

        // Salvar token em múltiplas chaves para garantir
        localStorage.setItem("securityZoneToken", result.token);
        localStorage.setItem("authToken", result.token); // Backup
        localStorage.setItem("playerData", JSON.stringify(result.player));

        // Salvar também no sessionStorage como redundância
        sessionStorage.setItem("securityZoneToken", result.token);
        sessionStorage.setItem("authToken", result.token);
        sessionStorage.setItem("playerData", JSON.stringify(result.player));

        // 🔥 AINDA chamar authUtils para manter consistência
        authUtils.setAuthData(result.token, result.player);

        // 🔥 DEBUG COMPLETO: Verificar se tudo foi salvo corretamente
        console.log("✅ Dados salvos manualmente! Verificando...");
        console.log(
          "🔐 securityZoneToken no localStorage:",
          localStorage.getItem("securityZoneToken") ? "SALVO" : "NÃO SALVO"
        );
        console.log(
          "🔐 authToken no localStorage:",
          localStorage.getItem("authToken") ? "SALVO" : "NÃO SALVO"
        );
        console.log(
          "🔐 playerData no localStorage:",
          localStorage.getItem("playerData") ? "SALVO" : "NÃO SALVO"
        );
        console.log(
          "🔐 Token via authUtils:",
          authUtils.getToken() ? "OK" : "FALHOU"
        );

        // Verificar todas as chaves no localStorage
        console.log(
          "🔐 Todas as chaves no localStorage após login:",
          Object.keys(localStorage)
        );

        // Pequeno delay para garantir persistência antes da navegação
        setTimeout(() => {
          console.log("🔄 Navegando para GameHome...");
          console.log("🔐 Status final da auth:", authUtils.getAuthStatus());
          navigate("/gamehome");
        }, 200);
      } else {
        setError(result.error);
        setLoading(false);
      }
    } catch (err) {
      console.error("❌ Erro no login:", err);
      setError(err.message || "Erro ao tentar fazer login.");
      setLoading(false);
    }
  };

  /* ===============================
        LOGIN COM GOOGLE
  ================================ */
  const handleGoogleLogin = async () => {
    try {
      setError("");
      const fbUser = await loginWithGoogle();
      const firebaseToken = await fbUser.getIdToken(true);

      // 🔥 ROTA CORRETA DO BACKEND
      const backendRes = await fetch(
        "http://localhost:3000/api/auth/firebase-login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firebaseToken }),
        }
      );

      const data = await backendRes.json();

      if (!backendRes.ok) {
        throw new Error(data.error || "Erro no login via Google");
      }

      // 🔥 CORREÇÃO: Salvar todos os dados de forma consistente
      authUtils.setAuthData(data.token, data.player);

      // 🔥 CORREÇÃO: Pequeno delay para garantir atualização do estado
      setTimeout(() => {
        navigate("/gamehome");
      }, 100);
    } catch (err) {
      console.error("Erro no login Google:", err);
      setError(err.message || "Erro ao fazer login com Google.");
    }
  };

  // 🔥 CORREÇÃO: Remover a verificação direta no render para evitar o warning
  // if (authUtils.getToken()) {
  //   navigate("/gamehome");
  //   return null;
  // }

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

        {/* Login Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-lg bg-white text-slate-900 font-bold hover:bg-gray-100 transition mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label htmlFor="email" className="block text-gray-300 mb-2 text-sm">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-yellow-400/40 text-white focus:border-yellow-400 outline-none transition"
              placeholder="seu@email.com"
              disabled={loading || googleLoading}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-gray-300 mb-2 text-sm"
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-yellow-400/40 text-white focus:border-yellow-400 outline-none transition"
              placeholder="Sua senha"
              disabled={loading || googleLoading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
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
            disabled={loading || googleLoading}
          >
            Cadastre-se
          </button>
        </p>
      </div>
    </div>
  );
}
