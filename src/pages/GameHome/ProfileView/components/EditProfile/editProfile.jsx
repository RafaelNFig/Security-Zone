// src/pages/GameHome/ProfileView/components/EditProfile/editProfile.jsx
import React, { useState, useRef } from "react";
import { Edit2 } from "lucide-react";
import ConfirmModal from "../ConfirmModal/confirmModal";
import GoogleLink from "../GoogleLink/googleLink";

const EditProfile = ({ profile, onUpdateProfile }) => {
  const formDataRef = useRef({
    PL_NAME: profile?.PL_NAME || "",
    PL_EMAIL: profile?.PL_EMAIL || "",
    PL_AVATAR: profile?.PL_AVATAR || ""
  });

  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState("");

  const [inputValues, setInputValues] = useState({
    PL_NAME: profile?.PL_NAME || "",
    PL_EMAIL: profile?.PL_EMAIL || "",
    PL_AVATAR: profile?.PL_AVATAR || ""
  });

  // Validação em tempo real do username
  const handleUsernameChange = async (e) => {
    const newUsername = e.target.value;
    
    formDataRef.current.PL_NAME = newUsername;
    setInputValues(prev => ({ ...prev, PL_NAME: newUsername }));
    
    if (newUsername && newUsername !== profile?.PL_NAME) {
      setTimeout(async () => {
        try {
          const response = await fetch(`http://localhost:3001/api/profile/check-username/${newUsername}`);
          if (response.ok) {
            const data = await response.json();
            if (!data.available) {
              setUsernameError("Este nome de usuário já está em uso");
            } else {
              setUsernameError("");
            }
          }
        } catch (error) {
          console.error("Erro ao verificar username:", error);
        }
      }, 500);
    } else {
      setUsernameError("");
    }
  };

  // Validação em tempo real do email
  const handleEmailChange = async (e) => {
    const newEmail = e.target.value;
    
    formDataRef.current.PL_EMAIL = newEmail;
    setInputValues(prev => ({ ...prev, PL_EMAIL: newEmail }));
    
    if (newEmail && newEmail !== profile?.PL_EMAIL) {
      setTimeout(async () => {
        try {
          const response = await fetch(`http://localhost:3001/api/profile/check-email/${newEmail}`);
          if (response.ok) {
            const data = await response.json();
            if (!data.available) {
              setEmailError("Este email já está em uso");
            } else {
              setEmailError("");
            }
          }
        } catch (error) {
          console.error("Erro ao verificar email:", error);
        }
      }, 500);
    } else {
      setEmailError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validações finais antes de mostrar o modal
    let hasErrors = false;

    // Verificar username
    if (formDataRef.current.PL_NAME && formDataRef.current.PL_NAME !== profile?.PL_NAME) {
      try {
        const response = await fetch(`http://localhost:3001/api/profile/check-username/${formDataRef.current.PL_NAME}`);
        if (response.ok) {
          const data = await response.json();
          if (!data.available) {
            setUsernameError("Este nome de usuário já está em uso");
            hasErrors = true;
          } else {
            setUsernameError("");
          }
        }
      } catch (error) {
        console.error("Erro ao verificar username:", error);
      }
    }

    // Verificar email
    if (formDataRef.current.PL_EMAIL && formDataRef.current.PL_EMAIL !== profile?.PL_EMAIL) {
      try {
        const response = await fetch(`http://localhost:3001/api/profile/check-email/${formDataRef.current.PL_EMAIL}`);
        if (response.ok) {
          const data = await response.json();
          if (!data.available) {
            setEmailError("Este email já está em uso");
            hasErrors = true;
          } else {
            setEmailError("");
          }
        }
      } catch (error) {
        console.error("Erro ao verificar email:", error);
      }
    }

    if (hasErrors) {
      return;
    }

    // Se não há erros, mostra o modal de confirmação
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    setLoading(true);
    setShowConfirmModal(false);

    try {
      await onUpdateProfile(formDataRef.current);
      
      // Modal de sucesso
      setShowConfirmModal(false);
      // Aqui você pode mostrar outro modal de sucesso se quiser
      
    } catch (error) {
      console.error("❌ Erro ao atualizar perfil:", error);
      
      if (error.message.includes("Nome de usuário já está em uso")) {
        setUsernameError("Este nome de usuário já está em uso");
      } else if (error.message.includes("Email já está em uso")) {
        setEmailError("Este email já está em uso");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSave = () => {
    setShowConfirmModal(false);
  };

  const handleAvatarChange = (e) => {
    formDataRef.current.PL_AVATAR = e.target.value;
    setInputValues(prev => ({ ...prev, PL_AVATAR: e.target.value }));
  };

  const handleGoogleLinkSuccess = (data) => {
    console.log('Google account linked successfully:', data);
    // Você pode atualizar o perfil local se necessário
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Modal de Confirmação */}
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

      {/* FORMULÁRIO - SÓ PARA DADOS DO PERFIL */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Username */}
        <div>
          <label className="block text-gray-300 mb-2">Username</label>
          <div className="flex items-center bg-slate-700 rounded-lg px-4 py-2">
            <input
              type="text"
              name="PL_NAME"
              value={inputValues.PL_NAME}
              onChange={handleUsernameChange}
              placeholder="Your username"
              className="flex-1 bg-transparent outline-none text-white placeholder-gray-400 disabled:opacity-50"
              required
              disabled={loading}
            />
            <Edit2 size={18} className="text-yellow-400 cursor-pointer" />
          </div>
          {usernameError && (
            <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
              <span>⚠</span> {usernameError}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-gray-300 mb-2">Email</label>
          <div className="flex items-center bg-slate-700 rounded-lg px-4 py-2">
            <input
              type="email"
              name="PL_EMAIL"
              value={inputValues.PL_EMAIL}
              onChange={handleEmailChange}
              placeholder="you@email.com"
              className="flex-1 bg-transparent outline-none text-white placeholder-gray-400 disabled:opacity-50"
              required
              disabled={loading}
            />
          </div>
          {emailError && (
            <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
              <span>⚠</span> {emailError}
            </p>
          )}
        </div>

        {/* Avatar URL */}
        <div>
          <label className="block text-gray-300 mb-2">Avatar URL</label>
          <div className="flex items-center bg-slate-700 rounded-lg px-4 py-2">
            <input
              type="url"
              name="PL_AVATAR"
              value={inputValues.PL_AVATAR}
              onChange={handleAvatarChange}
              placeholder="https://example.com/avatar.jpg"
              className="flex-1 bg-transparent outline-none text-white placeholder-gray-400 disabled:opacity-50"
              disabled={loading}
            />
            <Edit2 size={18} className="text-yellow-400 cursor-pointer" />
          </div>
        </div>

        {/* Botão de Salvar - DENTRO do formulário */}
        <div className="mt-4 flex justify-end">
          <button 
            type="submit"
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold px-8 py-2 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
            disabled={loading || usernameError || emailError}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>

      {/* GOOGLE LINK - FORA do formulário para não acionar o submit */}
      <GoogleLink 
        profile={profile} 
        onLinkSuccess={handleGoogleLinkSuccess} 
      />
    </div>
  );
};

export default EditProfile;