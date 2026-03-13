"use client"

import { useEffect, useState } from "react"

const ENCOURAGEMENTS = [
  "哇塞，你好棒呀！",
  "又搞定一个，冲鸭！",
  "小刺猬为你骄傲~",
  "今天也是效率满满的一天！",
  "叮咚！成就解锁！",
  "任务粉碎机就是你！",
  "太厉害了吧你！",
  "继续冲，奥利给！",
  "一小步，大进步！",
  "你简直无敌！",
  "休息一下，喝口水~",
  "稳扎稳打，了不起！",
]

interface CelebrationProps {
  isVisible: boolean
  onComplete: () => void
}

interface Firework {
  id: number
  x: number
  y: number
  particles: Array<{
    angle: number
    distance: number
    color: string
    size: number
    delay: number
  }>
}

const COLORS = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181", "#AA96DA", "#FCBAD3", "#A8D8EA"]

export function Celebration({ isVisible, onComplete }: CelebrationProps) {
  const [encouragement, setEncouragement] = useState("")
  const [fireworks, setFireworks] = useState<Firework[]>([])

  useEffect(() => {
    if (isVisible) {
      setEncouragement(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)])
      
      // Generate multiple fireworks at different positions
      const newFireworks: Firework[] = []
      const fireworkCount = 5
      
      for (let f = 0; f < fireworkCount; f++) {
        const particles = Array.from({ length: 12 }, (_, i) => ({
          angle: (i * 30) + Math.random() * 15,
          distance: 60 + Math.random() * 40,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 6 + Math.random() * 4,
          delay: f * 0.15,
        }))
        
        newFireworks.push({
          id: f,
          x: 15 + Math.random() * 70,
          y: 20 + Math.random() * 40,
          particles,
        })
      }
      
      setFireworks(newFireworks)

      const timer = setTimeout(() => {
        onComplete()
      }, 2500)

      return () => clearTimeout(timer)
    }
  }, [isVisible, onComplete])

  if (!isVisible) return null

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto"
      onClick={onComplete}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" />
      
      {/* Firework explosions */}
      {fireworks.map((firework) => (
        <div
          key={firework.id}
          className="absolute"
          style={{
            left: `${firework.x}%`,
            top: `${firework.y}%`,
          }}
        >
          {firework.particles.map((particle, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-firework"
              style={{
                backgroundColor: particle.color,
                width: particle.size,
                height: particle.size,
                '--angle': `${particle.angle}deg`,
                '--distance': `${particle.distance}px`,
                animationDelay: `${particle.delay}s`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      ))}

      {/* Main celebration content */}
      <div className="relative z-10 flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
        {/* Big hedgehog emoji - static, no animation */}
        <div className="text-7xl">
          🦔
        </div>
        
        {/* Encouragement text - bouncing, white color, no background */}
        <p className="text-2xl text-white text-center drop-shadow-lg animate-bounce">
          {encouragement}
        </p>
      </div>

      <style jsx>{`
        @keyframes firework {
          0% {
            transform: translate(0, 0) scale(0);
            opacity: 1;
          }
          20% {
            transform: translate(
              calc(cos(var(--angle)) * var(--distance) * 0.3),
              calc(sin(var(--angle)) * var(--distance) * 0.3)
            ) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(
              calc(cos(var(--angle)) * var(--distance)),
              calc(sin(var(--angle)) * var(--distance) + 30px)
            ) scale(0.3);
            opacity: 0;
          }
        }
        .animate-firework {
          animation: firework 1.2s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
