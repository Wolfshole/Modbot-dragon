const { Events, ActivityType } = require("discord.js");

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
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
  },
};
