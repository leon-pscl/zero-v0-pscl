'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/lib/types'
import { 
  BookOpen, 
  Plus, 
  FolderOpen, 
  LogOut,
  X
} from 'lucide-react'
import useSWR, { mutate } from 'swr'

interface SidebarProps {
  selectedProjectId: string | null
  onSelectProject: (projectId: string | null) => void
}

export function Sidebar({ selectedProjectId, onSelectProject }: SidebarProps) {
  const { user, logout } = useAuth()
  const [isCreating, setIsCreating] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')

  const fetcher = async () => {
    if (!user) return []
    const supabase = createClient()
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
    
    if (error) throw error
    return data as Project[]
  }

  const { data: projects = [], error } = useSWR(
    user ? `projects-${user.id}` : null,
    fetcher
  )

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newProjectName.trim()) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating project:', error)
      return
    }

    mutate(`projects-${user.id}`)
    setNewProjectName('')
    setNewProjectDesc('')
    setIsCreating(false)
    onSelectProject(data.id)
  }

  return (
    <aside className="w-64 h-screen bg-card border-r flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-card-foreground">ResearchHub</span>
        </div>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex items-center justify-between px-2 py-1 mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Projects
          </span>
          <button
            onClick={() => setIsCreating(true)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Create new project"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {isCreating && (
          <form onSubmit={handleCreateProject} className="mb-2 p-2 bg-muted rounded-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">New Project</span>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="p-0.5 rounded hover:bg-background text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name"
              className="w-full px-2 py-1.5 text-sm rounded border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent mb-2"
              autoFocus
            />
            <textarea
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full px-2 py-1.5 text-sm rounded border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent mb-2 resize-none"
            />
            <button
              type="submit"
              disabled={!newProjectName.trim()}
              className="w-full py-1.5 text-sm rounded bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50"
            >
              Create
            </button>
          </form>
        )}

        {error && (
          <p className="text-destructive text-sm px-2">Failed to load projects</p>
        )}

        <div className="space-y-0.5">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors ${
                selectedProjectId === project.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-card-foreground hover:bg-muted'
              }`}
            >
              <FolderOpen className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm truncate">{project.name}</span>
            </button>
          ))}

          {projects.length === 0 && !isCreating && (
            <p className="text-muted-foreground text-sm px-2 py-4 text-center">
              No projects yet. Create one to get started.
            </p>
          )}
        </div>
      </div>

      {/* User Section */}
      <div className="p-3 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-muted-foreground">
                {user?.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-card-foreground truncate">
                {user?.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
