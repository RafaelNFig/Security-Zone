import React, { useState } from "react";
import { 
  Power, Trash2, Edit, Star, 
  MoreVertical, AlertCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DeckActions = ({ 
  deckId, 
  deckName, 
  isActive = false, 
  playerId = 1,
  onActionComplete,
  className = "",
  compact = false,
  hideEditButton = false
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(null);
  const [error, setError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // 🔵 Função para debug - mostrar detalhes do erro
  const handleApiError = (operation, error, response) => {
    console.error(`❌ Erro na operação ${operation}:`, {
      error,
      response,
      deckId,
      playerId,
      timestamp: new Date().toISOString()
    });
    
    let errorMessage = "Erro desconhecido";
    
    if (error.message) {
      errorMessage = error.message;
    } else if (response && response.error) {
      errorMessage = response.error;
    } else if (response && response.message) {
      errorMessage = response.message;
    }
    
    setError(errorMessage);
    alert(`❌ Erro ao ${operation}: ${errorMessage}\n\nVerifique o console para mais detalhes.`);
  };

  // 🔵 Ativar/Desativar deck (MELHORADO)
  const toggleActive = async () => {
    setIsLoading(true);
    setError(null);
    setMenuOpen(false);
    
    try {
      console.log(`🔄 Tentando ${isActive ? 'desativar' : 'ativar'} deck ${deckId}...`);
      
      const response = await fetch(
        `http://localhost:3000/api/player/${playerId}/decks/${deckId}/activate`, 
        {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ activate: !isActive })
        }
      );

      // 🔴 PRIMEIRO: Verificar se a resposta é JSON
      const contentType = response.headers.get("content-type");
      let data;
      
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Resposta não é JSON: ${text.substring(0, 100)}`);
      }
      
      console.log(`✅ Resposta da API:`, data);
      
      if (data.success) {
        if (onActionComplete) {
          onActionComplete('toggleActive', { 
            deckId, 
            isActive: data.isActive || !isActive,
            message: data.message || `Deck ${!isActive ? 'ativado' : 'desativado'} com sucesso!`
          });
        }
        alert(`✅ Deck ${!isActive ? 'ativado' : 'desativado'} com sucesso!`);
      } else {
        handleApiError(`alterar status do deck ${deckId}`, 
          new Error(data.error || "Erro desconhecido"), 
          data
        );
      }
    } catch (err) {
      handleApiError(`conectar ao servidor para alterar status`, err, null);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔵 Excluir deck (MELHORADO COM DIAGNÓSTICO)
  const deleteDeck = async () => {
    // Primeira etapa: mostrar confirmação
    if (showConfirm !== 'delete') {
      setShowConfirm('delete');
      return;
    }

    // Segunda etapa: executar exclusão
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`🗑️ Tentando excluir deck ${deckId}...`);
      console.log(`📝 URL: http://localhost:3000/api/player/${playerId}/decks/${deckId}`);
      
      const response = await fetch(
        `http://localhost:3000/api/player/${playerId}/decks/${deckId}`, 
        { 
          method: 'DELETE',
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      // 🔴 DIAGNÓSTICO DETALHADO
      console.log(`📊 Status da resposta: ${response.status} ${response.statusText}`);
      console.log(`📊 Headers:`, Object.fromEntries([...response.headers.entries()]));
      
      const contentType = response.headers.get("content-type");
      let data;
      
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
        console.log(`📦 Dados da resposta:`, data);
      } else {
        const text = await response.text();
        console.log(`📦 Resposta não-JSON:`, text.substring(0, 500));
        data = { success: false, error: `Resposta inválida do servidor: ${response.status}` };
      }
      
      if (response.ok && data.success) {
        console.log(`✅ Deck ${deckId} excluído com sucesso!`);
        
        if (onActionComplete) {
          onActionComplete('delete', { 
            deckId, 
            message: data.message || "Deck excluído com sucesso!"
          });
        }
        
        setShowConfirm(null);
        setMenuOpen(false);
        
        // Feedback para o usuário
        alert(`✅ Deck "${deckName}" excluído com sucesso!`);
        
      } else {
        // Tratar erros específicos
        let errorMsg = data.error || `Erro ${response.status}: ${response.statusText}`;
        
        if (response.status === 404) {
          errorMsg = "Deck não encontrado. Pode já ter sido excluído.";
        } else if (response.status === 500) {
          errorMsg = "Erro interno do servidor. Verifique os logs do backend.";
        }
        
        handleApiError(`excluir deck ${deckId}`, new Error(errorMsg), data);
      }
    } catch (err) {
      handleApiError(`conectar ao servidor para excluir deck`, err, null);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔵 Editar deck
  const editDeck = () => {
    setMenuOpen(false);
    if (onActionComplete) {
      onActionComplete('edit', { deckId });
    }
  };

  // 🔵 Cancelar ação
  const cancelAction = () => {
    setShowConfirm(null);
    setError(null);
  };

  // 🔵 Fechar menu ao clicar fora
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuOpen && !event.target.closest('.deck-actions-menu')) {
        setMenuOpen(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuOpen]);

  // 🔵 Renderização compacta (menu dropdown)
  if (compact) {
    return (
      <div className={`relative deck-actions-menu ${className}`}>
        {/* Botão do menu */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="p-2 rounded-lg bg-[#001D3D] hover:bg-[#003566] border border-[#003566] transition-colors"
          disabled={isLoading}
          aria-label="Ações do deck"
        >
          <MoreVertical size={16} />
        </button>

        {/* Menu dropdown */}
        <AnimatePresence>
          {menuOpen && !showConfirm && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-full mt-1 w-48 bg-[#001D3D] border border-[#003566] rounded-lg shadow-lg z-50"
            >
              <div className="py-1">
                {!hideEditButton && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      editDeck();
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-[#003566] flex items-center gap-2 text-sm"
                  >
                    <Edit size={14} />
                    Editar deck
                  </button>
                )}
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleActive();
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-[#003566] flex items-center gap-2 text-sm"
                  disabled={isLoading}
                >
                  <Power size={14} />
                  {isActive ? "Desativar" : "Ativar"}
                  {isLoading && <span className="ml-auto animate-spin">⟳</span>}
                </button>
                
                <div className="border-t border-[#003566] my-1"></div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowConfirm('delete');
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-red-900/30 text-red-400 flex items-center gap-2 text-sm"
                >
                  <Trash2 size={14} />
                  Excluir deck
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de confirmação para exclusão */}
        <AnimatePresence>
          {showConfirm === 'delete' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
              onClick={cancelAction}
            >
              <div 
                className="w-full max-w-md bg-[#001D3D] border border-[#003566] rounded-xl p-5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="text-red-400" size={24} />
                  <h3 className="text-lg font-bold text-[#FFD60A]">
                    Excluir Deck
                  </h3>
                </div>
                
                <p className="text-gray-200 mb-2">
                  Tem certeza que deseja excluir o deck "{deckName}"?
                </p>
                
                <p className="text-sm text-red-400 mb-4">
                  ⚠️ Esta ação não pode ser desfeita.
                </p>
                
                {error && (
                  <div className="mb-4 p-2 bg-red-900/30 border border-red-700 rounded text-sm">
                    <strong>Erro:</strong> {error}
                  </div>
                )}
                
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={cancelAction}
                    className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600"
                    disabled={isLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={deleteDeck}
                    className="px-4 py-2 rounded-lg font-semibold flex items-center gap-2 bg-red-700 hover:bg-red-600"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Excluindo...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        Sim, excluir
                      </>
                    )}
                  </button>
                </div>
                
                {/* 🔴 DIAGNÓSTICO PARA DESENVOLVEDOR */}
                <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-400">
                  <details>
                    <summary className="cursor-pointer hover:text-gray-300">
                      Informações de diagnóstico
                    </summary>
                    <div className="mt-2 space-y-1">
                      <div>Deck ID: <code className="bg-gray-800 px-1 rounded">{deckId}</code></div>
                      <div>Player ID: <code className="bg-gray-800 px-1 rounded">{playerId}</code></div>
                      <div>URL: <code className="bg-gray-800 px-1 rounded">/api/player/{playerId}/decks/{deckId}</code></div>
                      <div>Método: <code className="bg-gray-800 px-1 rounded">DELETE</code></div>
                    </div>
                  </details>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // 🔵 Renderização padrão (botões individuais)
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {!hideEditButton && (
        <button
          onClick={editDeck}
          className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 flex items-center gap-2 transition-colors"
          title="Editar deck"
          disabled={isLoading}
        >
          <Edit size={16} />
          <span>Editar</span>
        </button>
      )}
      
      <button
        onClick={toggleActive}
        className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
          isActive 
            ? 'bg-yellow-600 hover:bg-yellow-500' 
            : 'bg-green-600 hover:bg-green-500'
        }`}
        title={isActive ? "Desativar deck" : "Ativar deck"}
        disabled={isLoading}
      >
        <Power size={16} />
        <span>{isActive ? "Desativar" : "Ativar"}</span>
        {isLoading && <span className="animate-spin">⟳</span>}
      </button>
      
      <button
        onClick={() => setShowConfirm('delete')}
        className="px-3 py-2 rounded-lg bg-red-700 hover:bg-red-600 flex items-center gap-2 transition-colors"
        title="Excluir deck"
        disabled={isLoading}
      >
        <Trash2 size={16} />
        <span>Excluir</span>
      </button>
    </div>
  );
};

// 🔵 Componente de status do deck
export const DeckStatusBadge = ({ isActive, showLabel = true }) => {
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
      isActive ? 'bg-green-700' : 'bg-gray-700'
    }`}>
      <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400' : 'bg-gray-400'}`} />
      {showLabel && (
        <span>{isActive ? 'ATIVO' : 'INATIVO'}</span>
      )}
    </div>
  );
};

// 🔵 Componente de estatísticas do deck
export const DeckStats = ({ totalCards, uniqueCards, isActive }) => {
  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1">
        <span className="text-gray-400">Cartas:</span>
        <span className="font-bold text-white">{totalCards}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-gray-400">Únicas:</span>
        <span className="font-bold text-[#FFD60A]">{uniqueCards}</span>
      </div>
      <DeckStatusBadge isActive={isActive} />
    </div>
  );
};

export default DeckActions;