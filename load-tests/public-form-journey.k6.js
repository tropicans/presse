/* global __ENV */

import http from 'k6/http'
import exec from 'k6/execution'
import { check, fail } from 'k6'

const SIGNATURE_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg=='

function readEnv(name, fallback) {
  return __ENV[name] || fallback
}

function readNumberEnv(name, fallback) {
  const value = Number(readEnv(name, String(fallback)))
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function readBooleanEnv(name, fallback) {
  const value = String(readEnv(name, fallback ? 'true' : 'false')).toLowerCase()
  return value === '1' || value === 'true' || value === 'yes'
}

const BASE_URL = readEnv('BASE_URL', 'http://localhost:3456').replace(/\/$/, '')
const FORM_SLUG = readEnv('FORM_SLUG', 'attendance-template')
const TARGET_VUS = readNumberEnv('K6_VUS', 3000)
const ITERATIONS_PER_VU = readNumberEnv('K6_ITERATIONS_PER_VU', 1)
const MAX_DURATION = readEnv('K6_MAX_DURATION', '10m')
const SUBMIT_FORM = readBooleanEnv('SUBMIT_FORM', true)
const LOAD_FORM_DEFINITION = readBooleanEnv('LOAD_FORM_DEFINITION', true)
const UNIQUE_IPS = readBooleanEnv('UNIQUE_IPS', true)
const PARTICIPANT_TYPE = readEnv('PARTICIPANT_TYPE', 'Internal')

const thresholds = {
  'http_req_failed{step:page}': ['rate<0.01'],
  'http_req_duration{step:page}': ['p(95)<1500'],
}

if (LOAD_FORM_DEFINITION) {
  thresholds['http_req_failed{step:definition}'] = ['rate<0.01']
  thresholds['http_req_duration{step:definition}'] = ['p(95)<1500']
}

if (SUBMIT_FORM) {
  thresholds['http_req_failed{step:submit}'] = ['rate<0.01']
  thresholds['http_req_duration{step:submit}'] = ['p(95)<2000']
}

export const options = {
  scenarios: {
    public_form_journey: {
      executor: 'per-vu-iterations',
      vus: TARGET_VUS,
      iterations: ITERATIONS_PER_VU,
      maxDuration: MAX_DURATION,
      gracefulStop: '30s',
    },
  },
  thresholds,
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
}

function pickOption(options, preferredValue) {
  if (!Array.isArray(options) || options.length === 0) {
    return ''
  }

  const preferred = options.find(
    (option) => String(option).trim().toLowerCase() === preferredValue.trim().toLowerCase()
  )

  return preferred || options[0]
}

function buildUniqueIp(vuId) {
  const octet3 = Math.floor(vuId / 250) % 250
  const octet4 = (vuId % 250) + 1
  return `10.77.${octet3}.${octet4}`
}

function buildHeaders(vuId, step) {
  const headers = {
    Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
  }

  if (UNIQUE_IPS) {
    headers['X-Forwarded-For'] = buildUniqueIp(vuId)
  }

  if (step === 'submit') {
    headers['Content-Type'] = 'application/json'
  }

  return headers
}

function buildTextValue(field, runId, vuId) {
  switch (field.name) {
    case 'namaLengkap':
      return `Load Test User ${vuId}`
    case 'nipNrp':
      return `${runId}${String(vuId).padStart(6, '0')}`
    case 'jabatan':
      return 'Peserta Load Test'
    case 'unitKerja':
      return 'Tim Uji Beban'
    case 'email':
      return `loadtest+${runId}-${vuId}@example.com`
    default:
      return `${field.label || field.name} ${runId}-${vuId}`.slice(0, field.maxLength || 120)
  }
}

function buildPayload(form, runId, vuId) {
  const payload = {}

  for (const field of form.fields || []) {
    if (field.type === 'signature') {
      payload[field.name] = SIGNATURE_PNG
      continue
    }

    if (field.type === 'radio' || field.type === 'likert') {
      const preferredValue = field.name === 'participantType' ? PARTICIPANT_TYPE : ''
      payload[field.name] = pickOption(field.options, preferredValue)
      continue
    }

    payload[field.name] = buildTextValue(field, runId, vuId)
  }

  return payload
}

export function setup() {
  const res = http.get(`${BASE_URL}/api/public/forms/${encodeURIComponent(FORM_SLUG)}`, {
    headers: buildHeaders(0, 'setup'),
    tags: { step: 'setup' },
  })

  const ok = check(res, {
    'setup form status is 200': (response) => response.status === 200,
  })

  if (!ok) {
    fail(`Gagal memuat definisi form ${FORM_SLUG}: status ${res.status}`)
  }

  const body = res.json()
  const form = body?.form

  if (!form?.slug || !Array.isArray(form?.fields)) {
    fail('Response form publik tidak valid untuk dipakai load test')
  }

  return {
    form,
    runId: Date.now().toString().slice(-8),
  }
}

export default function publicFormJourney(data) {
  const vuId = exec.vu.idInTest
  const pageRes = http.get(`${BASE_URL}/f/${encodeURIComponent(data.form.slug)}`, {
    headers: buildHeaders(vuId, 'page'),
    tags: { step: 'page', slug: data.form.slug },
  })

  check(pageRes, {
    'page status is 200': (response) => response.status === 200,
    'page returns html shell': (response) =>
      Boolean(response.body) && (response.body.includes('Memuat Form') || response.body.includes(data.form.title)),
  })

  if (LOAD_FORM_DEFINITION) {
    const definitionRes = http.get(
      `${BASE_URL}/api/public/forms/${encodeURIComponent(data.form.slug)}`,
      {
        headers: buildHeaders(vuId, 'definition'),
        tags: { step: 'definition', slug: data.form.slug },
      }
    )

    check(definitionRes, {
      'definition status is 200': (response) => response.status === 200,
      'definition returns form slug': (response) => response.json('form.slug') === data.form.slug,
    })
  }

  if (!SUBMIT_FORM) {
    return
  }

  const payload = buildPayload(data.form, data.runId, vuId)
  const submitRes = http.post(
    `${BASE_URL}/api/public/forms/${encodeURIComponent(data.form.slug)}/submit`,
    JSON.stringify(payload),
    {
      headers: buildHeaders(vuId, 'submit'),
      tags: { step: 'submit', slug: data.form.slug },
    }
  )

  check(submitRes, {
    'submit status is 201': (response) => response.status === 201,
    'submit returns id': (response) => Boolean(response.json('id')),
  })
}
