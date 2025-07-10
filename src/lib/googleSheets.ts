import { GoogleAuth } from 'google-auth-library'
import { google } from 'googleapis'

// Google Sheets configuration
const SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET
const REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/callback`

// OAuth 2.0 scopes
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
]

export interface GoogleUser {
  id: string
  email: string
  name: string
  picture?: string
}

export interface Template {
  id: string
  userId: string
  name: string
  canvasData: any
  excelData: any
  createdAt: string
  updatedAt: string
}

class GoogleSheetsService {
  private auth: any = null
  private sheets: any = null
  private oauth2: any = null

  constructor() {
    this.initializeAuth()
  }

  private initializeAuth() {
    this.auth = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI
    )

    // Set up event listeners for token refresh
    this.auth.on('tokens', (tokens: any) => {
      if (tokens.refresh_token) {
        localStorage.setItem('google_refresh_token', tokens.refresh_token)
      }
      if (tokens.access_token) {
        localStorage.setItem('google_access_token', tokens.access_token)
        localStorage.setItem('google_token_expiry', (Date.now() + (tokens.expires_in * 1000)).toString())
      }
    })

    this.sheets = google.sheets({ version: 'v4', auth: this.auth })
    this.oauth2 = google.oauth2({ version: 'v2', auth: this.auth })
  }

  // Authentication methods
  getAuthUrl(): string {
    return this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    })
  }

  async handleAuthCallback(code: string): Promise<GoogleUser> {
    try {
      const { tokens } = await this.auth.getToken(code)
      this.auth.setCredentials(tokens)

      // Store tokens
      if (tokens.refresh_token) {
        localStorage.setItem('google_refresh_token', tokens.refresh_token)
      }
      if (tokens.access_token) {
        localStorage.setItem('google_access_token', tokens.access_token)
        localStorage.setItem('google_token_expiry', (Date.now() + (tokens.expires_in! * 1000)).toString())
      }

      // Get user info
      const userInfo = await this.oauth2.userinfo.get()
      const user: GoogleUser = {
        id: userInfo.data.id,
        email: userInfo.data.email,
        name: userInfo.data.name,
        picture: userInfo.data.picture
      }

      localStorage.setItem('google_user', JSON.stringify(user))
      return user
    } catch (error) {
      console.error('Auth callback error:', error)
      throw new Error('Authentication failed')
    }
  }

  async restoreSession(): Promise<GoogleUser | null> {
    try {
      const refreshToken = localStorage.getItem('google_refresh_token')
      const accessToken = localStorage.getItem('google_access_token')
      const tokenExpiry = localStorage.getItem('google_token_expiry')
      const userStr = localStorage.getItem('google_user')

      if (!refreshToken || !userStr) {
        return null
      }

      const user = JSON.parse(userStr)

      // Check if access token is still valid
      const now = Date.now()
      const expiry = tokenExpiry ? parseInt(tokenExpiry) : 0

      if (accessToken && expiry > now + 60000) { // 1 minute buffer
        this.auth.setCredentials({
          access_token: accessToken,
          refresh_token: refreshToken
        })
        return user
      }

      // Refresh the token
      this.auth.setCredentials({
        refresh_token: refreshToken
      })

      await this.auth.refreshAccessToken()
      return user
    } catch (error) {
      console.error('Session restore error:', error)
      this.clearSession()
      return null
    }
  }

  clearSession() {
    localStorage.removeItem('google_refresh_token')
    localStorage.removeItem('google_access_token')
    localStorage.removeItem('google_token_expiry')
    localStorage.removeItem('google_user')
    this.auth.setCredentials({})
  }

  getCurrentUser(): GoogleUser | null {
    const userStr = localStorage.getItem('google_user')
    return userStr ? JSON.parse(userStr) : null
  }

  // Spreadsheet initialization
  async initializeSpreadsheet(): Promise<void> {
    try {
      // Check if spreadsheet exists and has the right structure
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID
      })

      const sheets = response.data.sheets
      const templateSheetExists = sheets?.some((sheet: any) => sheet.properties.title === 'Templates')

      if (!templateSheetExists) {
        // Create Templates sheet
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: 'Templates'
                }
              }
            }]
          }
        })

        // Add headers
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: 'Templates!A1:F1',
          valueInputOption: 'RAW',
          requestBody: {
            values: [['ID', 'User ID', 'Name', 'Canvas Data', 'Excel Data', 'Created At']]
          }
        })
      }
    } catch (error) {
      console.error('Spreadsheet initialization error:', error)
      throw new Error('Failed to initialize spreadsheet')
    }
  }

  // Template CRUD operations
  async createTemplate(template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<Template> {
    try {
      const id = Date.now().toString()
      const createdAt = new Date().toISOString()
      
      const newTemplate: Template = {
        id,
        createdAt,
        updatedAt: createdAt,
        ...template
      }

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Templates!A:F',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            newTemplate.id,
            newTemplate.userId,
            newTemplate.name,
            JSON.stringify(newTemplate.canvasData),
            JSON.stringify(newTemplate.excelData),
            newTemplate.createdAt
          ]]
        }
      })

      return newTemplate
    } catch (error) {
      console.error('Create template error:', error)
      throw new Error('Failed to create template')
    }
  }

  async getTemplates(userId: string): Promise<Template[]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Templates!A:F'
      })

      const rows = response.data.values || []
      if (rows.length <= 1) return [] // No data or only headers

      const templates: Template[] = []
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        if (row[1] === userId) { // Check if user ID matches
          templates.push({
            id: row[0],
            userId: row[1],
            name: row[2],
            canvasData: JSON.parse(row[3] || '{}'),
            excelData: JSON.parse(row[4] || '{}'),
            createdAt: row[5],
            updatedAt: row[5] // For now, same as created
          })
        }
      }

      return templates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } catch (error) {
      console.error('Get templates error:', error)
      throw new Error('Failed to fetch templates')
    }
  }

  async deleteTemplate(templateId: string, userId: string): Promise<void> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Templates!A:F'
      })

      const rows = response.data.values || []
      let rowIndex = -1

      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === templateId && rows[i][1] === userId) {
          rowIndex = i + 1 // +1 because sheets are 1-indexed
          break
        }
      }

      if (rowIndex === -1) {
        throw new Error('Template not found')
      }

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 0, // Assuming Templates is the first sheet
                dimension: 'ROWS',
                startIndex: rowIndex - 1,
                endIndex: rowIndex
              }
            }
          }]
        }
      })
    } catch (error) {
      console.error('Delete template error:', error)
      throw new Error('Failed to delete template')
    }
  }
}

export const googleSheetsService = new GoogleSheetsService()