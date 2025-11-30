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

  // atualiza campos dinamicamente
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    formDataRef.current[name] = value;
    setInputValues(prev => ({ ...prev, [name]: value }));
  };

  // abre modal de confirmação
  const handleSubmit = (e) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    setLoading(true);
    setShowConfirmModal(false);

    try {
      const token = authUtils.getToken();
      if (!token) {
        throw new Error("Token inválido.");
      }

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

      // atualiza o estado do profile no componente pai
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
    <div className="flex flex-col gap-6">

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
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* USERNAME */}
        <div>
          <label className="block text-gray-300 mb-2">Username</label>
          <div className="flex items-center bg-slate-700 rounded-lg px-4 py-2">
            <input
              type="text"
              name="PL_NAME"
              value={inputValues.PL_NAME}
              onChange={handleInputChange}
              placeholder="Your username"
              className="flex-1 bg-transparent outline-none text-white placeholder-gray-400 disabled:opacity-50"
              disabled={loading}
            />
            <Edit2 size={18} className="text-yellow-400" />
          </div>
        </div>

        {/* EMAIL */}
        <div>
          <label className="block text-gray-300 mb-2">Email</label>
          <div className="flex items-center bg-slate-700 rounded-lg px-4 py-2">
            <input
              type="email"
              name="PL_EMAIL"
              value={inputValues.PL_EMAIL}
              onChange={handleInputChange}
              placeholder="you@email.com"
              className="flex-1 bg-transparent outline-none text-white placeholder-gray-400 disabled:opacity-50"
              disabled={loading}
            />
          </div>
        </div>

        {/* AVATAR */}
        <div>
          <label className="block text-gray-300 mb-2">Avatar URL</label>
          <div className="flex items-center bg-slate-700 rounded-lg px-4 py-2">
            <input
              type="url"
              name="PL_AVATAR"
              value={inputValues.PL_AVATAR}
              onChange={handleInputChange}
              placeholder="https://example.com/avatar.jpg"
              className="flex-1 bg-transparent outline-none text-white placeholder-gray-400 disabled:opacity-50"
              disabled={loading}
            />
            <Edit2 size={18} className="text-yellow-400" />
          </div>
        </div>

        {/* BOTÃO DE SALVAR */}
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold px-8 py-2 rounded-lg transition disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      {/* GOOGLE LINK */}
      <GoogleLink profile={profile} onLinkSuccess={handleGoogleLinkSuccess} />

    </div>
  );
};

export default EditProfile;
