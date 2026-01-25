import pool from '../db/db.js';

export const SessionService = {
    /**
     * Creates a new pending session. Enforces one active session per user.
     */
    async createSession(uploaderId: string, guildId: string,channelId:string) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Remove stale sessions for this user
            await client.query(
                'DELETE FROM pending_sessions WHERE uploader_id = $1',
                [uploaderId]
            );

            // 2. Insert new session
            const query = `
                INSERT INTO pending_sessions (uploader_id, guild_id, channel_id) 
                VALUES ($1, $2, $3) 
                RETURNING id, created_at;
            `;
            const res = await client.query(query, [uploaderId, guildId,channelId]);

            await client.query('COMMIT');
            return res.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Finds the guild_id for an upload and removes the session.
     */
    async consumeSession(uploaderId: string) {
        const query = `
            DELETE FROM pending_sessions 
            WHERE uploader_id = $1 
            RETURNING guild_id,channel_id;
        `;
        const res = await pool.query(query, [uploaderId]);
        return res.rows[0] || null;
    }
};