const { SlashCommandBuilder } = require('discord.js');
const setupLogging = require('./setupLogging');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logtest')
    .setDescription('Testet das Logging-System'),
  async execute(interaction) {
    await setupLogging.sendLog(interaction.guild, {
      title: 'Test-Log',
      description: 'Dies ist ein Test des Logging-Systems.',
      category: 'system',
      level: 'info',
      details: { user: interaction.user.tag, time: new Date().toISOString() }
    });
    await interaction.reply({ content: 'Test-Log wurde gesendet!', ephemeral: true });
  }
};
