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
  /** 点击倒计时数字时请求重新拉取同步计时数据 */
  onRequestSync?: () => void
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
    bgColor: "bg-violet-300/90",
    textColor: "text-violet-600"
  },
  shortBreak: { 
    time: 5 * 60, 
    label: "短休息", 
    bgColor: "bg-sky-300/90",
    textColor: "text-sky-600"
  },
  longBreak: { 
    time: 15 * 60, 
    label: "长休息", 
    bgColor: "bg-teal-300/90",
    textColor: "text-teal-600"
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
      onRequestSync,
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
    /** 正计时显示：25:00 -> 25:01 -> 25:02 ... 26:00 ... */
    const formatOvertimeDisplay = (overtimeSeconds: number) =>
      formatTime(TIMER_MODES.pomodoro.time + overtimeSeconds)

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
              if (mode === "pomodoro") {
                // 专注 25 分钟结束 → 进入正计时，不调用 onComplete（等用户点「完成」再回调）
                onTimerStop?.()
                setIsOvertime(true)
                setOvertimeSeconds(0)
              } else {
                onTimerStop?.()
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
      <div className="bg-transparent rounded-[28px] px-4 py-6 min-h-[320px]">
        {/* Mode Tabs - 新拟态大圆角 */}
        <div className="flex justify-center mt-1 mb-0">
          <div className="inline-flex bg-stone-100 rounded-full p-1.5 neumorphic-concave">
            {(Object.keys(TIMER_MODES) as TimerMode[]).map((m) => (
              <button
                key={m}
                onClick={() => !isRemote && handleModeChange(m)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300",
                  displayMode === m
                    ? "bg-white text-stone-700 neumorphic-convex"
                    : "text-stone-500 hover:text-stone-600",
                  isRemote && "pointer-events-none"
                )}
              >
                {TIMER_MODES[m].label}
              </button>
            ))}
          </div>
        </div>

        {/* Large Time Display - 点击可重新拉取同步计时 */}
        <button
          type="button"
          onClick={onRequestSync}
          className="flex flex-col items-center mt-6 mb-10 w-full cursor-pointer touch-manipulation active:opacity-90"
        >
          <span className="min-h-[1.25rem] text-xs text-stone-500 mb-1 block text-center">
            {isRemote ? "其他设备计时中" : "\u00A0"}
          </span>
          {isRemote ? (
            <span className="font-timer-digits text-8xl font-bold tracking-[0.06em] text-stone-800">
              {formatTime(displayTimeLeft)}
            </span>
          ) : isOvertime ? (
            <span className={cn("font-timer-digits text-8xl font-bold tracking-[0.06em]", currentModeConfig.textColor)}>
              {formatOvertimeDisplay(overtimeSeconds)}
            </span>
          ) : (
            <span className="font-timer-digits text-8xl font-bold tracking-[0.06em] text-stone-800">
              {formatTime(displayTimeLeft)}
            </span>
          )}
        </button>

        {/* Control Buttons - Below timer；远程计时时显示「在本机操作」可接管 */}
        <div className="flex items-center justify-center h-11">
          {isRemote ? (
            <div className="flex flex-col items-center gap-2">
              {onAdoptToLocal && (
                <button
                  type="button"
                  onClick={onAdoptToLocal}
                  className="py-2.5 px-18 rounded-full text-base font-semibold bg-emerald-400 text-white shadow-lg shadow-emerald-300/50 active:scale-95 transition-all"
                >
                  在本机操作
                </button>
              )}
            </div>
          ) : isOvertime ? (
            <button
              onClick={completePomodoroEarly}
              className={cn(
                "py-2.5 px-18 rounded-full text-base font-semibold text-white shadow-lg shadow-emerald-300/50 transition-all duration-300 ease-out active:scale-95",
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
              {!isOvertime && (
                <button
                  onClick={resetTimer}
                  className={cn(
                    "w-9 h-9 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center neumorphic-convex transition-all duration-300 ease-out active:scale-95 hover:bg-stone-200/80",
                    hasStarted 
                      ? "opacity-100 scale-100" 
                      : "opacity-0 scale-0 w-0 pointer-events-none"
                  )}
                  title="重置"
                >
                  <RotateCcw size={16} className="text-stone-500" />
                </button>
              )}

              <button
                onClick={toggleTimer}
                className={cn(
                  "py-2.5 px-18 rounded-full text-base font-semibold text-white shadow-lg shadow-emerald-300/50 transition-all duration-300 ease-out active:scale-95",
                  "bg-emerald-400"
                )}
              >
                {!hasStarted ? "开始" : isRunning ? "暂停" : "继续"}
              </button>

              <button
                onClick={completePomodoroEarly}
                className={cn(
                  "w-9 h-9 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center neumorphic-convex transition-all duration-300 ease-out active:scale-95 hover:bg-stone-200/80",
                  hasStarted 
                    ? "opacity-100 scale-100" 
                    : "opacity-0 scale-0 w-0 pointer-events-none"
                )}
                title="完成本次番茄"
              >
                <Check size={16} className="text-stone-500" />
              </button>
            </div>
          )}
        </div>

        {/* Current Task - Below buttons，柔和灰 + 小绿点 */}
        {(displayTask || isRemote) && (
          <div className="mt-10 text-center">
            <p className="text-sm text-stone-500 flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              当前任务
            </p>
            <p className="text-base font-medium text-stone-800 mt-1">{displayTask || "—"}</p>
          </div>
        )}
      </div>
    )
  }
)
