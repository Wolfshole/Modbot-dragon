// register-global.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error('Bitte TOKEN und CLIENT_ID in .env setzen.');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command && command.data) commands.push(command.data.toJSON());
  }
} else {
  console.warn('Kein commands/ Ordner gefunden. Lege zumindest eine Datei wie commands/ping.js an.');
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`Registriere ${commands.length} globale Commands bei Discord...`);
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands },
    );
    console.log('Erfolgreich globale Commands registriert.');
  } catch (error) {
    console.error('Fehler beim Registrieren:', error);
  }
})();