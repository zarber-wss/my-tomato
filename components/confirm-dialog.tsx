"use client"

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - Same style as AddTaskModal */}
      <div 
        className="relative w-full max-w-md bg-card rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-center p-6 pb-4 border-b border-border/30 flex-shrink-0">
          <h2 className="text-xl font-bold text-foreground">
            {title}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 pt-4">
          <p className="text-muted-foreground text-base">
            {description}
          </p>
        </div>

        {/* Footer */}
        <div className="p-6 pt-2 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl font-semibold text-lg bg-secondary text-foreground transition-all active:scale-98"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-4 rounded-2xl font-semibold text-lg bg-blue-500 text-white shadow-lg transition-all active:scale-98"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  )
}
