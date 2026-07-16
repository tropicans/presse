import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { getFormAiAnalysis, generateAndSaveFormAiAnalysis } from '@/lib/ai-analysis'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function GET(_: NextRequest, context: RouteContext) {
  const session = await getAdminSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const analysis = await getFormAiAnalysis(id)

    if (!analysis) {
      return NextResponse.json({ error: 'Analisis AI belum dibuat' }, { status: 404 })
    }

    return NextResponse.json({ data: analysis })
  } catch (error) {
    console.error('Error fetching AI analysis:', error)
    return NextResponse.json({ error: 'Gagal mengambil analisis AI' }, { status: 500 })
  }
}

export async function POST(_: NextRequest, context: RouteContext) {
  const session = await getAdminSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const analysis = await generateAndSaveFormAiAnalysis(id)

    return NextResponse.json({ data: analysis })
  } catch (error) {
    console.error('Error generating AI analysis:', error)
    const message = error instanceof Error ? error.message : 'Gagal membuat analisis AI'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
