const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/levels.json');

// Stelle sicher, dass data Ordner existiert
if (!fs.existsSync(path.dirname(dataPath))) {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
}

// Lade/Speichere Level-Konfiguration
function loadLevelConfig() {
  if (!fs.existsSync(dataPath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
}

function saveLevelConfig(config) {
  fs.writeFileSync(dataPath, JSON.stringify(config, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-levels')
    .setDescription('Zeigt Level-System Status (Konfiguration über Dashboard)')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  async execute(interaction) {
    const config = loadLevelConfig();
    const guildId = interaction.guild.id;

    // Initialisiere Konfiguration falls nicht vorhanden
    if (!config[guildId]) {
      config[guildId] = {
        enabled: true,
        settings: {
          xpPerMessage: 15,
          xpCooldown: 60, // Sekunden
          levelUpMessage: '🎉 {user}, du bist jetzt Level **{level}**!',
          sendLevelUpInChannel: true
        },
        levelRoles: {}, // { level: roleId }
        users: {} // { userId: { xp, level, lastXP } }
      };
      saveConfig(config);
    }

    const guildConfig = config[guildId];

    const embed = new EmbedBuilder()
      .setTitle('📊 Level-System Status')
      .setDescription(
        '**Konfiguration über das Dashboard vornehmen!**\n\n' +
        `**Status:** ${guildConfig.enabled ? '✅ Aktiviert' : '❌ Deaktiviert'}`
      )
      .addFields(
        { name: '⚙️ Einstellungen', value: 
          `**XP pro Nachricht:** ${guildConfig.settings.xpPerMessage}\n` +
          `**XP Cooldown:** ${guildConfig.settings.xpCooldown}s\n` +
          `**Level-Up Nachricht:** ${guildConfig.settings.sendLevelUpInChannel ? 'Im Channel' : 'Aus'}`,
          inline: false
        },
        { name: '🎭 Level-Rollen', value: 
          Object.keys(guildConfig.levelRoles).length > 0 
            ? Object.entries(guildConfig.levelRoles)
                .map(([level, roleId]) => {
                  const role = interaction.guild.roles.cache.get(roleId);
                  return `Level ${level}: ${role ? role.name : 'Gelöscht'}`;
                })
                .join('\n')
            : 'Keine Rollen konfiguriert',
          inline: false
        },
        { name: '📈 Statistik', value:
          `**Registrierte User:** ${Object.keys(guildConfig.users).length}`,
          inline: false
        }
      )
      .setColor('#0099ff')
      .setTimestamp()
      .setFooter({ text: 'Konfiguriere alle Einstellungen über das Dashboard' });

    await interaction.reply({ embeds: [embed] });
  }
};

function saveConfig(config) {
  saveLevelConfig(config);
}
