export interface TranscriptLine { role: 'user' | 'assistant'; text: string }
export interface VoiceAgent {
  /** Model speech as a MediaStream; exists immediately so it can be used as a call's input before start(). */
  output: MediaStream
  /** Open the session and begin feeding `input` (the other party's audio) to the model. */
  start(input: MediaStream): Promise<void>
  /** Ask the model to greet the caller now (sent once per session). */
  greet(): void
  stop(): void
}

const CAPTURE_WORKLET = `
class Capture extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0]
    if (ch) this.port.postMessage(ch.slice())
    return true
  }
}
registerProcessor('capture', Capture)
`
const FRAME = 512 // 32 ms at 16 kHz
// Tuning knob: the model has no speed setting, so slow its speech on playback.
// ponytail: plain rate change lowers pitch slightly; use a time-stretcher if 0.85 or lower is needed.
const SPEECH_RATE = 0.92

export function createVoiceAgent(opts: {
  passcode: string
  onTranscript: (line: TranscriptLine) => void
  onError?: (message: string) => void
  /** Also play the model's speech on the local speakers. Default true. */
  monitor?: boolean
}): VoiceAgent {
  const playCtx = new AudioContext()
  const dest = playCtx.createMediaStreamDestination()
  const out = playCtx.createGain()
  out.connect(dest)
  if (opts.monitor !== false) out.connect(playCtx.destination)

  const active = new Set<AudioBufferSourceNode>()
  let nextTime = 0
  let ws: WebSocket | null = null
  let capCtx: AudioContext | null = null
  let srcNode: MediaStreamAudioSourceNode | null = null
  let worklet: AudioWorkletNode | null = null
  let inputEl: HTMLAudioElement | null = null
  let stopped = false

  function play(bytes: ArrayBuffer) {
    const dv = new DataView(bytes)
    const n = bytes.byteLength >> 1
    const buf = playCtx.createBuffer(1, n, 24000)
    const ch = buf.getChannelData(0)
    for (let i = 0; i < n; i++) ch[i] = dv.getInt16(i * 2, true) / 32768
    const src = playCtx.createBufferSource()
    src.buffer = buf
    src.playbackRate.value = SPEECH_RATE
    src.connect(out)
    nextTime = Math.max(nextTime, playCtx.currentTime + 0.02)
    src.start(nextTime)
    nextTime += buf.duration / SPEECH_RATE
    active.add(src)
    src.onended = () => active.delete(src)
  }

  function stopPlayback() {
    for (const s of active) { s.onended = null; try { s.stop() } catch { /* already ended */ } }
    active.clear()
    nextTime = 0
  }

  async function startCapture(input: MediaStream, sock: WebSocket) {
    capCtx = new AudioContext({ sampleRate: 16000 })
    await capCtx.resume()
    await capCtx.audioWorklet.addModule(URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: 'application/javascript' })))
    srcNode = capCtx.createMediaStreamSource(input)
    worklet = new AudioWorkletNode(capCtx, 'capture')
    const mute = capCtx.createGain()
    mute.gain.value = 0
    srcNode.connect(worklet)
    worklet.connect(mute)
    mute.connect(capCtx.destination)

    let buf = new Float32Array(0)
    worklet.port.onmessage = (e: MessageEvent<Float32Array>) => {
      const next = new Float32Array(buf.length + e.data.length)
      next.set(buf)
      next.set(e.data, buf.length)
      buf = next
      while (buf.length >= FRAME) {
        const dv = new DataView(new ArrayBuffer(FRAME * 2))
        for (let i = 0; i < FRAME; i++) {
          const x = Math.max(-1, Math.min(1, buf[i]))
          dv.setInt16(i * 2, Math.round(x * 32767), true)
        }
        sock.send(dv.buffer)
        buf = buf.subarray(FRAME)
      }
    }

    // Chrome can deliver silence from a remote WebRTC stream unless a media element is attached.
    inputEl = new Audio()
    inputEl.srcObject = input
    inputEl.muted = true
    void inputEl.play().catch(() => { /* autoplay policy; capture still works */ })
  }

  return {
    output: dest.stream,

    async start(input: MediaStream) {
      await playCtx.resume()
      await new Promise<void>((resolve, reject) => {
        const proto = location.protocol === 'https:' ? 'wss' : 'ws'
        const sock = new WebSocket(`${proto}://${location.host}/api/agent/ws`)
        sock.binaryType = 'arraybuffer'
        ws = sock
        let ready = false
        let errorMessage: string | null = null
        sock.onopen = () => sock.send(JSON.stringify({ type: 'start', passcode: opts.passcode }))
        sock.onmessage = async (e: MessageEvent) => {
          if (typeof e.data !== 'string') { play(e.data); return }
          const m = JSON.parse(e.data)
          if (m.type === 'ready') {
            ready = true
            await startCapture(input, sock)
            resolve()
          } else if (m.type === 'transcript') {
            opts.onTranscript({ role: m.role, text: m.text })
          } else if (m.type === 'interrupted') {
            stopPlayback()
          } else if (m.type === 'error') {
            errorMessage = m.message
            opts.onError?.(m.message)
            reject(new Error(m.message))
          }
        }
        sock.onclose = (e: CloseEvent) => {
          if (stopped) return
          if (!ready) {
            const msg = errorMessage ?? `Agent connection closed (${e.code})`
            if (!errorMessage) reject(new Error(msg))
            return
          }
          if (!errorMessage) opts.onError?.(`Agent connection closed (${e.code})`)
        }
      })
    },

    greet() {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'greet' }))
    },

    stop() {
      if (stopped) return
      stopped = true
      ws?.close()
      ws = null
      worklet?.disconnect()
      srcNode?.disconnect()
      void capCtx?.close()
      if (inputEl) { inputEl.pause(); inputEl.srcObject = null; inputEl = null }
      stopPlayback()
      void playCtx.close()
    },
  }
}
