import React from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  type = 'danger'
}) => {
  const colors = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
    info: 'bg-brand-green hover:bg-brand-green/90 text-white'
  };

  const iconColors = {
    danger: 'text-red-600 bg-red-50 dark:bg-red-900/20',
    warning: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    info: 'text-brand-green bg-brand-green/10 dark:bg-brand-green/20'
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center">
        <div className={`p-4 rounded-full mb-6 ${iconColors[type]}`}>
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-2xl font-black mb-4 text-stone-900 dark:text-stone-100">{title}</h2>
        <p className="text-stone-500 dark:text-stone-400 mb-8 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-4 w-full">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-2xl font-bold text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-6 py-3 rounded-2xl font-bold transition-all shadow-sm ${colors[type]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
