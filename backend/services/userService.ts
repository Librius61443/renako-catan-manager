import pool from '../db/db.js';

export const UserService = {
    async upsertUser(discordId: string, username: string, avatarHash: string | null) {
        let avatarUrl: string;

        if (avatarHash) {
            avatarUrl = `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.png`;
        } else {
            const defaultAvatarIndex = (BigInt(discordId) >> 22n) % 6n;
            avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
        }

        const query = `
        INSERT INTO users (discord_id, username, avatar_url)
        VALUES ($1, $2, $3)
        ON CONFLICT (discord_id) 
        DO UPDATE SET 
            username = EXCLUDED.username, 
            avatar_url = EXCLUDED.avatar_url
        RETURNING *;
        `;
        
        const res = await pool.query(query, [discordId, username, avatarUrl]);
        return res.rows[0];
    },

    async getUserByApiKey(apiKey: string) {
        const query = `SELECT discord_id, username FROM users WHERE api_key = $1`;
        const res = await pool.query(query, [apiKey]);
        return res.rows[0];
    },

    /**
     * Updated: Now uses ps.discord_id to pull stats across ALL 
     * linked Catan identities, regardless of who uploaded.
     */
    async getStatsByDiscordId(discordId: string) {
        const query = `
        SELECT 
            u.username,
            COALESCE(COUNT(ps.id), 0)::int as total_games,
            COALESCE(SUM(CASE WHEN ps.is_winner THEN 1 ELSE 0 END), 0)::int as wins,
            COALESCE(ROUND(AVG(ps.vp)::numeric, 2), 0)::float as avg_vp,
            COALESCE(ROUND(((SUM(CASE WHEN ps.is_winner THEN 1 ELSE 0 END)::float / NULLIF(COUNT(ps.id), 0)) * 100)::numeric, 1), 0)::float as win_rate
        FROM users u
        LEFT JOIN player_stats ps ON u.discord_id = ps.discord_id 
        WHERE u.discord_id = $1 
        GROUP BY u.username;
        `;
        const res = await pool.query(query, [discordId]);
        return res.rows[0];
    },

    async getUserById(discordId: string) {
        const query = `SELECT discord_id, username, api_key FROM users WHERE discord_id = $1`;
        const res = await pool.query(query, [discordId]);
        return res.rows[0]; 
    },

    /**
     * Updated: Now pulls the last 5 games where THIS discord user 
     * was a participant (ps.discord_id), not just the uploader.
     */
    async getHistoryByDiscordId(discordId: string) {
        const query = `
            SELECT 
                g.id as game_id,
                g.game_timestamp,
                ps.vp,
                ps.is_winner,
                ps.player_name
            FROM player_stats ps
            JOIN games g ON ps.game_id = g.id
            WHERE ps.discord_id = $1 
            ORDER BY g.game_timestamp DESC
            LIMIT 5;
        `;
        const res = await pool.query(query, [discordId]);
        return res.rows;
    },

    async getStatsByCatanName(catanName: string) {
        const query = `
        SELECT 
            player_name as catan_name,
            is_bot,
            COUNT(id)::int as total_games,
            SUM(CASE WHEN is_winner THEN 1 ELSE 0 END)::int as wins,
            COALESCE(ROUND(AVG(vp)::numeric, 2), 0)::float as avg_vp,
            COALESCE(ROUND(((SUM(CASE WHEN is_winner THEN 1 ELSE 0 END)::float / NULLIF(COUNT(id), 0)) * 100)::numeric, 1), 0)::float as win_rate
        FROM player_stats
        WHERE player_name ILIKE $1 
        GROUP BY player_name, is_bot;
        `;
        const res = await pool.query(query, [catanName]);
        return res.rows[0];
    },

    /**
     * Option B: Links a specific Catan username to a Discord ID.
     */
    async linkCatanIdentity(discordId: string, catanName: string) {
        const query = `
          INSERT INTO catan_identities (discord_id, catan_name)
          VALUES ($1, $2)
          ON CONFLICT (catan_name) DO NOTHING;
        `;
        await pool.query(query, [discordId, catanName]);
    },

    /**
     * Find the Discord User associated with a specific Catan name.
     */
    async getDiscordIdByCatanName(catanName: string): Promise<string | null> {
        const query = 'SELECT discord_id FROM catan_identities WHERE catan_name = $1';
        const res = await pool.query(query, [catanName]);
        return res.rows[0]?.discord_id || null;
    }
};