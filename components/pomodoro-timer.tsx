"use client"

import { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from "react"
import { RotateCcw, Check } from "lucide-react"
import { cn } from "@/lib/utils"

type TimerMode = "pomodoro" | "shortBreak" | "longBreak"

interface PomodoroTimerProps {
  currentTask?: string
  onComplete?: () => void
  onPomodoroComplete?: () => void
  onModeChange?: (mode: TimerMode) => void
  /** 多端同步：其他设备的计时结束时间戳（ms），设置时显示该倒计时 */
  remoteEndAt?: number | null
  remoteMode?: TimerMode | null
  remoteTaskName?: string | null
  /** 远程倒计时结束时回调（用于清除远程状态） */
  onRemoteComplete?: () => void
  /** 本机开始/暂停时同步到云端 */
  onTimerStart?: (endAt: number, mode: TimerMode) => void
  onTimerStop?: () => void
  /** 远程模式下点击「在本机操作」时由父组件接管（清除远程 + 调用 adoptRemote + 写回云端） */
  onAdoptToLocal?: () => void
}

export interface PomodoroTimerRef {
  switchToShortBreak: () => void
  /** 将远程计时接管为本机计时（用于本机重新打开后恢复操作） */
  adoptRemote: (endAt: number, mode: TimerMode) => void
}

const TIMER_MODES = {
  pomodoro: { 
    time: 25 * 60, 
    label: "专注", 
    bgColor: "bg-pink-400",
    textColor: "text-pink-400"
  },
  shortBreak: { 
    time: 5 * 60, 
    label: "短休息", 
    bgColor: "bg-blue-400",
    textColor: "text-blue-400"
  },
  longBreak: { 
    time: 15 * 60, 
    label: "长休息", 
    bgColor: "bg-teal-400",
    textColor: "text-teal-400"
  },
}

export const PomodoroTimer = forwardRef<PomodoroTimerRef, PomodoroTimerProps>(
  function PomodoroTimer(
    {
      currentTask,
      onComplete,
      onPomodoroComplete,
      onModeChange,
      remoteEndAt,
      remoteMode,
      remoteTaskName,
      onRemoteComplete,
      onTimerStart,
      onTimerStop,
      onAdoptToLocal,
    },
    ref
  ) {
    const [mode, setMode] = useState<TimerMode>("pomodoro")
    const [timeLeft, setTimeLeft] = useState(TIMER_MODES.pomodoro.time)
    const [isRunning, setIsRunning] = useState(false)
    const [hasStarted, setHasStarted] = useState(false)
    const [isOvertime, setIsOvertime] = useState(false)
    const [overtimeSeconds, setOvertimeSeconds] = useState(0)
    /** 结束时间戳（ms），用于退到后台后仍能正确倒计时 */
    const endTimeRef = useRef<number | null>(null)

    const formatTime = (seconds: number) => {
      const mins = Math.floor(Math.abs(seconds) / 60)
      const secs = Math.abs(seconds) % 60
      return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }

    const handleModeChange = useCallback((newMode: TimerMode) => {
      setMode(newMode)
      setTimeLeft(TIMER_MODES[newMode].time)
      setIsRunning(false)
      setHasStarted(false)
      setIsOvertime(false)
      setOvertimeSeconds(0)
      endTimeRef.current = null
      onTimerStop?.()
      onModeChange?.(newMode)
    }, [onModeChange, onTimerStop])

    const adoptRemote = useCallback((endAt: number, newMode: TimerMode) => {
      const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000))
      setMode(newMode)
      setTimeLeft(remaining)
      setIsRunning(true)
      setHasStarted(true)
      setIsOvertime(false)
      setOvertimeSeconds(0)
      endTimeRef.current = endAt
    }, [])

    useImperativeHandle(ref, () => ({
      switchToShortBreak: () => {
        handleModeChange("shortBreak")
      },
      adoptRemote,
    }), [handleModeChange, adoptRemote])

    const toggleTimer = () => {
      if (!isRunning && !hasStarted) {
        setHasStarted(true)
      }
      if (!isRunning) {
        const endAt = Date.now() + timeLeft * 1000
        endTimeRef.current = endAt
        onTimerStart?.(endAt, mode)
      } else {
        endTimeRef.current = null
        onTimerStop?.()
      }
      setIsRunning(!isRunning)
    }

    const resetTimer = () => {
      setTimeLeft(TIMER_MODES[mode].time)
      setIsRunning(false)
      setHasStarted(false)
      setIsOvertime(false)
      setOvertimeSeconds(0)
      endTimeRef.current = null
      onTimerStop?.()
    }

    const completePomodoroEarly = () => {
      if (mode === "pomodoro") {
        onPomodoroComplete?.()
        return
      }
      handleModeChange("pomodoro")
    }

    const isRemote = remoteEndAt != null && remoteEndAt > Date.now()
    const [remoteTimeLeft, setRemoteTimeLeft] = useState(0)
    useEffect(() => {
      if (remoteEndAt == null || remoteEndAt <= Date.now()) return
      const update = () => {
        const left = Math.max(0, Math.ceil((remoteEndAt! - Date.now()) / 1000))
        setRemoteTimeLeft(left)
        if (left === 0) onRemoteComplete?.()
      }
      update()
      const interval = setInterval(update, 1000)
      return () => clearInterval(interval)
    }, [remoteEndAt, onRemoteComplete])

    // 基于结束时间戳的倒计时，退到后台再进入时仍正确
    useEffect(() => {
      let interval: NodeJS.Timeout | null = null

      if (isRunning) {
        interval = setInterval(() => {
          if (isOvertime) {
            setOvertimeSeconds((prev) => prev + 1)
          } else if (endTimeRef.current != null) {
            const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000))
            setTimeLeft(remaining)
            if (remaining === 0) {
              endTimeRef.current = null
              onTimerStop?.()
              if (mode === "pomodoro") {
                setIsOvertime(true)
                setOvertimeSeconds(0)
                onComplete?.()
              } else {
                setMode("pomodoro")
                setTimeLeft(TIMER_MODES.pomodoro.time)
                setIsRunning(false)
                setHasStarted(false)
                onModeChange?.("pomodoro")
              }
            }
          }
        }, 1000)
      }

      return () => {
        if (interval) clearInterval(interval)
      }
    }, [isRunning, mode, isOvertime, onComplete, onModeChange, onTimerStop])

    // 从后台回到前台时，根据 endTimeRef 立即校正剩余时间
    useEffect(() => {
      const onVisible = () => {
        if (document.visibilityState !== "visible" || !isRunning || isOvertime) return
        if (endTimeRef.current != null) {
          const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000))
          setTimeLeft(remaining)
        }
      }
      document.addEventListener("visibilitychange", onVisible)
      return () => document.removeEventListener("visibilitychange", onVisible)
    }, [isRunning, isOvertime])

    const displayMode = isRemote ? (remoteMode ?? mode) : mode
    const currentModeConfig = TIMER_MODES[displayMode]
    const displayTimeLeft = isRemote ? remoteTimeLeft : timeLeft
    const displayTask = isRemote ? remoteTaskName : currentTask

    return (
      <div className="bg-card rounded-3xl px-4 py-6 shadow-sm min-h-[320px]">
        {/* Mode Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-secondary rounded-xl p-1">
            {(Object.keys(TIMER_MODES) as TimerMode[]).map((m) => (
              <button
                key={m}
                onClick={() => !isRemote && handleModeChange(m)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300",
                  displayMode === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                  isRemote && "pointer-events-none"
                )}
              >
                {TIMER_MODES[m].label}
              </button>
            ))}
          </div>
        </div>

        {/* Large Time Display */}
        <div className="flex flex-col items-center my-8">
          {isRemote ? (
            <>
              <span className="text-xs text-muted-foreground mb-1">其他设备计时中</span>
              <span className={cn("font-timer-digits text-7xl font-bold tracking-[0.06em]", currentModeConfig.textColor)}>
                {formatTime(displayTimeLeft)}
              </span>
            </>
          ) : isOvertime ? (
            <div className="flex flex-col items-center">
              <span className={cn("font-timer-digits text-7xl font-bold tracking-[0.06em]", currentModeConfig.textColor)}>
                {formatTime(0)}
              </span>
              <span className={cn("font-timer-digits text-lg font-medium mt-1 tracking-[0.04em]", currentModeConfig.textColor)}>
                +{formatTime(overtimeSeconds)}
              </span>
            </div>
          ) : (
            <span className={cn("font-timer-digits text-7xl font-bold tracking-[0.06em]", currentModeConfig.textColor)}>
              {formatTime(displayTimeLeft)}
            </span>
          )}
        </div>

        {/* Control Buttons - Below timer；远程计时时显示「在本机操作」可接管 */}
        <div className="flex items-center justify-center h-11">
          {isRemote ? (
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-muted-foreground">同步自其他设备</span>
              {onAdoptToLocal && (
                <button
                  type="button"
                  onClick={onAdoptToLocal}
                  className="py-2.5 px-6 rounded-xl text-sm font-medium bg-primary text-primary-foreground shadow-sm active:scale-95"
                >
                  在本机操作
                </button>
              )}
            </div>
          ) : isOvertime ? (
            // Overtime mode: only show centered "Complete" button
            <button
              onClick={completePomodoroEarly}
              className={cn(
                "py-2.5 px-16 rounded-xl text-base font-semibold shadow-sm transition-all duration-300 ease-out active:scale-95 text-white",
                currentModeConfig.bgColor
              )}
            >
              完成
            </button>
          ) : (
            <div className={cn(
              "flex items-center justify-center transition-all duration-300 ease-out",
              hasStarted ? "gap-4" : "gap-0"
            )}>
              {/* Reset Button - Only visible after started */}
              <button
                onClick={resetTimer}
                className={cn(
                  "w-9 h-9 rounded-full bg-secondary text-muted-foreground flex items-center justify-center transition-all duration-300 ease-out active:scale-95 hover:bg-secondary/80",
                  hasStarted 
                    ? "opacity-100 scale-100" 
                    : "opacity-0 scale-0 w-0 pointer-events-none"
                )}
                title="重置"
              >
                <RotateCcw size={16} />
              </button>

              {/* Start/Pause Button */}
              <button
                onClick={toggleTimer}
                className={cn(
                  "py-2.5 rounded-xl text-base font-semibold shadow-sm transition-all duration-300 ease-out active:scale-95 text-white",
                  currentModeConfig.bgColor,
                  hasStarted ? "px-16" : "px-16"
                )}
              >
                {!hasStarted ? "开始" : isRunning ? "暂停" : "继续"}
              </button>

              {/* Complete Pomodoro Button - Only visible after started */}
              <button
                onClick={completePomodoroEarly}
                className={cn(
                  "w-9 h-9 rounded-full bg-secondary text-muted-foreground flex items-center justify-center transition-all duration-300 ease-out active:scale-95 hover:bg-secondary/80",
                  hasStarted 
                    ? "opacity-100 scale-100" 
                    : "opacity-0 scale-0 w-0 pointer-events-none"
                )}
                title="完成本次番茄"
              >
                <Check size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Current Task - Below buttons */}
        {(displayTask || isRemote) && (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">当前任务</p>
            <p className="text-base font-medium text-foreground mt-1">{displayTask || "—"}</p>
          </div>
        )}
      </div>
    )
  }
)
