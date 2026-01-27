const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/automod.json');

// Stelle sicher, dass data Ordner existiert
if (!fs.existsSync(path.dirname(dataPath))) {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
}

// Lade/Speichere AutoMod-Konfiguration
function loadAutoModConfig() {
  if (!fs.existsSync(dataPath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
}

function saveAutoModConfig(config) {
  fs.writeFileSync(dataPath, JSON.stringify(config, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-automod')
    .setDescription('Zeigt AutoMod-Status (Konfiguration über Dashboard)')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  async execute(interaction) {
    const config = loadAutoModConfig();
    const guildId = interaction.guild.id;

    // Initialisiere Konfiguration falls nicht vorhanden
    if (!config[guildId]) {
      config[guildId] = {
        enabled: {
          spam: false,
          caps: false,
          badwords: false,
          links: false,
          mentions: false,
          duplicate: false
        },
        settings: {
          spamLimit: 5,
          capsPercent: 70,
          mentionLimit: 5,
          warnLimit: 3
        },
        badwords: [],
        warnings: {}
      };
      saveAutoModConfig(config);
    }

    const guildConfig = config[guildId];
    const statusEmoji = (enabled) => enabled ? '✅' : '❌';

    const embed = new EmbedBuilder()
      .setTitle('🛡️ AutoMod Status')
      .setDescription(
        '**Konfiguration über das Dashboard vornehmen!**\n\n' +
        'Aktueller Status aller AutoMod-Features:'
      )
      .addFields(
        { name: '🚫 Anti-Spam', value: statusEmoji(guildConfig.enabled.spam), inline: true },
        { name: '🔠 Anti-Caps', value: statusEmoji(guildConfig.enabled.caps), inline: true },
        { name: '🤬 Anti-Schimpfwörter', value: statusEmoji(guildConfig.enabled.badwords), inline: true },
        { name: '🔗 Anti-Links', value: statusEmoji(guildConfig.enabled.links), inline: true },
        { name: '👥 Anti-Mass-Mentions', value: statusEmoji(guildConfig.enabled.mentions), inline: true },
        { name: '🔁 Anti-Duplicate', value: statusEmoji(guildConfig.enabled.duplicate), inline: true },
        { name: '\u200b', value: '\u200b', inline: false },
        { name: '⚙️ Einstellungen', value: 
          `**Spam:** ${guildConfig.settings.spamLimit} Nachrichten/5s\n` +
          `**Caps:** ${guildConfig.settings.capsPercent}%\n` +
          `**Mentions:** ${guildConfig.settings.mentionLimit}\n` +
          `**Warnungen:** ${guildConfig.settings.warnLimit}\n` +
          `**Schimpfwörter:** ${guildConfig.badwords?.length || 0} gespeichert`,
          inline: false
        }
      )
      .setColor('#0099ff')
      .setTimestamp()
      .setFooter({ text: 'Konfiguriere alle Einstellungen über das Dashboard' });

    await interaction.reply({ embeds: [embed] });
  }
};
