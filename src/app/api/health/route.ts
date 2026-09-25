import { NextResponse } from 'next/server'
import { checkHealth } from '@/lib/health'

export async function GET() {
  try {
    const result = await checkHealth()
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Health check failed', error)
    return NextResponse.json({ status: 'error' }, { status: 503 })
  }
}
