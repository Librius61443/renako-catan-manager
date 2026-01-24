// backend/src/services/gameService.ts
import pool from '../db/db.js';

export const GameService = {
  async createGameWithPlayers(userId: string, guildId: string, data: any) {
    const client = await pool.connect();
    console.log("--- SERVICE HANDSHAKE ---");
    console.log("Arg 1 (userId):", userId);
    console.log("Arg 2 (guildId):", guildId);
    console.log("Arg 3 (data type):", typeof data);
    
    if (data) {
        console.log("Arg 3 (lobbyId):", data.lobbyId);
    } else {
        console.error("Arg 3 (data) IS TOTALLY UNDEFINED");
    }
    console.log("-------------------------");
    try {
      await client.query('BEGIN');
      
      // 1. Upsert the game record including guild_id
      const gameRes = await client.query(
        `INSERT INTO games (user_id, lobby_id, guild_id, game_timestamp, dice_stats, res_card_stats, dev_card_stats)
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         ON CONFLICT (lobby_id, game_timestamp) 
         DO UPDATE SET 
            guild_id = EXCLUDED.guild_id,
            dice_stats = EXCLUDED.dice_stats,
            res_card_stats = EXCLUDED.res_card_stats,
            dev_card_stats = EXCLUDED.dev_card_stats
         RETURNING id`,
        [
          userId, 
          data.lobbyId, 
          guildId, // New parameter from our session logic
          data.timestamp, 
          JSON.stringify(data.dice_stats), 
          JSON.stringify(data.res_card_stats), 
          JSON.stringify(data.dev_card_stats || {})
        ]
      );

      const gameId = gameRes.rows[0].id;

      await client.query('DELETE FROM player_stats WHERE game_id = $1', [gameId]);

      console.log(`[Ingest] Processing stats for Game ID: ${gameId} in Guild: ${guildId}`);

      // 3. Loop through overview and link activity/resource JSON
      for (const player of data.overview) {
        const pActivity = data.activity_stats?.find((s: any) => s.name === player.name) || {};
        const pResources = data.resource_stats?.find((s: any) => s.name === player.name) || {};

        await client.query(
          `INSERT INTO player_stats (game_id, uploader_id, player_name, vp, is_bot, is_winner, is_me, activity_stats, resource_stats)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            gameId, 
            userId,
            player.name, 
            player.vp, 
            player.isBot, 
            player.isWinner, 
            player.isMe, // Boolean flag from extension session_me logic
            JSON.stringify(pActivity), 
            JSON.stringify(pResources)
          ]
        );
      }

      await client.query('COMMIT');
      return gameId;
    } catch (e) {
      await client.query('ROLLBACK');
      console.error("[Database Error] Player stats failed to save:", e); 
      throw e;
    } finally {
      client.release();
    }
  }
};