const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AuditLogEvent, ChannelType } = require('discord.js');

// Speichert pending Channel-Löschungen
const pendingDeletions = new Map();

module.exports = {
  // KEIN 'name' Property mehr - wird manuell in setupAntiNuke.js registriert
  
  async execute(channel) {
    if (!channel.guild) return;
    
    try {
      // Hole den Executor aus den Audit Logs
      const auditLogs = await channel.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelDelete,
      });
      
      const deleteLog = auditLogs.entries.first();
      
      if (!deleteLog) return;
      
      // Prüfe ob der Log-Eintrag aktuell ist (innerhalb der letzten 5 Sekunden)
      if (Date.now() - deleteLog.createdTimestamp > 5000) return;
      
      const executor = deleteLog.executor;
      const target = deleteLog.target;
      
      // Prüfe ob es der richtige Channel ist
      if (target.id !== channel.id) return;
      
      // Erstelle Embed mit Channel-Info
      const embed = new EmbedBuilder()
        .setColor(0xff6b6b)
        .setTitle('🗑️ Channel wurde gelöscht')
        .setDescription(`Ein Channel wurde auf **${channel.guild.name}** gelöscht!`)
        .addFields(
          { name: '📝 Channel-Name', value: channel.name, inline: true },
          { name: '🔢 Channel-ID', value: channel.id, inline: true },
          { name: '📂 Typ', value: ChannelType[channel.type] || 'Unknown', inline: true },
          { name: '👤 Gelöscht von', value: `${executor.tag} (${executor.id})`, inline: true },
          { name: '⏰ Zeitpunkt', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
          { name: '💬 Grund', value: deleteLog.reason || 'Kein Grund angegeben', inline: false }
        )
        .setThumbnail(executor.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: channel.guild.name, iconURL: channel.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      // Buttons für Aktionen
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`channel_delete_restore_${channel.id}`)
            .setLabel('↩️ Rückgängig machen')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`channel_delete_acknowledge_${channel.id}`)
            .setLabel('✅ Zur Kenntnis genommen')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`channel_delete_investigate_${channel.id}`)
            .setLabel('🔍 Untersuchen')
            .setStyle(ButtonStyle.Primary)
        );
      
      // Finde den Server-Owner
      const owner = await channel.guild.fetchOwner();
      
      // Sende DM an Owner
      try {
        const dmMessage = await owner.send({
          embeds: [embed],
          components: [row]
        });
        
        // Speichere die Message für Button-Handler mit vollständigen Channel-Daten
        pendingDeletions.set(channel.id, {
          messageId: dmMessage.id,
          channelInfo: {
            name: channel.name,
            id: channel.id,
            type: channel.type,
            guildId: channel.guild.id,
            guildName: channel.guild.name,
            position: channel.position,
            topic: channel.topic || null,
            nsfw: channel.nsfw || false,
            rateLimitPerUser: channel.rateLimitPerUser || 0,
            parentId: channel.parentId || null,
            permissionOverwrites: channel.permissionOverwrites?.cache.map(overwrite => ({
              id: overwrite.id,
              type: overwrite.type,
              allow: overwrite.allow.bitfield.toString(),
              deny: overwrite.deny.bitfield.toString(),
            })) || [],
          },
          executor: {
            id: executor.id,
            tag: executor.tag,
          },
          timestamp: Date.now(),
        });
        
        console.log(`✅ DM an ${owner.user.tag} gesendet für gelöschten Channel: ${channel.name}`);
      } catch (error) {
        console.error(`❌ Konnte keine DM an ${owner.user.tag} senden:`, error.message);
        
        // Versuche Log-Channel zu finden
        const logChannel = channel.guild.channels.cache.find(
          ch => ch.name === 'logs' || ch.name === 'mod-logs' || ch.name === 'admin-logs'
        );
        
        if (logChannel) {
          await logChannel.send({ embeds: [embed] }).catch(console.error);
        }
      }
      
    } catch (error) {
      console.error('Fehler beim Channel-Delete Event:', error);
    }
  },
  
  // Handler für Button-Interaktionen
  async handleButton(interaction) {
    if (!interaction.customId.startsWith('channel_delete_')) return;
    
    const [, , action, channelId] = interaction.customId.split('_');
    const deletionData = pendingDeletions.get(channelId);
    
    if (!deletionData) {
      return interaction.reply({
        content: '❌ Diese Benachrichtigung ist abgelaufen.',
        flags: 64,
      });
    }
    
    if (action === 'restore') {
      const guild = interaction.client.guilds.cache.get(deletionData.channelInfo.guildId);
      
      if (!guild) {
        return interaction.reply({
          content: '❌ Server nicht gefunden.',
          ephemeral: true,
        });
      }
      
      try {
        await interaction.deferReply({ flags: 64 });
      } catch (error) {
        // Interaction already expired
        return interaction.reply({ content: '❌ Diese Aktion ist abgelaufen.', flags: 64 }).catch(() => {});
      }
      
      try {
        const { channelInfo } = deletionData;
        
        // Erstelle Channel mit ursprünglichen Einstellungen
        const channelOptions = {
          name: channelInfo.name,
          type: channelInfo.type,
          position: channelInfo.position,
          reason: `Wiederhergestellt von ${interaction.user.tag}`,
        };
        
        // Füge optionale Eigenschaften hinzu
        if (channelInfo.topic) channelOptions.topic = channelInfo.topic;
        if (channelInfo.nsfw !== undefined) channelOptions.nsfw = channelInfo.nsfw;
        if (channelInfo.rateLimitPerUser) channelOptions.rateLimitPerUser = channelInfo.rateLimitPerUser;
        if (channelInfo.parentId) channelOptions.parent = channelInfo.parentId;
        
        // Erstelle den Channel
        const newChannel = await guild.channels.create(channelOptions);
        
        // Stelle Permissions wieder her
        if (channelInfo.permissionOverwrites && channelInfo.permissionOverwrites.length > 0) {
          for (const overwrite of channelInfo.permissionOverwrites) {
            try {
              await newChannel.permissionOverwrites.create(overwrite.id, {
                allow: BigInt(overwrite.allow),
                deny: BigInt(overwrite.deny),
              });
            } catch (err) {
              console.error(`Konnte Permission für ${overwrite.id} nicht wiederherstellen:`, err.message);
            }
          }
        }
        
        const successEmbed = new EmbedBuilder()
          .setColor(0x51cf66)
          .setTitle('✅ Channel wiederhergestellt')
          .setDescription(`Der Channel wurde erfolgreich wiederhergestellt!`)
          .addFields(
            { name: '📝 Channel-Name', value: newChannel.name, inline: true },
            { name: '🆕 Neue ID', value: newChannel.id, inline: true },
            { name: '📂 Typ', value: ChannelType[newChannel.type] || 'Unknown', inline: true },
            { name: '👤 Wiederhergestellt von', value: interaction.user.tag, inline: false }
          )
          .setTimestamp();
        
        // Update die ursprüngliche Message
        const updatedOriginalEmbed = EmbedBuilder.from(interaction.message.embeds[0])
          .setColor(0x51cf66)
          .setFooter({ text: `↩️ Wiederhergestellt von ${interaction.user.tag}` });
        
        await interaction.message.edit({
          embeds: [updatedOriginalEmbed],
          components: [],
        });
        
        await interaction.editReply({
          embeds: [successEmbed],
        });
        
        pendingDeletions.delete(channelId);
        
      } catch (error) {
        console.error('Fehler beim Wiederherstellen des Channels:', error);
        
        await interaction.editReply({
          content: `❌ Fehler beim Wiederherstellen: ${error.message}`,
        });
      }
      
    } else if (action === 'acknowledge') {
      const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(0x51cf66)
        .setFooter({ text: `✅ Bestätigt von ${interaction.user.tag}` });
      
      await interaction.update({
        embeds: [updatedEmbed],
        components: [],
      });
      
      pendingDeletions.delete(channelId);
      
    } else if (action === 'investigate') {
      const guild = interaction.client.guilds.cache.get(deletionData.channelInfo.guildId);
      
      if (!guild) {
        return interaction.reply({
          content: '❌ Server nicht gefunden.',
          ephemeral: true,
        });
      }
      
      // Hole weitere Audit-Log Einträge
      const auditLogs = await guild.fetchAuditLogs({
        limit: 10,
        type: AuditLogEvent.ChannelDelete,
      });
      
      const recentDeletions = auditLogs.entries
        .filter(entry => Date.now() - entry.createdTimestamp < 3600000) // Letzte Stunde
        .map(entry => `• **${entry.target.name}** von ${entry.executor.tag}`)
        .join('\n') || 'Keine weiteren Löschungen in letzter Stunde';
      
      const investigateEmbed = new EmbedBuilder()
        .setColor(0x4c6ef5)
        .setTitle('🔍 Untersuchung: Channel-Löschungen')
        .setDescription(`Weitere Löschungen im Server **${guild.name}** in letzter Stunde:`)
        .addFields(
          { name: '📊 Gelöschte Channels', value: recentDeletions, inline: false }
        )
        .setTimestamp();
      
      await interaction.reply({
        embeds: [investigateEmbed],
        flags: 64,
      });
    }
  },
};
