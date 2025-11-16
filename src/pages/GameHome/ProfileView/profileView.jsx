// src/pages/GameHome/ProfileView/profileView.jsx
import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Camera } from 'lucide-react';
import { useProfile } from './hooks/useProfile';
import EditProfile from './components/EditProfile/editProfile';
import ProfileHistory from './components/ProfileHistory/profileHistory';
import ProfileSettings from './components/ProfileSettings/profileSettings';

const ProfileView = () => {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('edit');
  
  const { profile, loading, error, updateProfile } = useProfile(playerId);

  const handleBack = () => {
    navigate('/gamehome');
  };

  // Função para atualizar perfil
  const handleUpdateProfile = useCallback(async (formData) => {
    // eslint-disable-next-line no-useless-catch
    try {
      const result = await updateProfile(formData);
      return result;
    } catch (error) {
      throw error;
    }
  }, [updateProfile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 text-white">
        <div className="text-yellow-400 text-xl">Carregando perfil...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 text-white">
        <div className="text-red-400 text-xl text-center">
          {error}
          <button 
            onClick={handleBack}
            className="block mt-4 bg-yellow-400 text-slate-900 px-4 py-2 rounded-lg mx-auto"
          >
            Voltar para Home
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 text-white">
        <div className="text-red-400 text-xl">Perfil não encontrado</div>
      </div>
    );
  }

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'edit':
        return <EditProfile profile={profile} onUpdateProfile={handleUpdateProfile} />;
      case 'history':
        return <ProfileHistory />;
      case 'settings':
        return <ProfileSettings />;
      default:
        return <EditProfile profile={profile} onUpdateProfile={handleUpdateProfile} />;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 text-white p-6">
      <div className="bg-slate-800/60 rounded-2xl shadow-xl border border-yellow-500/30 w-full max-w-5xl flex flex-col md:flex-row overflow-hidden">
        
        {/* Sidebar */}
        <div className="bg-slate-900/80 w-full md:w-1/3 flex flex-col items-center py-10 border-r border-yellow-500/30">
          <div className="relative w-28 h-28 rounded-full bg-slate-700 flex items-center justify-center mb-6">
            {profile.PL_AVATAR ? (
              <img 
                src={profile.PL_AVATAR} 
                alt="Avatar" 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <Camera size={36} className="text-yellow-400" />
            )}
          </div>

          <button 
            onClick={() => setActiveTab('edit')}
            className={`w-40 py-2 rounded-lg mb-4 transition ${
              activeTab === 'edit' 
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' 
                : 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300'
            }`}
          >
            Edit Profile
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`w-40 py-2 rounded-lg mb-4 transition ${
              activeTab === 'history' 
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' 
                : 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300'
            }`}
          >
            History
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-40 py-2 rounded-lg transition ${
              activeTab === 'settings' 
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' 
                : 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300'
            }`}
          >
            Settings
          </button>

          {/* Stats Rápidos */}
          <div className="mt-8 w-full px-4">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <h3 className="text-yellow-400 text-sm font-semibold mb-3 text-center">Player Stats</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Level:</span>
                  <span className="text-white font-bold">{profile.PL_LEVEL}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Coins:</span>
                  <span className="text-yellow-400 font-bold">{profile.PL_COINS}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Gems:</span>
                  <span className="text-blue-400 font-bold">{profile.PL_GEMS}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Life:</span>
                  <span className="text-green-400 font-bold">{profile.PL_LIFE}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 px-10 py-8 relative">
          <X
            onClick={handleBack}
            className="absolute top-5 right-5 text-gray-400 hover:text-red-500 cursor-pointer transition"
            size={22}
          />

          <h2 className="text-2xl font-bold text-yellow-400 mb-8">
            {activeTab === 'edit' && 'Edit Profile'}
            {activeTab === 'history' && 'Game History'}
            {activeTab === 'settings' && 'Settings'}
          </h2>

          {/* Conteúdo Principal */}
          <div className="flex-1">
            {renderActiveComponent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;