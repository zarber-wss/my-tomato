"use client"

import { useState, useEffect, useRef } from "react"
import { X, Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Task } from "@/components/task-list"

type AddTaskSchedule = "today" | "future"

interface AddTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (name: string, pomodoroCount: number, notes?: string, isToday?: boolean) => void
  editingTask?: Task | null
}

export function AddTaskModal({ isOpen, onClose, onAdd, editingTask }: AddTaskModalProps) {
  const [taskName, setTaskName] = useState("")
  const [notes, setNotes] = useState("")
  const [pomodoroCount, setPomodoroCount] = useState(1)
  const [schedule, setSchedule] = useState<AddTaskSchedule>("today")
  const modalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize form with editing task data or reset
  useEffect(() => {
    if (isOpen) {
      if (editingTask) {
        setTaskName(editingTask.name)
        setNotes(editingTask.notes || "")
        setPomodoroCount(editingTask.pomodoroCount)
        setSchedule("today")
      } else {
        setTaskName("")
        setNotes("")
        setPomodoroCount(1)
        setSchedule("today")
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
      const isToday = schedule === "today"
      onAdd(taskName.trim(), pomodoroCount, notes.trim() || undefined, isToday)
      setTaskName("")
      setNotes("")
      setPomodoroCount(1)
      setSchedule("today")
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

      {/* Modal - Fixed position from bottom to handle keyboard，附图风格：白底、大圆角、柔和阴影 */}
      <div 
        ref={modalRef}
        className="relative w-full max-w-md bg-white rounded-t-[28px] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom duration-300 flex flex-col"
        style={{ maxHeight: "85vh" }}
      >
        {/* Fixed Header - 标题左、关闭右 */}
        <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0">
          <h2 className="text-xl font-bold text-stone-900">
            {isEditing ? "编辑任务" : "添加任务"}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200/80 transition-colors"
          >
            <X size={18} className="text-stone-500" />
          </button>
        </div>

        {/* Scrollable Content - 标签字体与垂直间距统一 */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <form id="add-task-form" onSubmit={handleSubmit}>
            <div className="mb-4">
              <p className="text-sm font-medium text-stone-600 mb-2">你在专注做什么?</p>
              <input
                ref={inputRef}
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="输入任务名称..."
                className="w-full px-4 py-3.5 bg-stone-100/80 rounded-2xl border-0 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                autoComplete="off"
              />
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-stone-600 mb-2">备注（可选）</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="添加备注信息..."
                rows={3}
                className="w-full px-4 py-3 bg-stone-100/80 rounded-2xl border-0 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 resize-none"
              />
            </div>

            {/* 安排在（左）参考高/中/低选中态 | 预估番茄数（右）附图 pill + 左对齐 */}
            {!editingTask ? (
              <div className="flex flex-wrap items-start gap-4 mb-4">
                <div className="flex-1 min-w-[140px]">
                  <p className="text-sm font-medium text-stone-600 mb-2">安排在</p>
                  <div className="inline-flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSchedule("today")}
                      className={cn(
                        "w-20 h-11 rounded-xl text-sm font-medium transition-all flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.08)]",
                        schedule === "today"
                          ? "bg-white border-2 border-emerald-400 text-emerald-600 font-semibold"
                          : "bg-stone-100 text-stone-600 hover:text-stone-800"
                      )}
                    >
                      今日
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchedule("future")}
                      className={cn(
                        "w-20 h-11 rounded-xl text-sm font-medium transition-all flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.08)]",
                        schedule === "future"
                          ? "bg-white border-2 border-emerald-400 text-emerald-600 font-semibold"
                          : "bg-stone-100 text-stone-600 hover:text-stone-800"
                      )}
                    >
                      未来
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-w-[140px] min-h-[92px]">
                  <div className={cn("transition-opacity duration-200 pb-2", schedule === "future" && "opacity-0 pointer-events-none")}>
                    <p className="text-sm font-medium text-stone-600 mb-2">预估番茄数</p>
                    <div className="flex items-center gap-2 h-11 rounded-full bg-stone-100/90 shadow-[0_2px_8px_rgba(0,0,0,0.06)] px-1">
                    <button
                      type="button"
                      onClick={decrementPomodoro}
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 shadow-[0_2px_6px_rgba(0,0,0,0.08)]",
                        pomodoroCount === 1
                          ? "bg-white text-stone-400 cursor-not-allowed"
                          : "bg-white text-stone-600 active:scale-95"
                      )}
                      disabled={pomodoroCount === 1}
                    >
                      <Minus size={16} strokeWidth={3} />
                    </button>
                    <div className="flex items-center justify-center gap-1 flex-1 min-w-0">
                      <span className="text-xl font-bold text-stone-800">{pomodoroCount}</span>
                      <span className="text-lg">🍅</span>
                    </div>
                    <button
                      type="button"
                      onClick={incrementPomodoro}
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 shadow-[0_2px_6px_rgba(0,0,0,0.08)]",
                        pomodoroCount === 10
                          ? "bg-white text-stone-400 cursor-not-allowed"
                          : "bg-white text-stone-600 active:scale-95"
                      )}
                      disabled={pomodoroCount === 10}
                    >
                      <Plus size={16} strokeWidth={3} />
                    </button>
                  </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <p className="text-sm font-medium text-stone-600 mb-2">预估番茄数</p>
                <div className="flex items-center gap-2 h-11 rounded-full bg-stone-100/90 shadow-[0_2px_8px_rgba(0,0,0,0.06)] px-1">
                  <button
                    type="button"
                    onClick={decrementPomodoro}
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 shadow-[0_2px_6px_rgba(0,0,0,0.08)]",
                      pomodoroCount === 1
                        ? "bg-white text-stone-400 cursor-not-allowed"
                        : "bg-white text-stone-600 active:scale-95"
                    )}
                    disabled={pomodoroCount === 1}
                  >
                    <Minus size={16} strokeWidth={3} />
                  </button>
                  <div className="flex items-center justify-center gap-1 flex-1 min-w-0">
                    <span className="text-xl font-bold text-stone-800">{pomodoroCount}</span>
                    <span className="text-lg">🍅</span>
                  </div>
                  <button
                    type="button"
                    onClick={incrementPomodoro}
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 shadow-[0_2px_6px_rgba(0,0,0,0.08)]",
                      pomodoroCount === 10
                        ? "bg-white text-stone-400 cursor-not-allowed"
                        : "bg-white text-stone-600 active:scale-95"
                    )}
                    disabled={pomodoroCount === 10}
                  >
                    <Plus size={16} strokeWidth={3} />
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="p-6 pt-4 flex-shrink-0">
          <button
            type="submit"
            form="add-task-form"
            className={cn(
              "w-full py-4 rounded-2xl font-semibold text-lg transition-all text-white",
              taskName.trim()
                ? "bg-emerald-400 shadow-lg shadow-emerald-300/40 active:scale-[0.98]"
                : "bg-stone-300 text-stone-500 cursor-not-allowed"
            )}
            disabled={!taskName.trim()}
          >
            {isEditing ? "保存修改" : "保存任务"}
          </button>
        </div>
      </div>
    </div>
  )
}
