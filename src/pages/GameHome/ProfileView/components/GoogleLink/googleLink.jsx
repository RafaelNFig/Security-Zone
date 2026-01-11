import React, { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../../../../../firebase/config";
import { authUtils } from "../../../../../utils/auth";
import { Check, Link, Unlink, AlertCircle } from "lucide-react";

const GoogleLink = ({ profile, onLinkSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isGoogleLinked = profile?.PL_AUTH_PROVIDER === "google";

  /* ===============================
        LINK GOOGLE
  ================================ */
  const handleLinkGoogleAccount = async () => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      authUtils.syncAuthData();
      let token = authUtils.getToken();

      if (!token) {
        throw new Error("Você precisa estar logado.");
      }

      const provider = new GoogleAuthProvider();
      provider.addScope("email");
      provider.addScope("profile");
      provider.setCustomParameters({ prompt: "select_account" });

      const result = await signInWithPopup(auth, provider);
      const firebaseToken = await result.user.getIdToken(true);

      const response = await fetch(
        "http://localhost:3000/api/auth/link-google",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ firebaseToken }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao vincular Google");
      }

      setMessage("Conta Google vinculada com sucesso!");
      if (data.token && data.player) {
        authUtils.setAuthData(data.token, data.player);
      }

      onLinkSuccess?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
        UNLINK GOOGLE
  ================================ */
  const handleUnlinkGoogle = async () => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const token = authUtils.getToken();
      if (!token) throw new Error("Você precisa estar logado.");

      const response = await fetch(
        "http://localhost:3000/api/auth/unlink-google",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao desvincular conta");
      }

      setMessage("Conta Google desvinculada com sucesso!");
      if (data.player) authUtils.updatePlayerData(data.player);
      onLinkSuccess?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
        RENDER
  ================================ */
  return (
    <div
      className="mt-6 rounded-2xl border border-white/10
                 bg-white/5 backdrop-blur
                 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.55)]"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <img
            src="https://www.google.com/favicon.ico"
            alt="Google"
            className="w-5 h-5"
          />
          <span className="text-slate-200 font-semibold">Conta Google</span>
        </div>

        {isGoogleLinked ? (
          <span className="flex items-center gap-2 text-green-400 text-sm">
            <Check size={16} /> Vinculada
          </span>
        ) : (
          <span className="flex items-center gap-2 text-yellow-400 text-sm">
            <Unlink size={16} /> Não vinculada
          </span>
        )}
      </div>

      {message && (
        <div className="mb-3 p-3 rounded-lg bg-green-500/15 border border-green-500/40 text-green-300 text-sm flex gap-2">
          <Check size={16} /> {message}
        </div>
      )}

      {error && (
        <div className="mb-3 p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-300 text-sm flex gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="flex gap-3">
        {!isGoogleLinked ? (
          <button
            onClick={handleLinkGoogleAccount}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl font-bold
                       bg-blue-500/20 border border-blue-400/40
                       text-blue-300 hover:bg-blue-400/20
                       transition disabled:opacity-50"
          >
            {loading ? "Processando..." : "Vincular Conta Google"}
          </button>
        ) : (
          <button
            onClick={handleUnlinkGoogle}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl font-bold
                       bg-red-500/20 border border-red-400/40
                       text-red-300 hover:bg-red-400/20
                       transition disabled:opacity-50"
          >
            {loading ? "Processando..." : "Desvincular Conta"}
          </button>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {isGoogleLinked
          ? "Sua conta está vinculada ao Google."
          : "Vincule sua conta Google para login rápido e sincronização."}
      </p>
    </div>
  );
};

export default GoogleLink;
