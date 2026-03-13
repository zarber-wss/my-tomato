"use client"

import React, { useState, useEffect } from "react"
import { Check, Trash2, MoreVertical, ArrowUpDown, GripVertical, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface Task {
  id: string
  name: string
  notes?: string
  pomodoroCount: number
  completedPomodoros: number
  completed: boolean
  completedAt?: Date
}

interface TaskListProps {
  tasks: Task[]
  onToggleComplete: (id: string) => void
  onDelete: (id: string) => void
  onReorder: (tasks: Task[]) => void
  onSelectTask: (task: Task) => void
  onEditTask: (task: Task) => void
  selectedTaskId?: string
}

const CARD_COLORS = [
  { bg: "bg-pink-50", border: "border-pink-300", shadow: "shadow-pink-200/50" },
  { bg: "bg-blue-50", border: "border-blue-300", shadow: "shadow-blue-200/50" },
  { bg: "bg-emerald-50", border: "border-emerald-300", shadow: "shadow-emerald-200/50" },
  { bg: "bg-amber-50", border: "border-amber-300", shadow: "shadow-amber-200/50" },
]

export function TaskList({
  tasks,
  onToggleComplete,
  onDelete,
  onReorder,
  onSelectTask,
  onEditTask,
  selectedTaskId,
}: TaskListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [isSortMode, setIsSortMode] = useState(false)
  const [touchStartY, setTouchStartY] = useState<number | null>(null)
  const [touchCurrentY, setTouchCurrentY] = useState<number | null>(null)
  const [newTaskId, setNewTaskId] = useState<string | null>(null)
  const prevTasksRef = React.useRef<Task[]>(tasks)
  const listRef = React.useRef<HTMLDivElement>(null)

  // Detect new task added
  useEffect(() => {
    const prevIds = new Set(prevTasksRef.current.map(t => t.id))
    const newTask = tasks.find(t => !prevIds.has(t.id) && !t.completed)
    
    if (newTask) {
      setNewTaskId(newTask.id)
      // Clear animation after it completes
      const timer = setTimeout(() => {
        setNewTaskId(null)
      }, 500)
      return () => clearTimeout(timer)
    }
    
    prevTasksRef.current = tasks
  }, [tasks])

  // Get today's date at midnight
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Filter tasks: uncompleted + completed today
  const activeTasks = tasks.filter((t) => !t.completed)
  const todayCompletedTasks = tasks.filter((t) => {
    if (!t.completed || !t.completedAt) return false
    const completedDate = new Date(t.completedAt)
    completedDate.setHours(0, 0, 0, 0)
    return completedDate.getTime() === today.getTime()
  })

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newTasks = [...activeTasks]
      const [draggedItem] = newTasks.splice(draggedIndex, 1)
      newTasks.splice(dragOverIndex, 0, draggedItem)
      
      // Merge with completed tasks
      const completedTasks = tasks.filter((t) => t.completed)
      onReorder([...newTasks, ...completedTasks])
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  // Touch handlers for mobile drag and drop
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    if (!isSortMode) return
    setDraggedIndex(index)
    setTouchStartY(e.touches[0].clientY)
    setTouchCurrentY(e.touches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (draggedIndex === null || !isSortMode) return
    e.preventDefault() // Prevent page scrolling during drag
    
    const touchY = e.touches[0].clientY
    setTouchCurrentY(touchY)
    
    // Find which item we're dragging over
    if (listRef.current) {
      const items = listRef.current.querySelectorAll('[data-task-item]')
      items.forEach((item, index) => {
        const rect = item.getBoundingClientRect()
        if (touchY >= rect.top && touchY <= rect.bottom) {
          setDragOverIndex(index)
        }
      })
    }
  }

  const handleTouchEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newTasks = [...activeTasks]
      const [draggedItem] = newTasks.splice(draggedIndex, 1)
      newTasks.splice(dragOverIndex, 0, draggedItem)
      
      const completedTasks = tasks.filter((t) => t.completed)
      onReorder([...newTasks, ...completedTasks])
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
    setTouchStartY(null)
    setTouchCurrentY(null)
  }

  // Disable body scroll when in sort mode
  useEffect(() => {
    if (isSortMode) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isSortMode])

  const renderTaskCard = (task: Task, index: number, isCompleted: boolean) => {
    const colorConfig = CARD_COLORS[index % CARD_COLORS.length]
    const isSelected = selectedTaskId === task.id
    const isDragging = draggedIndex === index
    const isDragOver = dragOverIndex === index
    const hasNotes = task.notes && task.notes.trim().length > 0
    const isNewTask = task.id === newTaskId

    return (
      <div
        key={task.id}
        data-task-item
        draggable={isSortMode && !isCompleted}
        onDragStart={(e) => handleDragStart(e, index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDragEnd={handleDragEnd}
        onDragLeave={handleDragLeave}
        onTouchStart={(e) => handleTouchStart(e, index)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => !isCompleted && !isSortMode && onSelectTask(task)}
        className={cn(
          "rounded-2xl px-4 py-3.5 transition-all border-2",
          isCompleted 
            ? "bg-white border-border/30 shadow-sm" 
            : cn(colorConfig.bg, "shadow-md", colorConfig.shadow),
          !isCompleted && (!isSelected || isSortMode) && "border-transparent",
          !isCompleted && !isSortMode && "cursor-pointer",
          isSelected && !isCompleted && !isSortMode && cn(
            colorConfig.border,
            // Neumorphism effect for selected state
            "shadow-[inset_2px_2px_4px_rgba(255,255,255,0.8),inset_-2px_-2px_4px_rgba(0,0,0,0.08),4px_4px_8px_rgba(0,0,0,0.1)]"
          ),
          isDragging && "opacity-50 scale-95 rotate-1",
          isDragOver && draggedIndex !== null && index < draggedIndex && "-translate-y-2 shadow-lg",
          isDragOver && draggedIndex !== null && index > draggedIndex && "translate-y-2 shadow-lg",
          isDragOver && draggedIndex !== null && index === dragOverIndex && "scale-[1.02] bg-blue-50",
          isSortMode && !isCompleted && "cursor-default",
          isNewTask && "animate-in slide-in-from-bottom-4 fade-in duration-300"
        )}
      >
        <div className="flex items-center gap-3">
          {/* Complete Toggle - Hidden in sort mode */}
          {!isSortMode && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleComplete(task.id)
              }}
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center transition-all flex-shrink-0",
                task.completed
                  ? "bg-gray-300"
                  : "border-2 border-foreground/20 hover:border-foreground/40"
              )}
            >
              {task.completed && <Check size={14} className="text-white" />}
            </button>
          )}

          {/* Task Info */}
          <div className="flex-1 min-w-0 pr-2 flex items-center">
            <div>
              <p className={cn(
                "font-medium break-words leading-normal",
                isCompleted ? "text-muted-foreground" : "text-foreground"
              )}>
                {task.name}
              </p>
              {hasNotes && (
                <p className={cn(
                  "text-sm mt-1 whitespace-pre-wrap break-words leading-normal",
                  isCompleted ? "text-muted-foreground/60" : "text-foreground/60"
                )}>
                  {task.notes}
                </p>
              )}
            </div>
          </div>

          {/* Pomodoro Count */}
          <div className="flex items-center gap-1 text-sm text-foreground/60 flex-shrink-0">
            <span className="font-medium">
              {task.completedPomodoros}/{task.pomodoroCount}
            </span>
            <span className="text-base">🍅</span>
          </div>

          {/* Sort Mode: Drag Handle */}
          {isSortMode && !isCompleted && (
            <div className="flex items-center justify-center flex-shrink-0 cursor-grab active:cursor-grabbing p-1">
              <GripVertical size={20} className="text-foreground/40" />
            </div>
          )}

          {/* Actions Menu - Hidden in sort mode */}
          {!isSortMode && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-2.5 -m-1 rounded-xl hover:bg-foreground/5 transition-colors flex-shrink-0"
                >
                  <MoreVertical size={22} className="text-foreground/40" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={5}>
                {!isCompleted && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditTask(task)
                    }}
                  >
                    <Pencil size={16} className="mr-2" />
                    编辑任务
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(task.id)
                  }}
                  className="text-destructive"
                >
                  <Trash2 size={16} className="mr-2" />
                  删除任务
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    )
  }

  const totalTaskCount = activeTasks.length + todayCompletedTasks.length

  if (totalTaskCount === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🍅</div>
        <p className="text-foreground font-medium">还没有任务</p>
        <p className="text-sm text-muted-foreground mt-1">点击下方按钮添加任务</p>
      </div>
    )
  }

  return (
    <div ref={listRef} className="flex flex-col gap-3">
      {/* Header with count and sort button */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">今日待办</h2>
          <span className="text-xs text-muted-foreground">
            {totalTaskCount}个任务
          </span>
        </div>
        <button
          onClick={() => setIsSortMode(!isSortMode)}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
            isSortMode 
              ? "bg-pink-100 text-pink-600" 
              : "bg-secondary text-muted-foreground hover:text-foreground"
          )}
        >
          <ArrowUpDown size={14} />
          {isSortMode ? "完成" : "排序"}
        </button>
      </div>

      {/* Active tasks */}
      {activeTasks.map((task, index) => renderTaskCard(task, index, false))}
      
      {/* Today's completed tasks - Hidden in sort mode */}
      {!isSortMode && todayCompletedTasks.length > 0 && (
        <>
          {activeTasks.length > 0 && (
            <div className="flex items-center gap-3 my-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">今日已完成</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}
          {todayCompletedTasks.map((task, index) => renderTaskCard(task, index, true))}
        </>
      )}
    </div>
  )
}
