import React, { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LogIn, Shield, CheckCircle, Globe } from 'lucide-react'

const AuthForm: React.FC = () => {
  const { login, handleAuthCallback, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      console.error('OAuth error:', error)
      // Clear URL parameters
      navigate('/auth', { replace: true })
      return
    }

    if (code) {
      handleAuthCallback(code)
        .then(() => {
          navigate('/dashboard', { replace: true })
        })
        .catch((error) => {
          console.error('Auth callback failed:', error)
          navigate('/auth', { replace: true })
        })
    }
  }, [searchParams, handleAuthCallback, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Authenticating...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white text-center">
          <h1 className="text-3xl font-bold mb-2">Certificate Generator</h1>
          <p className="text-blue-100">Professional certificate creation platform</p>
        </div>

        <div className="p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Shield className="text-blue-600" size={32} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Secure Authentication</h2>
            <p className="text-gray-600">
              Sign in with your Google account to access the certificate generator
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
              <span className="text-green-800 text-sm">Secure Google OAuth authentication</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
              <span className="text-green-800 text-sm">Data stored in your Google Sheets</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
              <span className="text-green-800 text-sm">Free lifetime access</span>
            </div>
          </div>

          <button
            onClick={login}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3"
          >
            <Globe size={20} />
            {loading ? 'Connecting...' : 'Continue with Google'}
          </button>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By continuing, you agree to our terms of service and privacy policy.
              Your data is stored securely in your own Google Sheets.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthForm