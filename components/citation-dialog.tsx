'use client'

import { useState, useEffect } from 'react'
import type { Reference, CitationFormat } from '@/lib/types'
import { X, Copy, Check } from 'lucide-react'

interface CitationDialogProps {
  reference: Reference
  onClose: () => void
}

const FORMATS: { value: CitationFormat; label: string }[] = [
  { value: 'apa', label: 'APA (7th ed.)' },
  { value: 'mla', label: 'MLA (9th ed.)' },
  { value: 'chicago', label: 'Chicago (17th ed.)' },
  { value: 'ieee', label: 'IEEE' },
  { value: 'harvard', label: 'Harvard' },
  { value: 'vancouver', label: 'Vancouver' },
  { value: 'bibtex', label: 'BibTeX' },
]

export function CitationDialog({ reference, onClose }: CitationDialogProps) {
  const [format, setFormat] = useState<CitationFormat>('apa')
  const [citation, setCitation] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    generateCitation()
  }, [format, reference])

  const generateCitation = async () => {
    setIsLoading(true)
    setError('')
    setCitation('')

    try {
      const response = await fetch('/api/citations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, format }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate citation')
      }

      const data = await response.json()
      setCitation(data.citation)
    } catch (err) {
      setError('Failed to generate citation. Please try again.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(citation)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-card-foreground">Generate Citation</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {/* Reference Title */}
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {reference.title}
          </p>

          {/* Format Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Citation Format
            </label>
            <div className="flex flex-wrap gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    format === f.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground hover:bg-muted border-border'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Citation Output */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Citation
            </label>
            <div className="relative">
              {isLoading ? (
                <div className="p-4 bg-muted rounded-md text-muted-foreground text-sm">
                  Generating citation...
                </div>
              ) : error ? (
                <div className="p-4 bg-destructive/10 rounded-md text-destructive text-sm">
                  {error}
                </div>
              ) : (
                <div className="p-4 bg-muted rounded-md">
                  <pre className={`text-sm text-card-foreground whitespace-pre-wrap break-words ${
                    format === 'bibtex' ? 'font-mono text-xs' : 'font-sans'
                  }`}>
                    {citation}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md text-muted-foreground hover:bg-muted transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleCopy}
              disabled={!citation || isLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Citation
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
