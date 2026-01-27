const { AuditLogEvent, EmbedBuilder } = require('discord.js');
const setupLogging = require('../commands/setupLogging');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member) {
    let executor = null;
    let actionType = null;
    try {
      const fetchedLogs = await member.guild.fetchAuditLogs({
        limit: 5,
        type: AuditLogEvent.MemberKick,
      });
      const now = Date.now();
      const entry = fetchedLogs.entries.find(e =>
        e.target.id === member.id &&
        now - e.createdTimestamp < 5000
      );
      if (entry) {
        executor = entry.executor;
        actionType = 'kick';
      }
    } catch {}

    let title = 'Nutzer hat den Server verlassen';
    let description = `${member.user.tag} (${member.id}) hat den Server verlassen.`;
    if (actionType === 'kick') {
      title = 'Nutzer gekickt';
      description = `${member.user.tag} (${member.id}) wurde gekickt.`;
    }

    await setupLogging.sendLog(member.guild, {
      title,
      description: `${description}${executor ? `\nDurchgeführt von: ${executor.tag}` : ''}`,
      level: actionType === 'kick' ? 'warn' : 'info',
    });
  }
};
