'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { ProjectView } from './project-view'
import { BookOpen } from 'lucide-react'

export function Dashboard() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  return (
    <div className="flex h-screen">
      <Sidebar
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
      />
      <main className="flex-1 bg-background overflow-hidden">
        {selectedProjectId ? (
          <ProjectView
            projectId={selectedProjectId}
            onProjectDeleted={() => setSelectedProjectId(null)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
              <BookOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Welcome to ResearchHub
            </h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Select a project from the sidebar or create a new one to start managing your research references.
            </p>
            <div className="grid grid-cols-2 gap-4 max-w-lg text-left">
              <div className="p-4 bg-card border rounded-lg cursor-pointer hover:border-accent transition-colors">
                <h3 className="font-medium text-card-foreground mb-1">Store References</h3>
                <p className="text-sm text-muted-foreground">
                  Add papers manually or import from search results
                </p>
              </div>
              <div className="p-4 bg-card border rounded-lg cursor-pointer hover:border-accent transition-colors">
                <h3 className="font-medium text-card-foreground mb-1">Generate Citations</h3>
                <p className="text-sm text-muted-foreground">
                  APA, MLA, Chicago, IEEE, Harvard, Vancouver, BibTeX
                </p>
              </div>
              <div className="p-4 bg-card border rounded-lg cursor-pointer hover:border-accent transition-colors">
                <h3 className="font-medium text-card-foreground mb-1">AI Insights</h3>
                <p className="text-sm text-muted-foreground">
                  Chat with AI about your references and find gaps
                </p>
              </div>
              <div className="p-4 bg-card border rounded-lg cursor-pointer hover:border-accent transition-colors">
                <h3 className="font-medium text-card-foreground mb-1">Search Papers</h3>
                <p className="text-sm text-muted-foreground">
                  Find academic papers and add them to your project
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
