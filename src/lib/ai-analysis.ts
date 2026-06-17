import { prisma } from './prisma'
import { listAdminFormSubmissions } from './forms'

export interface AggregatedData {
  formTitle: string
  formSlug: string
  totalSubmissions: number
  hasQuiz: boolean
  quizStats: {
    averageScore: number
    passRate: number
    passedCount: number
    failedCount: number
  } | null
  fieldSummaries: Record<
    string,
    {
      label: string
      type: string
      stats?: Record<string, number>
      textAnswers?: string[]
    }
  >
}

export function isChoiceField(type: string): boolean {
  return ['radio', 'select', 'likert'].includes(type)
}

export async function preAggregateSubmissions(formId: string): Promise<AggregatedData | null> {
  const data = await listAdminFormSubmissions(formId, {}, { page: 1, pageSize: 1000 })
  if (!data) return null

  const total = data.filteredItems
  const columns = data.columns
  const items = data.items

  const fieldSummaries: Record<
    string,
    {
      label: string
      type: string
      stats?: Record<string, number>
      textAnswers?: string[]
    }
  > = {}

  for (const col of columns) {
    if (col.type === 'signature') continue

    fieldSummaries[col.name] = {
      label: col.label,
      type: col.type,
      ...(isChoiceField(col.type) ? { stats: {} } : { textAnswers: [] }),
    }
  }

  let totalQuizScore = 0
  let passedCount = 0
  let failedCount = 0
  const hasQuiz = data.hasQuiz

  for (const item of items) {
    for (const col of columns) {
      if (col.type === 'signature') continue
      const val = item.answers[col.name]
      if (val === undefined || val === null || val === '') continue

      const summary = fieldSummaries[col.name]
      if (summary) {
        if (summary.stats) {
          summary.stats[val] = (summary.stats[val] ?? 0) + 1
        } else if (summary.textAnswers) {
          summary.textAnswers.push(val)
        }
      }
    }

    if (hasQuiz && item.meta?.quiz) {
      totalQuizScore += item.meta.quiz.score ?? 0
      if (item.meta.quiz.passed) {
        passedCount++
      } else {
        failedCount++
      }
    }
  }

  return {
    formTitle: data.form.title,
    formSlug: data.form.slug,
    totalSubmissions: total,
    hasQuiz,
    quizStats: hasQuiz
      ? {
          averageScore: total > 0 ? totalQuizScore / total : 0,
          passRate: total > 0 ? (passedCount / total) * 100 : 0,
          passedCount,
          failedCount,
        }
      : null,
    fieldSummaries,
  }
}

export function buildPrompt(aggregated: AggregatedData): string {
  let quantStr = ''
  if (aggregated.hasQuiz && aggregated.quizStats) {
    quantStr += `### Hasil Kuis\n`
    quantStr += `- Rata-rata Skor: ${aggregated.quizStats.averageScore.toFixed(2)}\n`
    quantStr += `- Persentase Kelulusan: ${aggregated.quizStats.passRate.toFixed(2)}%\n`
    quantStr += `- Lulus: ${aggregated.quizStats.passedCount} orang\n`
    quantStr += `- Tidak Lulus: ${aggregated.quizStats.failedCount} orang\n\n`
  }

  quantStr += `### Distribusi Jawaban Pilihan\n`
  for (const name in aggregated.fieldSummaries) {
    const summary = aggregated.fieldSummaries[name]
    if (summary && summary.stats) {
      quantStr += `#### Pertanyaan: "${summary.label}" (Tipe: ${summary.type})\n`
      const totalAnswers = Object.values(summary.stats).reduce((a, b) => a + b, 0)
      for (const val in summary.stats) {
        const count = summary.stats[val] ?? 0
        const pct = totalAnswers > 0 ? (count / totalAnswers) * 100 : 0
        quantStr += `- ${val}: ${count} respon (${pct.toFixed(1)}%)\n`
      }
      quantStr += `\n`
    }
  }

  let qualStr = ''
  for (const name in aggregated.fieldSummaries) {
    const summary = aggregated.fieldSummaries[name]
    if (summary && summary.textAnswers && summary.textAnswers.length > 0) {
      qualStr += `#### Pertanyaan: "${summary.label}" (Tipe: ${summary.type})\n`
      const sample = summary.textAnswers.slice(0, 50)
      for (const val of sample) {
        qualStr += `- "${val}"\n`
      }
      if (summary.textAnswers.length > 50) {
        qualStr += `- (... dan ${summary.textAnswers.length - 50} jawaban lainnya)\n`
      }
      qualStr += `\n`
    }
  }

  return `Anda adalah seorang UX Researcher Senior, Product Designer, dan Analis Data Kepegawaian yang sangat berpengalaman.
Tugas Anda adalah melakukan analisis mendalam terhadap hasil isian formulir berikut:

Formulir: ${aggregated.formTitle}
Jumlah Kiriman (Sampel): ${aggregated.totalSubmissions} orang

[DATA KUANTITATIF (PILIHAN & KUIS)]
${quantStr || 'Tidak ada data kuantitatif.'}

[DATA KUALITATIF (TEKS BEBAS)]
${qualStr || 'Tidak ada data kualitatif.'}

Silakan lakukan analisis komprehensif berdasarkan instruksi berikut:
1. **Ringkasan Tematik**: Identifikasi tema-tema utama, masukan paling sering muncul, keluhan utama, serta saran perbaikan dari jawaban teks bebas.
2. **Analisis Sentimen & Klasifikasi**: Tentukan sentimen umum peserta (Positif, Netral, Negatif) beserta perkiraan persentasenya.
3. **Analisis Terintegrasi**: Korelasikan data pilihan atau hasil kuis dengan jawaban teks. (Misalnya: apakah kelompok peserta yang tidak lulus kuis memberikan saran yang berbeda? Apakah ada pola khusus dari jawaban pilihan tertentu?)
4. **Rekomendasi Strategis**: Rekomendasikan 3-5 langkah aksi konkret yang berorientasi solusi demi peningkatan kualitas program/pelayanan kepegawaian.

Tuliskan laporan analisis Anda dalam Markdown Bahasa Indonesia yang profesional, rapi, bernada objektif, dan siap dibaca oleh pimpinan organisasi. Gunakan heading, bullet points, dan tabel perbandingan jika berguna untuk visualisasi. Jangan menyertakan ID teknis atau data individu sensitif.`
}

export async function callLlmApi(prompt: string): Promise<string> {
  const apiKey = process.env.LLM_API_KEY
  if (!apiKey) {
    throw new Error('LLM_API_KEY tidak dikonfigurasi di file env')
  }

  const apiBase = process.env.LLM_API_BASE || 'https://sembilan.kelazz.my.id/v1'
  const modelName = process.env.LLM_MODEL || 'gpt-4o'

  const res = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        {
          role: 'system',
          content: 'Anda adalah AI asisten analis data yang objektif dan ahli dalam riset kepegawaian.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error('LLM API Error response:', errorText)
    throw new Error(`LLM API request failed with status ${res.status}: ${errorText}`)
  }

  const json = await res.json()
  const content = json.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('Hasil respon LLM kosong')
  }

  return content
}

export async function getFormAiAnalysis(formId: string) {
  return await prisma.formAiAnalysis.findUnique({
    where: { formId },
  })
}

export async function generateAndSaveFormAiAnalysis(formId: string) {
  const aggregated = await preAggregateSubmissions(formId)
  if (!aggregated) {
    throw new Error('Form tidak ditemukan atau data kosong')
  }

  if (aggregated.totalSubmissions === 0) {
    throw new Error('Tidak ada data kiriman yang bisa dianalisis')
  }

  const prompt = buildPrompt(aggregated)
  const analysisText = await callLlmApi(prompt)
  const modelUsed = process.env.LLM_MODEL || 'gpt-4o'

  const saved = await prisma.formAiAnalysis.upsert({
    where: { formId },
    update: {
      analysisText,
      analyzedCount: aggregated.totalSubmissions,
      modelUsed,
    },
    create: {
      formId,
      analysisText,
      analyzedCount: aggregated.totalSubmissions,
      modelUsed,
    },
  })

  return saved
}
