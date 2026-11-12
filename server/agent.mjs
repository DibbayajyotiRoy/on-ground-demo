import { BedrockRuntimeClient, InvokeModelWithBidirectionalStreamCommand } from '@aws-sdk/client-bedrock-runtime'
import { NodeHttp2Handler } from '@smithy/node-http-handler'
import { randomUUID } from 'node:crypto'
import { WebSocketServer } from 'ws'

const PATH = '/api/agent/ws'
const MAX_SESSIONS = 2
const MAX_SESSION_MS = 5 * 60 * 1000
const START_TIMEOUT_MS = 5000
const enc = new TextEncoder()
const dec = new TextDecoder()

// Structure (voice rules, acknowledge-then-move, narrow reassurance, never invent
// facts) follows the pattern of a production calling agent; the wording is our own.
const SYSTEM_PROMPT = `You are Avani, a sales associate at the On-Ground demo store. You have just phoned a customer who enquired last week about an orthopaedic mattress, and they have picked up. You placed this call, so never thank them for calling.

LANGUAGE AND PACE
- Speak simple, everyday Hindi, the way people talk on the phone in India. English words for product terms are fine (mattress, EMI, delivery, WhatsApp).
- If the customer speaks English, switch to English and stay in it.
- Speak slowly and clearly, in short sentences, with a small pause between sentences. One or two sentences per turn, never more.
- This is spoken audio: no lists, no headings, no symbols.

HOW TO SOUND
- Like a warm, real person, not a script. Vary your acknowledgements; never repeat the same opener twice in a row.
- Every reply: first acknowledge something specific the customer just said (a word, a number, a concern), then move forward with one question or one next step. Always end on something they can answer; never stop on a bare "okay".
- Never re-ask something they already answered.
- If they interrupt you, stop, listen, acknowledge, then continue from where you were. Do not start over.
- Only if they check the line ("hello?", "are you there?", "can you hear me?") say a brief sorry and repeat your last point in fewer words. A plain "okay" or "haan" is not confusion: just continue.

THE CALL
1. Open: say your name and that you are calling from the On-Ground demo store about their mattress enquiry, and ask if this is a good time.
2. If it is not a good time, ask when to call back, confirm it, thank them and close.
3. Find out what matters most to them (back support, size, budget, delivery date) with one question at a time.
4. Share only the relevant fact, then offer the next step: book a store visit or a home delivery slot.
5. Confirm what was agreed in one sentence, say the confirmation will come on WhatsApp, thank them and close.

WHAT YOU KNOW (use only these facts)
- Product: orthopaedic mattress, queen size, 10-year warranty, 100-night trial.
- Their quote is still valid: 25,800 rupees, or no-cost EMI of 2,150 rupees a month for 12 months.
- Delivery within 4 days, free installation. The store is open 10 am to 9 pm every day.

RULES
- Never invent prices, dates, offers, stock or addresses. If you do not know, say you will have the store team confirm and message them.
- Never pressure. If they say no, accept it politely and close.
- If asked, say honestly that you are an AI assistant calling for the store.
- If they want to end the call, thank them and say goodbye at once.`

// Pushes events into the Bedrock request stream; the generator ends once closed and drained.
function makeQueue() {
  const items = []
  let wake = null
  let closed = false
  const notify = () => { wake?.(); wake = null }
  return {
    push(event) { if (!closed) { items.push(event); notify() } },
    close() { closed = true; notify() },
    async *[Symbol.asyncIterator]() {
      while (true) {
        if (items.length) {
          yield { chunk: { bytes: enc.encode(JSON.stringify(items.shift())) } }
        } else if (closed) {
          return
        } else {
          await new Promise(resolve => { wake = resolve })
        }
      }
    },
  }
}

export function attachAgent(httpServer) {
  const wss = new WebSocketServer({ noServer: true })
  const bedrock = new BedrockRuntimeClient({
    region: process.env.NOVA_REGION || 'ap-northeast-1',
    requestHandler: new NodeHttp2Handler({ requestTimeout: 300000, sessionTimeout: 300000, disableConcurrentStreams: false, maxConcurrentStreams: 20 }),
  })

  httpServer.on('upgrade', (req, socket, head) => {
    if (new URL(req.url, 'http://localhost').pathname !== PATH) return
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req))
  })

  wss.on('connection', ws => {
    if (wss.clients.size > MAX_SESSIONS) return ws.close(4429)
    runSession(ws, bedrock)
  })
}

function runSession(ws, bedrock) {
  const promptName = randomUUID()
  const audioId = randomUUID()
  const queue = makeQueue()
  const blocks = new Map() // contentId -> { role, stage } for open output blocks
  let started = false
  let greeted = false
  let closed = false
  const send = msg => ws.send(JSON.stringify(msg))
  const startTimer = setTimeout(() => ws.close(4400), START_TIMEOUT_MS)
  let maxTimer = null
  const event = e => queue.push({ event: e })

  const cleanup = () => {
    if (closed) return
    closed = true
    clearTimeout(startTimer)
    clearTimeout(maxTimer)
    if (started) {
      event({ contentEnd: { promptName, contentName: audioId } })
      event({ promptEnd: { promptName } })
      event({ sessionEnd: {} })
    }
    queue.close()
  }
  ws.on('close', cleanup)

  ws.on('message', (data, isBinary) => {
    if (isBinary) {
      if (!started) return ws.close(4400)
      return event({ audioInput: { promptName, contentName: audioId, content: Buffer.from(data).toString('base64') } })
    }
    let msg
    try { msg = JSON.parse(data.toString()) } catch { msg = {} }
    if (!started) {
      if (msg.type !== 'start') return ws.close(4400)
      const expected = process.env.DEMO_PASSCODE
      if (!expected || msg.passcode !== expected) return ws.close(4401)
      started = true
      clearTimeout(startTimer)
      maxTimer = setTimeout(() => ws.close(1000, 'time limit'), MAX_SESSION_MS)
      open()
      return
    }
    if (msg.type === 'greet' && !greeted) {
      greeted = true
      const id = randomUUID()
      event({ contentStart: { promptName, contentName: id, type: 'TEXT', interactive: true, role: 'USER', textInputConfiguration: { mediaType: 'text/plain' } } })
      event({ textInput: { promptName, contentName: id, content: 'hi' } })
      event({ contentEnd: { promptName, contentName: id } })
    }
  })

  function handleOutput(ev) {
    if (ev.chunk?.bytes) {
      const e = JSON.parse(dec.decode(ev.chunk.bytes)).event ?? {}
      if (e.contentStart) {
        let stage
        try { stage = JSON.parse(e.contentStart.additionalModelFields || '{}').generationStage } catch { /* no stage */ }
        blocks.set(e.contentStart.contentId, { role: e.contentStart.role, stage })
      } else if (e.textOutput) {
        const t = e.textOutput
        if (isInterruption(t.content)) send({ type: 'interrupted' })
        else if (blocks.get(t.contentId)?.stage === 'FINAL') {
          const role = t.role ?? blocks.get(t.contentId)?.role
          send({ type: 'transcript', role: role === 'USER' ? 'user' : 'assistant', text: t.content })
        }
      } else if (e.audioOutput) {
        ws.send(Buffer.from(e.audioOutput.content, 'base64'), { binary: true })
      } else if (e.contentEnd) {
        if (e.contentEnd.stopReason === 'INTERRUPTED') send({ type: 'interrupted' })
        blocks.delete(e.contentEnd.contentId)
      }
      return
    }
    const key = Object.keys(ev).find(k => /Exception$/.test(k) && ev[k])
    if (key) throw Object.assign(new Error(ev[key].message ?? ''), { name: ev[key].name ?? key })
  }

  async function open() {
    event({ sessionStart: { inferenceConfiguration: { maxTokens: 1024, topP: 0.9, temperature: 0.7 }, turnDetectionConfiguration: { endpointingSensitivity: 'MEDIUM' } } })
    event({
      promptStart: {
        promptName,
        textOutputConfiguration: { mediaType: 'text/plain' },
        audioOutputConfiguration: {
          mediaType: 'audio/lpcm', sampleRateHertz: 24000, sampleSizeBits: 16, channelCount: 1,
          voiceId: process.env.NOVA_VOICE_ID || 'kiara', encoding: 'base64', audioType: 'SPEECH',
        },
      },
    })
    const sysId = randomUUID()
    event({ contentStart: { promptName, contentName: sysId, type: 'TEXT', interactive: false, role: 'SYSTEM', textInputConfiguration: { mediaType: 'text/plain' } } })
    event({ textInput: { promptName, contentName: sysId, content: SYSTEM_PROMPT } })
    event({ contentEnd: { promptName, contentName: sysId } })
    event({
      contentStart: {
        promptName, contentName: audioId, type: 'AUDIO', interactive: true, role: 'USER',
        audioInputConfiguration: { mediaType: 'audio/lpcm', sampleRateHertz: 16000, sampleSizeBits: 16, channelCount: 1, audioType: 'SPEECH', encoding: 'base64' },
      },
    })
    try {
      const res = await bedrock.send(new InvokeModelWithBidirectionalStreamCommand({
        modelId: process.env.NOVA_MODEL_ID || 'amazon.nova-2-sonic-v1:0',
        body: queue,
      }))
      send({ type: 'ready' })
      for await (const ev of res.body) handleOutput(ev)
      ws.close(1000)
    } catch (err) {
      if (closed) return
      send({ type: 'error', message: `${err.name}: ${err.message}` })
      ws.close(1011)
    }
  }
}

function isInterruption(content) {
  try { return JSON.parse(content).interrupted === true } catch { return false }
}
