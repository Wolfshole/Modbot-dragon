const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/levels.json');

function loadLevelConfig() {
  if (!fs.existsSync(dataPath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
}

function calculateLevel(xp) {
  // Level = sqrt(XP / 100)
  return Math.floor(Math.sqrt(xp / 100));
}

function calculateXPForLevel(level) {
  return level * level * 100;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Zeigt deinen oder einen anderen Rank')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User dessen Rank du sehen möchtest')
        .setRequired(false)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const config = loadLevelConfig();
    const guildConfig = config[interaction.guild.id];

    if (!guildConfig || !guildConfig.enabled) {
      return interaction.reply({
        content: '❌ Das Level-System ist nicht aktiviert!',
        flags: 64
      });
    }

    const userData = guildConfig.users[targetUser.id];

    if (!userData) {
      return interaction.reply({
        content: `❌ ${targetUser.username} hat noch keine XP gesammelt!`,
        flags: 64
      });
    }

    // Berechne Ranking
    const allUsers = Object.entries(guildConfig.users)
      .sort((a, b) => b[1].xp - a[1].xp);
    const rank = allUsers.findIndex(([id]) => id === targetUser.id) + 1;

    const currentLevel = userData.level;
    const nextLevel = currentLevel + 1;
    const xpForCurrentLevel = calculateXPForLevel(currentLevel);
    const xpForNextLevel = calculateXPForLevel(nextLevel);
    const xpProgress = userData.xp - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;
    const progressPercent = Math.floor((xpProgress / xpNeeded) * 100);

    // Progress Bar
    const barLength = 20;
    const filledLength = Math.floor((progressPercent / 100) * barLength);
    const progressBar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

    const embed = new EmbedBuilder()
      .setTitle(`📊 Rank von ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .setColor('#0099ff')
      .addFields(
        { name: '🏆 Rang', value: `#${rank}`, inline: true },
        { name: '⭐ Level', value: `${currentLevel}`, inline: true },
        { name: '💎 Gesamt XP', value: `${userData.xp}`, inline: true },
        { name: '📈 Fortschritt zu Level ' + nextLevel, value: 
          `${progressBar} ${progressPercent}%\n` +
          `${xpProgress} / ${xpNeeded} XP`,
          inline: false
        }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
