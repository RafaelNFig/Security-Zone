// src/pages/GameHome/ProfileView/components/ConfirmModal/confirmModal.jsx
import React from 'react';
import { CheckCircle, X, AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ 
  isOpen, 
  onConfirm, 
  onCancel, 
  title = "Confirmar Alterações",
  message = "Tem certeza que deseja salvar as alterações?",
  confirmText = "Salvar",
  cancelText = "Cancelar",
  type = "info"
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={42} className="text-emerald-300" />;
      case 'warning':
        return <AlertTriangle size={42} className="text-yellow-300" />;
      case 'error':
        return <AlertTriangle size={42} className="text-red-400" />;
      default:
        return <CheckCircle size={42} className="text-cyan-300" />;
    }
  };

  const getButtonStyles = () => {
    switch (type) {
      case 'success':
        return 'from-emerald-400 to-emerald-500 text-black';
      case 'warning':
        return 'from-yellow-400 to-yellow-500 text-black';
      case 'error':
        return 'from-red-500 to-red-600 text-white';
      default:
        return 'from-cyan-400 to-cyan-500 text-black';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center
                    bg-black/70 backdrop-blur-sm px-4">
      
      <div className="relative w-full max-w-md
                      bg-[#0B0F16]/95
                      border border-white/10
                      rounded-2xl
                      shadow-[0_30px_120px_rgba(0,0,0,0.75)]
                      overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="text-lg font-extrabold tracking-tight text-slate-100">
            {title}
          </h3>

          <button
            onClick={onCancel}
            className="h-9 w-9 rounded-xl flex items-center justify-center
                       bg-white/5 border border-white/10
                       hover:bg-white/10 transition"
            aria-label="Fechar"
          >
            <X size={18} className="text-slate-200" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center text-center px-6 py-6 gap-4">
          <div className="flex items-center justify-center">
            {getIcon()}
          </div>

          <p className="text-slate-200/80 text-sm sm:text-base leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end
                        px-5 py-4 border-t border-white/10">
          
          <button
            onClick={onCancel}
            className="w-full sm:w-auto px-5 py-2.5
                       rounded-xl
                       bg-white/5 border border-white/10
                       text-slate-200
                       hover:bg-white/10 transition font-semibold"
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            className={`w-full sm:w-auto px-5 py-2.5
                        rounded-xl font-extrabold transition
                        bg-gradient-to-b ${getButtonStyles()}
                        shadow-lg hover:brightness-110`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
