"use client"

import { useState, useEffect, useRef } from "react"
import { X, Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Task } from "@/components/task-list"

interface AddTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (name: string, pomodoroCount: number, notes?: string) => void
  editingTask?: Task | null
}

export function AddTaskModal({ isOpen, onClose, onAdd, editingTask }: AddTaskModalProps) {
  const [taskName, setTaskName] = useState("")
  const [notes, setNotes] = useState("")
  const [pomodoroCount, setPomodoroCount] = useState(1)
  const modalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize form with editing task data or reset
  useEffect(() => {
    if (isOpen) {
      if (editingTask) {
        setTaskName(editingTask.name)
        setNotes(editingTask.notes || "")
        setPomodoroCount(editingTask.pomodoroCount)
      } else {
        setTaskName("")
        setNotes("")
        setPomodoroCount(1)
      }
      // Focus input after a short delay to ensure modal is visible
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen, editingTask])

  // Reset scroll position when modal opens
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.scrollTop = 0
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (taskName.trim()) {
      onAdd(taskName.trim(), pomodoroCount, notes.trim() || undefined)
      setTaskName("")
      setNotes("")
      setPomodoroCount(1)
      onClose()
    }
  }

  const incrementPomodoro = () => {
    setPomodoroCount((prev) => Math.min(prev + 1, 10))
  }

  const decrementPomodoro = () => {
    setPomodoroCount((prev) => Math.max(prev - 1, 1))
  }

  if (!isOpen) return null

  const isEditing = !!editingTask

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - Fixed position from bottom to handle keyboard */}
      <div 
        ref={modalRef}
        className="relative w-full max-w-md bg-card rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col"
        style={{ maxHeight: "85vh" }}
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border/30 flex-shrink-0">
          <h2 className="text-xl font-bold text-foreground">
            {isEditing ? "编辑任务" : "添加新任务"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          <form id="add-task-form" onSubmit={handleSubmit}>
            {/* Task Name Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                任务名称
              </label>
              <input
                ref={inputRef}
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="请输入任务名称..."
                className="w-full px-4 py-3 bg-input rounded-xl border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                autoComplete="off"
              />
            </div>

            {/* Notes Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">
                备注（可选）
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="添加备注信息..."
                rows={3}
                className="w-full px-4 py-3 bg-input rounded-xl border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {/* Pomodoro Count */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">
                预计番茄数
              </label>
              <div className="flex items-center justify-center gap-6 py-4 bg-muted rounded-xl">
                <button
                  type="button"
                  onClick={decrementPomodoro}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                    pomodoroCount === 1
                      ? "bg-muted-foreground/20 text-muted-foreground cursor-not-allowed"
                      : "bg-primary text-primary-foreground shadow-md active:scale-95"
                  )}
                  disabled={pomodoroCount === 1}
                >
                  <Minus size={20} />
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-4xl font-bold text-foreground">{pomodoroCount}</span>
                  <span className="text-3xl">🍅</span>
                </div>

                <button
                  type="button"
                  onClick={incrementPomodoro}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                    pomodoroCount === 10
                      ? "bg-muted-foreground/20 text-muted-foreground cursor-not-allowed"
                      : "bg-primary text-primary-foreground shadow-md active:scale-95"
                  )}
                  disabled={pomodoroCount === 10}
                >
                  <Plus size={20} />
                </button>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-2">
                每个番茄 = 25分钟专注时间
              </p>
            </div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="p-6 pt-4 border-t border-border/30 bg-card flex-shrink-0">
          <button
            type="submit"
            form="add-task-form"
            className={cn(
              "w-full py-4 rounded-2xl font-semibold text-lg transition-all",
              taskName.trim()
                ? "bg-primary text-primary-foreground shadow-lg active:scale-98"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
            disabled={!taskName.trim()}
          >
            {isEditing ? "保存修改" : "添加任务"}
          </button>
        </div>
      </div>
    </div>
  )
}
