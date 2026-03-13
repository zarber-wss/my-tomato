"use client"

import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react"
import { RotateCcw, Check } from "lucide-react"
import { cn } from "@/lib/utils"

type TimerMode = "pomodoro" | "shortBreak" | "longBreak"

interface PomodoroTimerProps {
  currentTask?: string
  onComplete?: () => void
  onPomodoroComplete?: () => void
  onModeChange?: (mode: TimerMode) => void
}

export interface PomodoroTimerRef {
  switchToShortBreak: () => void
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
  function PomodoroTimer({ currentTask, onComplete, onPomodoroComplete, onModeChange }, ref) {
    const [mode, setMode] = useState<TimerMode>("pomodoro")
    const [timeLeft, setTimeLeft] = useState(TIMER_MODES.pomodoro.time)
    const [isRunning, setIsRunning] = useState(false)
    const [hasStarted, setHasStarted] = useState(false)
    const [isOvertime, setIsOvertime] = useState(false)
    const [overtimeSeconds, setOvertimeSeconds] = useState(0)

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
      onModeChange?.(newMode)
    }, [onModeChange])

    // Expose method to parent
    useImperativeHandle(ref, () => ({
      switchToShortBreak: () => {
        handleModeChange("shortBreak")
      }
    }), [handleModeChange])

    const toggleTimer = () => {
      if (!isRunning && !hasStarted) {
        setHasStarted(true)
      }
      setIsRunning(!isRunning)
    }

    const resetTimer = () => {
      setTimeLeft(TIMER_MODES[mode].time)
      setIsRunning(false)
      setHasStarted(false)
      setIsOvertime(false)
      setOvertimeSeconds(0)
    }

    const completePomodoroEarly = () => {
      // Complete this pomodoro (not the entire task)
      if (mode === "pomodoro") {
        onPomodoroComplete?.()
      }
      resetTimer()
    }

    useEffect(() => {
      let interval: NodeJS.Timeout | null = null

      if (isRunning) {
        interval = setInterval(() => {
          if (isOvertime) {
            setOvertimeSeconds((prev) => prev + 1)
          } else if (timeLeft > 0) {
            setTimeLeft((prev) => prev - 1)
          } else if (timeLeft === 0 && mode === "pomodoro" && !isOvertime) {
            // Enter overtime mode for pomodoro
            setIsOvertime(true)
            setOvertimeSeconds(0)
            onComplete?.()
          } else if (timeLeft === 0 && mode !== "pomodoro") {
            // For short/long break, auto reset when finished
            setIsRunning(false)
            setHasStarted(false)
            setTimeLeft(TIMER_MODES[mode].time)
          }
        }, 1000)
      }

      return () => {
        if (interval) clearInterval(interval)
      }
    }, [isRunning, timeLeft, mode, isOvertime, onComplete])

    const currentModeConfig = TIMER_MODES[mode]

    return (
      <div className="bg-card rounded-3xl px-4 py-6 shadow-sm">
        {/* Mode Tabs - Horizontal layout at top */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-secondary rounded-xl p-1">
            {(Object.keys(TIMER_MODES) as TimerMode[]).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300",
                  mode === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {TIMER_MODES[m].label}
              </button>
            ))}
          </div>
        </div>

        {/* Large Time Display - Centered */}
        <div className="flex flex-col items-center">
          {isOvertime ? (
            <div className="flex flex-col items-center">
              <span className={cn("text-7xl font-bold tracking-tight font-mono", currentModeConfig.textColor)}>
                {formatTime(0)}
              </span>
              <span className={cn("text-lg font-medium mt-1", currentModeConfig.textColor)}>
                +{formatTime(overtimeSeconds)}
              </span>
            </div>
          ) : (
            <span className={cn("text-7xl font-bold tracking-tight font-mono", currentModeConfig.textColor)}>
              {formatTime(timeLeft)}
            </span>
          )}
        </div>

        {/* Control Buttons - Below timer */}
        <div className="mt-8 flex items-center justify-center h-11">
          {isOvertime ? (
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
        {currentTask && (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">当前任务</p>
            <p className="text-xl font-medium text-foreground mt-1">{currentTask}</p>
          </div>
        )}
      </div>
    )
  }
)
