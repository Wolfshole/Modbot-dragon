const { ChannelType } = require('discord.js');

module.exports = {
  /**
   * Sendet ein Embed in den Log-Channel
   * @param {import('discord.js').Guild} guild
   * @param {import('discord.js').EmbedBuilder} embed
   */
  async sendLog(guild, embed) {
    const logChannelId = process.env.LOG_CHANNEL_ID;
    if (!logChannelId) return;
    const channel = guild.channels.cache.get(logChannelId);
    if (channel && (channel.type === ChannelType.GuildText || channel.isTextBased())) {
      await channel.send({ embeds: [embed] });
    }
  }
};
