const { AuditLogEvent, EmbedBuilder } = require('discord.js');
const setupLogging = require('../commands/setupLogging');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember) {
    // Vergleiche Rollen
    const oldRoles = new Set(oldMember.roles.cache.keys());
    const newRoles = new Set(newMember.roles.cache.keys());

    // Rollen hinzugefügt
    const addedRoles = [...newRoles].filter(x => !oldRoles.has(x));
    // Rollen entfernt
    const removedRoles = [...oldRoles].filter(x => !newRoles.has(x));

    if (addedRoles.length === 0 && removedRoles.length === 0) return;

    // Hole Audit Log Eintrag
    let executor = null;
    try {
      const fetchedLogs = await newMember.guild.fetchAuditLogs({
        limit: 5,
        type: AuditLogEvent.MemberRoleUpdate,
      });
      const now = Date.now();
      const entry = fetchedLogs.entries.find(e =>
        e.target.id === newMember.id &&
        now - e.createdTimestamp < 5000 &&
        e.executor.id !== newMember.id // Nur loggen, wenn ein anderer User die Änderung gemacht hat
      );
      if (entry) {
        executor = entry.executor;
      }
    } catch (e) {
      // Audit Log Fehler ignorieren
    }

    // Nur loggen, wenn ein Mod/Admin die Änderung gemacht hat
    if (!executor) return;

    // Log senden
    await setupLogging.sendLog(newMember.guild, {
      title: 'Rollenänderung',
      description: `Bei ${newMember.user.tag} wurden Rollen geändert.`,
      level: 'info',
    });
  }
};
