import { describe, expect, it, vi } from 'vitest'

// Mock prisma before importing code that references it
vi.mock('./prisma', () => {
  return {
    prisma: {
      formAiAnalysis: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
    },
  }
})

import { isChoiceField, buildPrompt, AggregatedData } from './ai-analysis'

describe('ai-analysis helpers', () => {
  describe('isChoiceField', () => {
    it('returns true for choice fields', () => {
      expect(isChoiceField('radio')).toBe(true)
      expect(isChoiceField('select')).toBe(true)
      expect(isChoiceField('likert')).toBe(true)
      expect(isChoiceField('yes_no')).toBe(true)
    })

    it('returns false for other fields', () => {
      expect(isChoiceField('text')).toBe(false)
      expect(isChoiceField('textarea')).toBe(false)
      expect(isChoiceField('signature')).toBe(false)
    })
  })

  describe('buildPrompt', () => {
    it('properly formats prompt with choice and text fields', () => {
      const mockData: AggregatedData = {
        formTitle: 'Survei Kepuasan',
        formSlug: 'survei-kepuasan',
        totalSubmissions: 5,
        hasQuiz: true,
        quizStats: {
          averageScore: 80,
          passRate: 60,
          passedCount: 3,
          failedCount: 2,
        },
        fieldSummaries: {
          rating: {
            label: 'Rating Program',
            type: 'radio',
            stats: {
              'Sangat Baik': 3,
              'Cukup': 2,
            },
          },
          hadir: {
            label: 'Kehadiran Peserta',
            type: 'yes_no',
            stats: {
              'Ya': 4,
              'Tidak': 1,
            },
          },
          saran: {
            label: 'Saran Anda',
            type: 'textarea',
            textAnswers: [
              'Program sudah sangat baik',
              'Perlu perbaikan modul',
            ],
          },
        },
      }

      const prompt = buildPrompt(mockData)
      expect(prompt).toContain('Survei Kepuasan')
      expect(prompt).toContain('Jumlah Kiriman (Sampel): 5 orang')
      expect(prompt).toContain('Rata-rata Skor: 80.00')
      expect(prompt).toContain('Persentase Kelulusan: 60.00%')
      expect(prompt).toContain('Rating Program')
      expect(prompt).toContain('Sangat Baik: 3')
      expect(prompt).toContain('Cukup: 2')
      expect(prompt).toContain('Kehadiran Peserta')
      expect(prompt).toContain('Ya: 4')
      expect(prompt).toContain('Tidak: 1')
      expect(prompt).toContain('Saran Anda')
      expect(prompt).toContain('Program sudah sangat baik')
    })
  })
})
