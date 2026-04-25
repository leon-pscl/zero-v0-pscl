'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SemanticScholarPaper } from '@/lib/types'
import { Search, Plus, ExternalLink, Check } from 'lucide-react'
import { mutate } from 'swr'

interface SearchPanelProps {
  projectId: string
}

export function SearchPanel({ projectId }: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SemanticScholarPaper[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set())
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsSearching(true)
    setError('')
    setResults([])

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Search failed')
      }
      
      const data = await response.json()
      setResults(data.papers || [])
    } catch (err) {
      setError('Failed to search. Please try again.')
      console.error(err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddToProject = async (paper: SemanticScholarPaper) => {
    setAddingIds(prev => new Set(prev).add(paper.paperId))

    try {
      // Parse authors
      const authors = paper.authors.map(a => {
        const parts = a.name.split(' ')
        const family = parts.pop() || ''
        const given = parts.join(' ')
        return { given, family }
      })

      const supabase = createClient()
      const { error } = await supabase
        .from('paper_references')
        .insert({
          project_id: projectId,
          title: paper.title,
          authors,
          year: paper.year,
          journal: paper.venue,
          doi: paper.externalIds?.DOI || null,
          url: paper.url,
          abstract: paper.abstract,
          type: 'article-journal',
          raw_data: paper
        })

      if (error) throw error

      setAddedIds(prev => new Set(prev).add(paper.paperId))
      mutate(`references-${projectId}`)
    } catch (err) {
      console.error('Failed to add paper:', err)
    } finally {
      setAddingIds(prev => {
        const next = new Set(prev)
        next.delete(paper.paperId)
        return next
      })
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="p-3 border-b">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search academic papers..."
            className="flex-1 px-3 py-2 text-sm rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={!query.trim() || isSearching}
            className="p-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {isSearching && (
          <div className="text-center text-muted-foreground text-sm py-8">
            Searching...
          </div>
        )}

        {error && (
          <div className="text-center text-destructive text-sm py-4">
            {error}
          </div>
        )}

        {!isSearching && results.length === 0 && !error && (
          <div className="text-center text-muted-foreground text-sm py-8">
            <Search className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
            <p>Search for academic papers</p>
            <p className="text-xs mt-1">
              Powered by OpenAlex
            </p>
          </div>
        )}

        {results.map((paper) => {
          const isAdding = addingIds.has(paper.paperId)
          const isAdded = addedIds.has(paper.paperId)

          return (
            <div
              key={paper.paperId}
              className="p-3 bg-muted/50 rounded-lg border border-transparent hover:border-border transition-colors"
            >
              <h4 className="text-sm font-medium text-card-foreground leading-snug line-clamp-2">
                {paper.title}
              </h4>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span className="truncate">
                  {paper.authors.slice(0, 2).map(a => a.name).join(', ')}
                  {paper.authors.length > 2 && ' et al.'}
                </span>
                {paper.year && (
                  <>
                    <span className="text-border">|</span>
                    <span>{paper.year}</span>
                  </>
                )}
                {paper.citationCount > 0 && (
                  <>
                    <span className="text-border">|</span>
                    <span>{paper.citationCount} citations</span>
                  </>
                )}
              </div>
              {paper.abstract && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {paper.abstract}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => handleAddToProject(paper)}
                  disabled={isAdding || isAdded}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
                    isAdded
                      ? 'bg-green-100 text-green-700'
                      : 'bg-primary text-primary-foreground hover:opacity-90'
                  } disabled:opacity-50`}
                >
                  {isAdded ? (
                    <>
                      <Check className="w-3 h-3" />
                      Added
                    </>
                  ) : isAdding ? (
                    'Adding...'
                  ) : (
                    <>
                      <Plus className="w-3 h-3" />
                      Add
                    </>
                  )}
                </button>
                <a
                  href={paper.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded text-muted-foreground hover:bg-muted"
                >
                  <ExternalLink className="w-3 h-3" />
                  View
                </a>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
