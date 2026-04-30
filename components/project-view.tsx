'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Project, Reference } from '@/lib/types'
import { ReferenceList } from './reference-list'
import { ReferenceForm } from './reference-form'
import { PDFImport } from './pdf-import'
import { CitationDialog } from './citation-dialog'
import { ChatPanel } from './chat-panel'
import { SearchPanel } from './search-panel'
import { 
  Plus, 
  MessageSquare, 
  Search,
  Trash2,
  X,
  FileUp,
  ChevronDown
} from 'lucide-react'
import useSWR from 'swr'

interface ProjectViewProps {
  projectId: string
  onProjectDeleted: () => void
}

export function ProjectView({ projectId, onProjectDeleted }: ProjectViewProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [showPDFImport, setShowPDFImport] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showCitation, setShowCitation] = useState(false)
  const [selectedReference, setSelectedReference] = useState<Reference | null>(null)
  const [rightPanel, setRightPanel] = useState<'chat' | 'search' | null>(null)

  const fetcher = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()
    
    if (error) throw error
    return data as Project
  }

  const { data: project, error, isLoading, mutate } = useSWR(
    `project-${projectId}`,
    fetcher
  )

  const handleGenerateCitation = (reference: Reference) => {
    setSelectedReference(reference)
    setShowCitation(true)
  }

  const handleDeleteProject = async () => {
    if (!project) return
    if (!confirm(`Are you sure you want to delete "${project.name}"? This will also delete all references in this project.`)) {
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (error) {
      console.error('Error deleting project:', error)
      return
    }

    onProjectDeleted()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading project...
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        Failed to load project
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-w-0 ${rightPanel ? 'border-r' : ''}`}>
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b bg-card">
          <div>
            <h1 className="text-xl font-semibold text-card-foreground">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRightPanel(rightPanel === 'search' ? null : 'search')}
              className={`p-2 rounded-md transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent ${
                rightPanel === 'search'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              aria-label="Search papers"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => setRightPanel(rightPanel === 'chat' ? null : 'chat')}
              className={`p-2 rounded-md transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent ${
                rightPanel === 'chat'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              aria-label="AI Assistant"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Add Reference
                <ChevronDown className="w-3 h-3 ml-1" />
              </button>
              {showAddMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-dropdown" 
                    onClick={() => setShowAddMenu(false)} 
                  />
                  <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-card border z-dropdown">
                    <button
                      onClick={() => {
                        setShowAddForm(true)
                        setShowAddMenu(false)
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-card-foreground hover:bg-muted transition-colors rounded-t-md"
                    >
                      <Plus className="w-4 h-4" />
                      Manual Entry
                    </button>
                    <button
                      onClick={() => {
                        setShowPDFImport(true)
                        setShowAddMenu(false)
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-card-foreground hover:bg-muted transition-colors rounded-b-md"
                    >
                      <FileUp className="w-4 h-4" />
                      Import from PDF
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={handleDeleteProject}
              className="p-2 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label="Delete project"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* References */}
        <div className="flex-1 overflow-y-auto p-4">
          <ReferenceList project={project} onGenerateCitation={handleGenerateCitation} />
        </div>
      </div>

      {/* Right Panel */}
      {rightPanel && (
        <div className="w-96 flex flex-col bg-card">
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-medium text-card-foreground">
              {rightPanel === 'chat' ? 'AI Research Assistant' : 'Search Papers'}
            </h3>
            <button
              onClick={() => setRightPanel(null)}
              className="p-1 rounded hover:bg-muted text-muted-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {rightPanel === 'chat' && <ChatPanel projectId={projectId} />}
          {rightPanel === 'search' && <SearchPanel projectId={projectId} />}
        </div>
      )}

      {/* Modals */}
      {showAddForm && (
        <ReferenceForm projectId={projectId} onClose={() => setShowAddForm(false)} />
      )}
      {showPDFImport && (
        <PDFImport projectId={projectId} onClose={() => setShowPDFImport(false)} />
      )}
      {showCitation && selectedReference && (
        <CitationDialog
          reference={selectedReference}
          onClose={() => {
            setShowCitation(false)
            setSelectedReference(null)
          }}
        />
      )}
    </div>
  )
}
