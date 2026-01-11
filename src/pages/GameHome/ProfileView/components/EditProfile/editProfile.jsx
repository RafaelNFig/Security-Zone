// src/pages/GameHome/ProfileView/components/EditProfile/editProfile.jsx
import React, { useState, useRef } from "react";
import { Edit2 } from "lucide-react";
import ConfirmModal from "../ConfirmModal/confirmModal";
import GoogleLink from "../GoogleLink/googleLink";
import { authUtils } from "../../../../../utils/auth";

const EditProfile = ({ profile, onUpdateProfile }) => {

  const formDataRef = useRef({
    PL_NAME: profile?.PL_NAME || "",
    PL_EMAIL: profile?.PL_EMAIL || "",
    PL_AVATAR: profile?.PL_AVATAR || ""
  });

  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [inputValues, setInputValues] = useState({
    PL_NAME: profile?.PL_NAME || "",
    PL_EMAIL: profile?.PL_EMAIL || "",
    PL_AVATAR: profile?.PL_AVATAR || ""
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    formDataRef.current[name] = value;
    setInputValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    setLoading(true);
    setShowConfirmModal(false);

    try {
      const token = authUtils.getToken();
      if (!token) throw new Error("Token inválido.");

      const response = await fetch(`http://localhost:3000/api/player/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formDataRef.current),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao atualizar perfil.");
      }

      onUpdateProfile(data.player);

    } catch (err) {
      console.error("Erro ao atualizar perfil:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSave = () => {
    setShowConfirmModal(false);
  };

  const handleGoogleLinkSuccess = (data) => {
    console.log("Google vinculado:", data);
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
          <div className="flex items-center gap-3
                          rounded-xl bg-black/30 border border-white/10
                          px-4 py-2.5
                          focus-within:border-cyan-300/40 transition">
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
          <div className="flex items-center gap-3
                          rounded-xl bg-black/30 border border-white/10
                          px-4 py-2.5
                          focus-within:border-emerald-300/40 transition">
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
          <div className="flex items-center gap-3
                          rounded-xl bg-black/30 border border-white/10
                          px-4 py-2.5
                          focus-within:border-yellow-300/40 transition">
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
      <div className="rounded-2xl border border-white/10
                      bg-white/5 backdrop-blur
                      shadow-[0_16px_60px_rgba(0,0,0,0.35)]
                      p-6">
        <GoogleLink
          profile={profile}
          onLinkSuccess={handleGoogleLinkSuccess}
        />
      </div>

    </div>
  );
};

export default EditProfile;
