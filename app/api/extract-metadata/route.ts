import { generateText, Output } from 'ai'
import { z } from 'zod'
import { NextResponse } from 'next/server'

const MetadataSchema = z.object({
  title: z.string().describe('The title of the paper'),
  authors: z.array(z.object({
    given: z.string().describe('First/given name'),
    family: z.string().describe('Last/family name')
  })).describe('List of authors'),
  year: z.number().nullable().describe('Publication year'),
  journal: z.string().nullable().describe('Journal or conference name'),
  abstract: z.string().nullable().describe('Paper abstract'),
  doi: z.string().nullable().describe('DOI identifier if present')
})

export async function POST(request: Request) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      )
    }

    const result = await generateText({
      model: 'openai/gpt-4o-mini',
      output: Output.object({
        schema: MetadataSchema
      }),
      prompt: `Extract academic paper metadata from the following text extracted from a PDF.
      
The text may be poorly formatted due to PDF extraction. Do your best to identify:
- The paper title (usually at the top, larger text)
- Author names (look for names near the title, often with affiliations)
- Publication year (look for dates, copyright notices, or "Published" text)
- Journal or conference name (often in headers/footers or near DOI)
- Abstract (usually labeled "Abstract" followed by a paragraph)
- DOI (usually starts with "10." and includes forward slashes)

If you cannot find a piece of information, return null for that field.

Text from PDF:
${text}`
    })

    return NextResponse.json(result.output)
  } catch (error) {
    console.error('Metadata extraction error:', error)
    return NextResponse.json(
      { error: 'Failed to extract metadata' },
      { status: 500 }
    )
  }
}
