const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/logging.json');

// Stelle sicher, dass data Ordner existiert
if (!fs.existsSync(path.dirname(dataPath))) {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
}

// Lade/Speichere Logging-Konfiguration
function loadLoggingConfig() {
  if (!fs.existsSync(dataPath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
}

function saveLoggingConfig(config) {
  fs.writeFileSync(dataPath, JSON.stringify(config, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-logging')
    .setDescription('Konfiguriert das Logging-System')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Log-Channel für alle Events')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  async execute(interaction) {
    const logChannel = interaction.options.getChannel('channel');

    // Speichere Konfiguration
    const config = loadLoggingConfig();
    config[interaction.guild.id] = {
      logChannelId: logChannel.id
    };
    saveLoggingConfig(config);

    const embed = new EmbedBuilder()
      .setTitle('✅ Logging aktiviert')
      .setDescription(
        `Alle User-Aktionen werden jetzt in ${logChannel} geloggt.\n\n` +
        `**Geloggte Events:**\n` +
        `📝 Nachrichten (erstellt, bearbeitet, gelöscht)\n` +
        `👤 User (join, leave, ban, kick, timeout)\n` +
        `📁 Channels (erstellt, gelöscht, bearbeitet)\n` +
        `🎭 Rollen (zugewiesen, entfernt)\n` +
        `🔊 Voice (join, leave, move)\n` +
        `📋 Server-Updates`
      )
      .setColor('#00ff00')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  // Hilfsfunktion zum Senden von Logs
  async sendLog(guild, embed) {
    try {
      const config = loadLoggingConfig();
      const guildConfig = config[guild.id];

      if (!guildConfig || !guildConfig.logChannelId) return;

      const logChannel = await guild.channels.fetch(guildConfig.logChannelId).catch(() => null);
      if (!logChannel) return;

      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Logging Error:', error);
    }
  }
};
