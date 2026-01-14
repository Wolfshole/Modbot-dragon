const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Kompatibilität für discord.js v13/v14
function getRestAndRoutes() {
  try {
    const { REST, Routes } = require('discord.js');
    return { REST, Routes };
  } catch (_) {
    const { REST } = require('@discordjs/rest');
    const { Routes } = require('discord-api-types/v10');
    return { REST, Routes };
  }
}

const { REST, Routes } = getRestAndRoutes();

// Umgebungsvariablen laden
const TOKEN = process.env.TOKEN || process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID || process.env.APPLICATION_ID;
const GUILD_ID = process.env.GUILD_ID || process.env.DISCORD_GUILD_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error('❌ Fehler: TOKEN und CLIENT_ID müssen gesetzt sein!');
  console.error('Setze folgende Umgebungsvariablen:');
  console.error('  - TOKEN (oder DISCORD_TOKEN)');
  console.error('  - CLIENT_ID (oder DISCORD_CLIENT_ID)');
  console.error('  - GUILD_ID (optional, für Guild-spezifische Befehle)');
  process.exit(1);
}

// Befehle aus dem commands-Ordner laden
const commandsDir = path.join(__dirname, 'commands');
const commands = [];

if (!fs.existsSync(commandsDir)) {
  console.warn('⚠️  Warnung: commands-Ordner existiert nicht!');
} else {
  const commandFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));
  
  console.log(`📁 Gefundene Command-Dateien: ${commandFiles.length}`);
  
  for (const file of commandFiles) {
    const filePath = path.join(commandsDir, file);
    try {
      delete require.cache[require.resolve(filePath)]; // Cache leeren
      const command = require(filePath);
      
      if (command?.data?.toJSON) {
        commands.push(command.data.toJSON());
        console.log(`  ✓ ${file} geladen`);
      } else {
        console.warn(`  ⚠️  ${file} hat keine gültige data-Property`);
      }
    } catch (error) {
      console.error(`  ❌ Fehler beim Laden von ${file}:`, error.message);
    }
  }
}

console.log(`\n📤 Registriere ${commands.length} Befehl(e)...`);
if (commands.length > 0) {
  console.log(`   Befehle: ${commands.map(c => c.name).join(', ')}\n`);
}

// REST API Client erstellen
const rest = new REST({ version: '10' }).setToken(TOKEN);

// Befehle deployen
(async () => {
  try {
    if (GUILD_ID) {
      // Guild-spezifische Befehle (sofort verfügbar)
      console.log(`🎯 Ziel: Guild-Befehle (Guild ID: ${GUILD_ID})`);
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
      );
      console.log('✅ Guild-Befehle erfolgreich aktualisiert!');
    } else {
      // Globale Befehle (kann bis zu 1 Stunde dauern)
      console.log('🌍 Ziel: Globale Befehle (alle Server)');
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands }
      );
      console.log('✅ Globale Befehle erfolgreich aktualisiert!');
      console.log('ℹ️  Hinweis: Es kann bis zu 1 Stunde dauern, bis sie überall verfügbar sind.');
    }
  } catch (error) {
    console.error('❌ Fehler beim Deployen der Befehle:', error);
    if (error.code === 50001) {
      console.error('   → Bot fehlt die OAuth2-Berechtigung "applications.commands"');
    } else if (error.code === 10004) {
      console.error('   → Ungültige Guild ID oder Bot ist nicht Mitglied dieser Guild');
    }
    process.exit(1);
  }
})();
