/** Records two streams into one stereo file: `left` on the left channel, `right` on the right. */
export function startStereoRecorder(left: MediaStream, right: MediaStream): { stop(): Promise<Blob> } {
  const ctx = new AudioContext()
  const merger = ctx.createChannelMerger(2)
  ctx.createMediaStreamSource(left).connect(merger, 0, 0)
  ctx.createMediaStreamSource(right).connect(merger, 0, 1)
  const dest = ctx.createMediaStreamDestination()
  merger.connect(dest)

  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : undefined
  const recorder = new MediaRecorder(dest.stream, mimeType ? { mimeType } : undefined)
  const chunks: Blob[] = []
  recorder.ondataavailable = e => chunks.push(e.data)
  recorder.start()

  return {
    stop() {
      return new Promise<Blob>(resolve => {
        recorder.onstop = () => {
          void ctx.close()
          resolve(new Blob(chunks, { type: recorder.mimeType }))
        }
        recorder.stop()
      })
    },
  }
}
