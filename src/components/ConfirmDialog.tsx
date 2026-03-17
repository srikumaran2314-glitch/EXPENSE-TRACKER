import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDanger = true
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-6 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDanger ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-stone-900">{title}</h3>
              <p className="text-stone-500 mt-2 text-sm">{message}</p>
            </div>
            
            <div className="p-6 bg-stone-50 flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-xl font-bold text-stone-600 hover:bg-stone-200 transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 py-3 rounded-xl font-bold text-white transition-all shadow-lg ${
                  isDanger ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 'bg-stone-900 hover:bg-stone-800 shadow-stone-100'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
