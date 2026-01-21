import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { cors } from 'hono/cors'
import { Client } from 'pg';

const app = new Hono()
const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/catan_db'
});

client.connect()
  .then(() => {console.log("Connected to DB")})
  .catch((err)=>{console.log("Failed to connect to DB", err)});

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
  const data = c.req.valid('json');

  try {
    // 1. Start Transaction
    await client.query('BEGIN');

    // 2. Insert Game (Use UPSERT logic so duplicate scrapes don't crash it)
    const gameRes = await client.query(
      `INSERT INTO games (lobby_id, game_timestamp, dice_stats, res_card_stats, dev_card_stats)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (lobby_id) DO UPDATE SET dice_stats = EXCLUDED.dice_stats
       RETURNING id`,
      [data.lobbyId, data.timestamp, data.dice_stats, data.res_card_stats, data.dev_card_stats]
    );

    const gameId = gameRes.rows[0].id;

    // 3. Insert Player Stats
    for (const player of data.overview) {
      // Find the specific zipped stats for THIS player name
      const playerActivity = data.activity_stats?.find(s => s.name === player.name);
      const playerResources = data.resource_stats?.find(s => s.name === player.name);

      await client.query(
        `INSERT INTO player_stats (game_id, player_name, vp, is_bot, is_winner, activity_stats, resource_stats)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [gameId, player.name, player.vp, player.isBot, player.isWinner, playerActivity, playerResources]
      );
    }

    // 4. Commit
    await client.query('COMMIT');
    console.log(`✅ Game ${data.lobbyId} saved to DB.`);
    
    return c.json({ success: true, gameId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ Database Insert Error:", err);
    return c.json({ success: false, error: "Database failure" }, 500);
  }
});

const port = 3000
console.log(`Server is starting...`)
console.log(`Listening on port ${port}`)
serve({
  fetch: app.fetch,
  port: port,
  hostname: '0.0.0.0' 
}, (info) => {
  console.log(`Server is running on http://${info.address}:${info.port}`)
})