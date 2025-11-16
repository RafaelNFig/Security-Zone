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
        return <CheckCircle size={48} className="text-green-400" />;
      case 'warning':
        return <AlertTriangle size={48} className="text-yellow-400" />;
      case 'error':
        return <AlertTriangle size={48} className="text-red-400" />;
      default:
        return <CheckCircle size={48} className="text-blue-400" />;
    }
  };

  const getButtonStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 hover:bg-green-600';
      case 'warning':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'error':
        return 'bg-red-500 hover:bg-red-600';
      default:
        return 'bg-blue-500 hover:bg-blue-600';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-800 border border-yellow-500/30 rounded-2xl p-6 mx-4 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-yellow-400">{title}</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-300 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-4">
            {getIcon()}
          </div>
          <p className="text-gray-300 text-lg">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition font-semibold"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 py-2 text-white rounded-lg transition font-semibold ${getButtonStyles()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;