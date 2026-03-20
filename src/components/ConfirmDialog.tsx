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
  theme?: string;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDanger = true,
  theme = 'dark'
}: ConfirmDialogProps) {
  const isPink = theme === 'pink';
  const isWhite = theme === 'light';
  
  const cardBg = isWhite ? 'bg-white' : (isPink ? 'bg-[#FF8DA1]' : 'bg-black');
  const borderCol = isWhite ? 'border-stone-200' : (isPink ? 'border-black/10' : 'border-white/10');
  const textColor = isWhite ? 'text-black font-bold' : (isPink ? 'text-black font-bold' : 'text-white');
  const mutedText = isWhite ? 'text-black font-bold' : (isPink ? 'text-black/60 font-bold' : 'text-white/60');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`${cardBg} w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border ${borderCol}`}
          >
            <div className="p-6 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDanger ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className={`text-xl font-bold ${textColor}`}>{title}</h3>
              <p className={`${mutedText} mt-2 text-sm`}>{message}</p>
            </div>
            
            <div className={`p-6 ${cardBg} flex gap-3`}>
              <button
                onClick={onCancel}
                className={`flex-1 py-3 rounded-xl font-bold ${isPink ? 'bg-black/10 text-black' : 'bg-white/5 text-white'} border ${borderCol} hover:opacity-80 transition-all`}
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 py-3 rounded-xl font-bold ${isPink ? 'bg-black text-white' : 'bg-white/10 backdrop-blur-md border border-white/30 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]'} hover:opacity-80 transition-all`}
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
