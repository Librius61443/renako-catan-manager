import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { cors } from 'hono/cors'

const app = new Hono()

// --- Middleware ---
app.use('*', logger())
app.use('/api/*', cors({
  origin: "*",
  allowMethods: ["POST", "GET", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"]
}))

// --- Updated Schema (Matches the Zipped Extension Payload) ---
const gameSchema = z.object({
  lobbyId: z.string(),
  timestamp: z.string(),
  overview: z.array(z.object({
    name: z.string(),
    vp: z.number(),
    isBot: z.boolean(),
    isWinner: z.boolean()
  })),
  dice_stats: z.record(z.string(), z.number()),
  res_card_stats: z.record(z.string(), z.number()).optional(),
  dev_card_stats: z.record(z.string(), z.number()).optional(),
  // These are now arrays of objects (one per player)
  activity_stats: z.array(z.record(z.string(), z.any())).optional(),
  resource_stats: z.array(z.record(z.string(), z.any())).optional()
});

// --- Routes ---
app.get('/', (c) => c.text('Catan Tracker API is Online!'))

app.post('/api/ingest', zValidator('json', gameSchema), async (c) => {
  const data = c.req.valid('json')
  
  console.log("\n --- New Ingest Received ---")
  console.log(`Lobby:  ${data.lobbyId}`)
  console.log(`Winner: ${data.overview.find(p => p.isWinner)?.name || 'Unknown'}`)
  console.log(`Time:   ${data.timestamp}`)
  
  if (data.resource_stats) {
    console.log("Resource Stats Sample (Player 0):", data.resource_stats[0])
  }
  
  return c.json({ 
    success: true,
    message: 'Data Received', 
    lobby: data.lobbyId 
  })
})

const port = 3000
console.log(`Server is starting...`)

serve({
  fetch: app.fetch,
  port: port,
  hostname: 'localhost' 
}, (info) => {
  console.log(`Server is running on http://${info.address}:${info.port}`)
})