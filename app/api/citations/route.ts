import { NextRequest, NextResponse } from 'next/server'
import type { Reference, CitationFormat } from '@/lib/types'

// CSL style templates for different citation formats
const CSL_STYLES: Record<CitationFormat, string> = {
  apa: 'apa',
  mla: 'modern-language-association',
  chicago: 'chicago-note-bibliography',
  ieee: 'ieee',
  harvard: 'harvard1',
  vancouver: 'vancouver',
  bibtex: 'bibtex'
}

function formatAuthorAPA(authors: Reference['authors']): string {
  if (!authors || authors.length === 0) return ''
  
  if (authors.length === 1) {
    const a = authors[0]
    return `${a.family}, ${a.given.charAt(0)}.`
  }
  
  if (authors.length === 2) {
    return `${authors[0].family}, ${authors[0].given.charAt(0)}., & ${authors[1].family}, ${authors[1].given.charAt(0)}.`
  }
  
  if (authors.length <= 20) {
    const allButLast = authors.slice(0, -1).map(a => `${a.family}, ${a.given.charAt(0)}.`).join(', ')
    const last = authors[authors.length - 1]
    return `${allButLast}, & ${last.family}, ${last.given.charAt(0)}.`
  }
  
  // More than 20 authors
  const first19 = authors.slice(0, 19).map(a => `${a.family}, ${a.given.charAt(0)}.`).join(', ')
  const last = authors[authors.length - 1]
  return `${first19}, ... ${last.family}, ${last.given.charAt(0)}.`
}

function formatAuthorMLA(authors: Reference['authors']): string {
  if (!authors || authors.length === 0) return ''
  
  if (authors.length === 1) {
    return `${authors[0].family}, ${authors[0].given}`
  }
  
  if (authors.length === 2) {
    return `${authors[0].family}, ${authors[0].given}, and ${authors[1].given} ${authors[1].family}`
  }
  
  return `${authors[0].family}, ${authors[0].given}, et al.`
}

function formatAuthorChicago(authors: Reference['authors']): string {
  if (!authors || authors.length === 0) return ''
  
  if (authors.length === 1) {
    return `${authors[0].family}, ${authors[0].given}`
  }
  
  if (authors.length === 2) {
    return `${authors[0].family}, ${authors[0].given}, and ${authors[1].given} ${authors[1].family}`
  }
  
  if (authors.length === 3) {
    return `${authors[0].family}, ${authors[0].given}, ${authors[1].given} ${authors[1].family}, and ${authors[2].given} ${authors[2].family}`
  }
  
  return `${authors[0].family}, ${authors[0].given}, et al.`
}

function formatAuthorIEEE(authors: Reference['authors']): string {
  if (!authors || authors.length === 0) return ''
  
  const formatted = authors.map(a => `${a.given.charAt(0)}. ${a.family}`)
  
  if (formatted.length <= 6) {
    if (formatted.length === 1) return formatted[0]
    const allButLast = formatted.slice(0, -1).join(', ')
    return `${allButLast}, and ${formatted[formatted.length - 1]}`
  }
  
  return `${formatted.slice(0, 6).join(', ')}, et al.`
}

function formatAuthorHarvard(authors: Reference['authors']): string {
  if (!authors || authors.length === 0) return ''
  
  if (authors.length === 1) {
    return `${authors[0].family}, ${authors[0].given.charAt(0)}.`
  }
  
  if (authors.length === 2) {
    return `${authors[0].family}, ${authors[0].given.charAt(0)}. and ${authors[1].family}, ${authors[1].given.charAt(0)}.`
  }
  
  if (authors.length === 3) {
    return `${authors[0].family}, ${authors[0].given.charAt(0)}., ${authors[1].family}, ${authors[1].given.charAt(0)}. and ${authors[2].family}, ${authors[2].given.charAt(0)}.`
  }
  
  return `${authors[0].family}, ${authors[0].given.charAt(0)}. et al.`
}

function formatAuthorVancouver(authors: Reference['authors']): string {
  if (!authors || authors.length === 0) return ''
  
  const formatted = authors.slice(0, 6).map(a => `${a.family} ${a.given.charAt(0)}`)
  
  if (authors.length > 6) {
    return `${formatted.join(', ')}, et al.`
  }
  
  return formatted.join(', ')
}

function generateBibTeX(ref: Reference): string {
  const key = ref.authors?.[0]?.family?.toLowerCase() || 'unknown'
  const year = ref.year || 'n.d.'
  const citeKey = `${key}${year}`
  
  const authors = ref.authors?.map(a => `${a.family}, ${a.given}`).join(' and ') || ''
  
  let entry = `@article{${citeKey},\n`
  entry += `  title = {${ref.title}},\n`
  if (authors) entry += `  author = {${authors}},\n`
  if (ref.year) entry += `  year = {${ref.year}},\n`
  if (ref.journal) entry += `  journal = {${ref.journal}},\n`
  if (ref.volume) entry += `  volume = {${ref.volume}},\n`
  if (ref.issue) entry += `  number = {${ref.issue}},\n`
  if (ref.pages) entry += `  pages = {${ref.pages}},\n`
  if (ref.doi) entry += `  doi = {${ref.doi}},\n`
  if (ref.url) entry += `  url = {${ref.url}},\n`
  entry += `}`
  
  return entry
}

function generateCitation(reference: Reference, format: CitationFormat): string {
  const { title, authors, year, journal, volume, issue, pages, doi, url } = reference
  
  switch (format) {
    case 'apa': {
      let citation = formatAuthorAPA(authors)
      citation += year ? ` (${year}). ` : ' (n.d.). '
      citation += `${title}. `
      if (journal) {
        citation += `*${journal}*`
        if (volume) citation += `, *${volume}*`
        if (issue) citation += `(${issue})`
        if (pages) citation += `, ${pages}`
        citation += '. '
      }
      if (doi) citation += `https://doi.org/${doi}`
      return citation.trim()
    }
    
    case 'mla': {
      let citation = formatAuthorMLA(authors)
      citation += citation ? '. ' : ''
      citation += `"${title}." `
      if (journal) {
        citation += `*${journal}*`
        if (volume) citation += `, vol. ${volume}`
        if (issue) citation += `, no. ${issue}`
        if (year) citation += `, ${year}`
        if (pages) citation += `, pp. ${pages}`
        citation += '. '
      } else if (year) {
        citation += `${year}. `
      }
      if (doi) citation += `doi:${doi}.`
      return citation.trim()
    }
    
    case 'chicago': {
      let citation = formatAuthorChicago(authors)
      citation += citation ? '. ' : ''
      citation += `"${title}." `
      if (journal) {
        citation += `*${journal}*`
        if (volume) citation += ` ${volume}`
        if (issue) citation += `, no. ${issue}`
        if (year) citation += ` (${year})`
        if (pages) citation += `: ${pages}`
        citation += '. '
      } else if (year) {
        citation += `${year}. `
      }
      if (doi) citation += `https://doi.org/${doi}.`
      return citation.trim()
    }
    
    case 'ieee': {
      let citation = formatAuthorIEEE(authors)
      citation += ', '
      citation += `"${title}," `
      if (journal) {
        citation += `*${journal}*`
        if (volume) citation += `, vol. ${volume}`
        if (issue) citation += `, no. ${issue}`
        if (pages) citation += `, pp. ${pages}`
        if (year) citation += `, ${year}`
        citation += '. '
      } else if (year) {
        citation += `${year}. `
      }
      if (doi) citation += `doi: ${doi}.`
      return citation.trim()
    }
    
    case 'harvard': {
      let citation = formatAuthorHarvard(authors)
      citation += year ? ` (${year}) ` : ' '
      citation += `'${title}', `
      if (journal) {
        citation += `*${journal}*`
        if (volume) citation += `, ${volume}`
        if (issue) citation += `(${issue})`
        if (pages) citation += `, pp. ${pages}`
        citation += '. '
      }
      if (doi) citation += `Available at: https://doi.org/${doi}.`
      return citation.trim()
    }
    
    case 'vancouver': {
      let citation = formatAuthorVancouver(authors)
      citation += '. '
      citation += `${title}. `
      if (journal) {
        citation += journal
        if (year) citation += `. ${year}`
        if (volume) citation += `;${volume}`
        if (issue) citation += `(${issue})`
        if (pages) citation += `:${pages}`
        citation += '. '
      } else if (year) {
        citation += `${year}. `
      }
      if (doi) citation += `doi: ${doi}.`
      return citation.trim()
    }
    
    case 'bibtex': {
      return generateBibTeX(reference)
    }
    
    default:
      return ''
  }
}

export async function POST(request: NextRequest) {
  try {
    const { reference, format } = await request.json() as {
      reference: Reference
      format: CitationFormat
    }

    if (!reference || !format) {
      return NextResponse.json(
        { error: 'Missing reference or format' },
        { status: 400 }
      )
    }

    const citation = generateCitation(reference, format)

    return NextResponse.json({ citation })
  } catch (error) {
    console.error('Citation generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate citation' },
      { status: 500 }
    )
  }
}
