import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Search, Download, FileText, Trash2, AlertTriangle } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface Template {
  id: string
  name: string
  canvas_data: any
  excel_data: any
  created_at: string
}

const CertificateGenerator: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredData, setFilteredData] = useState<any[]>([])
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const certificateRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template)
    
    // Set up Excel data
    const excelData = template.excel_data?.data || []
    setFilteredData(excelData)
    setShowSearchResults(false)
    setSearchTerm('')
    
    // Initialize field values with default text from template elements
    const initialValues: Record<string, string> = {}
    template.canvas_data?.elements?.forEach((element: any) => {
      initialValues[`element_${element.id}`] = element.text || ''
    })
    setFieldValues(initialValues)
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    if (!selectedTemplate?.excel_data?.data) return

    if (term.trim() === '') {
      setShowSearchResults(false)
      return
    }

    const filtered = selectedTemplate.excel_data.data.filter((row: any[]) =>
      row.some((cell: any) =>
        cell?.toString().toLowerCase().includes(term.toLowerCase())
      )
    )
    setFilteredData(filtered)
    setShowSearchResults(true)
  }

  const handleRowSelect = (row: any[]) => {
    const values: Record<string, string> = { ...fieldValues }
    
    // Update element fields if they have mapped columns
    selectedTemplate?.canvas_data?.elements?.forEach((element: any) => {
      if (element.mappedColumn && selectedTemplate.excel_data?.columns) {
        const columnIndex = selectedTemplate.excel_data.columns.indexOf(element.mappedColumn)
        if (columnIndex !== -1 && row[columnIndex]) {
          values[`element_${element.id}`] = row[columnIndex].toString()
        }
      }
    })
    
    setFieldValues(values)
    setShowSearchResults(false)
    setSearchTerm('')
  }

  const updateFieldValue = (elementId: string, value: string) => {
    setFieldValues(prev => ({
      ...prev,
      [elementId]: value
    }))
  }

  const handleDeleteTemplate = async (templateId: string) => {
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', templateId)
        .eq('user_id', user?.id)

      if (error) throw error
      
      setTemplates(prev => prev.filter(t => t.id !== templateId))
      setDeleteConfirm(null)
      
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null)
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Failed to delete template')
    } finally {
      setDeleting(false)
    }
  }

  const downloadCertificate = async (format: 'pdf' | 'png' | 'jpg') => {
    if (!certificateRef.current) return

    setGenerating(true)
    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        backgroundColor: selectedTemplate?.canvas_data?.backgroundColor || '#ffffff',
        useCORS: true,
        allowTaint: true
      })

      if (format === 'pdf') {
        const imgWidth = canvas.width
        const imgHeight = canvas.height
        const pdf = new jsPDF({
          orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
          unit: 'px',
          format: [imgWidth, imgHeight]
        })
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight)
        pdf.save(`certificate.pdf`)
      } else {
        const link = document.createElement('a')
        link.download = `certificate.${format}`
        link.href = canvas.toDataURL(`image/${format}`)
        link.click()
      }
    } catch (error) {
      console.error('Error generating certificate:', error)
      alert('Failed to generate certificate')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={18} />
                Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Certificate Generator</h1>
            </div>
            {selectedTemplate && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadCertificate('pdf')}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  <Download size={18} />
                  PDF
                </button>
                <button
                  onClick={() => downloadCertificate('png')}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <Download size={18} />
                  PNG
                </button>
                <button
                  onClick={() => downloadCertificate('jpg')}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Download size={18} />
                  JPG
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedTemplate ? (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Select a Template</h2>
            {templates.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">No templates found</p>
                <button
                  onClick={() => navigate('/template-creator')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Your First Template
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-semibold text-gray-900 flex-1">
                          {template.name}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteConfirm(template.id)
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete template"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <p className="text-gray-600 mb-4">
                        Created: {new Date(template.created_at).toLocaleDateString()}
                      </p>
                      <div 
                        onClick={() => handleTemplateSelect(template)}
                        className="flex items-center text-blue-600 font-medium cursor-pointer hover:text-blue-700 transition-colors"
                      >
                        Select Template
                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedTemplate.name}
              </h2>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Change Template
              </button>
            </div>

            {/* Search Bar - Only show if template has Excel data */}
            {selectedTemplate.excel_data?.data && selectedTemplate.excel_data.data.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6 relative">
                <div className="flex items-center gap-4">
                  <Search className="text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search data to auto-fill fields..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                {/* Search Results Dropdown */}
                {showSearchResults && filteredData.length > 0 && (
                  <div className="absolute top-full left-6 right-6 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-10 max-h-64 overflow-y-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          {selectedTemplate.excel_data?.columns?.map((column: string, index: number) => (
                            <th key={index} className="px-4 py-2 text-left text-sm font-medium text-gray-900">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map((row, rowIndex) => (
                          <tr
                            key={rowIndex}
                            onClick={() => handleRowSelect(row)}
                            className="cursor-pointer hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                          >
                            {row.map((cell: any, cellIndex: number) => (
                              <td key={cellIndex} className="px-4 py-3 text-sm text-gray-900">
                                {cell?.toString() || ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Certificate Preview with Editable Fields */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <FileText size={20} />
                Certificate Preview
              </h3>
              
              <div className="flex justify-center mb-6">
                <div
                  className="relative shadow-lg border border-gray-200"
                  style={{
                    width: (selectedTemplate.canvas_data?.width || 800) * 0.6,
                    height: (selectedTemplate.canvas_data?.height || 600) * 0.6,
                    backgroundColor: selectedTemplate.canvas_data?.backgroundColor || '#ffffff',
                    backgroundImage: selectedTemplate.canvas_data?.backgroundImage 
                      ? `url(${selectedTemplate.canvas_data.backgroundImage})` 
                      : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                  {selectedTemplate.canvas_data?.elements?.map((element: any, index: number) => {
                    const displayText = fieldValues[`element_${element.id}`] || element.text || '';

                    return (
                      <div
                        key={index}
                        className="absolute"
                        style={{
                          left: (element.x || 0) * 0.6,
                          top: (element.y || 0) * 0.6,
                          width: (element.width || 200) * 0.6,
                          height: (element.height || 40) * 0.6,
                        }}
                      >
                        <input
                          type="text"
                          value={displayText}
                          onChange={(e) => updateFieldValue(`element_${element.id}`, e.target.value)}
                          className="w-full h-full bg-transparent border-none outline-none text-center resize-none"
                          style={{
                            fontSize: (element.fontSize || 16) * 0.6,
                            fontFamily: element.fontFamily || 'Arial',
                            color: element.color || '#000000',
                            fontWeight: element.isBold ? 'bold' : 'normal',
                            fontStyle: element.isItalic ? 'italic' : 'normal',
                          }}
                          placeholder="Click to edit..."
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Download Section */}
              <div className="text-center border-t pt-6">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Download Certificate</h4>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => downloadCertificate('pdf')}
                    disabled={generating}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors shadow-md hover:shadow-lg"
                  >
                    <Download size={18} />
                    PDF
                  </button>
                  <button
                    onClick={() => downloadCertificate('png')}
                    disabled={generating}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors shadow-md hover:shadow-lg"
                  >
                    <Download size={18} />
                    PNG
                  </button>
                  <button
                    onClick={() => downloadCertificate('jpg')}
                    disabled={generating}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md hover:shadow-lg"
                  >
                    <Download size={18} />
                    JPG
                  </button>
                </div>
                {generating && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-gray-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Generating certificate...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Hidden full-size version for download */}
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
              <div
                ref={certificateRef}
                className="relative"
                style={{
                  width: selectedTemplate.canvas_data?.width || 800,
                  height: selectedTemplate.canvas_data?.height || 600,
                  backgroundColor: selectedTemplate.canvas_data?.backgroundColor || '#ffffff',
                  backgroundImage: selectedTemplate.canvas_data?.backgroundImage 
                    ? `url(${selectedTemplate.canvas_data.backgroundImage})` 
                    : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                {selectedTemplate.canvas_data?.elements?.map((element: any, index: number) => {
                  const displayText = fieldValues[`element_${element.id}`] || element.text || '';

                  return (
                    <div
                      key={index}
                      className="absolute flex items-center justify-center"
                      style={{
                        left: element.x || 0,
                        top: element.y || 0,
                        width: element.width || 200,
                        height: element.height || 40,
                        fontSize: element.fontSize || 16,
                        fontFamily: element.fontFamily || 'Arial',
                        color: element.color || '#000000',
                        fontWeight: element.isBold ? 'bold' : 'normal',
                        fontStyle: element.isItalic ? 'italic' : 'normal',
                        textAlign: 'center',
                        wordWrap: 'break-word',
                        overflow: 'hidden'
                      }}
                    >
                      {displayText}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-red-100 rounded-full">
                    <AlertTriangle className="text-red-600" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Delete Template</h3>
                    <p className="text-gray-600">This action cannot be undone</p>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-6">
                  Are you sure you want to delete the template "
                  <span className="font-medium">
                    {templates.find(t => t.id === deleteConfirm)?.name}
                  </span>
                  "? This will permanently remove the template and all its data.
                </p>
                
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    disabled={deleting}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(deleteConfirm)}
                    disabled={deleting}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 size={18} />
                    {deleting ? 'Deleting...' : 'Delete Template'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CertificateGenerator