const { Events, ActivityType } = require("discord.js");
const logger = require("../logger");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`✅ Bot ist online! Eingeloggt als ${client.user.tag}`);

    // Custom Status setzen
    client.user.setPresence({
      activities: [
        {
          name: "Bin in Wartung",
          type: ActivityType.Custom,
        },
      ],
      status: "dnd",
    });

    logger.info(`Bot eingeloggt als ${client.user.tag}`);
    const logChannelId = process.env.LOG_CHANNEL_ID;
    if (logChannelId) {
      const channel = await client.channels.fetch(logChannelId).catch(() => null);
      if (channel && channel.isTextBased()) {
        channel.send(":white_check_mark: Bot wurde erfolgreich gestartet!");
        logger.info("Startnachricht in Log-Channel gesendet.");
      } else {
        logger.warn("Log-Channel nicht gefunden oder kein Textkanal.");
      }
    } else {
      logger.warn("LOG_CHANNEL_ID nicht gesetzt.");
    }
  },
};
