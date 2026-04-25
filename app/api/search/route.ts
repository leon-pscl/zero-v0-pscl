import { NextRequest, NextResponse } from 'next/server'
import type { SemanticScholarPaper } from '@/lib/types'

const SEMANTIC_SCHOLAR_API = 'https://api.semanticscholar.org/graph/v1/paper/search'

interface SemanticScholarResponse {
  total: number
  offset: number
  next?: number
  data: Array<{
    paperId: string
    title: string
    abstract?: string
    year?: number
    authors: Array<{ authorId: string; name: string }>
    venue?: string
    citationCount: number
    externalIds?: {
      DOI?: string
      ArXiv?: string
    }
    url: string
  }>
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const offset = searchParams.get('offset') || '0'
  const limit = searchParams.get('limit') || '10'

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    )
  }

  try {
    const fields = [
      'paperId',
      'title',
      'abstract',
      'year',
      'authors',
      'venue',
      'citationCount',
      'externalIds',
      'url'
    ].join(',')

    const url = new URL(SEMANTIC_SCHOLAR_API)
    url.searchParams.set('query', query)
    url.searchParams.set('fields', fields)
    url.searchParams.set('offset', offset)
    url.searchParams.set('limit', limit)

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
      // Add a small delay to be respectful of rate limits
      signal: AbortSignal.timeout(15000)
    })

    if (!response.ok) {
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please wait a moment and try again.' },
          { status: 429 }
        )
      }
      throw new Error(`Semantic Scholar API returned ${response.status}`)
    }

    const data: SemanticScholarResponse = await response.json()

    const papers: SemanticScholarPaper[] = data.data.map(paper => ({
      paperId: paper.paperId,
      title: paper.title,
      abstract: paper.abstract || null,
      year: paper.year || null,
      authors: paper.authors,
      venue: paper.venue || null,
      citationCount: paper.citationCount || 0,
      externalIds: paper.externalIds,
      url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`
    }))

    return NextResponse.json({
      papers,
      total: data.total,
      offset: parseInt(offset),
      hasMore: data.next !== undefined
    })
  } catch (error) {
    console.error('Search API error:', error)
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Search request timed out. Please try again.' },
        { status: 504 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to search papers. Please try again.' },
      { status: 500 }
    )
  }
}
