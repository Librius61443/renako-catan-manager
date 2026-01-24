import { Hono } from 'hono';
import { UserService } from '../services/userService.js';
import { SessionService } from '../services/sessionService.js';
const discordRoutes = new Hono();

discordRoutes.get('/stats/:discordId', async (c) => {
    const discordId = c.req.param('discordId');
    const stats = await UserService.getStatsByDiscordId(discordId);
    
    if (!stats) return c.json({ error: 'not_found' }, 404);
    return c.json(stats);
});

discordRoutes.get('/history/:discordId', async (c) => {
    const discordId = c.req.param('discordId');
    const history = await UserService.getHistoryByDiscordId(discordId);
    return c.json(history);
});
discordRoutes.get('/user/:discordId', async (c) => {
    const discordId = c.req.param('discordId');
    const user = await UserService.getUserById(discordId);
    
    if (!user) {
        return c.json({ error: 'not_linked' }, 404);
    }
    return c.json(user);
});

discordRoutes.get('/search', async (c) => {
    const name = c.req.query('name');
    
    if (!name) return c.json({ error: 'name_required' }, 400);

    const stats = await UserService.getStatsByCatanName(name);
    
    if (!stats) return c.json({ error: 'not_found' }, 404);
    
    return c.json(stats);
});
discordRoutes.post('/sessions', async (c) => {
    const { uploaderId, guildId } = await c.req.json();

    if (!uploaderId || !guildId) {
        return c.json({ error: 'missing_params' }, 400);
    }

    try {
        // Verify the user exists (Foreign Key requirement)
        const user = await UserService.getUserById(uploaderId);
        if (!user) {
            return c.json({ error: 'user_not_found' }, 403);
        }

        const session = await SessionService.createSession(uploaderId, guildId);
        return c.json(session, 201);
    } catch (error) {
        console.error('Session Error:', error);
        return c.json({ error: 'server_error' }, 500);
    }
});

export default discordRoutes;