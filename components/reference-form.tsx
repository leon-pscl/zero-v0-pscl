'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Author } from '@/lib/types'
import { X, Plus, Trash2 } from 'lucide-react'
import { mutate } from 'swr'

interface ReferenceFormProps {
  projectId: string
  onClose: () => void
}

export function ReferenceForm({ projectId, onClose }: ReferenceFormProps) {
  const [title, setTitle] = useState('')
  const [authors, setAuthors] = useState<Author[]>([{ given: '', family: '' }])
  const [year, setYear] = useState('')
  const [journal, setJournal] = useState('')
  const [volume, setVolume] = useState('')
  const [issue, setIssue] = useState('')
  const [pages, setPages] = useState('')
  const [doi, setDoi] = useState('')
  const [url, setUrl] = useState('')
  const [abstract, setAbstract] = useState('')
  const [type, setType] = useState('article-journal')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    const validAuthors = authors.filter(a => a.given.trim() || a.family.trim())
    
    if (!title.trim()) {
      setError('Title is required')
      setIsSubmitting(false)
      return
    }

    const supabase = createClient()
    const { error: insertError } = await supabase
      .from('paper_references')
      .insert({
        project_id: projectId,
        title: title.trim(),
        authors: validAuthors,
        year: year ? parseInt(year) : null,
        journal: journal.trim() || null,
        volume: volume.trim() || null,
        issue: issue.trim() || null,
        pages: pages.trim() || null,
        doi: doi.trim() || null,
        url: url.trim() || null,
        abstract: abstract.trim() || null,
        type
      })

    if (insertError) {
      setError('Failed to add reference')
      console.error(insertError)
      setIsSubmitting(false)
      return
    }

    mutate(`references-${projectId}`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-card-foreground">Add Reference</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-4">
            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="article-journal">Journal Article</option>
                <option value="book">Book</option>
                <option value="chapter">Book Chapter</option>
                <option value="paper-conference">Conference Paper</option>
                <option value="thesis">Thesis</option>
                <option value="report">Report</option>
                <option value="webpage">Web Page</option>
              </select>
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
                placeholder="Enter the title of the work"
                className="w-full px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                required
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
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addAuthor}
                  className="flex items-center gap-1 text-sm text-accent hover:underline"
                >
                  <Plus className="w-4 h-4" />
                  Add author
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
                  min="1800"
                  max="2100"
                  className="w-full px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">
                  Journal / Publisher
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

            {/* Volume, Issue, Pages */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">
                  Volume
                </label>
                <input
                  type="text"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  placeholder="12"
                  className="w-full px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">
                  Issue
                </label>
                <input
                  type="text"
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  placeholder="3"
                  className="w-full px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">
                  Pages
                </label>
                <input
                  type="text"
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  placeholder="45-67"
                  className="w-full px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            {/* DOI and URL */}
            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">
                  URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            {/* Abstract */}
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Abstract
              </label>
              <textarea
                value={abstract}
                onChange={(e) => setAbstract(e.target.value)}
                placeholder="Enter the abstract for AI analysis..."
                rows={4}
                className="w-full px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>

            {error && (
              <p className="text-destructive text-sm">{error}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Reference'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
