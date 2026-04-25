'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Author } from '@/lib/types'
import { X, Upload, FileText, Loader2, Check, AlertCircle } from 'lucide-react'
import { mutate } from 'swr'
import * as pdfjsLib from 'pdfjs-dist'

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

interface PDFImportProps {
  projectId: string
  onClose: () => void
}

interface ExtractedMetadata {
  title: string
  authors: Author[]
  year: number | null
  journal: string | null
  abstract: string | null
  doi: string | null
}

type ImportStep = 'upload' | 'extracting' | 'review' | 'saving' | 'done' | 'error'

export function PDFImport({ projectId, onClose }: PDFImportProps) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [extractedText, setExtractedText] = useState('')
  const [metadata, setMetadata] = useState<ExtractedMetadata | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state for editing
  const [title, setTitle] = useState('')
  const [authors, setAuthors] = useState<Author[]>([{ given: '', family: '' }])
  const [year, setYear] = useState('')
  const [journal, setJournal] = useState('')
  const [abstract, setAbstract] = useState('')
  const [doi, setDoi] = useState('')

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (selectedFile.type !== 'application/pdf') {
      setError('Please select a PDF file')
      return
    }

    setFile(selectedFile)
    setError('')
    setStep('extracting')

    try {
      // Extract text from PDF
      const arrayBuffer = await selectedFile.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      
      let fullText = ''
      const maxPages = Math.min(pdf.numPages, 5) // Only extract first 5 pages for metadata
      
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
        fullText += pageText + '\n'
      }

      setExtractedText(fullText)

      // Use AI to extract metadata
      const response = await fetch('/api/extract-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullText.substring(0, 8000) }) // Limit text for API
      })

      if (!response.ok) {
        throw new Error('Failed to extract metadata')
      }

      const extracted: ExtractedMetadata = await response.json()
      setMetadata(extracted)
      
      // Pre-fill form
      setTitle(extracted.title || '')
      setAuthors(extracted.authors?.length ? extracted.authors : [{ given: '', family: '' }])
      setYear(extracted.year?.toString() || '')
      setJournal(extracted.journal || '')
      setAbstract(extracted.abstract || '')
      setDoi(extracted.doi || '')
      
      setStep('review')
    } catch (err) {
      console.error('PDF extraction error:', err)
      setError('Failed to extract text from PDF. Please try again or enter details manually.')
      setStep('error')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      const fakeEvent = {
        target: { files: [droppedFile] }
      } as unknown as React.ChangeEvent<HTMLInputElement>
      handleFileSelect(fakeEvent)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const addAuthor = () => {
    setAuthors([...authors, { given: '', family: '' }])
  }

  const removeAuthor = (index: number) => {
    if (authors.length > 1) {
      setAuthors(authors.filter((_, i) => i !== index))
    }
  }

  const updateAuthor = (index: number, field: 'given' | 'family', value: string) => {
    const newAuthors = [...authors]
    newAuthors[index][field] = value
    setAuthors(newAuthors)
  }

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setStep('saving')
    setError('')

    const validAuthors = authors.filter(a => a.given.trim() || a.family.trim())
    
    const supabase = createClient()
    const { error: insertError } = await supabase
      .from('paper_references')
      .insert({
        project_id: projectId,
        title: title.trim(),
        authors: validAuthors,
        year: year ? parseInt(year) : null,
        journal: journal.trim() || null,
        doi: doi.trim() || null,
        abstract: abstract.trim() || null,
        type: 'article-journal',
        raw_data: { source: 'pdf-import', filename: file?.name }
      })

    if (insertError) {
      setError('Failed to save reference')
      console.error(insertError)
      setStep('review')
      return
    }

    setStep('done')
    mutate(`references-${projectId}`)
    
    // Auto close after success
    setTimeout(() => {
      onClose()
    }, 1500)
  }

  const resetToUpload = () => {
    setStep('upload')
    setFile(null)
    setExtractedText('')
    setMetadata(null)
    setError('')
    setTitle('')
    setAuthors([{ given: '', family: '' }])
    setYear('')
    setJournal('')
    setAbstract('')
    setDoi('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-card-foreground">
            Import from PDF
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Upload Step */}
          {step === 'upload' && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-card-foreground mb-2">
                Drop your PDF here
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse files
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll extract metadata from the PDF using AI
              </p>
            </div>
          )}

          {/* Extracting Step */}
          {step === 'extracting' && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
              <p className="text-lg font-medium text-card-foreground mb-2">
                Extracting metadata...
              </p>
              <p className="text-sm text-muted-foreground">
                Reading PDF and analyzing content with AI
              </p>
              {file && (
                <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  {file.name}
                </div>
              )}
            </div>
          )}

          {/* Review Step */}
          {step === 'review' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-md bg-accent/10 text-sm">
                <Check className="w-4 h-4 text-accent" />
                <span className="text-card-foreground">
                  Metadata extracted from <strong>{file?.name}</strong>. Please review and edit if needed.
                </span>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">
                  Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              {/* Authors */}
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">
                  Authors
                </label>
                <div className="space-y-2">
                  {authors.map((author, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={author.given}
                        onChange={(e) => updateAuthor(index, 'given', e.target.value)}
                        placeholder="First name"
                        className="flex-1 px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <input
                        type="text"
                        value={author.family}
                        onChange={(e) => updateAuthor(index, 'family', e.target.value)}
                        placeholder="Last name"
                        className="flex-1 px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      {authors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAuthor(index)}
                          className="p-2 rounded hover:bg-muted text-muted-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addAuthor}
                    className="text-sm text-accent hover:underline"
                  >
                    + Add author
                  </button>
                </div>
              </div>

              {/* Year and Journal */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="2024"
                    className="w-full px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">
                    Journal
                  </label>
                  <input
                    type="text"
                    value={journal}
                    onChange={(e) => setJournal(e.target.value)}
                    placeholder="Journal name"
                    className="w-full px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              {/* DOI */}
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">
                  DOI
                </label>
                <input
                  type="text"
                  value={doi}
                  onChange={(e) => setDoi(e.target.value)}
                  placeholder="10.1000/xyz123"
                  className="w-full px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              {/* Abstract */}
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">
                  Abstract
                </label>
                <textarea
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                />
              </div>

              {error && (
                <p className="text-destructive text-sm">{error}</p>
              )}
            </div>
          )}

          {/* Saving Step */}
          {step === 'saving' && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
              <p className="text-lg font-medium text-card-foreground">
                Saving reference...
              </p>
            </div>
          )}

          {/* Done Step */}
          {step === 'done' && (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto rounded-full bg-accent/20 flex items-center justify-center mb-4">
                <Check className="w-6 h-6 text-accent" />
              </div>
              <p className="text-lg font-medium text-card-foreground">
                Reference added successfully!
              </p>
            </div>
          )}

          {/* Error Step */}
          {step === 'error' && (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto rounded-full bg-destructive/20 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <p className="text-lg font-medium text-card-foreground mb-2">
                Extraction Failed
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {error}
              </p>
              <button
                onClick={resetToUpload}
                className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'review' && (
          <div className="flex items-center justify-end gap-3 p-4 border-t">
            <button
              onClick={resetToUpload}
              className="px-4 py-2 text-sm rounded-md text-muted-foreground hover:bg-muted transition-colors"
            >
              Upload Different PDF
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90"
            >
              Save Reference
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
