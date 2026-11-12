import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime'

// Base persona from server/agent.mjs, adapted for a text model whose reply is read
// aloud by a Twilio text-to-speech voice.
const SYSTEM_PROMPT = `You are Avani, a sales associate at the On-Ground demo store. You have just phoned a customer who enquired last week about an orthopaedic mattress, and they have picked up. You placed this call, so never thank them for calling.

OUTPUT FORMAT (your reply is read aloud by a voice)
- Reply in plain Hindi written in Devanagari script only. English product words may stay in Latin script (mattress, EMI, delivery, WhatsApp).
- If the customer speaks English, reply in English.
- No markdown, no lists, no headings, no emojis, no symbols, no stage directions like (pause).
- One or two short sentences per reply, never more.
- You are a woman: use feminine Hindi verb forms for yourself (बोल रही हूँ, समझ गई).

SPECIAL MESSAGES FROM THE SYSTEM
- "(call connected)": the customer has just picked up. Give your opening line.
- "(silence)": nothing was heard. Briefly ask if they can hear you.

HOW TO SOUND
- Like a warm, real person, not a script. Vary your acknowledgements; never repeat the same opener twice in a row.
- Every reply: first acknowledge something specific the customer just said (a word, a number, a concern), then move forward with one question or one next step. Always end on something they can answer.
- Never re-ask something they already answered.
- Only if they check the line ("hello?", "can you hear me?") say a brief sorry and repeat your last point in fewer words. A plain "okay" or "haan" is not confusion: just continue.

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
- When the conversation is finished (the customer says goodbye, declines, or the next step is confirmed), say your goodbye and end the reply with the exact marker [END].`

const MAX_TURNS = 8 // Twilio trial allows at most 10 webhook hops per call
const TTL_MS = 10 * 60 * 1000
const END = '[END]'
const APOLOGY = 'माफ़ कीजिए, अभी तकनीकी दिक्कत है। हम आपको दोबारा कॉल करेंगे।'

// Locally the AWS SDK's default chain finds the developer's AWS profile. On Vercel
// the AWS_* names are reserved, so a Bedrock-only key is passed under its own names.
const { BEDROCK_ACCESS_KEY_ID: accessKeyId, BEDROCK_SECRET_ACCESS_KEY: secretAccessKey } = process.env
const bedrock = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION || 'us-east-1',
  maxAttempts: 3,
  ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
})

// ponytail: in-memory per process; use Redis if this ever runs on more than one instance
const calls = new Map()

export function getCall(callSid) {
  return calls.get(callSid)
}

export function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function say(text) {
  const voice = escapeXml(process.env.TWILIO_SAY_VOICE || 'Polly.Aditi')
  const rate = process.env.TWILIO_SAY_RATE || '90%'
  const body = rate === 'off'
    ? escapeXml(text)
    : `<prosody rate="${escapeXml(rate)}">${escapeXml(text)}</prosody>`
  return `<Say language="hi-IN" voice="${voice}">${body}</Say>`
}

// Returns the TwiML for the next turn of a phone call.
export async function nextTwiml(callSid, speech) {
  let state = calls.get(callSid)
  if (!state) {
    state = { messages: [], transcript: [], turns: 0, error: undefined }
    calls.set(callSid, state)
    setTimeout(() => calls.delete(callSid), TTL_MS).unref()
  }

  const heard = typeof speech === 'string' ? speech.trim() : ''
  if (heard) state.transcript.push({ role: 'user', text: heard })
  const userText = state.turns === 0 ? '(call connected)' : heard || '(silence)'
  state.messages.push({ role: 'user', content: [{ text: userText }] })

  let reply
  try {
    const response = await bedrock.send(new ConverseCommand({
      modelId: process.env.BEDROCK_MODEL_ID || 'us.amazon.nova-2-lite-v1:0',
      system: [{ text: SYSTEM_PROMPT }],
      messages: state.messages,
      inferenceConfig: { maxTokens: 160, temperature: 0.6 },
    }))
    reply = response.output.message.content[0].text
  } catch (err) {
    state.error = `${err.name}: ${err.message}`
    return `<Response>${say(APOLOGY)}<Hangup/></Response>`
  }

  const ended = reply.includes(END)
  const text = reply.replaceAll(END, '').trim() || 'धन्यवाद, नमस्ते।'
  state.messages.push({ role: 'assistant', content: [{ text }] })
  state.transcript.push({ role: 'assistant', text })
  state.turns += 1

  if (ended || state.turns >= MAX_TURNS) {
    return `<Response>${say(text)}<Hangup/></Response>`
  }
  return `<Response><Gather input="speech" language="hi-IN" speechTimeout="auto" timeout="6" actionOnEmptyResult="true" action="/api/twilio/agent" method="POST">${say(text)}</Gather></Response>`
}
