/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Plugin } from '@opencode-ai/plugin'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import TelegramBot from 'node-telegram-bot-api'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID
const TELEGRAM_CHAT_IDS = process.env.TELEGRAM_CHAT_IDS
const LOG_FILE = path.join(process.env.USERPROFILE || process.env.HOME || os.tmpdir(), '.opencode-telegram-plugin.log')
const MAX_MESSAGE_LENGTH = 3500
const MAX_MENU_COMMANDS = 25
const MAX_CUSTOM_COMMANDS_IN_MENU = 8

const BUILTIN_COMMANDS = [
  { command: 'start', description: 'Tampilkan bantuan singkat' },
  { command: 'new', description: 'Buat sesi baru' },
  { command: 'sessions', description: 'Daftar sesi terbaru' },
  { command: 'status', description: 'Status sesi aktif' },
  { command: 'switch', description: 'Pindah sesi' },
  { command: 'abort', description: 'Batalkan tugas berjalan' },
  { command: 'diff', description: 'Lihat file yang berubah' },
  { command: 'messages', description: 'Lihat pesan terbaru' },
  { command: 'shell', description: 'Jalankan perintah shell' },
  { command: 'commands', description: 'Daftar command OpenCode' },
  { command: 'oc_undo', description: 'Undo pesan terakhir' },
  { command: 'oc_redo', description: 'Redo pesan terakhir' },
  { command: 'oc_compact', description: 'Ringkas sesi' },
  { command: 'oc_share', description: 'Bagikan sesi' },
  { command: 'oc_unshare', description: 'Batalkan bagikan sesi' },
  { command: 'oc_init', description: 'Buat atau perbarui AGENTS.md' },
  { command: 'oc_models', description: 'Daftar model tersedia' },
  { command: 'oc_help', description: 'Bantuan OpenCode' },
] as const

type OpenCodeCommand = {
  name: string
  description: string
}

type PendingPermission = {
  chatId: string
  permissionId: string
  sessionId: string
  description: string
}

function log(...args: unknown[]) {
  const line = `[${new Date().toISOString()}] [telegram-plugin] ${args.map((value) => typeof value === 'string' ? value : JSON.stringify(value)).join(' ')}\n`
  fs.appendFileSync(LOG_FILE, line)
}

function parseAllowedChatIds() {
  const values = [
    TELEGRAM_CHAT_ID,
    ...(TELEGRAM_CHAT_IDS ? TELEGRAM_CHAT_IDS.split(',') : []),
  ]

  return new Set(
    values
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value))
  )
}

function sanitizeTelegramText(value: string) {
  return value.replace(/[_*`\[\]]/g, '')
}

function splitMessage(text: string, maxLength = MAX_MESSAGE_LENGTH) {
  if (text.length <= maxLength) {
    return [text]
  }

  const chunks: string[] = []
  let remaining = text

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining)
      break
    }

    let splitAt = remaining.lastIndexOf('\n', maxLength)
    if (splitAt < Math.floor(maxLength * 0.5)) {
      splitAt = maxLength
    }

    chunks.push(remaining.slice(0, splitAt))
    remaining = remaining.slice(splitAt).trimStart()
  }

  return chunks
}

function extractResponseText(data: unknown) {
  const parts = (data as { parts?: Array<{ type?: string; content?: string; text?: string }> } | null)?.parts ?? []
  return parts
    .filter((part) => part.type === 'text')
    .map((part) => part.content || part.text || '')
    .filter(Boolean)
    .join('\n')
}

function normalizeCommandName(commandName: string) {
  return commandName.replace(/-/g, '_').slice(0, 32)
}

export const TelegramRemotePlugin: Plugin = async ({ client, directory }) => {
  log('='.repeat(80))
  log('Plugin loading...', `Log file: ${LOG_FILE}`, `Directory: ${directory}`)

  const allowedChatIds = parseAllowedChatIds()

  if (!TELEGRAM_BOT_TOKEN || allowedChatIds.size === 0) {
    log('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID(S). Plugin disabled.')
    return {}
  }

  let bot: TelegramBot | null = null
  let openCodeCommands: OpenCodeCommand[] = []
  const currentSessionIdByChat = new Map<string, string>()
  const isProcessingByChat = new Map<string, boolean>()
  const awaitingPromptResultByChat = new Map<string, boolean>()
  const pendingPermissions = new Map<string, PendingPermission>()

  const sendChunks = async (chatId: string, text: string, options?: TelegramBot.SendMessageOptions) => {
    if (!bot) return

    for (const chunk of splitMessage(text)) {
      try {
        await bot.sendMessage(chatId, chunk, options)
      } catch {
        await bot.sendMessage(chatId, sanitizeTelegramText(chunk), options)
      }
    }
  }

  const findChatIdBySessionId = (sessionId: string) => {
    for (const [chatId, activeSessionId] of currentSessionIdByChat.entries()) {
      if (activeSessionId === sessionId) {
        return chatId
      }
    }

    return null
  }

  const ensureSession = async (chatId: string) => {
    const currentSessionId = currentSessionIdByChat.get(chatId)

    if (currentSessionId) {
      try {
        const session = await client.session.get({ path: { id: currentSessionId } })
        if (session.data) {
          return currentSessionId
        }
      } catch {
        log(`Session ${currentSessionId} no longer exists, creating a new one`)
      }
    }

    const session = await client.session.create({ body: { title: `Telegram Remote (${chatId})` } })
    currentSessionIdByChat.set(chatId, session.data!.id)
    return session.data!.id
  }

  const fetchOpenCodeCommands = async () => {
    try {
      const result =
        (await (client as any).command?.list?.())
        ?? (await (client as any).GET?.('/command'))
      const commands = result?.data || result?.body || []

      if (!Array.isArray(commands)) {
        return [] as OpenCodeCommand[]
      }

      return commands
        .map((command: any) => ({
          name: command.name || command.id || '',
          description: command.description || '',
        }))
        .filter((command) => command.name)
    } catch (error) {
      log('Failed to fetch commands', error)
      return [] as OpenCodeCommand[]
    }
  }

  const executeOpenCodeCommand = async (chatId: string, command: string, args: string) => {
    const sessionId = await ensureSession(chatId)
    const result = await client.session.command({
      path: { id: sessionId },
      body: { command, arguments: args },
    })
    return extractResponseText(result.data) || 'Command selesai dijalankan.'
  }

  const handleSessionIdle = async (sessionId: string) => {
    const chatId = findChatIdBySessionId(sessionId)

    if (!chatId || !awaitingPromptResultByChat.get(chatId)) {
      return
    }

    awaitingPromptResultByChat.set(chatId, false)
    isProcessingByChat.set(chatId, false)

    try {
      const result = await client.session.messages({ path: { id: sessionId } })
      const messages = (result.data as any[]) || []
      const lastAssistant = [...messages].reverse().find((message: any) => message.info?.role === 'assistant')
      const responseText = lastAssistant ? extractResponseText(lastAssistant) : ''

      if (responseText) {
        await sendChunks(chatId, responseText)
        return
      }

      await sendChunks(chatId, 'Tugas selesai.')
    } catch (error: any) {
      log('Failed to fetch messages after session.idle', error)
      await sendChunks(chatId, `Tugas selesai, tetapi balasan tidak bisa diambil. ${error?.message || ''}`.trim())
    }
  }

  const respondToPermission = async (chatId: string, sessionId: string, permissionId: string, reply: 'once' | 'always' | 'reject') => {
    try {
      await (client as any).postSessionIdPermissionsPermissionId({
        path: { id: sessionId, permissionID: permissionId },
        body: { response: reply },
      })
    } catch (error: any) {
      log('Failed to respond to permission request', error)
      await sendChunks(chatId, 'Gagal menjawab permission request otomatis. Silakan cek OpenCode TUI.')
      return
    }

    const label = reply === 'once' ? 'Approved (once)' : reply === 'always' ? 'Approved (always)' : 'Denied'
    await sendChunks(chatId, `[OK] ${label}`)
  }

  const handlePermissionAsked = async (payload: any) => {
    const sessionId = payload.sessionID || payload.session_id || payload.sessionId
    const permissionId = payload.permissionID || payload.permission_id || payload.permissionId || payload.id
    const chatId = sessionId ? findChatIdBySessionId(sessionId) : null

    if (!sessionId || !permissionId || !chatId) {
      return
    }

    const tool = payload.permission || 'unknown'
    const args = Array.isArray(payload.patterns) ? payload.patterns.join('\n').slice(0, 400) : ''
    const sent = await bot?.sendMessage(
      chatId,
      `Permission Request\n\nTool: ${tool}\nCommand: ${args || 'N/A'}\n\nReply YES, ALWAYS, or NO.`
    )

    if (!sent) {
      return
    }

    pendingPermissions.set(`${chatId}:${sent.message_id}`, {
      chatId,
      permissionId,
      sessionId,
      description: `${tool}: ${args}`,
    })

    setTimeout(() => {
      pendingPermissions.delete(`${chatId}:${sent.message_id}`)
    }, 5 * 60 * 1000)
  }

  const startEventStream = async () => {
    try {
      const events = await client.event.subscribe()
      if (!events.stream) {
        return
      }

      for await (const event of events.stream as any) {
        const props = event.properties || event

        if (event.type === 'permission.asked') {
          await handlePermissionAsked(props)
        }

        if (event.type === 'session.idle') {
          const sessionId = props.sessionID || props.session_id || props.sessionId
          if (sessionId) {
            await handleSessionIdle(sessionId)
          }
        }

        if (event.type === 'session.error') {
          const sessionId = props.sessionID || props.session_id || props.sessionId
          const chatId = sessionId ? findChatIdBySessionId(sessionId) : null
          if (chatId) {
            awaitingPromptResultByChat.set(chatId, false)
            isProcessingByChat.set(chatId, false)
            await sendChunks(chatId, `Session error: ${String(props.error || 'Unknown error')}`)
          }
        }
      }
    } catch (error) {
      log('Event stream failed', error)
      setTimeout(() => {
        void startEventStream()
      }, 5000)
    }
  }

  const registerMenuCommands = async () => {
    if (!bot) return

    openCodeCommands = await fetchOpenCodeCommands()
    const builtinNames = new Set([
      'new', 'clear', 'undo', 'redo', 'compact', 'summarize',
      'share', 'unshare', 'init', 'models', 'themes', 'help',
      'exit', 'quit', 'q', 'sessions', 'resume', 'continue',
      'connect', 'details', 'editor', 'export', 'thinking',
    ])

    const customMenuCommands = openCodeCommands
      .filter((command) => !builtinNames.has(command.name))
      .slice(0, MAX_CUSTOM_COMMANDS_IN_MENU)
      .map((command) => ({
        command: `oc_${normalizeCommandName(command.name)}`,
        description: (command.description || command.name).slice(0, 256),
      }))

    const menuCommands = [...BUILTIN_COMMANDS, ...customMenuCommands].slice(0, MAX_MENU_COMMANDS)

    try {
      await bot.setMyCommands(menuCommands)
    } catch (error) {
      log('Failed to set bot commands', error)
    }

    for (const chatId of allowedChatIds) {
      await sendChunks(
        chatId,
        `OpenCode Remote connected!\nProject: ${directory}\nAuthorized chats: ${allowedChatIds.size}\nMenu commands: ${menuCommands.length}\nCustom commands available: ${openCodeCommands.length}`
      )
    }
  }

  const registerCommandHandlers = () => {
    if (!bot) return

    bot.onText(/\/start/, async (message) => {
      const chatId = message.chat.id.toString()
      if (!allowedChatIds.has(chatId)) return

      openCodeCommands = await fetchOpenCodeCommands()
      const customCount = openCodeCommands.length
      await sendChunks(
        chatId,
        [
          'OpenCode Telegram Remote',
          '',
          `Project: ${directory}`,
          '',
          'Command utama:',
          '/new [judul] - buat sesi baru',
          '/sessions - daftar sesi terbaru',
          '/switch <id> - pindah sesi',
          '/status - status sesi aktif',
          '/abort - batalkan tugas berjalan',
          '/diff - lihat file yang berubah',
          '/messages - lihat pesan terbaru',
          '/shell <cmd> - jalankan perintah shell',
          '/commands - lihat daftar command OpenCode',
          '',
          'Shortcut shell:',
          '!git status',
          '',
          `Custom commands terdeteksi: ${customCount}`,
          'Menu tombol Telegram hanya menampilkan subset command yang paling penting.',
        ].join('\n')
      )
    })

    bot.onText(/\/new(?:\s+(.+))?/, async (message, match) => {
      const chatId = message.chat.id.toString()
      if (!allowedChatIds.has(chatId)) return

      const title = match?.[1] || 'Telegram Remote'
      const session = await client.session.create({ body: { title: `${title} (${chatId})` } })
      currentSessionIdByChat.set(chatId, session.data!.id)
      await sendChunks(chatId, `Sesi baru dibuat.\nID: ${session.data!.id.slice(0, 8)}\nJudul: ${title}`)
    })

    bot.onText(/\/sessions?/, async (message) => {
      const chatId = message.chat.id.toString()
      if (!allowedChatIds.has(chatId)) return

      const sessions = await client.session.list()
      if (!sessions.data || sessions.data.length === 0) {
        await sendChunks(chatId, 'Belum ada sesi.')
        return
      }

      const currentSessionId = currentSessionIdByChat.get(chatId)
      const list = sessions.data
        .slice(0, 15)
        .map((session: any) => `${session.id.slice(0, 8)} - ${session.title || 'Untitled'}${session.id === currentSessionId ? ' (aktif)' : ''}`)
        .join('\n')
      await sendChunks(chatId, `Recent Sessions:\n\n${list}\n\nUse /switch <id> to switch.`)
    })

    bot.onText(/\/switch(?:\s+(.+))?/, async (message, match) => {
      const chatId = message.chat.id.toString()
      if (!allowedChatIds.has(chatId)) return

      const targetId = match?.[1]?.trim()
      if (!targetId) {
        await sendChunks(chatId, 'Usage: /switch <session-id-prefix>')
        return
      }

      const sessions = await client.session.list()
      const found = sessions.data?.find((session: any) => session.id.startsWith(targetId))

      if (!found) {
        await sendChunks(chatId, `Sesi dengan prefix ${targetId} tidak ditemukan.`)
        return
      }

      currentSessionIdByChat.set(chatId, found.id)
      await sendChunks(chatId, `Berhasil pindah ke sesi ${found.id.slice(0, 8)} - ${found.title || 'Untitled'}`)
    })

    bot.onText(/\/status/, async (message) => {
      const chatId = message.chat.id.toString()
      if (!allowedChatIds.has(chatId)) return

      const currentSessionId = currentSessionIdByChat.get(chatId)
      if (!currentSessionId) {
        await sendChunks(chatId, 'Belum ada sesi aktif. Kirim pesan untuk memulai sesi.')
        return
      }

      const session = await client.session.get({ path: { id: currentSessionId } })
      const data = session.data as any
      await sendChunks(chatId, `Session Status\nID: ${data.id.slice(0, 8)}\nJudul: ${data.title || 'Untitled'}\nProject: ${directory}`)
    })

    bot.onText(/\/pending/, async (message) => {
      const chatId = message.chat.id.toString()
      if (!allowedChatIds.has(chatId)) return

      const pendingForChat = Array.from(pendingPermissions.values()).filter((pending) => pending.chatId === chatId)
      if (pendingForChat.length === 0) {
        await sendChunks(chatId, 'Tidak ada permission request yang menunggu jawaban.')
        return
      }

      const list = pendingForChat.map((pending, index) => `${index + 1}. ${pending.description}`).join('\n')
      await sendChunks(chatId, `Pending Permissions (${pendingForChat.length})\n\n${list}`)
    })

    bot.onText(/\/abort/, async (message) => {
      const chatId = message.chat.id.toString()
      if (!allowedChatIds.has(chatId)) return

      const currentSessionId = currentSessionIdByChat.get(chatId)
      if (!currentSessionId) {
        await sendChunks(chatId, 'Belum ada sesi aktif.')
        return
      }

      await client.session.abort({ path: { id: currentSessionId } })
      isProcessingByChat.set(chatId, false)
      awaitingPromptResultByChat.set(chatId, false)
      await sendChunks(chatId, 'Tugas dibatalkan.')
    })

    bot.onText(/\/diff/, async (message) => {
      const chatId = message.chat.id.toString()
      if (!allowedChatIds.has(chatId)) return

      const currentSessionId = currentSessionIdByChat.get(chatId)
      if (!currentSessionId) {
        await sendChunks(chatId, 'Belum ada sesi aktif.')
        return
      }

      const result = await client.session.diff({ path: { id: currentSessionId } })
      const entries = (result.data as any[]) || []

      if (entries.length === 0) {
        await sendChunks(chatId, 'Belum ada file yang berubah pada sesi ini.')
        return
      }

      await sendChunks(chatId, `Changed files:\n\n${entries.map((item: any) => item.path || item.file || 'unknown').join('\n')}`)
    })

    bot.onText(/\/messages/, async (message) => {
      const chatId = message.chat.id.toString()
      if (!allowedChatIds.has(chatId)) return

      const currentSessionId = currentSessionIdByChat.get(chatId)
      if (!currentSessionId) {
        await sendChunks(chatId, 'Belum ada sesi aktif.')
        return
      }

      const result = await client.session.messages({ path: { id: currentSessionId } })
      const messages = (result.data as any[]) || []

      if (messages.length === 0) {
        await sendChunks(chatId, 'Belum ada pesan pada sesi ini.')
        return
      }

      const summary = messages.slice(-5).map((entry: any) => {
        const role = entry.info?.role || 'unknown'
        const text = extractResponseText(entry)
        return `${role}: ${sanitizeTelegramText((text || '(no text)').slice(0, 180))}`
      }).join('\n\n')

      await sendChunks(chatId, summary)
    })

    bot.onText(/\/shell(?:\s+(.+))?/, async (message, match) => {
      const chatId = message.chat.id.toString()
      if (!allowedChatIds.has(chatId)) return

      const command = match?.[1]?.trim()
      if (!command) {
        await sendChunks(chatId, 'Usage: /shell <command>')
        return
      }

      const sessionId = await ensureSession(chatId)
      await sendChunks(chatId, `Menjalankan: ${command}`)
      const result = await client.session.shell({
        path: { id: sessionId },
        body: { agent: '', command },
      })
      const output = extractResponseText(result.data)
      await sendChunks(chatId, output || 'Command selesai tanpa output.')
    })

    bot.onText(/\/commands(?:\s+(\d+))?/, async (message, match) => {
      const chatId = message.chat.id.toString()
      if (!allowedChatIds.has(chatId)) return

      openCodeCommands = await fetchOpenCodeCommands()
      const page = Math.max(1, Number(match?.[1] || 1))
      const perPage = 30
      const start = (page - 1) * perPage
      const pageCommands = openCodeCommands.slice(start, start + perPage)

      if (pageCommands.length === 0) {
        await sendChunks(chatId, `Tidak ada command di halaman ${page}.`)
        return
      }

      const totalPages = Math.max(1, Math.ceil(openCodeCommands.length / perPage))
      const text = pageCommands
        .map((command) => `/oc_${normalizeCommandName(command.name)} - ${command.description || command.name}`)
        .join('\n')
      await sendChunks(chatId, `OpenCode Commands (${page}/${totalPages})\n\n${text}\n\nGunakan /commands <halaman> untuk lanjut.`)
    })

    bot.onText(/^\/oc_(\w+)(?:\s+(.*))?$/, async (message, match) => {
      const chatId = message.chat.id.toString()
      if (!allowedChatIds.has(chatId)) return

      const commandName = match?.[1]?.replace(/_/g, '-') || ''
      const args = match?.[2]?.trim() || ''
      const currentSessionId = currentSessionIdByChat.get(chatId)

      try {
        switch (commandName) {
          case 'undo': {
            if (!currentSessionId) {
              await sendChunks(chatId, 'Belum ada sesi aktif.')
              return
            }
            await client.session.revert({ path: { id: currentSessionId }, body: { messageID: '' } })
            await sendChunks(chatId, 'Undo selesai.')
            return
          }
          case 'redo': {
            if (!currentSessionId) {
              await sendChunks(chatId, 'Belum ada sesi aktif.')
              return
            }
            await client.session.unrevert({ path: { id: currentSessionId } })
            await sendChunks(chatId, 'Redo selesai.')
            return
          }
          case 'share': {
            if (!currentSessionId) {
              await sendChunks(chatId, 'Belum ada sesi aktif.')
              return
            }
            const result = await client.session.share({ path: { id: currentSessionId } })
            const url = (result.data as any)?.share_url || (result.data as any)?.shareURL || 'Sesi dibagikan.'
            await sendChunks(chatId, `Sesi dibagikan: ${url}`)
            return
          }
          case 'unshare': {
            if (!currentSessionId) {
              await sendChunks(chatId, 'Belum ada sesi aktif.')
              return
            }
            await client.session.unshare({ path: { id: currentSessionId } })
            await sendChunks(chatId, 'Bagikan sesi dibatalkan.')
            return
          }
          case 'models': {
            const modelsResult = await client.config.providers()
            const providers = ((modelsResult.data as any)?.providers || []) as Array<any>
            const text = providers.flatMap((provider) => {
              const models = (provider.models || []).slice(0, 8)
              if (models.length === 0) return []
              return [`${provider.name || provider.id}:`, ...models.map((model: any) => `- ${model.name || model.id || 'unknown'}`), '']
            }).join('\n')
            await sendChunks(chatId, text || 'Tidak ada model yang tersedia.')
            return
          }
          default: {
            await sendChunks(chatId, `Menjalankan /${commandName}${args ? ` ${args}` : ''}...`)
            const response = await executeOpenCodeCommand(chatId, commandName, args)
            await sendChunks(chatId, response)
            return
          }
        }
      } catch (error: any) {
        await sendChunks(chatId, `Error: ${error?.message || String(error)}`)
      }
    })
  }

  const registerMessageHandler = () => {
    if (!bot) return

    const parsePermissionReply = (value: string): 'once' | 'always' | 'reject' | null => {
      if (value === 'yes' || value === 'y' || value === 'approve') return 'once'
      if (value === 'always' || value === 'a') return 'always'
      if (value === 'no' || value === 'n' || value === 'deny' || value === 'reject') return 'reject'
      return null
    }

    bot.on('message', async (message) => {
      const chatId = message.chat.id.toString()
      if (!message.text || !allowedChatIds.has(chatId)) {
        return
      }

      const text = message.text.trim()
      const lower = text.toLowerCase()

      if (text.startsWith('/')) {
        return
      }

      if (message.reply_to_message) {
        const pending = pendingPermissions.get(`${chatId}:${message.reply_to_message.message_id}`)
        if (pending) {
          const reply = parsePermissionReply(lower)
          if (reply) {
            pendingPermissions.delete(`${chatId}:${message.reply_to_message.message_id}`)
            await respondToPermission(chatId, pending.sessionId, pending.permissionId, reply)
            return
          }
        }
      }

      const pendingForChat = Array.from(pendingPermissions.entries()).filter(([, pending]) => pending.chatId === chatId)
      if (pendingForChat.length > 0) {
        const reply = parsePermissionReply(lower)
        if (reply) {
          const [messageKey, pending] = pendingForChat.at(-1)!
          pendingPermissions.delete(messageKey)
          await respondToPermission(chatId, pending.sessionId, pending.permissionId, reply)
          return
        }
      }

      if (text.startsWith('!')) {
        const command = text.slice(1).trim()
        if (!command) {
          return
        }

        const sessionId = await ensureSession(chatId)
        await sendChunks(chatId, `Menjalankan: ${command}`)
        try {
          const result = await client.session.shell({
            path: { id: sessionId },
            body: { agent: '', command },
          })
          await sendChunks(chatId, extractResponseText(result.data) || 'Command selesai tanpa output.')
        } catch (error: any) {
          await sendChunks(chatId, `Error: ${error?.message || String(error)}`)
        }
        return
      }

      if (isProcessingByChat.get(chatId)) {
        await sendChunks(chatId, 'OpenCode masih bekerja. Gunakan /abort bila ingin membatalkan.')
        return
      }

      try {
        isProcessingByChat.set(chatId, true)
        awaitingPromptResultByChat.set(chatId, true)
        const sessionId = await ensureSession(chatId)
        await sendChunks(chatId, 'Working on it...')
        await client.session.promptAsync({
          path: { id: sessionId },
          body: { parts: [{ type: 'text', text }] },
        })
      } catch (error: any) {
        isProcessingByChat.set(chatId, false)
        awaitingPromptResultByChat.set(chatId, false)
        await sendChunks(chatId, `Error: ${error?.message || String(error)}`)
      }
    })
  }

  const registerCallbackHandler = () => {
    if (!bot) return

    bot.on('callback_query', async (query) => {
      const chatId = query.message?.chat.id.toString()
      if (!query.data || !query.message || !chatId || !allowedChatIds.has(chatId)) {
        return
      }

      const data = query.data
      if (!data.startsWith('perm:')) {
        await bot.answerCallbackQuery(query.id)
        return
      }

      const [, action, permissionPrefix] = data.split(':')
      const entry = Array.from(pendingPermissions.entries()).find(([key, pending]) => key.startsWith(`${chatId}:`) && pending.permissionId.startsWith(permissionPrefix))

      if (!entry) {
        await bot.answerCallbackQuery(query.id, { text: 'Permission sudah tidak aktif.' })
        return
      }

      const [messageKey, pending] = entry
      pendingPermissions.delete(messageKey)

      const reply = action === 'always' ? 'always' : action === 'once' ? 'once' : 'reject'
      await respondToPermission(chatId, pending.sessionId, pending.permissionId, reply)
      await bot.answerCallbackQuery(query.id, { text: 'Permission diproses.' })
    })
  }

  const initBot = async () => {
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {
        polling: {
          autoStart: true,
          params: { timeout: 30 },
        },
      })

      bot.on('polling_error', (error) => {
        if (!error.message?.includes('409')) {
          log('Polling error', error.message)
        }
      })

      bot.on('error', (error) => {
        log('Bot error', error.message)
      })

      registerCommandHandlers()
      registerMessageHandler()
      registerCallbackHandler()

      void registerMenuCommands()
      void startEventStream()
    } catch (error) {
      log('Failed to initialize bot', error)
    }
  }

  setTimeout(() => {
    void initBot()
  }, 0)

  return {
    event: async ({ event }: { event: any }) => {
      const props = event.properties || event

      if (event.type === 'permission.asked') {
        const permissionId = props.permissionID || props.permission_id || props.permissionId || props.id
        const alreadyHandled = Array.from(pendingPermissions.values()).some((pending) => pending.permissionId === permissionId)
        if (!alreadyHandled) {
          await handlePermissionAsked(props)
        }
      }

      if (event.type === 'session.idle') {
        const sessionId = props.sessionID || props.session_id || props.sessionId
        if (sessionId) {
          await handleSessionIdle(sessionId)
        }
      }

      if (event.type === 'session.error') {
        const sessionId = props.sessionID || props.session_id || props.sessionId
        const chatId = sessionId ? findChatIdBySessionId(sessionId) : null
        if (chatId) {
          awaitingPromptResultByChat.set(chatId, false)
          isProcessingByChat.set(chatId, false)
          await sendChunks(chatId, `Session error: ${String(props.error || 'Unknown error')}`)
        }
      }
    },
  }
}

export default TelegramRemotePlugin
