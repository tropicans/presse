import { describe, expect, it, vi, beforeEach } from 'vitest'

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

vi.mock('./forms', () => {
  return {
    listAdminFormSubmissions: vi.fn(),
  }
})

import { prisma } from './prisma'
import { listAdminFormSubmissions } from './forms'
import {
  isChoiceField,
  buildPrompt,
  preAggregateSubmissions,
  callLlmApi,
  generateAndSaveFormAiAnalysis,
  AggregatedData
} from './ai-analysis'

describe('ai-analysis', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetAllMocks()
    process.env = { ...originalEnv }
    global.fetch = vi.fn()
  })

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

  describe('preAggregateSubmissions', () => {
    it('returns null if form submissions lookup returns null', async () => {
      vi.mocked(listAdminFormSubmissions).mockResolvedValueOnce(null)
      const res = await preAggregateSubmissions('some-form-id')
      expect(res).toBeNull()
    })

    it('aggregates data properly and computes quiz stats when hasQuiz is true', async () => {
      vi.mocked(listAdminFormSubmissions).mockResolvedValueOnce({
        form: { id: 'f1', title: 'Test Form', slug: 'test-form', status: 'PUBLISHED' },
        totalItems: 2,
        filteredItems: 2,
        hasParticipantType: false,
        hasQuiz: true,
        columns: [
          { id: 'col1', name: 'kehadiran', label: 'Kehadiran', type: 'yes_no' },
          { id: 'col2', name: 'feedback', label: 'Feedback', type: 'textarea' },
          { id: 'col3', name: 'ttd', label: 'Tanda Tangan', type: 'signature' },
        ],
        items: [
          {
            id: 's1',
            createdAt: new Date().toISOString(),
            answers: { kehadiran: 'Ya', feedback: 'Bagus sekali' },
            meta: {
              participantType: null,
              quiz: {
                score: 80,
                maxScore: 100,
                correctAnswers: 4,
                totalQuestions: 5,
                passingScore: 70,
                passed: true,
              },
            },
          },
          {
            id: 's2',
            createdAt: new Date().toISOString(),
            answers: { kehadiran: 'Tidak', feedback: 'Kurang lama' },
            meta: {
              participantType: null,
              quiz: {
                score: 50,
                maxScore: 100,
                correctAnswers: 2,
                totalQuestions: 5,
                passingScore: 70,
                passed: false,
              },
            },
          },
        ],
        page: 1,
        pageSize: 10,
        totalPages: 1,
      })

      const res = await preAggregateSubmissions('f1')
      expect(res).not.toBeNull()
      expect(res?.formTitle).toBe('Test Form')
      expect(res?.totalSubmissions).toBe(2)
      expect(res?.hasQuiz).toBe(true)
      expect(res?.quizStats).toEqual({
        averageScore: 65,
        passRate: 50,
        passedCount: 1,
        failedCount: 1,
      })
      expect(res?.fieldSummaries.kehadiran).toEqual({
        label: 'Kehadiran',
        type: 'yes_no',
        stats: { Ya: 1, Tidak: 1 },
      })
      expect(res?.fieldSummaries.feedback).toEqual({
        label: 'Feedback',
        type: 'textarea',
        textAnswers: ['Bagus sekali', 'Kurang lama'],
      })
      // Signature fields are skipped
      expect(res?.fieldSummaries.ttd).toBeUndefined()
    })
  })

  describe('callLlmApi', () => {
    it('throws error if environment variables are incomplete', async () => {
      delete process.env.LLM_API_KEY
      await expect(callLlmApi('hello')).rejects.toThrow('Konfigurasi LLM')
    })

    it('throws error if fetch returns non-ok response', async () => {
      process.env.LLM_API_KEY = 'key'
      process.env.LLM_API_BASE = 'base'
      process.env.LLM_MODEL = 'model'

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Error',
      } as Response)

      await expect(callLlmApi('hello')).rejects.toThrow('LLM API request failed with status 500')
    })

    it('returns content on success', async () => {
      process.env.LLM_API_KEY = 'key'
      process.env.LLM_API_BASE = 'base'
      process.env.LLM_MODEL = 'model'

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'LLM Response Text' } }],
        }),
      } as Response)

      const res = await callLlmApi('hello')
      expect(res).toBe('LLM Response Text')
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith('base/chat/completions', expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer key',
        },
      }))
    })
  })

  describe('generateAndSaveFormAiAnalysis', () => {
    it('throws error if environment variables are incomplete', async () => {
      delete process.env.LLM_API_KEY
      await expect(generateAndSaveFormAiAnalysis('f1')).rejects.toThrow('Konfigurasi LLM')
    })

    it('throws error if form not found or submissions empty', async () => {
      process.env.LLM_API_KEY = 'key'
      process.env.LLM_API_BASE = 'base'
      process.env.LLM_MODEL = 'model'

      vi.mocked(listAdminFormSubmissions).mockResolvedValueOnce(null)
      await expect(generateAndSaveFormAiAnalysis('f1')).rejects.toThrow('Form tidak ditemukan')

      vi.mocked(listAdminFormSubmissions).mockResolvedValueOnce({
        form: { id: 'f1', title: 'Test Form', slug: 'test-form', status: 'PUBLISHED' },
        totalItems: 0,
        filteredItems: 0,
        hasParticipantType: false,
        hasQuiz: false,
        columns: [],
        items: [],
        page: 1,
        pageSize: 10,
        totalPages: 0,
      })
      await expect(generateAndSaveFormAiAnalysis('f1')).rejects.toThrow('Tidak ada data kiriman')
    })

    it('orchestrates and saves analysis to database on success', async () => {
      process.env.LLM_API_KEY = 'key'
      process.env.LLM_API_BASE = 'base'
      process.env.LLM_MODEL = 'my-model'

      vi.mocked(listAdminFormSubmissions).mockResolvedValueOnce({
        form: { id: 'f1', title: 'Test Form', slug: 'test-form', status: 'PUBLISHED' },
        totalItems: 1,
        filteredItems: 1,
        hasParticipantType: false,
        hasQuiz: false,
        columns: [{ id: 'col1', name: 'q1', label: 'Q1', type: 'text' }],
        items: [{ id: 's1', createdAt: new Date().toISOString(), answers: { q1: 'ans' }, meta: { participantType: null, quiz: null } }],
        page: 1,
        pageSize: 10,
        totalPages: 1,
      })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'AI Analysis Result' } }],
        }),
      } as Response)

      vi.mocked(prisma.formAiAnalysis.upsert).mockResolvedValueOnce({
        id: 'analysis-id',
        formId: 'f1',
        analysisText: 'AI Analysis Result',
        analyzedCount: 1,
        modelUsed: 'my-model',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const res = await generateAndSaveFormAiAnalysis('f1')
      expect(res.analysisText).toBe('AI Analysis Result')
      expect(res.analyzedCount).toBe(1)
      expect(res.modelUsed).toBe('my-model')

      expect(prisma.formAiAnalysis.upsert).toHaveBeenCalledWith({
        where: { formId: 'f1' },
        update: {
          analysisText: 'AI Analysis Result',
          analyzedCount: 1,
          modelUsed: 'my-model',
        },
        create: {
          formId: 'f1',
          analysisText: 'AI Analysis Result',
          analyzedCount: 1,
          modelUsed: 'my-model',
        },
      })
    })
  })
})

