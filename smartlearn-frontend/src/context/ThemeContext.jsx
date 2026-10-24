import { createContext, useContext, useEffect, useState } from "react"

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("sla-theme")
    if (saved) return saved === "dark"
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  })

  const [fontScale, setFontScale] = useState(() => {
    const saved = localStorage.getItem("sla-font-scale")
    return ["small", "medium", "large"].includes(saved) ? saved : "medium"
  })

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
    localStorage.setItem("sla-theme", dark ? "dark" : "light")
  }, [dark])

  useEffect(() => {
    // Apply the preference at the document root so every route (including
    // account/login screens) updates immediately and survives refreshes.
    document.documentElement.dataset.fontScale = fontScale
    document.documentElement.style.setProperty(
      "--sla-font-zoom",
      fontScale === "small" ? "0.9" : fontScale === "large" ? "1.15" : "1"
    )
    localStorage.setItem("sla-font-scale", fontScale)
  }, [fontScale])

  const toggleDark = () => setDark(d => !d)
  const cycleFontScale = () => {
    setFontScale(current => current === "small" ? "medium" : current === "medium" ? "large" : "small")
  }

  return (
    <ThemeContext.Provider value={{ dark, toggleDark, fontScale, setFontScale, cycleFontScale }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
