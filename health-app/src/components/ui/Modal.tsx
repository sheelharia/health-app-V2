import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
}

export function Modal({ isOpen, onClose, title, children, size = 'md', showCloseButton = true }: ModalProps) {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity" 
          onClick={onClose}
          aria-hidden="true"
        />
        <div className={clsx('relative w-full bg-white rounded-2xl shadow-xl', sizes[size])}>
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-4 border-b border-emerald-100">
              {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

export function ConfirmDialog({ 
  isOpen, onClose, onConfirm, title, message, 
  confirmText = 'Confirm', cancelText = 'Cancel',
  variant = 'primary', isLoading 
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
          <div className="p-4">
            <p className="text-gray-600">{message}</p>
          </div>
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={clsx(
                'px-4 py-2 text-sm font-medium text-white rounded-xl disabled:opacity-50',
                variant === 'danger' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-brand-600 hover:bg-brand-700'
              )}
            >
              {isLoading ? '...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}