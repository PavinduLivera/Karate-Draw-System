"use client";
import React from 'react';
import { AlertTriangle, ShieldAlert, Info, X } from 'lucide-react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  details?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  details,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-red-100 text-red-600',
          btnBg: 'bg-red-600 hover:bg-red-700 text-white',
          Icon: ShieldAlert,
        };
      case 'info':
        return {
          iconBg: 'bg-blue-100 text-blue-600',
          btnBg: 'bg-blue-600 hover:bg-blue-700 text-white',
          Icon: Info,
        };
      case 'warning':
      default:
        return {
          iconBg: 'bg-amber-100 text-amber-600',
          btnBg: 'bg-amber-600 hover:bg-amber-700 text-white',
          Icon: AlertTriangle,
        };
    }
  };

  const { iconBg, btnBg, Icon } = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 overflow-hidden animate-in zoom-in-95 duration-200 space-y-4">
        
        {/* Top Header with Icon and Close Button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl ${iconBg} flex items-center justify-center shrink-0 shadow-xs`}>
              <Icon size={22} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base leading-snug">
                {title}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Confirmation required
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Message */}
        <p className="text-xs sm:text-sm text-slate-700 font-semibold leading-relaxed">
          {message}
        </p>

        {/* Optional details box */}
        {details && (
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 font-medium">
            {typeof details === 'string' ? <p>{details}</p> : details}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer ${btnBg}`}
          >
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ConfirmationModal;
