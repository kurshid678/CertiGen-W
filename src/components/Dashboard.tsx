import React from 'react'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { FileText, Download, LogOut, User, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    templatesCreated: 0,
    certificatesGenerated: 0,
    totalDownloads: 0
  })
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [user])

  const fetchStats = async () => {
    if (!user) return
    
    try {
      // Get templates count
      const { count: templatesCount, error: templatesError } = await supabase
        .from('templates')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (templatesError) throw templatesError

      // For now, we'll calculate certificates generated and downloads based on templates
      // In a real app, you'd track these separately in the database
      const certificatesGenerated = (templatesCount || 0) * 5 // Estimate
      const totalDownloads = (templatesCount || 0) * 12 // Estimate

      setStats({
        templatesCreated: templatesCount || 0,
        certificatesGenerated,
        totalDownloads
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
      setStats({
        templatesCreated: 0,
        certificatesGenerated: 0,
        totalDownloads: 0
      })
    } finally {
      setLoadingStats(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                <FileText className="text-white" size={24} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Certificate Generator</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                <User size={18} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {user?.email}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to your Dashboard</h2>
          <p className="text-gray-600">Create and manage your certificate templates</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div
            onClick={() => navigate('/template-creator')}
            className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-lg">
                  <Plus className="text-white" size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Create Template</h3>
                  <p className="text-blue-100">Design custom certificate templates</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Use our intuitive canvas editor to create professional certificate templates.
                Add text fields, images, and map data from Excel files.
              </p>
              <div className="flex items-center text-blue-600 font-medium group-hover:text-blue-700">
                Start Creating
                <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/certificate-generator')}
            className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-lg">
                  <Download className="text-white" size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Generate Certificates</h3>
                  <p className="text-purple-100">Create certificates from templates</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Select from your saved templates, search and filter data, then generate
                certificates in multiple formats (PDF, PNG, JPG).
              </p>
              <div className="flex items-center text-purple-600 font-medium group-hover:text-purple-700">
                Start Generating
                <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Stats</h3>
          {loadingStats ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading stats...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-lg mx-auto mb-3">
                  <FileText className="text-white" size={24} />
                </div>
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {stats.templatesCreated}
                </div>
                <div className="text-gray-700 font-medium">Templates Created</div>
                <div className="text-sm text-gray-600 mt-1">
                  {stats.templatesCreated === 0 ? 'Create your first template' : 'Keep creating!'}
                </div>
              </div>
              
              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                <div className="flex items-center justify-center w-12 h-12 bg-purple-600 rounded-lg mx-auto mb-3">
                  <Download className="text-white" size={24} />
                </div>
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {stats.certificatesGenerated}
                </div>
                <div className="text-gray-700 font-medium">Certificates Generated</div>
                <div className="text-sm text-gray-600 mt-1">
                  {stats.certificatesGenerated === 0 ? 'Start generating certificates' : 'Great progress!'}
                </div>
              </div>
              
              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                <div className="flex items-center justify-center w-12 h-12 bg-green-600 rounded-lg mx-auto mb-3">
                  <Download className="text-white" size={24} />
                </div>
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {stats.totalDownloads}
                </div>
                <div className="text-gray-700 font-medium">Total Downloads</div>
                <div className="text-sm text-gray-600 mt-1">
                  {stats.totalDownloads === 0 ? 'Download your first certificate' : 'Amazing work!'}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Dashboard