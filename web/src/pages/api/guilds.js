// Simple API endpoint to get Discord guilds where the bot is installed
// This is a temporary solution until Discord OAuth is implemented

import { Client, GatewayIntentBits } from 'discord.js';

// Load environment variables
const TOKEN = import.meta.env.TOKEN || process.env.TOKEN;

export async function GET() {
    try {
        // Create a temporary Discord client to fetch guilds
        const client = new Client({
            intents: [GatewayIntentBits.Guilds]
        });

        await client.login(TOKEN);

        // Wait for client to be ready
        await new Promise((resolve) => {
            client.once('ready', resolve);
        });

        // Get all guilds where the bot is installed
        const guilds = client.guilds.cache.map(guild => ({
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            approximate_member_count: guild.memberCount
        }));

        // Cleanup
        await client.destroy();

        return new Response(JSON.stringify(guilds), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Error fetching guilds:', error);
        
        return new Response(JSON.stringify({ error: 'Failed to fetch guilds' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}
