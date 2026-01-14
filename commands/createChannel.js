const { SlashCommandBuilder, ChannelType, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('createchannel')
    .setDescription('Erstellt einen neuen Channel')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Name des Channels')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('typ')
        .setDescription('Typ des Channels')
        .setRequired(true)
        .addChoices(
          { name: '💬 Text Channel', value: 'text' },
          { name: '🔊 Voice Channel', value: 'voice' },
          { name: '📢 Ankündigungs Channel', value: 'announcement' },
          { name: '🎭 Stage Channel', value: 'stage' },
          { name: '📁 Kategorie', value: 'category' },
          { name: '🧵 Forum Channel', value: 'forum' }
        ))
    .addChannelOption(option =>
      option.setName('kategorie')
        .setDescription('Kategorie für den Channel')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(false))
    .addStringOption(option =>
      option.setName('topic')
        .setDescription('Thema/Beschreibung des Channels (nur Text/Forum)')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('position')
        .setDescription('Position des Channels')
        .setMinValue(0)
        .setRequired(false))
    .addBooleanOption(option =>
      option.setName('nsfw')
        .setDescription('NSFW-Channel? (nur Text/Forum)')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('slowmode')
        .setDescription('Slow Mode in Sekunden (nur Text/Forum/Stage)')
        .setMinValue(0)
        .setMaxValue(21600)
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('userlimit')
        .setDescription('User Limit (nur Voice/Stage, 0 = unbegrenzt)')
        .setMinValue(0)
        .setMaxValue(99)
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('bitrate')
        .setDescription('Bitrate in kbps (nur Voice/Stage, 8-384)')
        .setMinValue(8)
        .setMaxValue(384)
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels),

  async execute(interaction) {
    await interaction.deferReply();

    const name = interaction.options.getString('name');
    const typ = interaction.options.getString('typ');
    const kategorie = interaction.options.getChannel('kategorie');
    const topic = interaction.options.getString('topic');
    const position = interaction.options.getInteger('position');
    const nsfw = interaction.options.getBoolean('nsfw') || false;
    const slowmode = interaction.options.getInteger('slowmode');
    const userlimit = interaction.options.getInteger('userlimit');
    const bitrate = interaction.options.getInteger('bitrate');

    try {
      // Channel Typ konvertieren
      const channelTypeMap = {
        'text': ChannelType.GuildText,
        'voice': ChannelType.GuildVoice,
        'announcement': ChannelType.GuildAnnouncement,
        'stage': ChannelType.GuildStageVoice,
        'category': ChannelType.GuildCategory,
        'forum': ChannelType.GuildForum
      };

      const channelType = channelTypeMap[typ];

      // Channel Optionen
      const channelOptions = {
        name: name,
        type: channelType,
        parent: kategorie?.id || null
      };

      // Position
      if (position !== null) {
        channelOptions.position = position;
      }

      // Text/Forum/Announcement spezifische Optionen
      if (typ === 'text' || typ === 'announcement' || typ === 'forum') {
        if (topic) channelOptions.topic = topic;
        if (nsfw) channelOptions.nsfw = nsfw;
      }

      // Slow Mode
      if (slowmode !== null && (typ === 'text' || typ === 'announcement' || typ === 'forum' || typ === 'stage')) {
        channelOptions.rateLimitPerUser = slowmode;
      }

      // Voice/Stage spezifische Optionen
      if (typ === 'voice' || typ === 'stage') {
        if (userlimit !== null) channelOptions.userLimit = userlimit;
        if (bitrate !== null) channelOptions.bitrate = bitrate * 1000; // kbps zu bps
      }

      // Erstelle Channel
      const newChannel = await interaction.guild.channels.create(channelOptions);

      // Erfolgs-Embed
      const embed = new EmbedBuilder()
        .setTitle('✅ Channel erstellt')
        .setDescription(`Channel ${newChannel} wurde erfolgreich erstellt!`)
        .addFields(
          { name: '📝 Name', value: name, inline: true },
          { name: '📋 Typ', value: getChannelTypeEmoji(typ), inline: true },
          { name: '🆔 ID', value: newChannel.id, inline: true }
        )
        .setColor('#00ff00')
        .setTimestamp();

      // Optionale Felder
      if (kategorie) {
        embed.addFields({ name: '📁 Kategorie', value: kategorie.name, inline: true });
      }
      if (topic) {
        embed.addFields({ name: '💬 Topic', value: topic, inline: false });
      }
      if (position !== null) {
        embed.addFields({ name: '📍 Position', value: position.toString(), inline: true });
      }
      if (nsfw) {
        embed.addFields({ name: '🔞 NSFW', value: 'Ja', inline: true });
      }
      if (slowmode !== null) {
        embed.addFields({ name: '⏱️ Slow Mode', value: `${slowmode}s`, inline: true });
      }
      if (userlimit !== null && userlimit > 0) {
        embed.addFields({ name: '👥 User Limit', value: userlimit.toString(), inline: true });
      }
      if (bitrate !== null) {
        embed.addFields({ name: '🎵 Bitrate', value: `${bitrate} kbps`, inline: true });
      }

      embed.addFields({ name: '👤 Erstellt von', value: `${interaction.user} (${interaction.user.tag})`, inline: false });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Create Channel Error:', error);
      
      let errorMessage = '❌ Fehler beim Erstellen des Channels!';
      
      if (error.code === 50013) {
        errorMessage = '❌ Der Bot hat keine Berechtigung, Channels zu erstellen!';
      } else if (error.code === 50035) {
        errorMessage = '❌ Ungültiger Channel-Name oder Einstellungen!';
      }

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Fehler')
            .setDescription(errorMessage)
            .addFields({ name: 'Details', value: `\`\`\`${error.message}\`\`\`` })
            .setColor('#ff0000')
            .setTimestamp()
        ]
      });
    }
  }
};

/**
 * Gibt Emoji für Channel-Typ zurück
 */
function getChannelTypeEmoji(typ) {
  const emojis = {
    'text': '💬 Text Channel',
    'voice': '🔊 Voice Channel',
    'announcement': '📢 Ankündigungs Channel',
    'stage': '🎭 Stage Channel',
    'category': '📁 Kategorie',
    'forum': '🧵 Forum Channel'
  };
  return emojis[typ] || typ;
}
