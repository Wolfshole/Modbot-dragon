const { AuditLogEvent, EmbedBuilder } = require('discord.js');
const setupLogging = require('../commands/setupLogging');

module.exports = {
  name: 'guildBanRemove',
  async execute(ban) {
    let executor = null;
    try {
      const fetchedLogs = await ban.guild.fetchAuditLogs({
        limit: 5,
        type: AuditLogEvent.MemberBanRemove,
      });
      const now = Date.now();
      const entry = fetchedLogs.entries.find(e =>
        e.target.id === ban.user.id &&
        now - e.createdTimestamp < 5000
      );
      if (entry) executor = entry.executor;
    } catch {}

    await setupLogging.sendLog(ban.guild, {
      title: 'Nutzer entbannt',
      description: `${ban.user.tag} (${ban.user.id}) wurde entbannt.${executor ? `\nDurchgeführt von: ${executor.tag}` : ''}`,
      level: 'info',
    });
  }
};
