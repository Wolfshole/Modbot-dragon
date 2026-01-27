const { AuditLogEvent, EmbedBuilder } = require('discord.js');
const setupLogging = require('../commands/setupLogging');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember) {
    // Timeout geändert?
    if (oldMember.communicationDisabledUntilTimestamp === newMember.communicationDisabledUntilTimestamp) return;
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

    let action = newMember.communicationDisabledUntilTimestamp ? 'Timeout gesetzt' : 'Timeout entfernt';
    let who = executor ? `Durchgeführt von: ${executor.tag}` : '';
    await setupLogging.sendLog(newMember.guild, {
      title: action,
      description: `${newMember.user.tag} ${newMember.communicationDisabledUntilTimestamp ? 'wurde stummgeschaltet.' : 'kann wieder schreiben.'}${who ? `\n${who}` : ''}`,
      level: 'warn',
    });
  }
};
