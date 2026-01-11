import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Camera, RefreshCw, Home } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useProfile } from "./hooks/useProfile";
import EditProfile from "./components/EditProfile/editProfile";
import ProfileHistory from "./components/ProfileHistory/profileHistory";
import ProfileSettings from "./components/ProfileSettings/profileSettings";

/* ===============================
   Helper visual (somente UI)
================================ */
const Stat = ({ label, value, accent = "white" }) => {
  const colors = {
    yellow: "text-yellow-300",
    blue: "text-blue-300",
    green: "text-green-300",
    purple: "text-purple-300",
    white: "text-slate-100",
  };

  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={`font-bold ${colors[accent]}`}>{value}</span>
    </div>
  );
};

const ProfileView = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("edit");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    profile,
    loading,
    error,
    refetch,
    updateLocalProfile,
    isAuthenticated,
  } = useProfile();

  useEffect(() => {
    console.log("🔍 [ProfileView] Estado:", {
      loading,
      error,
      isAuthenticated,
      profile,
      activeTab,
    });
  }, [loading, error, isAuthenticated, profile, activeTab]);

  const handleBack = useCallback(() => {
    navigate("/gamehome");
  }, [navigate]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleUpdateProfile = useCallback(
    async (formData) => {
      try {
        updateLocalProfile(formData);
      } catch (err) {
        console.error(err);
        handleRefresh();
      }
    },
    [updateLocalProfile, handleRefresh]
  );

  /* ===============================
     STATES
  ================================ */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070A10]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070A10] p-6">
        <div className="bg-white/5 border border-red-500/40 rounded-2xl p-8 text-center">
          <X className="mx-auto mb-4 text-red-400" size={36} />
          <p className="text-red-300 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRefresh}
              className="px-6 py-2 bg-yellow-400 text-black font-bold rounded-xl"
            >
              Tentar novamente
            </button>
            <button
              onClick={handleBack}
              className="px-6 py-2 bg-white/10 text-white rounded-xl"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070A10]">
        <div className="text-center">
          <Camera size={40} className="text-yellow-400 mx-auto mb-4" />
          <p className="text-slate-300">Perfil não encontrado</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "edit", label: "Editar Perfil", icon: "✏️" },
    { id: "history", label: "Histórico", icon: "📊" },
    { id: "settings", label: "Configurações", icon: "⚙️" },
  ];

  const renderActiveComponent = () => {
    if (activeTab === "edit")
      return (
        <EditProfile
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
        />
      );
    if (activeTab === "history") return <ProfileHistory />;
    if (activeTab === "settings") return <ProfileSettings />;
    return null;
  };

  /* ===============================
     MAIN VIEW
  ================================ */
  return (
    <div className="min-h-screen bg-[#070A10] flex items-center justify-center p-4 md:p-6">
      <div
        className="w-full max-w-6xl rounded-2xl overflow-hidden
                   border border-white/10 bg-white/5 backdrop-blur
                   shadow-[0_40px_160px_rgba(0,0,0,0.75)]
                   flex flex-col md:flex-row"
      >
        {/* SIDEBAR */}
        <aside className="w-full md:w-1/3 lg:w-1/4 bg-black/40 border-r border-white/10 py-8 flex flex-col items-center">
          {/* Avatar */}
          <div className="relative mb-6">
            <div className="w-28 h-28 rounded-full border border-yellow-400/40 bg-black/40 overflow-hidden flex items-center justify-center">
              {profile.PL_AVATAR ? (
                <img
                  src={profile.PL_AVATAR}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera className="text-yellow-400" size={36} />
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-yellow-400 text-black rounded-full flex items-center justify-center text-xs font-bold">
              {profile.PL_LEVEL}
            </div>
          </div>

          {/* Info */}
          <div className="text-center px-4 mb-8">
            <h1 className="text-yellow-400 font-bold truncate">
              {profile.PL_NAME}
            </h1>
            <p className="text-xs text-slate-300 truncate">
              {profile.PL_EMAIL}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              ID • {profile.PL_ID}
            </p>
          </div>

          {/* Tabs */}
          <div className="w-full px-4 space-y-2 mb-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full py-2.5 rounded-xl flex gap-3 justify-center items-center font-semibold text-sm transition
                  ${
                    activeTab === tab.id
                      ? "bg-yellow-400/15 text-yellow-300 border border-yellow-400/40"
                      : "bg-white/5 text-slate-300 hover:text-yellow-300"
                  }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="w-full px-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h3 className="text-yellow-300 text-center font-semibold mb-3">
                Estatísticas
              </h3>
              <div className="space-y-2">
                <Stat label="Nível" value={profile.PL_LEVEL} />
                <Stat label="Moedas" value={`${profile.PL_COINS} 🪙`} accent="yellow" />
                <Stat label="Gemas" value={`${profile.PL_GEMS} 💎`} accent="blue" />
                <Stat label="Vida" value={`${profile.PL_LIFE}%`} accent="green" />
                {profile.PL_EXPERIENCE !== undefined && (
                  <Stat
                    label="EXP"
                    value={profile.PL_EXPERIENCE}
                    accent="purple"
                  />
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 px-6 md:px-8 py-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-yellow-400">
              {tabs.find((t) => t.id === activeTab)?.label}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
              >
                <RefreshCw
                  size={18}
                  className={isRefreshing ? "animate-spin" : ""}
                />
              </button>
              <button
                onClick={handleBack}
                className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {renderActiveComponent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default ProfileView;
