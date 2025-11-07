import { useState, useEffect } from 'react';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { app } from './config.js';
import { authUtils } from '../utils/auth.js';

// Inicializar autenticação
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Hook personalizado de autenticação
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Observar mudanças no estado de autenticação
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // Usuário logado - obter token e salvar
          const token = await user.getIdToken();
          const userData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          };
          
          // Usa seu sistema existente de autenticação
          authUtils.setAuthData(token, userData);
          setUser(userData);
        } else {
          // Usuário deslogado - limpar dados
          authUtils.clearAuthData();
          setUser(null);
        }
      } catch (e) {
        console.error('Erro no estado de autenticação:', e);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    // Cleanup function
    return () => unsubscribe();
  }, []);

  // Função de login com Google
  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (e) {
      console.error('Erro no login Google:', e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  // Função de logout
  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
    } catch (e) {
      console.error('Erro no logout:', e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  // Verificar se há usuário salvo (para inicialização)
  useEffect(() => {
    const savedUser = authUtils.getPlayerData();
    if (savedUser && !user) {
      try {
        setUser(savedUser);
      } catch (e) {
        console.warn('Erro ao recuperar usuário:', e);
      }
    }
  }, []);

  return {
    user,
    loading,
    loginWithGoogle,
    logout,
    isAuthenticated: !!user
  };
};

// Exportar funções individuais também
export { auth, googleProvider };