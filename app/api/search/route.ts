import { NextRequest, NextResponse } from 'next/server'
import type { SemanticScholarPaper } from '@/lib/types'

// Using OpenAlex API - it has generous rate limits (100k/day unauthenticated)
// and provides comprehensive academic paper data
const OPENALEX_API = 'https://api.openalex.org/works'

interface OpenAlexAuthor {
  author: {
    id: string
    display_name: string
  }
}

interface OpenAlexWork {
  id: string
  doi?: string
  title: string
  display_name: string
  publication_year?: number
  authorships: OpenAlexAuthor[]
  primary_location?: {
    source?: {
      display_name?: string
    }
  }
  cited_by_count: number
  abstract_inverted_index?: Record<string, number[]>
}

interface OpenAlexResponse {
  meta: {
    count: number
    per_page: number
    page: number
  }
  results: OpenAlexWork[]
}

// Convert inverted index to readable abstract
function invertedIndexToText(invertedIndex: Record<string, number[]> | undefined): string | null {
  if (!invertedIndex) return null
  
  const words: [string, number][] = []
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push([word, pos])
    }
  }
  
  words.sort((a, b) => a[1] - b[1])
  return words.map(w => w[0]).join(' ')
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const page = searchParams.get('page') || '1'
  const perPage = searchParams.get('limit') || '10'

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    )
  }

  try {
    const url = new URL(OPENALEX_API)
    url.searchParams.set('search', query)
    url.searchParams.set('page', page)
    url.searchParams.set('per_page', perPage)
    // Request polite pool (faster responses) by providing an email
    url.searchParams.set('mailto', 'research-hub@example.com')
    // Sort by relevance score and citation count
    url.searchParams.set('sort', 'relevance_score:desc')

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000)
    })

    if (!response.ok) {
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please wait a moment and try again.' },
          { status: 429 }
        )
      }
      throw new Error(`OpenAlex API returned ${response.status}`)
    }

    const data: OpenAlexResponse = await response.json()

    // Transform OpenAlex results to our paper format
    const papers: SemanticScholarPaper[] = data.results.map(work => {
      // Extract DOI from the full URL if present
      const doi = work.doi?.replace('https://doi.org/', '') || undefined
      
      return {
        paperId: work.id.replace('https://openalex.org/', ''),
        title: work.display_name || work.title,
        abstract: invertedIndexToText(work.abstract_inverted_index),
        year: work.publication_year || null,
        authors: work.authorships.map(a => ({
          authorId: a.author.id,
          name: a.author.display_name
        })),
        venue: work.primary_location?.source?.display_name || null,
        citationCount: work.cited_by_count || 0,
        externalIds: doi ? { DOI: doi } : undefined,
        url: work.doi || work.id
      }
    })

    return NextResponse.json({
      papers,
      total: data.meta.count,
      page: parseInt(page),
      hasMore: data.meta.page * data.meta.per_page < data.meta.count
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
