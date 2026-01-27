
require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");
const logger = require("./logger");


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers, // <--- wichtig!
    GatewayIntentBits.MessageContent, // falls benötigt
    GatewayIntentBits.GuildModeration
  ],
});


logger.info("Bot wird gestartet...");


client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

logger.debug(`Lade ${commandFiles.length} Commands aus ${commandsPath}`);
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
    );
  }
}

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js"));
for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Anti-Nuke Event Handlers Setup
const { setupAntiNukeEvents } = require("./events/setupAntiNuke");
setupAntiNukeEvents(client);

// Logging Event Handlers Setup
const { setupLoggingEvents } = require("./events/loggingHandler");
setupLoggingEvents(client);

// AutoMod Event Handlers Setup
const { setupAutoModEvents } = require("./events/autoModHandler");
setupAutoModEvents(client);

// Level System Event Handlers Setup
const { setupLevelEvents } = require("./events/levelHandler");
setupLevelEvents(client);

client.login(process.env.TOKEN);
