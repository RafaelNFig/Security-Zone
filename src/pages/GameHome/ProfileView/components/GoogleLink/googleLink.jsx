import React, { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../../../../../firebase/config";
import { authUtils } from "../../../../../utils/auth";
import { Check, Link, Unlink, AlertCircle } from "lucide-react";

const GoogleLink = ({ profile, onLinkSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleLinkGoogleAccount = async () => {
  setLoading(true);
  setMessage('');
  setError('');

  try {
    // 🔍 DEBUG COMPLETO DO ESTADO DA AUTENTICAÇÃO
    console.log('🔐 [GoogleLink] === INICIANDO VINCULAÇÃO GOOGLE ===');
    console.log('🔐 [GoogleLink] Profile recebido:', profile);
    
    // 🔥 FORÇAR SINCRONIZAÇÃO ANTES DE VERIFICAR
    console.log('🔄 [GoogleLink] Forçando sincronização...');
    authUtils.syncAuthData();
    
    const jwtToken = authUtils.getToken();
    console.log('🔐 [GoogleLink] Token do authUtils:', jwtToken);
    
    // Verificar todas as chaves possíveis no localStorage
    console.log('🔐 [GoogleLink] Todas as chaves no localStorage:', Object.keys(localStorage));
    
    // Verificar tokens específicos
    const possibleTokens = {
      'securityZoneToken': localStorage.getItem('securityZoneToken'),
      'authToken': localStorage.getItem('authToken'),
      'token': localStorage.getItem('token'),
      'jwtToken': localStorage.getItem('jwtToken'),
      'userToken': localStorage.getItem('userToken'),
      'firebaseToken': localStorage.getItem('firebaseToken')
    };
    
    console.log('🔐 [GoogleLink] Tokens encontrados:', possibleTokens);
    
    // Verificar sessionStorage também
    console.log('🔐 [GoogleLink] securityZoneToken no sessionStorage:', sessionStorage.getItem('securityZoneToken'));
    console.log('🔐 [GoogleLink] playerData no sessionStorage:', sessionStorage.getItem('playerData'));
    
    // Verificar status completo da autenticação
    const authStatus = authUtils.getAuthStatus();
    console.log('🔐 [GoogleLink] Status completo da autenticação:', authStatus);
    
    // 🔧 SOLUÇÃO: Verificação robusta do token
    let finalToken = jwtToken;
    
    // Se não encontrou, tentar chaves alternativas
    if (!finalToken) {
      console.log('🔄 [GoogleLink] Token não encontrado no authUtils, buscando em chaves alternativas...');
      finalToken = localStorage.getItem('authToken') || 
                   localStorage.getItem('token') || 
                   localStorage.getItem('userToken') ||
                   localStorage.getItem('jwtToken');
      
      console.log('🔐 [GoogleLink] Token encontrado em chave alternativa:', finalToken);
      
      // Se encontrou em outra chave, sincronizar com authUtils
      if (finalToken) {
        const playerData = authUtils.getPlayerData();
        console.log('🔐 [GoogleLink] PlayerData disponível para sync:', playerData);
        if (playerData) {
          authUtils.setAuthData(finalToken, playerData);
          console.log('✅ [GoogleLink] Token sincronizado com authUtils');
        } else {
          console.warn('⚠️ [GoogleLink] Token encontrado mas playerData não disponível');
        }
      }
    }

    // 🔥 TENTATIVA DE RECUPERAÇÃO AVANÇADA
    if (!finalToken) {
      console.log('🔄 [GoogleLink] Tentando recuperação avançada...');
      
      // Buscar qualquer chave que contenha "token" ou "auth"
      const allKeys = Object.keys(localStorage);
      const tokenKeys = allKeys.filter(key => 
        key.toLowerCase().includes('token') || 
        key.toLowerCase().includes('auth') ||
        key.toLowerCase().includes('jwt')
      );
      
      console.log('🔐 [GoogleLink] Chaves relacionadas a token:', tokenKeys);
      
      for (const key of tokenKeys) {
        const value = localStorage.getItem(key);
        console.log(`🔐 [GoogleLink] ${key}:`, value);
        if (value && value.length > 50) { // Token provável
          finalToken = value;
          console.log(`✅ [GoogleLink] Token recuperado da chave: ${key}`);
          break;
        }
      }
    }

    if (!finalToken) {
      console.error('❌ [GoogleLink] NENHUM TOKEN ENCONTRADO EM NENHUMA CHAVE!');
      console.log('🔐 [GoogleLink] Estado completo do localStorage:');
      Object.keys(localStorage).forEach(key => {
        console.log(`   ${key}:`, localStorage.getItem(key));
      });
      throw new Error("Você precisa estar logado na conta normal. Faça login primeiro.");
    }

    console.log('✅ [GoogleLink] Token final que será enviado:', finalToken);
    console.log('🔐 [GoogleLink] Comprimento do token:', finalToken.length);

    // Prosseguir com o Google OAuth
    console.log('🔄 [GoogleLink] Iniciando autenticação com Google...');
    const provider = new GoogleAuthProvider();
    
    // 🔥 CORREÇÃO: Configurações para garantir token fresco
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({
      prompt: 'select_account' // Forçar seleção de conta para token fresco
    });
    
    const result = await signInWithPopup(auth, provider);

    const firebaseUser = result.user;
    
    // 🔥 CORREÇÃO: Forçar token fresco com forceRefresh
    console.log('🔄 [GoogleLink] Obtendo token Firebase FORÇADO...');
    const firebaseToken = await firebaseUser.getIdToken(true); // true = force refresh
    
    console.log('✅ [GoogleLink] Firebase token obtido:', firebaseToken ? 'SIM' : 'NÃO');
    console.log('🔐 [GoogleLink] Firebase token (início):', firebaseToken.substring(0, 50) + '...');
    console.log('🔐 [GoogleLink] Comprimento do Firebase token:', firebaseToken.length);
    console.log('🔐 [GoogleLink] Firebase user:', {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName
    });

    // 🔥 VERIFICAÇÃO: O token Firebase é válido?
    if (!firebaseToken || firebaseToken.length < 100) {
      throw new Error("Token Firebase inválido obtido");
    }

    console.log('🔄 [GoogleLink] Enviando requisição para vincular Google...');
    console.log('🔐 [GoogleLink] URL:', "http://localhost:3000/api/auth/link-google");
    console.log('🔐 [GoogleLink] Headers:', {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${finalToken.substring(0, 50)}...` // Mostrar só início por segurança
    });
    console.log('🔐 [GoogleLink] Body:', { 
      firebaseToken: firebaseToken.substring(0, 50) + '...',
      firebaseTokenLength: firebaseToken.length
    });

    const response = await fetch("http://localhost:3000/api/auth/link-google", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${finalToken}`
      },
      body: JSON.stringify({ 
        firebaseToken,
        // 🔥 ADICIONAR: Informações adicionais para debug no backend
        _debug: {
          firebaseUid: firebaseUser.uid,
          firebaseEmail: firebaseUser.email,
          timestamp: new Date().toISOString()
        }
      })
    });

    console.log('📡 [GoogleLink] Resposta da API - Status:', response.status);
    console.log('📡 [GoogleLink] Resposta da API - OK:', response.ok);
    console.log('📡 [GoogleLink] Resposta da API - Headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('📡 [GoogleLink] Dados da resposta:', data);

    if (!response.ok) {
      console.error('❌ [GoogleLink] Erro na resposta da API:', data);
      
      // 🔥 TRATAMENTO ESPECÍFICO PARA ERRO 401
      if (response.status === 401) {
        if (data.code === 'INVALID_FIREBASE_TOKEN') {
          console.error('🔥 [GoogleLink] PROBLEMA NO BACKEND: Token Firebase rejeitado');
          console.error('🔥 [GoogleLink] Possíveis causas:');
          console.error('🔥 [GoogleLink] 1. Firebase não configurado corretamente no backend');
          console.error('🔥 [GoogleLink] 2. Projeto Firebase diferente entre frontend/backend');
          console.error('🔥 [GoogleLink] 3. Token expirado muito rápido');
        }
      }
      
      throw new Error(data.error || "Erro ao vincular conta Google");
    }

    setMessage("Conta Google vinculada com sucesso!");
    console.log('✅ [GoogleLink] Conta Google vinculada com sucesso!');

    if (data.token && data.player) {
      console.log('🔄 [GoogleLink] Atualizando dados de autenticação...');
      authUtils.setAuthData(data.token, data.player);
      console.log('✅ [GoogleLink] Dados de autenticação atualizados');
      
      // Verificar se atualizou corretamente
      const newAuthStatus = authUtils.getAuthStatus();
      console.log('🔐 [GoogleLink] Novo status após atualização:', newAuthStatus);
    }

    onLinkSuccess?.(data);
    console.log('🎉 [GoogleLink] Vinculação concluída com sucesso!');

  } catch (err) {
    console.error("❌ [GoogleLink] Erro ao vincular conta Google:", err);
    console.error("❌ [GoogleLink] Stack trace:", err.stack);
    console.error("❌ [GoogleLink] Tipo do erro:", err.name);
    console.error("❌ [GoogleLink] Mensagem do erro:", err.message);
    
    // Log adicional para erros de rede
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      console.error('🌐 [GoogleLink] Possível erro de rede/CORS');
    }
    
    // 🔥 TRATAMENTO ESPECÍFICO PARA FIREBASE
    if (err.code && err.code.includes('auth/')) {
      console.error('🔥 [GoogleLink] Erro específico do Firebase:', err.code);
      console.error('🔥 [GoogleLink] Mensagem completa:', err.message);
    }
    
    setError(err.message);
  } finally {
    setLoading(false);
    console.log('🔚 [GoogleLink] Finalizando função handleLinkGoogleAccount');
  }
};

  const handleUnlinkGoogle = async () => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      // Debug também para a função de desvincular
      const jwtToken = authUtils.getToken();
      console.log("🔐 [Unlink] Token do authUtils:", jwtToken);

      let finalToken = jwtToken;
      if (!finalToken) {
        finalToken =
          localStorage.getItem("authToken") ||
          localStorage.getItem("token") ||
          localStorage.getItem("userToken");
      }

      if (!finalToken) {
        throw new Error("Você precisa estar logado.");
      }

      console.log("🔐 [Unlink] Token final:", finalToken);

      const response = await fetch(
        "http://localhost:3000/api/auth/unlink-google",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${finalToken}`,
          },
        }
      );

      const data = await response.json();
      console.log("📡 [Unlink] Resposta:", data);

      if (!response.ok) {
        throw new Error(data.error || "Erro ao desvincular conta");
      }

      setMessage("Conta Google desvinculada com sucesso!");

      if (data.player) {
        authUtils.updatePlayerData(data.player);
      }

      onLinkSuccess?.(data);
    } catch (err) {
      console.error("❌ [Unlink] Erro:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isGoogleLinked = profile?.PL_AUTH_PROVIDER === "google";

  // Debug do profile também
  console.log("👤 Profile recebido:", profile);
  console.log("🔗 Google vinculado?:", isGoogleLinked);

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

      {message && (
        <div className="mb-3 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
          <p className="text-green-400 text-sm flex items-center gap-2">
            <Check size={16} />
            {message}
          </p>
        </div>
      )}

      {error && (
        <div className="mb-3 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </p>
        </div>
      )}

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

      <div className="mt-3 text-xs text-gray-400">
        {isGoogleLinked ? (
          <p>Sua conta está vinculada ao Google.</p>
        ) : (
          <p>Vincule sua conta Google para login rápido e sincronização.</p>
        )}
      </div>
    </div>
  );
};

export default GoogleLink;
