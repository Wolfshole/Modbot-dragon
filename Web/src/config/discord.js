// Discord Bot Configuration
// Lädt die Konfiguration aus der .env Datei des Bots

export const DISCORD_CONFIG = {
    // Discord Bot Client ID / Application ID aus .env
    CLIENT_ID: import.meta.env.CLIENT_ID || '1442980448597708892',
    
    // Client Secret für OAuth (optional, nur für Backend)
    CLIENT_SECRET: import.meta.env.CLIENT_SECRET || '6Tg08220pW0Dztpuwewa2mmOg6e9YYdo',
    
    // Guild ID (optional, für Tests)
    GUILD_ID: import.meta.env.GUILD_ID || '1316837584592441447',
    
    // Permissions für den Bot (8 = Administrator)
    PERMISSIONS: '8',
    
    // OAuth2 Scopes
    SCOPES: 'bot applications.commands',
    
    // Redirect URI nach OAuth Login
    REDIRECT_URI: import.meta.env.PUBLIC_REDIRECT_URI || 'http://localhost:4321/auth/callback'
};

// Generiere den Bot Invite Link
export function getBotInviteUrl() {
    return `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CONFIG.CLIENT_ID}&permissions=${DISCORD_CONFIG.PERMISSIONS}&scope=${DISCORD_CONFIG.SCOPES}`;
}

// Generiere den OAuth Login Link (für später)
export function getOAuthUrl() {
    return `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CONFIG.CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_CONFIG.REDIRECT_URI)}&response_type=code&scope=identify guilds`;
}
