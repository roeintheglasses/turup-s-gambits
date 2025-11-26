"use client"

import { useState, useEffect, memo } from "react"

interface VisualEffectsProps {
  enableGrain?: boolean
  enableCRT?: boolean
}

export const VisualEffects = memo(function VisualEffects({ enableGrain = false, enableCRT = false }: VisualEffectsProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <>
      {enableGrain && <div className="grain-effect" />}
      {enableCRT && <div className="crt-effect" />}
    </>
  )
})

