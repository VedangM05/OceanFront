"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "oceanfront-ui-theme",
  ...props
}: ThemeProviderProps) {
  // 1. Initial state set to defaultTheme (e.g., "system").
  // This avoids accessing localStorage on the server during SSR.
  const [theme, setTheme] = useState<Theme>(defaultTheme) 

  // 2. useEffect for reading the stored theme and setting up the listener.
  // This runs only on the client after mounting.
  useEffect(() => {
    // Check if localStorage is available (should be true here)
    if (typeof window !== "undefined" && window.localStorage) {
        const storedTheme = localStorage.getItem(storageKey) as Theme
        if (storedTheme) {
            setTheme(storedTheme)
        }
    }
  }, [storageKey])


  // 3. useEffect for applying the theme class to the document root (original logic).
  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      // 4. Safely set theme in localStorage when the user changes it.
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(storageKey, newTheme)
      }
      setTheme(newTheme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider")

  return context
}