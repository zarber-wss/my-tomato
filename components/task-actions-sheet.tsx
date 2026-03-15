"use client"

import type { Task } from "@/components/task-list"

interface TaskActionsSheetProps {
  isOpen: boolean
  onClose: () => void
  task: Task | null
  onComplete: (id: string) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  /** 今日待办时显示，调整到未来待办 */
  onMoveToFuture?: (id: string) => void
  /** 未来待办时显示，添加到今日待办 */
  onAddToToday?: (id: string) => void
}

export function TaskActionsSheet({
  isOpen,
  onClose,
  task,
  onComplete,
  onEdit,
  onDelete,
  onMoveToFuture,
  onAddToToday,
}: TaskActionsSheetProps) {
  if (!isOpen || !task) return null

  const isFutureTask = task.createdAt == null

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

  const handleMoveToFuture = () => {
    onMoveToFuture?.(task.id)
    onClose()
  }

  const handleAddToToday = () => {
    onAddToToday?.(task.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md bg-card rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[85vh]"
      >
        {/* 顶部拖拽把手 - 标题与浮层顶部间距加倍：pb-4 */}
        <div className="flex justify-center pt-4 pb-4 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        {/* 任务名称与备注：备注最多 2 行截断，保留换行 */}
        <div className="px-6 pb-4 border-b border-border/30 flex-shrink-0">
          <h2 className="text-xl font-bold text-foreground">{task.name}</h2>
          {task.notes && task.notes.trim() ? (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2 overflow-hidden text-ellipsis whitespace-pre-wrap break-words">
              {task.notes}
            </p>
          ) : null}
        </div>
        {/* 操作按钮：未来任务展示 添加到今日待办、修改任务、删除；今日任务展示 完成任务、修改任务、调整到未来待办、删除；高度自适应，内容多时可滚动 */}
        <div className="p-6 pt-4 flex-1 min-h-0 overflow-y-auto space-y-[14px]">
          {isFutureTask && onAddToToday && (
            <button
              onClick={handleAddToToday}
              className="w-full flex items-center justify-center px-4 py-4 rounded-xl font-medium bg-primary text-primary-foreground transition-colors hover:opacity-90 active:scale-[0.98]"
            >
              添加到今日待办
            </button>
          )}
          {isFutureTask && (
            <button
              onClick={handleEdit}
              className="w-full flex items-center justify-center px-4 py-4 rounded-xl font-medium text-foreground bg-muted hover:bg-muted/80 transition-colors active:scale-[0.98]"
            >
              修改任务
            </button>
          )}
          {!isFutureTask && !task.completed && (
            <button
              onClick={handleComplete}
              className="w-full flex items-center justify-center px-4 py-4 rounded-xl font-medium bg-primary text-primary-foreground transition-colors hover:opacity-90 active:scale-[0.98]"
            >
              完成任务
            </button>
          )}
          {!isFutureTask && !task.completed && (
            <button
              onClick={handleEdit}
              className="w-full flex items-center justify-center px-4 py-4 rounded-xl font-medium text-foreground bg-muted hover:bg-muted/80 transition-colors active:scale-[0.98]"
            >
              修改任务
            </button>
          )}
          {!isFutureTask && !task.completed && task.createdAt != null && onMoveToFuture && (
            <button
              onClick={handleMoveToFuture}
              className="w-full flex items-center justify-center px-4 py-4 rounded-xl font-medium text-foreground bg-muted hover:bg-muted/80 transition-colors active:scale-[0.98]"
            >
              调整到未来待办
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
