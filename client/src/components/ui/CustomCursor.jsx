import { useEffect, useRef, useState } from "react"

export default function CustomCursor() {
  const [isDesktop, setIsDesktop] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  const cursorDot = useRef(null)
  const cursorRing = useRef(null)

  useEffect(() => {
    const checkScreen = () => {
      setIsDesktop(window.innerWidth >= 768)
    }

    checkScreen()

    window.addEventListener("resize", checkScreen)

    return () => {
      window.removeEventListener("resize", checkScreen)
    }
  }, [])

  useEffect(() => {
    if (!isDesktop) return

    const dot = cursorDot.current
    const ring = cursorRing.current

    let mouseX = 0
    let mouseY = 0

    let ringX = 0
    let ringY = 0

    let animationFrameId

    const moveCursor = (e) => {
      mouseX = e.clientX
      mouseY = e.clientY

      setIsVisible(true)

      if (dot) {
        dot.style.left = `${mouseX}px`
        dot.style.top = `${mouseY}px`
      }
    }

    window.addEventListener("mousemove", moveCursor)

    const handleMouseEnterWindow = () => {
      setIsVisible(true)
    }

    const handleMouseLeaveWindow = () => {
      setIsVisible(false)
    }

    document.addEventListener("mouseenter", handleMouseEnterWindow)
    document.addEventListener("mouseleave", handleMouseLeaveWindow)

    const animate = () => {
      ringX += (mouseX - ringX) * 0.12
      ringY += (mouseY - ringY) * 0.12

      if (ring) {
        ring.style.left = `${ringX}px`
        ring.style.top = `${ringY}px`
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    // GLOBAL HOVER DETECTION
    const handleHoverEffects = (e) => {
      if (!dot || !ring) return

      const target = e.target.closest(
        "button, a, .btn-primary, .btn-outline"
      )

      if (target) {
        // Hover state
        dot.style.backgroundColor = "#ffffff"
        dot.style.boxShadow = "0 0 20px rgba(255,255,255,0.95)"

        ring.style.border = "1px solid rgba(34,211,238,0.95)"
        ring.style.boxShadow = "0 0 35px rgba(34,211,238,0.7)"

        ring.style.width = "52px"
        ring.style.height = "52px"
      } else {
        // Default state
        dot.style.backgroundColor = "#ff4d4d"
        dot.style.boxShadow = "0 0 18px rgba(255,77,77,0.95)"

        ring.style.border = "1px solid rgba(255,77,77,0.85)"
        ring.style.boxShadow = "0 0 28px rgba(255,77,77,0.55)"

        ring.style.width = "40px"
        ring.style.height = "40px"
      }
    }

    document.addEventListener("mouseover", handleHoverEffects)

    return () => {
      window.removeEventListener("mousemove", moveCursor)

      document.removeEventListener(
        "mouseenter",
        handleMouseEnterWindow
      )

      document.removeEventListener(
        "mouseleave",
        handleMouseLeaveWindow
      )

      document.removeEventListener(
        "mouseover",
        handleHoverEffects
      )

      cancelAnimationFrame(animationFrameId)
    }
  }, [isDesktop])

  if (!isDesktop) return null

  return (
    <>
      {/* Inner Dot */}
      <div
        ref={cursorDot}
        className={`fixed rounded-full pointer-events-none z-[999999] transition-opacity duration-200 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{
          width: "12px",
          height: "12px",
          backgroundColor: "#ff4d4d",
          transform: "translate(-50%, -50%)",
          boxShadow: "0 0 18px rgba(255,77,77,0.95)",
          transition:
            "background-color 0.25s ease, box-shadow 0.25s ease, opacity 0.2s ease",
        }}
      />

      {/* Outer Ring */}
      <div
        ref={cursorRing}
        className={`fixed rounded-full pointer-events-none z-[999998] transition-opacity duration-200 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{
          width: "40px",
          height: "40px",
          border: "1px solid rgba(255,77,77,0.85)",
          transform: "translate(-50%, -50%)",
          boxShadow: "0 0 28px rgba(255,77,77,0.55)",
          transition:
            "width 0.25s ease, height 0.25s ease, border 0.25s ease, box-shadow 0.25s ease, opacity 0.2s ease",
        }}
      />
    </>
  )
}