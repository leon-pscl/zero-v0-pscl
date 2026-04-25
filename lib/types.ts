export interface User {
  id: string
  name: string
  email: string
  created_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface Author {
  given: string
  family: string
}

export interface Reference {
  id: string
  project_id: string
  title: string
  authors: Author[]
  year: number | null
  journal: string | null
  volume: string | null
  issue: string | null
  pages: string | null
  doi: string | null
  url: string | null
  abstract: string | null
  type: string
  raw_data: Record<string, unknown> | null
  created_at: string
}

export type CitationFormat = 'apa' | 'mla' | 'chicago' | 'ieee' | 'harvard' | 'vancouver' | 'bibtex'

export interface SemanticScholarPaper {
  paperId: string
  title: string
  abstract: string | null
  year: number | null
  authors: Array<{ authorId: string; name: string }>
  venue: string | null
  citationCount: number
  externalIds?: {
    DOI?: string
    ArXiv?: string
  }
  url: string
}
