const { Events, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/automod.json');

// Tracking für Spam-Erkennung
const messageTracker = new Map(); // userId -> [timestamps]
const duplicateTracker = new Map(); // userId -> lastMessage

function loadAutoModConfig() {
  if (!fs.existsSync(dataPath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
}

function saveAutoModConfig(config) {
  fs.writeFileSync(dataPath, JSON.stringify(config, null, 2));
}

// Schimpfwörter aus Config laden
function getBadWords(guildId) {
  const config = loadAutoModConfig();
  const guildConfig = config[guildId];
  
  if (!guildConfig || !guildConfig.badwords) {
    // Standard-Liste falls keine konfiguriert
    return ['schimpfwort1', 'schimpfwort2'];
  }
  
  return guildConfig.badwords;
}

module.exports = {
  name: 'autoModHandler',

  setupAutoModEvents(client) {
    client.on(Events.MessageCreate, async (message) => {
      // Ignoriere Bots und DMs
      if (message.author.bot || !message.guild) return;

      const config = loadAutoModConfig();
      const guildConfig = config[message.guild.id];

      // Kein AutoMod konfiguriert
      if (!guildConfig) return;

      const member = message.member;
      if (!member) return;

      // Admins und Mods sind immun
      if (member.permissions.has('Administrator') || member.permissions.has('ManageMessages')) {
        return;
      }

      let violated = false;
      let reason = '';

      // 🚫 Anti-Spam Check
      if (guildConfig.enabled.spam) {
        const userId = message.author.id;
        const now = Date.now();
        
        if (!messageTracker.has(userId)) {
          messageTracker.set(userId, []);
        }

        const userMessages = messageTracker.get(userId);
        userMessages.push(now);

        // Entferne alte Nachrichten (älter als 5 Sekunden)
        const recentMessages = userMessages.filter(timestamp => now - timestamp < 5000);
        messageTracker.set(userId, recentMessages);

        if (recentMessages.length > guildConfig.settings.spamLimit) {
          violated = true;
          reason = `🚫 Spam (${recentMessages.length} Nachrichten in 5s)`;
        }
      }

      // 🔠 Anti-Caps Check
      if (!violated && guildConfig.enabled.caps && message.content.length > 10) {
        const upperCase = message.content.replace(/[^A-ZÄÖÜẞ]/g, '').length;
        const total = message.content.replace(/[^A-Za-zÄÖÜäöüß]/g, '').length;
        
        if (total > 0) {
          const capsPercent = (upperCase / total) * 100;
          if (capsPercent > guildConfig.settings.capsPercent) {
            violated = true;
            reason = `🔠 Zu viele Großbuchstaben (${Math.round(capsPercent)}%)`;
          }
        }
      }

      // 🤬 Anti-Schimpfwörter Check
      if (!violated && guildConfig.enabled.badwords) {
        const content = message.content.toLowerCase();
        const badWordsList = getBadWords(message.guild.id);
        
        for (const word of badWordsList) {
          if (content.includes(word.toLowerCase())) {
            violated = true;
            reason = `🤬 Unangemessene Sprache`;
            break;
          }
        }
      }

      // 🔗 Anti-Links Check
      if (!violated && guildConfig.enabled.links) {
        const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|net|org|de|io|gg|xyz))/gi;
        if (urlRegex.test(message.content)) {
          violated = true;
          reason = `🔗 Links nicht erlaubt`;
        }
      }

      // 👥 Anti-Mass-Mentions Check
      if (!violated && guildConfig.enabled.mentions) {
        const mentions = message.mentions.users.size + message.mentions.roles.size;
        if (mentions > guildConfig.settings.mentionLimit) {
          violated = true;
          reason = `👥 Zu viele Erwähnungen (${mentions})`;
        }
      }

      // 🔁 Anti-Duplicate Check
      if (!violated && guildConfig.enabled.duplicate) {
        const userId = message.author.id;
        const lastMessage = duplicateTracker.get(userId);
        
        if (lastMessage && lastMessage.content === message.content && 
            Date.now() - lastMessage.timestamp < 10000) {
          violated = true;
          reason = `🔁 Doppelte Nachricht`;
        }
        
        duplicateTracker.set(userId, {
          content: message.content,
          timestamp: Date.now()
        });
      }

      // Wenn Verstoß erkannt wurde
      if (violated) {
        try {
          // Lösche Nachricht
          await message.delete().catch(() => {});

          // Erhöhe Warnung
          if (!guildConfig.warnings) guildConfig.warnings = {};
          if (!guildConfig.warnings[message.author.id]) {
            guildConfig.warnings[message.author.id] = { count: 0, lastWarn: 0 };
          }

          const userWarnings = guildConfig.warnings[message.author.id];
          userWarnings.count++;
          userWarnings.lastWarn = Date.now();

          // Strafe anwenden
          let action = '';
          if (userWarnings.count >= guildConfig.settings.warnLimit) {
            // Timeout für 10 Minuten
            await member.timeout(10 * 60 * 1000, `AutoMod: ${reason}`).catch(() => {});
            action = '⏱️ 10 Minuten Timeout';
            userWarnings.count = 0; // Reset nach Timeout
          } else {
            action = `⚠️ Warnung ${userWarnings.count}/${guildConfig.settings.warnLimit}`;
          }

          saveAutoModConfig(config);

          // Sende Warnung
          const warnEmbed = new EmbedBuilder()
            .setTitle('🛡️ AutoMod')
            .setDescription(`${message.author}, deine Nachricht wurde gelöscht!`)
            .addFields(
              { name: '📋 Grund', value: reason, inline: true },
              { name: '⚖️ Aktion', value: action, inline: true }
            )
            .setColor('#ff0000')
            .setTimestamp();

          const warnMessage = await message.channel.send({ embeds: [warnEmbed] });

          // Lösche Warnung nach 5 Sekunden
          setTimeout(() => {
            warnMessage.delete().catch(() => {});
          }, 5000);

        } catch (error) {
          console.error('AutoMod Error:', error);
        }
      }
    });

    // Reset Warnungen nach 1 Stunde
    setInterval(() => {
      const config = loadAutoModConfig();
      const now = Date.now();
      
      for (const guildId in config) {
        if (config[guildId].warnings) {
          for (const userId in config[guildId].warnings) {
            const userWarn = config[guildId].warnings[userId];
            if (now - userWarn.lastWarn > 60 * 60 * 1000) {
              delete config[guildId].warnings[userId];
            }
          }
        }
      }
      
      saveAutoModConfig(config);
    }, 15 * 60 * 1000); // Alle 15 Minuten prüfen

    console.log('✅ AutoMod Event Handler registriert');
  }
};
