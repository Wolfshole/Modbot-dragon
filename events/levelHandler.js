const { Events, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/levels.json');

function loadLevelConfig() {
  if (!fs.existsSync(dataPath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
}

function saveLevelConfig(config) {
  fs.writeFileSync(dataPath, JSON.stringify(config, null, 2));
}

function calculateLevel(xp) {
  return Math.floor(Math.sqrt(xp / 100));
}

module.exports = {
  name: 'levelHandler',

  setupLevelEvents(client) {
    client.on(Events.MessageCreate, async (message) => {
      // Ignoriere Bots und DMs
      if (message.author.bot || !message.guild) return;

      const config = loadLevelConfig();
      const guildConfig = config[message.guild.id];

      // System nicht aktiviert
      if (!guildConfig || !guildConfig.enabled) return;

      const userId = message.author.id;
      const now = Date.now();

      // Initialisiere User-Daten
      if (!guildConfig.users[userId]) {
        guildConfig.users[userId] = {
          xp: 0,
          level: 0,
          lastXP: 0
        };
      }

      const userData = guildConfig.users[userId];

      // Prüfe Cooldown
      const cooldown = guildConfig.settings.xpCooldown * 1000;
      if (now - userData.lastXP < cooldown) {
        return; // Noch im Cooldown
      }

      // Vergebe XP
      const xpGain = guildConfig.settings.xpPerMessage;
      const oldLevel = userData.level;
      
      userData.xp += xpGain;
      userData.lastXP = now;
      
      // Berechne neues Level
      const newLevel = calculateLevel(userData.xp);

      // Level Up?
      if (newLevel > oldLevel) {
        userData.level = newLevel;

        // Level-Up Nachricht senden
        if (guildConfig.settings.sendLevelUpInChannel) {
          const levelUpMsg = guildConfig.settings.levelUpMessage
            .replace('{user}', `${message.author}`)
            .replace('{level}', newLevel);

          const embed = new EmbedBuilder()
            .setTitle('🎉 Level Up!')
            .setDescription(levelUpMsg)
            .setColor('#00ff00')
            .setThumbnail(message.author.displayAvatarURL())
            .setTimestamp();

          await message.channel.send({ embeds: [embed] }).catch(() => {});
        }

        // Level-Rollen zuweisen
        const member = message.member;
        if (member && guildConfig.levelRoles[newLevel]) {
          const roleId = guildConfig.levelRoles[newLevel];
          const role = message.guild.roles.cache.get(roleId);
          
          if (role) {
            try {
              await member.roles.add(role);
              
              // Entferne vorherige Level-Rollen
              for (const [level, oldRoleId] of Object.entries(guildConfig.levelRoles)) {
                if (parseInt(level) < newLevel && oldRoleId !== roleId) {
                  const oldRole = message.guild.roles.cache.get(oldRoleId);
                  if (oldRole && member.roles.cache.has(oldRoleId)) {
                    await member.roles.remove(oldRole).catch(() => {});
                  }
                }
              }
            } catch (error) {
              console.error('Level Role Error:', error);
            }
          }
        }
      }

      // Speichere Konfiguration
      config[message.guild.id] = guildConfig;
      saveLevelConfig(config);
    });

    console.log('✅ Level Event Handler registriert');
  }
};
