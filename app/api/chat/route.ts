import { streamText, convertToModelMessages, UIMessage, consumeStream } from 'ai'
import { createClient } from '@supabase/supabase-js'
import type { Reference } from '@/lib/types'

export const maxDuration = 60

// Create Supabase client for server-side
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getProjectReferences(projectId: string): Promise<Reference[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('paper_references')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching references:', error)
    return []
  }

  return data as Reference[]
}

function formatReferencesForContext(references: Reference[]): string {
  if (references.length === 0) {
    return 'No references have been added to this project yet.'
  }

  return references.map((ref, index) => {
    const authors = ref.authors?.map(a => `${a.given} ${a.family}`).join(', ') || 'Unknown authors'
    let entry = `[${index + 1}] "${ref.title}" by ${authors}`
    if (ref.year) entry += ` (${ref.year})`
    if (ref.journal) entry += `. Published in ${ref.journal}`
    if (ref.abstract) entry += `\n   Abstract: ${ref.abstract}`
    return entry
  }).join('\n\n')
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages, projectId } = body as {
      messages: UIMessage[]
      projectId?: string
    }

    // Get references for context if projectId is provided
    let referenceContext = ''
    if (projectId) {
      const references = await getProjectReferences(projectId)
      referenceContext = formatReferencesForContext(references)
    }

    const systemPrompt = `You are a helpful research assistant that helps users understand and analyze their academic references. You have access to the user's reference collection.

${projectId ? `## Current Reference Collection:
${referenceContext}

## Your Capabilities:
1. **Summarize themes**: Identify common themes, methodologies, and findings across the references
2. **Find research gaps**: Identify what topics or perspectives might be missing from the collection
3. **Compare and contrast**: Analyze differences in approaches, findings, or conclusions between papers
4. **Answer questions**: Provide information about specific papers or the collection as a whole
5. **Suggest connections**: Point out relationships between different references
6. **Recommend searches**: Suggest search terms for finding additional relevant papers
7. **Provide definitions**: Explain technical terms or concepts related to the references

When discussing specific references, refer to them by their title or use their number from the list above.` : 'No project is currently selected. Please ask the user to select a project to analyze their references.'}

Be concise but thorough in your responses. Use academic language appropriate for research discussions.`

    const result = streamText({
      model: 'openai/gpt-4o-mini',
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      abortSignal: req.signal,
    })

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      consumeSseStream: consumeStream,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process chat request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
