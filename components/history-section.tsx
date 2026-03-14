"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Task } from "./task-list"

interface HistorySectionProps {
  tasks: Task[]
}

function formatDate(date: Date): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const taskDate = new Date(date)
  taskDate.setHours(0, 0, 0, 0)
  
  if (taskDate.getTime() === yesterday.getTime()) {
    return "昨天"
  }
  
  const month = (taskDate.getMonth() + 1).toString().padStart(2, '0')
  const day = taskDate.getDate().toString().padStart(2, '0')
  
  if (taskDate.getFullYear() === today.getFullYear()) {
    return `${month}月${day}日`
  }
  
  return `${taskDate.getFullYear()}.${month}月${day}日`
}

function getDateKey(date: Date): string {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, "0")
  const day = d.getDate().toString().padStart(2, "0")
  return `${y}-${m}-${day}`
}

function groupTasksByDate(tasks: Task[]): Map<string, { displayDate: string; tasks: Task[] }> {
  const groups = new Map<string, { displayDate: string; tasks: Task[] }>()
  const todayKey = getDateKey(new Date())

  tasks
    .filter((task) => {
      if (!task.completed || !task.completedAt) return false
      const completedKey = getDateKey(task.completedAt)
      return completedKey < todayKey
    })
    .sort((a, b) => {
      const dateA = new Date(a.completedAt!).getTime()
      const dateB = new Date(b.completedAt!).getTime()
      return dateB - dateA
    })
    .forEach((task) => {
      const dateKey = getDateKey(task.completedAt!)
      const displayDate = formatDate(task.completedAt!)
      const existing = groups.get(dateKey)
      if (existing) {
        existing.tasks.push(task)
      } else {
        groups.set(dateKey, { displayDate, tasks: [task] })
      }
    })
  
  return groups
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getDailyStats(tasks: Task[], year: number, month: number): Map<number, number> {
  const stats = new Map<number, number>()
  const daysInMonth = getDaysInMonth(year, month)
  
  for (let day = 1; day <= daysInMonth; day++) {
    stats.set(day, 0)
  }
  
  tasks
    .filter((task) => task.completed && task.completedAt)
    .forEach((task) => {
      const date = new Date(task.completedAt!)
      if (date.getFullYear() === year && date.getMonth() === month) {
        const day = date.getDate()
        const current = stats.get(day) || 0
        stats.set(day, current + task.completedPomodoros)
      }
    })
  
  return stats
}

export function HistorySection({ tasks }: HistorySectionProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState({ year: today.getFullYear(), month: today.getMonth() })
  
  const groupedTasks = groupTasksByDate(tasks)
  const dailyStats = getDailyStats(tasks, currentMonth.year, currentMonth.month)
  
  const totalPomodoros = tasks
    .filter((t) => t.completed)
    .reduce((sum, t) => sum + t.completedPomodoros, 0)
  
  const monthlyTotal = Array.from(dailyStats.values()).reduce((sum, v) => sum + v, 0)
  const maxDailyValue = Math.max(...Array.from(dailyStats.values()), 1)
  
  const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
  
  const goToPrevMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 }
      }
      return { ...prev, month: prev.month - 1 }
    })
  }
  
  const goToNextMonth = () => {
    const isCurrentMonth = currentMonth.year === today.getFullYear() && currentMonth.month === today.getMonth()
    if (isCurrentMonth) return
    
    setCurrentMonth(prev => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 }
      }
      return { ...prev, month: prev.month + 1 }
    })
  }
  
  const isCurrentMonth = currentMonth.year === today.getFullYear() && currentMonth.month === today.getMonth()

  return (
    <div className="space-y-4">
      {/* Total Stats Card - Horizontal Layout */}
      <div className="bg-card rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <p className="text-sm text-muted-foreground">累计专注</p>
        <div className="flex items-center gap-1.5">
          <span className="text-3xl font-semibold text-foreground">{totalPomodoros}</span>
          <span className="text-2xl">🍅</span>
        </div>
      </div>

      {/* Daily Chart for Month */}
      <div className="bg-card rounded-2xl p-4 shadow-sm">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={goToPrevMonth}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <ChevronLeft size={20} className="text-muted-foreground" />
          </button>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {currentMonth.year === today.getFullYear() 
                ? monthNames[currentMonth.month]
                : `${currentMonth.year}年${monthNames[currentMonth.month]}`
              }
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{monthlyTotal} 个番茄</p>
          </div>
          <button 
            onClick={goToNextMonth}
            disabled={isCurrentMonth}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isCurrentMonth ? "opacity-30" : "hover:bg-secondary"
            }`}
          >
            <ChevronRight size={20} className="text-muted-foreground" />
          </button>
        </div>
        
        {/* Daily Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {/* Weekday headers */}
          {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
            <div key={day} className="text-center text-xs text-muted-foreground py-1">
              {day}
            </div>
          ))}
          
          {/* Empty cells for start offset */}
          {Array.from({ length: new Date(currentMonth.year, currentMonth.month, 1).getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          
          {/* Day cells */}
          {Array.from(dailyStats.entries()).map(([day, count]) => {
            const isToday = currentMonth.year === today.getFullYear() && 
                           currentMonth.month === today.getMonth() && 
                           day === today.getDate()
            const intensity = count > 0 ? Math.min(count / maxDailyValue, 1) : 0
            
            return (
              <div
                key={day}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-colors ${
                  isToday ? "ring-2 ring-pink-300" : ""
                }`}
                style={{
                  backgroundColor: count > 0 
                    ? `rgba(244, 114, 182, ${0.2 + intensity * 0.6})` 
                    : "rgba(0,0,0,0.03)"
                }}
              >
                <span className={`font-medium ${count > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                  {day}
                </span>
                {count > 0 && (
                  <span className="text-[10px] text-foreground/70">{count}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* History List - Grouped by date in single card */}
      {groupedTasks.size === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl shadow-sm">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-muted-foreground text-sm">暂无历史记录</p>
          <p className="text-xs text-muted-foreground mt-1">完成的任务会在这里显示</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(groupedTasks.entries()).map(([dateKey, { displayDate, tasks: dateTasks }]) => (
            <div key={dateKey} className="bg-card rounded-2xl p-4 shadow-sm">
              {/* Date Header */}
              <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                {displayDate}
              </p>
              
              {/* Tasks List */}
              <div className="space-y-3">
                {dateTasks.map((task, index) => (
                  <div
                    key={task.id}
                    className={index < dateTasks.length - 1 ? "pb-3 border-b border-border/50" : ""}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground break-words">
                          {task.name}
                        </p>
                        {task.notes && (
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                            {task.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
                        <span>{task.completedPomodoros}</span>
                        <span>🍅</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
