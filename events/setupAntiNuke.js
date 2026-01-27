const antiNukeHandler = require('./antiNukeHandler');
const channelDeleteHandler = require('./channelDelete');

// Set für Deduplication
const channelDeleteProcessed = new Set();

/**
 * Registriert alle Anti-Nuke Event Handler
 * @param {Client} client - Der Discord Client
 */
function setupAntiNukeEvents(client) {
  // Channel Delete mit Deduplication
  client.on('channelDelete', async channel => {
    const key = `${channel.guild?.id}-${channel.id}`;
    if (channelDeleteProcessed.has(key)) return;
    
    channelDeleteProcessed.add(key);
    setTimeout(() => channelDeleteProcessed.delete(key), 5000);
    
    // Anti-Nuke ZUERST (Ban/Timeout)
    await antiNukeHandler.handleChannelDelete(channel);
    
    // Dann DM senden
    await channelDeleteHandler.execute(channel);
  });

  // Role Delete
  client.on('roleDelete', role => {
    antiNukeHandler.handleRoleDelete(role);
  });

  // Ban Add
  client.on('guildBanAdd', ban => {
    antiNukeHandler.handleBanAdd(ban);
  });

  // Member Remove (Kick Detection)
  client.on('guildMemberRemove', async member => {
    const auditLogs = await member.guild.fetchAuditLogs({ 
      limit: 1, 
      type: 20 
    }).catch(() => null);
    
    if (auditLogs) {
      const kickLog = auditLogs.entries.first();
      if (kickLog && 
          kickLog.target.id === member.id && 
          Date.now() - kickLog.createdTimestamp < 5000) {
        antiNukeHandler.handleKick(member);
      }
    }
  });

  console.log('✅ Anti-Nuke Event Handler registriert');
}

module.exports = { setupAntiNukeEvents };
