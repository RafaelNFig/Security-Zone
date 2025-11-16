// src/pages/GameHome/ProfileView/components/GoogleLink/googleLink.jsx
import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../../../../firebase/config';
import { Check, Link, Unlink, AlertCircle } from 'lucide-react';

const GoogleLink = ({ profile, onLinkSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleLinkGoogleAccount = async () => {
    setLoading(true);
    setMessage('');
    setError('');
  
    try {
      // 1. Fazer login com Google no Firebase
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // 2. FORÇAR um token fresco - importante!
      console.log('🔄 Forçando token fresco...');
      await auth.currentUser?.getIdToken(true); // Force refresh
      const firebaseToken = await user.getIdToken(true); // true = force refresh
      
      console.log('🔥 Token fresco obtido:', firebaseToken.substring(0, 20) + '...');
  
      // 3. Enviar para o backend
      const response = await fetch('http://localhost:3000/api/auth/firebase-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firebaseToken })
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao vincular conta');
      }
  
      setMessage('✅ Conta Google vinculada com sucesso!');
      
      if (data.token && data.player) {
        localStorage.setItem('securityZoneToken', data.token);
        localStorage.setItem('playerData', JSON.stringify(data.player));
        localStorage.setItem('user', JSON.stringify(data.player));
      }
  
      onLinkSuccess?.(data);
  
    } catch (err) {
      console.error('Erro ao vincular conta Google:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      // Para desvincular, precisamos do token JWT
      // Vamos ver se existe agora
      const jwtToken = localStorage.getItem('securityZoneToken');

      if (!jwtToken) {
        throw new Error('Faça login com Google primeiro para poder desvincular');
      }

      const response = await fetch('http://localhost:3000/api/auth/unlink-google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao desvincular conta');
      }

      setMessage('✅ Conta Google desvinculada com sucesso!');
      
      // Atualizar dados locais
      if (data.player) {
        localStorage.setItem('playerData', JSON.stringify(data.player));
        localStorage.setItem('user', JSON.stringify(data.player));
      }

      onLinkSuccess?.(data);

    } catch (err) {
      console.error('Erro ao desvincular conta Google:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Verificar se já tem conta Google vinculada
  const isGoogleLinked = profile?.PL_AUTH_PROVIDER === 'google';

  return (
    <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <img
            src="https://www.google.com/favicon.ico"
            alt="Google"
            className="w-6 h-6"
          />
          <span className="text-gray-300 font-medium">Conta Google</span>
        </div>
        
        {isGoogleLinked ? (
          <div className="flex items-center gap-2 text-green-400">
            <Check size={16} />
            <span className="text-sm">Vinculada</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-yellow-400">
            <Unlink size={16} />
            <span className="text-sm">Não vinculada</span>
          </div>
        )}
      </div>

      {/* Status Message */}
      {message && (
        <div className="mb-3 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
          <p className="text-green-400 text-sm flex items-center gap-2">
            <Check size={16} />
            {message}
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-3 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </p>
        </div>
      )}

      {/* Botão de Ação */}
      <div className="flex gap-3">
        {!isGoogleLinked ? (
          <button
            onClick={handleLinkGoogleAccount}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processando...
              </>
            ) : (
              <>
                <Link size={16} />
                Vincular Conta Google
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleUnlinkGoogle}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processando...
              </>
            ) : (
              <>
                <Unlink size={16} />
                Desvincular Conta
              </>
            )}
          </button>
        )}
      </div>

      {/* Informações adicionais */}
      <div className="mt-3 text-xs text-gray-400">
        {isGoogleLinked ? (
          <p>Sua conta está vinculada ao Google. Você pode fazer login com Google ou email/senha.</p>
        ) : (
          <p>Vincule sua conta Google para fazer login mais rapidamente e sincronizar seus dados.</p>
        )}
      </div>
    </div>
  );
};

export default GoogleLink;