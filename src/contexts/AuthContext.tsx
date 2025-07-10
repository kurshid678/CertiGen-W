import React, { createContext, useContext, useEffect, useState } from 'react'
import { googleSheetsService, GoogleUser } from '../lib/googleSheets'

interface AuthContextType {
  user: GoogleUser | null
  login: () => void
  logout: () => Promise<void>
  loading: boolean
  handleAuthCallback: (code: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const useAuth = () => useContext(AuthContext)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<GoogleUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const restoredUser = await googleSheetsService.restoreSession()
        if (restoredUser) {
          setUser(restoredUser)
          // Initialize spreadsheet for the user
          await googleSheetsService.initializeSpreadsheet()
        }
      } catch (error) {
        console.error('Failed to restore session:', error)
        googleSheetsService.clearSession()
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const login = () => {
    const authUrl = googleSheetsService.getAuthUrl()
    window.location.href = authUrl
  }

  const handleAuthCallback = async (code: string) => {
    try {
      setLoading(true)
      const user = await googleSheetsService.handleAuthCallback(code)
      setUser(user)
      
      // Initialize spreadsheet for the new user
      await googleSheetsService.initializeSpreadsheet()
    } catch (error) {
      console.error('Auth callback error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      googleSheetsService.clearSession()
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const value = {
    user,
    login,
    logout,
    loading,
    handleAuthCallback
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}