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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Zeigt die Top 10 User'),

  async execute(interaction) {
    const config = loadLevelConfig();
    const guildConfig = config[interaction.guild.id];

    if (!guildConfig || !guildConfig.enabled) {
      return interaction.reply({
        content: '❌ Das Level-System ist nicht aktiviert!',
        flags: 64
      });
    }

    // Sortiere User nach XP
    const sortedUsers = Object.entries(guildConfig.users)
      .sort((a, b) => b[1].xp - a[1].xp)
      .slice(0, 10);

    if (sortedUsers.length === 0) {
      return interaction.reply({
        content: '❌ Noch keine User im Leaderboard!',
        flags: 64
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('🏆 Leaderboard')
      .setDescription('Top 10 User nach XP')
      .setColor('#ffd700')
      .setTimestamp();

    let description = '';
    for (let i = 0; i < sortedUsers.length; i++) {
      const [userId, userData] = sortedUsers[i];
      const user = await interaction.client.users.fetch(userId).catch(() => null);
      const username = user ? user.username : 'Unbekannt';
      
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      
      description += `${medal} **${username}** - Level ${userData.level} (${userData.xp} XP)\n`;
    }

    embed.setDescription(description);

    await interaction.reply({ embeds: [embed] });
  }
};
