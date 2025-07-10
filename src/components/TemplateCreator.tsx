import React, { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { googleSheetsService } from '../lib/googleSheets'
import { ArrowLeft, Save, Upload, Plus, Type, Image, Trash2, FileSpreadsheet, ChevronDown } from 'lucide-react'
import Draggable from 'react-draggable'
import * as XLSX from 'xlsx'

interface TextElement {
  id: string
  text: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  fontFamily: string
  color: string
  isBold: boolean
  isItalic: boolean
  mappedColumn?: string
}

interface CanvasData {
  width: number
  height: number
  backgroundColor: string
  backgroundImage?: string
  elements: TextElement[]
}

interface ExcelSheet {
  name: string
  data: any[]
  columns: string[]
}

const TemplateCreator: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [templateName, setTemplateName] = useState('')
  const [canvasData, setCanvasData] = useState<CanvasData>({
    width: 800,
    height: 600,
    backgroundColor: '#ffffff',
    elements: []
  })
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [excelData, setExcelData] = useState<any[]>([])
  const [excelColumns, setExcelColumns] = useState<string[]>([])
  const [availableSheets, setAvailableSheets] = useState<ExcelSheet[]>([])
  const [selectedSheet, setSelectedSheet] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bgImageInputRef = useRef<HTMLInputElement>(null)

  const addTextElement = () => {
    const newElement: TextElement = {
      id: Date.now().toString(),
      text: 'Sample Text',
      x: 50,
      y: 50,
      width: 200,
      height: 40,
      fontSize: 16,
      fontFamily: 'Arial',
      color: '#000000',
      isBold: false,
      isItalic: false
    }
    setCanvasData(prev => ({
      ...prev,
      elements: [...prev.elements, newElement]
    }))
  }

  const updateElement = (id: string, updates: Partial<TextElement>) => {
    setCanvasData(prev => ({
      ...prev,
      elements: prev.elements.map(el => 
        el.id === id ? { ...el, ...updates } : el
      )
    }))
  }

  const deleteElement = (id: string) => {
    setCanvasData(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== id)
    }))
    setSelectedElement(null)
  }

  const processExcelSheet = (workbook: XLSX.WorkBook, sheetName: string) => {
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
    
    if (jsonData.length > 0) {
      const columns = jsonData[0] as string[]
      const rows = jsonData.slice(1)
      return { columns, data: rows }
    }
    return { columns: [], data: [] }
  }

  const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const data = e.target?.result
      const workbook = XLSX.read(data, { type: 'binary' })
      
      // Process all sheets
      const sheets: ExcelSheet[] = []
      workbook.SheetNames.forEach(sheetName => {
        const { columns, data } = processExcelSheet(workbook, sheetName)
        if (columns.length > 0) {
          sheets.push({
            name: sheetName,
            columns,
            data
          })
        }
      })
      
      setAvailableSheets(sheets)
      
      // If only one sheet, auto-select it
      if (sheets.length === 1) {
        selectSheet(sheets[0].name)
      }
    }
    reader.readAsBinaryString(file)
  }

  const selectSheet = (sheetName: string) => {
    const sheet = availableSheets.find(s => s.name === sheetName)
    if (sheet) {
      setSelectedSheet(sheetName)
      setExcelColumns(sheet.columns)
      setExcelData(sheet.data)
    }
  }

  const handleBackgroundImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setCanvasData(prev => ({
        ...prev,
        backgroundImage: result
      }))
    }
    reader.readAsDataURL(file)
  }

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      alert('Please enter a template name')
      return
    }

    if (!user) {
      alert('User not authenticated')
      return
    }

    setSaving(true)
    try {
      await googleSheetsService.createTemplate({
        userId: user.id,
        name: templateName,
        canvasData: canvasData,
        excelData: { columns: excelColumns, data: excelData, selectedSheet }
      })
      
      alert('Template saved successfully!')
      navigate('/dashboard')
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const selectedElementData = canvasData.elements.find(el => el.id === selectedElement)

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
              <h1 className="text-2xl font-bold text-gray-900">Template Creator</h1>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Template Name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={saveTemplate}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-80 bg-white shadow-lg p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Canvas Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Canvas Settings</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
                    <input
                      type="number"
                      value={canvasData.width}
                      onChange={(e) => setCanvasData(prev => ({ ...prev, width: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
                    <input
                      type="number"
                      value={canvasData.height}
                      onChange={(e) => setCanvasData(prev => ({ ...prev, height: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                  <input
                    type="color"
                    value={canvasData.backgroundColor}
                    onChange={(e) => setCanvasData(prev => ({ ...prev, backgroundColor: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Background Image</label>
                  <button
                    onClick={() => bgImageInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors w-full"
                  >
                    <Image size={16} />
                    Upload Image
                  </button>
                  <input
                    ref={bgImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundImageUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Tools */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tools</h3>
              <div className="space-y-2">
                <button
                  onClick={addTextElement}
                  className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Type size={18} />
                  Add Text Field
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Upload size={18} />
                  Upload Excel
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Excel Sheet Selector */}
            {availableSheets.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileSpreadsheet size={18} />
                  Excel Sheets
                </h3>
                
                {availableSheets.length > 1 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Sheet to Use
                    </label>
                    <div className="relative">
                      <select
                        value={selectedSheet}
                        onChange={(e) => selectSheet(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                      >
                        <option value="">Choose a sheet...</option>
                        {availableSheets.map((sheet) => (
                          <option key={sheet.name} value={sheet.name}>
                            {sheet.name} ({sheet.data.length} rows)
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>
                  </div>
                )}

                {selectedSheet && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <FileSpreadsheet size={16} />
                      <span className="font-medium">Active Sheet: {selectedSheet}</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      {excelData.length} rows • {excelColumns.length} columns
                    </p>
                  </div>
                )}

                {/* Available Sheets Preview */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Available Sheets:</h4>
                  {availableSheets.map((sheet) => (
                    <div
                      key={sheet.name}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedSheet === sheet.name
                          ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() => selectSheet(sheet.name)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{sheet.name}</span>
                        {selectedSheet === sheet.name && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {sheet.data.length} rows • {sheet.columns.length} columns
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {sheet.columns.slice(0, 3).map((col, idx) => (
                          <span key={idx} className="text-xs bg-white px-2 py-1 rounded border">
                            {col}
                          </span>
                        ))}
                        {sheet.columns.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{sheet.columns.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Excel Columns */}
            {excelColumns.length > 0 && selectedSheet && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Available Columns
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {excelColumns.map((column, index) => (
                    <div key={index} className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                      <span className="font-medium text-blue-900">{column}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Element Properties */}
            {selectedElementData && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Element Properties</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Text</label>
                    <input
                      type="text"
                      value={selectedElementData.text}
                      onChange={(e) => updateElement(selectedElement!, { text: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Font Size</label>
                    <input
                      type="number"
                      value={selectedElementData.fontSize}
                      onChange={(e) => updateElement(selectedElement!, { fontSize: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                    <input
                      type="color"
                      value={selectedElementData.color}
                      onChange={(e) => updateElement(selectedElement!, { color: e.target.value })}
                      className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer"
                    />
                  </div>
                  {excelColumns.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Map to Column
                      </label>
                      <div className="relative">
                        <select
                          value={selectedElementData.mappedColumn || ''}
                          onChange={(e) => updateElement(selectedElement!, { mappedColumn: e.target.value || undefined })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                        >
                          <option value="">No mapping</option>
                          {excelColumns.map((column, index) => (
                            <option key={index} value={column}>{column}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                      </div>
                      {selectedElementData.mappedColumn && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ Mapped to "{selectedElementData.mappedColumn}"
                        </p>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => deleteElement(selectedElement!)}
                    className="w-full flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 size={18} />
                    Delete Element
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="flex justify-center">
            <div
              className="relative border-2 border-gray-300 shadow-lg"
              style={{
                width: canvasData.width,
                height: canvasData.height,
                backgroundColor: canvasData.backgroundColor,
                backgroundImage: canvasData.backgroundImage ? `url(${canvasData.backgroundImage})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {canvasData.elements.map((element) => (
                <Draggable
                  key={element.id}
                  defaultPosition={{ x: element.x, y: element.y }}
                  onStop={(e, data) => {
                    updateElement(element.id, { x: data.x, y: data.y })
                  }}
                >
                  <div
                    className={`absolute cursor-move ${selectedElement === element.id ? 'ring-2 ring-blue-500' : ''}`}
                    onClick={() => setSelectedElement(element.id)}
                    style={{
                      width: element.width,
                      height: element.height,
                      fontSize: element.fontSize,
                      fontFamily: element.fontFamily,
                      color: element.color,
                      fontWeight: element.isBold ? 'bold' : 'normal',
                      fontStyle: element.isItalic ? 'italic' : 'normal',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: selectedElement === element.id ? '2px solid #3b82f6' : '1px solid transparent',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    {element.mappedColumn ? (
                      <div className="text-center">
                        <div>{element.text}</div>
                        <div className="text-xs opacity-75 mt-1">
                          [{element.mappedColumn}]
                        </div>
                      </div>
                    ) : (
                      element.text
                    )}
                  </div>
                </Draggable>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TemplateCreator