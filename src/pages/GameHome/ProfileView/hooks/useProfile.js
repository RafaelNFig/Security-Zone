// src/pages/GameHome/ProfileView/hooks/useProfile.js
import { useState, useEffect, useCallback } from 'react';

export const useProfile = (playerId) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:3000/api/profile/${playerId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Erro ${response.status}: ${response.statusText}`);
      }
      
      const profileData = await response.json();
      setProfile(profileData);
      return profileData;
    } catch (err) {
      console.error('Erro no hook useProfile:', err);
      setError(err.message || 'Erro ao carregar perfil');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  const updateProfile = async (formData) => {
    try {
      setLoading(true);
      
      const response = await fetch(`http://localhost:3000/api/profile/${playerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro ${response.status}`);
      }
      
      const updatedProfile = await response.json();
      
      // Apenas no banco de dados, sem atualizar estado
      return updatedProfile;
      
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (playerId) {
      fetchProfile();
    }
  }, [playerId, fetchProfile]);

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile,
    updateProfile,
    setProfile
  };
};