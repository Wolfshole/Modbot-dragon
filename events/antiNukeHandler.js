const fs = require('fs');
const path = require('path');
const { Events, AuditLogEvent } = require('discord.js');

const DATA_FILE = path.join(__dirname, '..', 'data', 'antinuke.json');

function readStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (e) {
    return {};
  }
}

// Track actions per user per guild
const actionTracker = new Map(); // guildId -> userId -> { channels: [], roles: [], bans: [], kicks: [] }

function trackAction(guildId, userId, actionType) {
  if (!actionTracker.has(guildId)) {
    actionTracker.set(guildId, new Map());
  }
  const guildTracker = actionTracker.get(guildId);
  
  if (!guildTracker.has(userId)) {
    guildTracker.set(userId, { channels: [], roles: [], bans: [], kicks: [] });
  }
  
  const userActions = guildTracker.get(userId);
  const now = Date.now();
  userActions[actionType].push(now);
  
  return userActions;
}

function cleanOldActions(actions, timeWindowMs) {
  const cutoff = Date.now() - timeWindowMs;
  return actions.filter(timestamp => timestamp > cutoff);
}

async function checkAndPunish(guild, userId, actionType, config) {
  const userActions = trackAction(guild.id, userId, actionType);
  const timeWindowMs = config.timeWindowSec * 1000;
  
  // Clean old actions
  userActions[actionType] = cleanOldActions(userActions[actionType], timeWindowMs);
  
  const count = userActions[actionType].length;
  const threshold = config.thresholds[actionType];
  
  if (count >= threshold) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;
    
    // Don't punish bot owner or guild owner
    if (member.id === guild.ownerId) return;
    if (member.user.bot && member.id === guild.members.me?.id) return;
    
    // Log to channel
    if (config.logChannelId) {
      const logChannel = guild.channels.cache.get(config.logChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [{
            color: 0xff0000,
            title: '🚨 Anti-Nuke Alert',
            description: `**${member.user.tag}** hat ${count} ${actionType} Aktionen in ${config.timeWindowSec}s durchgeführt!`,
            fields: [
              { name: 'User', value: `<@${userId}>`, inline: true },
              { name: 'Aktion', value: actionType, inline: true },
              { name: 'Anzahl', value: `${count}/${threshold}`, inline: true },
            ],
            timestamp: new Date(),
          }]
        }).catch(console.error);
      }
    }
    
    // Apply punishment
    const botMember = guild.members.me;
    const botHighestRole = botMember?.roles.highest;
    const memberHighestRole = member.roles.highest;
    
    // Entferne alle Rollen (außer @everyone) - auch bei gleich hohen Rollen versuchen
    const rolesToRemove = member.roles.cache.filter(role => role.id !== guild.id);
    if (rolesToRemove.size > 0) {
      try {
        // Versuche alle Rollen zu entfernen
        await member.roles.remove(rolesToRemove, `Anti-Nuke: ${count} ${actionType} in ${config.timeWindowSec}s`);
        console.log(`✅ Removed ${rolesToRemove.size} roles from ${member.user.tag}`);
      } catch (roleError) {
        // Wenn das fehlschlägt, versuche einzeln nur die Rollen zu entfernen, die niedriger sind
        console.warn(`⚠️ Could not remove all roles from ${member.user.tag}, trying individual roles...`);
        let removedCount = 0;
        for (const role of rolesToRemove.values()) {
          if (botHighestRole && role.position < botHighestRole.position) {
            try {
              await member.roles.remove(role, `Anti-Nuke: ${count} ${actionType} in ${config.timeWindowSec}s`);
              removedCount++;
            } catch (e) {
              console.error(`❌ Could not remove role ${role.name} from ${member.user.tag}`);
            }
          }
        }
        if (removedCount > 0) {
          console.log(`✅ Removed ${removedCount}/${rolesToRemove.size} roles from ${member.user.tag}`);
        }
      }
    }
    
    // Ban/Timeout versuchen - auch bei gleich hohen Rollen
    try {
      if (config.punishment === 'ban') {
        await member.ban({ reason: `Anti-Nuke: ${count} ${actionType} in ${config.timeWindowSec}s` });
        console.log(`✅ Banned ${member.user.tag} for anti-nuke violation`);
      } else if (config.punishment === 'timeout') {
        await member.timeout(10 * 60 * 1000, `Anti-Nuke: ${count} ${actionType} in ${config.timeWindowSec}s`);
        console.log(`✅ Timed out ${member.user.tag} for anti-nuke violation`);
      }
    } catch (error) {
      console.error(`❌ Failed to punish user ${member.user.tag}:`, error.message);
      if (memberHighestRole.position >= botHighestRole?.position) {
        console.error(`⚠️ User ${member.user.tag} hat gleich hohe oder höhere Rollen als der Bot! Bot-Rolle muss höher sein.`);
      }
    }
    
    // Clear tracking after punishment
    userActions[actionType] = [];
  }
}

async function getExecutor(guild, auditLogType) {
  try {
    const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: auditLogType });
    const entry = auditLogs.entries.first();
    if (entry && Date.now() - entry.createdTimestamp < 5000) {
      return entry.executor;
    }
  } catch (error) {
    console.error('Error fetching audit logs:', error.message);
  }
  return null;
}

module.exports = {
  name: 'antiNukeHandler',
  
  async handleChannelDelete(channel) {
    if (!channel.guild) return;
    
    const store = readStore();
    const config = store[channel.guild.id];
    if (!config || !config.enabled) return;
    
    const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelDelete);
    if (executor && !executor.bot) {
      await checkAndPunish(channel.guild, executor.id, 'channels', config);
    }
  },
  
  async handleRoleDelete(role) {
    if (!role.guild) return;
    
    const store = readStore();
    const config = store[role.guild.id];
    if (!config || !config.enabled) return;
    
    const executor = await getExecutor(role.guild, AuditLogEvent.RoleDelete);
    if (executor && !executor.bot) {
      await checkAndPunish(role.guild, executor.id, 'roles', config);
    }
  },
  
  async handleBanAdd(ban) {
    if (!ban.guild) return;
    
    const store = readStore();
    const config = store[ban.guild.id];
    if (!config || !config.enabled) return;
    
    const executor = await getExecutor(ban.guild, AuditLogEvent.MemberBanAdd);
    if (executor && !executor.bot) {
      await checkAndPunish(ban.guild, executor.id, 'bans', config);
    }
  },
  
  async handleKick(member) {
    if (!member.guild) return;
    
    const store = readStore();
    const config = store[member.guild.id];
    if (!config || !config.enabled) return;
    
    const executor = await getExecutor(member.guild, AuditLogEvent.MemberKick);
    if (executor && !executor.bot) {
      await checkAndPunish(member.guild, executor.id, 'kicks', config);
    }
  },
};
