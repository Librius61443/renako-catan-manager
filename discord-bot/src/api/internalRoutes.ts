import { Hono } from 'hono';
import { Client } from 'discord.js';
import { createMatchSummaryEmbed } from '../utils/embedGenerator.js';
import type { MatchTitles } from '../core/types.js';

export const setupInternalRoutes = (client: Client) => {
  const api = new Hono();

    api.post('/announce', async (c) => {
    const { summary, guildId, channelId } = await c.req.json();
    console.log(`[DEBUG] Received announce request for Guild: ${guildId}, Channel: ${channelId}`);

    try {
        const guild = await client.guilds.fetch(guildId);
        
        const channel = (channelId ? await guild.channels.fetch(channelId) : null)
        || guild.channels.cache.find(ch => ch.name === 'catan-stats' && ch.isTextBased())
        || guild.systemChannel;

        if (!channel || !channel.isTextBased()) {
        console.error(`[DEBUG] Failed to find a valid text channel.`);
        return c.json({ error: 'Channel not found' }, 404);
        }

        const permissions = channel.permissionsFor(client.user!);
        console.log(`[DEBUG] Checking permissions for #${channel.name}:`);
        console.log(` - ViewChannel: ${permissions?.has('ViewChannel')}`);
        console.log(` - SendMessages: ${permissions?.has('SendMessages')}`);
        console.log(` - EmbedLinks: ${permissions?.has('EmbedLinks')}`);

        if (!permissions?.has('SendMessages') || !permissions?.has('EmbedLinks')) {
        console.error(`[DEBUG] Missing critical permissions in #${channel.name}`);
        }

        const embed = createMatchSummaryEmbed(summary);
        await channel.send({ embeds: [embed] });
        
        console.log(`[DEBUG] Successfully sent embed to #${channel.name}`);
        return c.json({ success: true }, 201);

    } catch (err: any) {
        console.error(`[Bot API Error]: ${err.message}`);
        // Check if it's a DiscordAPIError (code 50013 is specifically Missing Permissions)
        if (err.code === 50013) {
        console.error(`[TIP] Renako needs 'Embed Links' and 'Send Messages' in that specific channel!`);
        }
        return c.json({ error: err.message }, 500);
    }
    });

  return api;
};