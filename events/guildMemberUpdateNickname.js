const { AuditLogEvent, EmbedBuilder } = require('discord.js');
const setupLogging = require('../commands/setupLogging');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember) {
    if (oldMember.nickname === newMember.nickname) return;
    let executor = null;
    try {
      const fetchedLogs = await newMember.guild.fetchAuditLogs({
        limit: 5,
        type: AuditLogEvent.MemberUpdate,
      });
      const now = Date.now();
      const entry = fetchedLogs.entries.find(e =>
        e.target.id === newMember.id &&
        now - e.createdTimestamp < 5000
      );
      if (entry) executor = entry.executor;
    } catch {}

    await setupLogging.sendLog(newMember.guild, {
      title: 'Nickname geändert',
      description: `${newMember.user.tag} (${newMember.id}) hat den Nickname geändert.`,
      fields: [
        { name: 'Vorher', value: oldMember.nickname || 'Keiner', inline: true },
        { name: 'Nachher', value: newMember.nickname || 'Keiner', inline: true },
        ...(executor ? [{ name: 'Durchgeführt von', value: `${executor.tag} (${executor.id})` }] : [])
      ],
      level: 'info',
    });
  }
};
