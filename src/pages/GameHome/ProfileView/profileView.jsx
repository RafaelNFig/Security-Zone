// src/pages/GameHome/ProfileView/profileView.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Camera, RefreshCw, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfile } from './hooks/useProfile';
import EditProfile from './components/EditProfile/editProfile';
import ProfileHistory from './components/ProfileHistory/profileHistory';
import ProfileSettings from './components/ProfileSettings/profileSettings';

const ProfileView = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("edit");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 🔥 Hook useProfile otimizado
  const { 
    profile, 
    loading, 
    error, 
    refetch, 
    updateLocalProfile,
    isAuthenticated 
  } = useProfile();

  // 🔥 Debug info
  useEffect(() => {
    console.log('🔍 [ProfileView] Estado atual:', {
      loading,
      error,
      isAuthenticated,
      profile: profile ? `${profile.PL_NAME} (${profile.PL_ID})` : 'null',
      activeTab
    });
  }, [loading, error, isAuthenticated, profile, activeTab]);

  const handleBack = useCallback(() => {
    navigate("/gamehome");
  }, [navigate]);

  const handleRefresh = useCallback(async () => {
    console.log('🔄 [ProfileView] Recarregando perfil...');
    setIsRefreshing(true);
    try {
      await refetch();
    } catch (err) {
      console.error('❌ [ProfileView] Erro ao recarregar:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleUpdateProfile = useCallback(async (formData) => {
    console.log('📝 [ProfileView] Atualizando perfil:', formData);
    try {
      // 🔥 Atualização otimista
      updateLocalProfile(formData);
      
      // Aqui você pode adicionar uma chamada API real se necessário
      // await api.updateProfile(formData);
      
    } catch (err) {
      console.error('❌ [ProfileView] Erro ao atualizar perfil:', err);
      // 🔥 Reverter atualização em caso de erro
      handleRefresh();
    }
  }, [updateLocalProfile, handleRefresh]);

  // 🔥 Loading State Otimizado
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-yellow-400 text-xl font-semibold">Carregando perfil...</p>
          <p className="text-gray-400 text-sm mt-2">Preparando seus dados</p>
        </motion.div>
      </div>
    );
  }

  // 🔥 Error State Otimizado
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 text-white p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/80 border border-red-500/50 rounded-2xl p-8 max-w-md w-full text-center backdrop-blur-md"
        >
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="text-red-400" size={32} />
          </div>
          <h3 className="text-red-400 text-xl font-bold mb-2">Erro ao Carregar</h3>
          <p className="text-gray-300 mb-2">{error}</p>
          {!isAuthenticated && (
            <p className="text-sm text-red-300 mb-4">
              Faça login para acessar seu perfil
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-yellow-500 text-slate-900 px-6 py-3 rounded-lg hover:bg-yellow-400 transition disabled:opacity-50 font-semibold flex items-center gap-2"
            >
              {isRefreshing ? (
                <RefreshCw className="animate-spin" size={16} />
              ) : (
                <RefreshCw size={16} />
              )}
              Tentar Novamente
            </button>
            <button
              onClick={handleBack}
              className="bg-slate-700 text-white px-6 py-3 rounded-lg hover:bg-slate-600 transition font-semibold flex items-center gap-2"
            >
              <Home size={16} />
              Voltar
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // 🔥 No Profile State
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 text-white">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Camera className="text-yellow-400" size={32} />
          </div>
          <h3 className="text-yellow-400 text-xl font-bold mb-2">Perfil Não Encontrado</h3>
          <p className="text-gray-400 mb-4">Não foi possível carregar os dados do perfil</p>
          <button
            onClick={handleBack}
            className="bg-yellow-500 text-slate-900 px-6 py-3 rounded-lg hover:bg-yellow-400 transition font-semibold"
          >
            Voltar ao Início
          </button>
        </motion.div>
      </div>
    );
  }

  // 🔥 Component Renderer Otimizado
  const renderActiveComponent = () => {
    const components = {
      edit: (
        <EditProfile
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
        />
      ),
      history: <ProfileHistory profile={profile} />,
      settings: <ProfileSettings profile={profile} />,
    };

    return components[activeTab] || components.edit;
  };

  // 🔥 Tab Configurations
  const tabs = [
    { id: "edit", label: "Editar Perfil", icon: "✏️" },
    { id: "history", label: "Histórico", icon: "📊" },
    { id: "settings", label: "Configurações", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 text-white p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-slate-800/60 rounded-2xl shadow-2xl border border-yellow-500/30 w-full max-w-6xl flex flex-col md:flex-row overflow-hidden backdrop-blur-md"
      >
        
        {/* 🔥 SIDEBAR OTIMIZADA */}
        <div className="bg-slate-900/80 w-full md:w-1/3 lg:w-1/4 flex flex-col items-center py-8 border-r border-yellow-500/30">
          
          {/* Avatar Section */}
          <motion.div 
            className="relative group mb-6"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border-2 border-yellow-500/50 shadow-lg">
              {profile.PL_AVATAR ? (
                <img
                  src={profile.PL_AVATAR}
                  alt="Avatar"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <Camera size={36} className="text-yellow-400" />
              )}
              <div className="absolute inset-0 bg-yellow-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <motion.div
              className="absolute -bottom-2 -right-2 bg-yellow-500 text-slate-900 rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold border-2 border-slate-900"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              {profile.PL_LEVEL}
            </motion.div>
          </motion.div>

          {/* Player Info */}
          <div className="text-center mb-8 px-4">
            <h1 className="text-xl font-bold text-yellow-400 mb-1 truncate w-full">
              {profile.PL_NAME}
            </h1>
            <p className="text-gray-400 text-sm truncate w-full">
              {profile.PL_EMAIL}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              ID: {profile.PL_ID}
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="w-full px-4 space-y-3 mb-8">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 text-sm font-semibold ${
                  activeTab === tab.id
                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 shadow-lg shadow-yellow-500/10"
                    : "bg-slate-800/50 hover:bg-slate-700/50 text-gray-300 hover:text-yellow-300 border border-transparent"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-lg">{tab.icon}</span>
                {tab.label}
              </motion.button>
            ))}
          </div>

          {/* Stats Card */}
          <motion.div 
            className="w-full px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 shadow-lg">
              <h3 className="text-yellow-400 text-sm font-semibold mb-3 text-center">
                🎯 Estatísticas
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Nível:</span>
                  <span className="text-white font-bold">{profile.PL_LEVEL}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Moedas:</span>
                  <span className="text-yellow-400 font-bold flex items-center gap-1">
                    {profile.PL_COINS} <span>🪙</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Gemas:</span>
                  <span className="text-blue-400 font-bold flex items-center gap-1">
                    {profile.PL_GEMS} <span>💎</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Vida:</span>
                  <span className="text-green-400 font-bold">{profile.PL_LIFE}%</span>
                </div>
                {profile.PL_EXPERIENCE !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">EXP:</span>
                    <span className="text-purple-400 font-bold">{profile.PL_EXPERIENCE}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* 🔥 MAIN CONTENT OTIMIZADO */}
        <div className="flex-1 px-6 md:px-8 py-6 relative min-h-[600px]">
          {/* Header Actions */}
          <div className="flex justify-between items-center mb-8">
            <motion.h2 
              className="text-2xl md:text-3xl font-bold text-yellow-400"
              key={activeTab}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {tabs.find(tab => tab.id === activeTab)?.label}
            </motion.h2>
            
            <div className="flex items-center gap-3">
              <motion.button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition text-gray-300 hover:text-yellow-400 disabled:opacity-50"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Recarregar perfil"
              >
                <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
              </motion.button>
              
              <motion.button
                onClick={handleBack}
                className="p-2 rounded-lg bg-slate-700/50 hover:bg-red-500/20 transition text-gray-300 hover:text-red-400"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Voltar ao jogo"
              >
                <X size={20} />
              </motion.button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {renderActiveComponent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfileView;