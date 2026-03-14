"use client"

import type { Task } from "@/components/task-list"

interface TaskActionsSheetProps {
  isOpen: boolean
  onClose: () => void
  task: Task | null
  onComplete: (id: string) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}

export function TaskActionsSheet({
  isOpen,
  onClose,
  task,
  onComplete,
  onEdit,
  onDelete,
}: TaskActionsSheetProps) {
  if (!isOpen || !task) return null

  const handleComplete = () => {
    onComplete(task.id)
    onClose()
  }

  const handleEdit = () => {
    onEdit(task)
    onClose()
  }

  const handleDelete = () => {
    onDelete(task.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md bg-card rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col"
        style={{ maxHeight: "50vh" }}
      >
        {/* 顶部拖拽把手 - 标题与浮层顶部间距加倍：pb-4 */}
        <div className="flex justify-center pt-4 pb-4 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        {/* 任务名称与备注 */}
        <div className="px-6 pb-4 border-b border-border/30 flex-shrink-0">
          <h2 className="text-xl font-bold text-foreground">{task.name}</h2>
          {task.notes && task.notes.trim() ? (
            <p className="text-sm text-muted-foreground mt-1">{task.notes}</p>
          ) : null}
        </div>
        {/* 三个操作按钮：仅文字、高度+1/4、间距+2px */}
        <div className="p-6 pt-4 flex-1 overflow-y-auto space-y-[14px]">
          {!task.completed && (
            <button
              onClick={handleComplete}
              className="w-full flex items-center justify-center px-4 py-4 rounded-xl font-medium text-white transition-colors hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "#3473B5" }}
            >
              完成任务
            </button>
          )}
          {!task.completed && (
            <button
              onClick={handleEdit}
              className="w-full flex items-center justify-center px-4 py-4 rounded-xl font-medium text-foreground bg-muted hover:bg-muted/80 transition-colors active:scale-[0.98]"
            >
              修改任务
            </button>
          )}
          <button
            onClick={handleDelete}
            className="w-full flex items-center justify-center px-4 py-4 rounded-xl font-medium text-destructive bg-muted hover:bg-muted/80 transition-colors active:scale-[0.98]"
          >
            删除任务
          </button>
        </div>
      </div>
    </div>
  )
}
