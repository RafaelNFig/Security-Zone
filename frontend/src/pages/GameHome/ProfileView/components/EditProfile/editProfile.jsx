// src/pages/GameHome/ProfileView/components/EditProfile/editProfile.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Edit2, Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmModal from "../ConfirmModal/confirmModal";
import GoogleLink from "../GoogleLink/googleLink";

// ✅ client oficial (/api relativo via Nginx)
import { apiRequest } from "@/services/api.js";

const NOTICE_KEY = "SZ_PROFILE_UPDATE_NOTICE";

const EditProfile = ({ profile, onUpdateProfile }) => {
  const baseProfile = useMemo(
    () => ({
      PL_NAME: profile?.PL_NAME || "",
      PL_EMAIL: profile?.PL_EMAIL || "",
      PL_AVATAR: profile?.PL_AVATAR || "",
    }),
    [profile]
  );

  const formDataRef = useRef({ ...baseProfile });

  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [inputValues, setInputValues] = useState({ ...baseProfile });

  const [notice, setNotice] = useState(null); // { type: "info"|"success"|"error", title, message }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ✅ após reload: mostrar "Atualização Concluída"
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(NOTICE_KEY);
      if (!raw) return;

      sessionStorage.removeItem(NOTICE_KEY);
      const parsed = JSON.parse(raw);

      if (parsed?.type === "success") {
        setNotice({
          type: "success",
          title: "Atualização Concluída",
          message: "Seus dados foram atualizados com sucesso.",
        });
      }
    } catch {
      // ignore
    }
  }, []);

  // ✅ quando profile mudar (ex: fetch inicial), sincroniza refs/states
  useEffect(() => {
    formDataRef.current = { ...baseProfile };
    setInputValues({ ...baseProfile });
  }, [baseProfile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    formDataRef.current[name] = value;
    setInputValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    setLoading(true);
    setShowConfirmModal(false);
    setNotice(null);

    try {
      const current = formDataRef.current || {};

      // ✅ monta payload SOMENTE com campos alterados
      const payload = {};

      const nextName = String(current.PL_NAME || "").trim();
      const nextEmail = String(current.PL_EMAIL || "").trim();
      const nextAvatar = String(current.PL_AVATAR || "").trim();

      if (nextName && nextName !== String(baseProfile.PL_NAME || "")) payload.name = nextName;
      if (nextEmail && nextEmail !== String(baseProfile.PL_EMAIL || "")) payload.email = nextEmail;

      // avatar pode ser "" (remover)
      if (nextAvatar !== String(baseProfile.PL_AVATAR || "")) payload.avatar = nextAvatar || null;

      if (Object.keys(payload).length === 0) {
        throw new Error("Nenhum dado fornecido para atualização.");
      }

      // ✅ notificação estilo register
      setNotice({
        type: "info",
        title: "Atualizando dados...",
        message: "Aguarde um instante…",
      });

      const res = await apiRequest("/player/profile", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (!res?.success) {
        throw new Error(res?.data?.error || res?.error || "Erro ao atualizar perfil.");
      }

      // opcional: atualiza no estado atual antes do reload
      const data = res.data;
      onUpdateProfile?.(data?.player || data);

      // ✅ espera 2s e recarrega mantendo a notificação de sucesso
      await sleep(2000);
      sessionStorage.setItem(NOTICE_KEY, JSON.stringify({ type: "success" }));
      window.location.reload();
    } catch (err) {
      console.error("Erro ao atualizar perfil:", err);
      setNotice({
        type: "error",
        title: "Falha ao atualizar",
        message: err?.message || "Erro ao atualizar perfil.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSave = () => {
    setShowConfirmModal(false);
  };

  const handleGoogleLinkSuccess = (data) => {
    // se quiser atualizar na hora sem reload, pode chamar onUpdateProfile com data.player
    // mantendo o comportamento atual:
    console.log("Google vinculado:", data);
  };

  const NoticeBox = ({ n }) => {
    const styles =
      n.type === "success"
        ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
        : n.type === "error"
          ? "border-red-400/25 bg-red-500/10 text-red-100"
          : "border-cyan-400/25 bg-cyan-500/10 text-cyan-100";

    const Icon = n.type === "success" ? Check : n.type === "error" ? AlertCircle : null;

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`rounded-2xl border px-4 py-3 text-sm relative overflow-hidden ${styles}`}
      >
        <div
          className="absolute inset-0 opacity-[0.12] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative flex items-start gap-3">
          {Icon ? <Icon size={18} className="mt-0.5 opacity-90" /> : null}
          <div className="flex-1">
            <div className="text-xs font-mono uppercase tracking-[0.45em] opacity-80">
              status
            </div>
            <div className="mt-1 font-extrabold">{n.title}</div>
            <div className="mt-1 text-slate-100/80">{n.message}</div>

            {n.type === "info" && (
              <div className="mt-3 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full w-full bg-white/30"
                  initial={{ x: "-100%" }}
                  animate={{ x: "0%" }}
                  transition={{ duration: 2, ease: "linear" }}
                />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      {/* MODAL */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onConfirm={handleConfirmSave}
        onCancel={handleCancelSave}
        title="Confirmar Alterações"
        message="Tem certeza que deseja salvar as alterações do seu perfil?"
        confirmText="Sim, Salvar"
        cancelText="Cancelar"
        type="info"
      />

      {/* NOTIFICAÇÃO (mesmo estilo do register) */}
      <AnimatePresence>{notice ? <NoticeBox n={notice} /> : null}</AnimatePresence>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10
                   bg-white/5 backdrop-blur
                   shadow-[0_20px_80px_rgba(0,0,0,0.45)]
                   p-6 flex flex-col gap-6"
      >
        {/* USERNAME */}
        <div>
          <label className="block mb-2 text-[11px] font-mono uppercase tracking-[0.35em] text-slate-300/70">
            Username
          </label>
          <div
            className="flex items-center gap-3
                       rounded-xl bg-black/30 border border-white/10
                       px-4 py-2.5
                       focus-within:border-cyan-300/40 transition"
          >
            <input
              type="text"
              name="PL_NAME"
              value={inputValues.PL_NAME}
              onChange={handleInputChange}
              placeholder="Your username"
              className="flex-1 bg-transparent outline-none
                         text-slate-100 placeholder-slate-400/60
                         disabled:opacity-50"
              disabled={loading}
            />
            <Edit2 size={16} className="text-cyan-300/70" />
          </div>
        </div>

        {/* EMAIL */}
        <div>
          <label className="block mb-2 text-[11px] font-mono uppercase tracking-[0.35em] text-slate-300/70">
            Email
          </label>
          <div
            className="flex items-center gap-3
                       rounded-xl bg-black/30 border border-white/10
                       px-4 py-2.5
                       focus-within:border-emerald-300/40 transition"
          >
            <input
              type="email"
              name="PL_EMAIL"
              value={inputValues.PL_EMAIL}
              onChange={handleInputChange}
              placeholder="you@email.com"
              className="flex-1 bg-transparent outline-none
                         text-slate-100 placeholder-slate-400/60
                         disabled:opacity-50"
              disabled={loading}
            />
          </div>
        </div>

        {/* AVATAR */}
        <div>
          <label className="block mb-2 text-[11px] font-mono uppercase tracking-[0.35em] text-slate-300/70">
            Avatar URL
          </label>
          <div
            className="flex items-center gap-3
                       rounded-xl bg-black/30 border border-white/10
                       px-4 py-2.5
                       focus-within:border-yellow-300/40 transition"
          >
            <input
              type="url"
              name="PL_AVATAR"
              value={inputValues.PL_AVATAR}
              onChange={handleInputChange}
              placeholder="https://example.com/avatar.jpg"
              className="flex-1 bg-transparent outline-none
                         text-slate-100 placeholder-slate-400/60
                         disabled:opacity-50"
              disabled={loading}
            />
            <Edit2 size={16} className="text-yellow-300/70" />
          </div>
        </div>

        {/* BOTÃO DE SALVAR */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-2.5 rounded-xl font-extrabold transition
                       bg-gradient-to-b from-[#FFD60A] to-[#FFC300]
                       text-[#000814]
                       shadow-lg shadow-yellow-500/30
                       hover:shadow-yellow-500/50
                       disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      {/* GOOGLE LINK */}
      <div
        className="rounded-2xl border border-white/10
                   bg-white/5 backdrop-blur
                   shadow-[0_16px_60px_rgba(0,0,0,0.35)]
                   p-6"
      >
        <GoogleLink profile={profile} onLinkSuccess={handleGoogleLinkSuccess} />
      </div>
    </div>
  );
};

export default EditProfile;
