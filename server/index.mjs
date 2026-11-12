import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import app from './app.mjs'
import { attachAgent } from './agent.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.join(__dirname, '..', 'dist')

app.use(express.static(distPath))
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api')) return next()
  res.sendFile(path.join(distPath, 'index.html'))
})

const PORT = process.env.PORT || 3001
const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
attachAgent(server)
