'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Reference, Project } from '@/lib/types'
import { 
  FileText, 
  ChevronDown, 
  ChevronRight,
  Trash2,
  Quote,
  ExternalLink,
  Copy
} from 'lucide-react'
import useSWR, { mutate } from 'swr'

interface ReferenceListProps {
  project: Project
  onGenerateCitation: (reference: Reference) => void
}

export function ReferenceList({ project, onGenerateCitation }: ReferenceListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetcher = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('paper_references')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as Reference[]
  }

  const { data: references = [], error, isLoading } = useSWR(
    `references-${project.id}`,
    fetcher
  )

  const handleDelete = async (refId: string) => {
    if (!confirm('Are you sure you want to delete this reference?')) return
    
    setDeletingId(refId)
    const supabase = createClient()
    const { error } = await supabase
      .from('paper_references')
      .delete()
      .eq('id', refId)
    
    if (error) {
      console.error('Error deleting reference:', error)
    } else {
      mutate(`references-${project.id}`)
    }
    setDeletingId(null)
  }

  const formatAuthors = (authors: Reference['authors']) => {
    if (!authors || authors.length === 0) return 'Unknown authors'
    if (authors.length === 1) {
      return `${authors[0].family}, ${authors[0].given}`
    }
    if (authors.length === 2) {
      return `${authors[0].family} & ${authors[1].family}`
    }
    return `${authors[0].family} et al.`
  }

  const copyDoi = (doi: string) => {
    navigator.clipboard.writeText(`https://doi.org/${doi}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading references...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive">
        Failed to load references
      </div>
    )
  }

  if (references.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <FileText className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-1">No references yet</h3>
        <p className="text-muted-foreground text-sm max-w-md">
          Add references manually or search for papers to build your literature collection.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {references.map((ref) => {
        const isExpanded = expandedId === ref.id
        const isDeleting = deletingId === ref.id

        return (
          <div
            key={ref.id}
            className={`bg-card border rounded-lg overflow-hidden transition-shadow ${
              isExpanded ? 'shadow-md' : 'shadow-sm hover:shadow-md'
            }`}
          >
            {/* Collapsed View */}
            <div 
              className="p-4 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : ref.id)}
            >
              <div className="flex items-start gap-3">
                <button className="mt-1 text-muted-foreground">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-card-foreground leading-snug">
                    {ref.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <span>{formatAuthors(ref.authors)}</span>
                    {ref.year && (
                      <>
                        <span className="text-border">|</span>
                        <span>{ref.year}</span>
                      </>
                    )}
                    {ref.journal && (
                      <>
                        <span className="text-border">|</span>
                        <span className="italic truncate">{ref.journal}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded View */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-0 border-t bg-muted/30">
                <div className="pt-4 pl-7">
                  {/* Abstract */}
                  {ref.abstract && (
                    <div className="mb-4">
                      <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Abstract
                      </h5>
                      <p className="text-sm text-card-foreground leading-relaxed">
                        {ref.abstract}
                      </p>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                    {ref.volume && (
                      <div>
                        <span className="text-muted-foreground">Volume:</span>{' '}
                        <span className="text-card-foreground">{ref.volume}</span>
                      </div>
                    )}
                    {ref.issue && (
                      <div>
                        <span className="text-muted-foreground">Issue:</span>{' '}
                        <span className="text-card-foreground">{ref.issue}</span>
                      </div>
                    )}
                    {ref.pages && (
                      <div>
                        <span className="text-muted-foreground">Pages:</span>{' '}
                        <span className="text-card-foreground">{ref.pages}</span>
                      </div>
                    )}
                    {ref.doi && (
                      <div className="col-span-2 flex items-center gap-2">
                        <span className="text-muted-foreground">DOI:</span>{' '}
                        <a 
                          href={`https://doi.org/${ref.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {ref.doi}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copyDoi(ref.doi!)
                          }}
                          className="p-1 rounded hover:bg-muted text-muted-foreground"
                          title="Copy DOI link"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onGenerateCitation(ref)
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                    >
                      <Quote className="w-3.5 h-3.5" />
                      Generate Citation
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(ref.id)
                      }}
                      disabled={isDeleting}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
