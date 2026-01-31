import { ReactNode, createContext, useContext, useState } from 'react';

interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger';
}

interface ConfirmDialogContextType {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | null>(null);

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error('useConfirmDialog must be used within ConfirmDialogProvider');
  }
  return context;
}

interface DialogState extends ConfirmDialogOptions {
  isOpen: boolean;
  resolve?: (value: boolean) => void;
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    title: '',
    message: '',
  });

  const confirm = (options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({
        ...options,
        isOpen: true,
        resolve,
      });
    });
  };

  const handleConfirm = () => {
    dialog.resolve?.(true);
    setDialog({ ...dialog, isOpen: false });
  };

  const handleCancel = () => {
    dialog.resolve?.(false);
    setDialog({ ...dialog, isOpen: false });
  };

  const getTypeStyles = () => {
    switch (dialog.type) {
      case 'warning':
        return {
          icon: '⚠️',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
        };
      case 'danger':
        return {
          icon: '🚫',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          buttonColor: 'bg-red-600 hover:bg-red-700',
        };
      default:
        return {
          icon: 'ℹ️',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/30',
          buttonColor: 'bg-theme-primary hover:bg-theme-primary-hover',
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      
      {dialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCancel}
          />

          {/* Dialog */}
          <div className={`relative w-full max-w-md mx-4 rounded-xl shadow-2xl overflow-hidden border ${styles.borderColor} ${styles.bgColor} backdrop-blur-md bg-white/90 dark:bg-dark-200/90`}>
            {/* Header */}
            <div className="p-6 pb-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{styles.icon}</span>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {dialog.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {dialog.message}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 pt-2 flex gap-3 justify-end">
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg font-medium text-sm transition-colors bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-dark-100 dark:hover:bg-dark-50 dark:text-gray-200"
              >
                {dialog.cancelText || 'Cancel'}
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors text-white ${styles.buttonColor}`}
              >
                {dialog.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
}
