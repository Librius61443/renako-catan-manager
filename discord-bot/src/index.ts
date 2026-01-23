// bot/src/index.ts
import { Client, GatewayIntentBits, Events } from 'discord.js';
import * as dotenv from 'dotenv';
import { CommandHandler } from './core/CommandHandler.js';
import { ApiClient } from './core/ApiClient.js';

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const api = new ApiClient(process.env.API_BASE_URL || "http://api:3000");
const handler = new CommandHandler();

(async () => {
    console.log("🌸 Renako is trying to wake up...");
    
    // 1. Load commands into memory
    const commands = await handler.load();
    await handler.register(Array.from(commands.values()));
    client.once(Events.ClientReady, async (c) => {
        console.log(`✅ Ready! Logged in as ${c.user.tag}`);
        
        // OPTIONAL: You can call a 'handler.register()' here if you 
        // want the bot to automatically sync slash commands with Discord.
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const command = commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction, { api });
        } catch (error) {
            console.error("Interaction Error:", error);
            // Use followUp if the command deferred, or reply if it didn't
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: 'Hawaa! Something went wrong...', ephemeral: true });
            } else {
                await interaction.reply({ content: 'Hawaa! Something went wrong...', ephemeral: true });
            }
        }
    });

    await client.login(process.env.DISCORD_TOKEN);
})();