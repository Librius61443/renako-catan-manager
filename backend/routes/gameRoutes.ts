// backend/src/routes/gameRoutes.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { gameSchema } from '../schemas/gameSchema.js';
import { GameService } from '../services/gameService.js';
import { UserService } from '../services/userService.js';
import { SessionService } from '../services/sessionService.js'; // New Import

const gameRoutes = new Hono();
gameRoutes.post('/ingest', zValidator('json', gameSchema), async (c) => {
  const apiKey = c.req.header('x-api-key');
  
  if (!apiKey) return c.json({ success: false, error: 'Missing API Key' }, 401);

  const user = await UserService.getUserByApiKey(apiKey);
  if (!user) return c.json({ success: false, error: 'Invalid API Key' }, 403);

  // DEBUG 1: Is Zod returning data?
  const data = c.req.valid('json');
  console.log(`[DEBUG ROUTE] Data validated. LobbyID: ${data?.lobbyId}`);

  try {
    const session = await SessionService.consumeSession(user.discord_id);
    const finalGuildId = session?.guild_id || user.last_guild_id || 'GLOBAL';

    // DEBUG 2: Check the arguments right before the function call
    console.log(`[DEBUG ROUTE] Calling Service with: DiscordID: ${user.discord_id}, GuildID: ${finalGuildId}`);

    const gameId = await GameService.createGameWithPlayers(user.discord_id, finalGuildId, data);
    
    return c.json({ success: true, gameId }, 201);
  } catch (error: any) {
    // DEBUG 3: Catch if the error is coming from the call itself
    console.error('[Ingest Error]:', error.message);
    return c.json({ success: false, error: error.message }, 500);
  }
});
export default gameRoutes;