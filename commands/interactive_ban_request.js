const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Speichert aktive Ban-Anfragen
const activeBanRequests = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban-request')
    .setDescription('Erstelle eine interaktive Ban-Anfrage')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Der User, der gebannt werden soll')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('grund')
        .setDescription('Grund für den Ban')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('beweise')
        .setDescription('Links zu Beweisen (Screenshots, Logs, etc.)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const grund = interaction.options.getString('grund');
    const beweise = interaction.options.getString('beweise') || 'Keine Beweise angegeben';

    // Prüfe ob User bannable ist
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    
    if (!targetMember) {
      return interaction.reply({ 
        content: '❌ User ist nicht auf diesem Server!', 
        flags: 64 
      });
    }

    if (targetMember.id === interaction.guild.ownerId) {
      return interaction.reply({ 
        content: '❌ Der Server-Owner kann nicht gebannt werden!', 
        flags: 64 
      });
    }

    if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ 
        content: '❌ Du kannst keinen User mit gleicher/höherer Rolle bannen!', 
        flags: 64 
      });
    }

    // Erstelle Request ID
    const requestId = `ban_${Date.now()}_${targetUser.id}`;

    // Erstelle Embed
    const embed = new EmbedBuilder()
      .setTitle('🔨 Ban-Anfrage')
      .setDescription(`**User:** ${targetUser} (${targetUser.tag})\n**ID:** ${targetUser.id}`)
      .addFields(
        { name: '📋 Grund', value: grund, inline: false },
        { name: '🔍 Beweise', value: beweise, inline: false },
        { name: '👤 Angefordert von', value: `${interaction.user} (${interaction.user.tag})`, inline: false },
        { name: '✅ Zustimmungen', value: '0', inline: true },
        { name: '❌ Ablehnungen', value: '0', inline: true }
      )
      .setColor('#ff0000')
      .setTimestamp()
      .setThumbnail(targetUser.displayAvatarURL());

    // Erstelle Buttons
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`ban_approve_${requestId}`)
          .setLabel('✅ Zustimmen')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`ban_deny_${requestId}`)
          .setLabel('❌ Ablehnen')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`ban_execute_${requestId}`)
          .setLabel('🔨 Sofort Bannen')
          .setStyle(ButtonStyle.Primary)
      );

    // Sende Nachricht
    const message = await interaction.reply({ 
      embeds: [embed], 
      components: [row],
      fetchReply: true
    });

    // Speichere Request
    activeBanRequests.set(requestId, {
      messageId: message.id,
      channelId: interaction.channel.id,
      guildId: interaction.guild.id,
      targetUserId: targetUser.id,
      targetUserTag: targetUser.tag,
      grund: grund,
      beweise: beweise,
      requesterId: interaction.user.id,
      requesterTag: interaction.user.tag,
      approvals: new Set(),
      denials: new Set(),
      createdAt: Date.now()
    });

    // Lösche Request nach 24 Stunden
    setTimeout(() => {
      activeBanRequests.delete(requestId);
    }, 24 * 60 * 60 * 1000);
  },

  // Button Handler
  async handleButton(interaction) {
    const customId = interaction.customId;
    const requestId = customId.split('_').slice(2).join('_');
    const action = customId.split('_')[1];

    const request = activeBanRequests.get(requestId);
    
    if (!request) {
      return interaction.reply({ 
        content: '❌ Diese Ban-Anfrage ist abgelaufen oder existiert nicht mehr!', 
        flags: 64 
      });
    }

    // Prüfe Berechtigung
    const member = interaction.member;
    if (!member.permissions.has(PermissionsBitField.Flags.BanMembers) && action === 'execute') {
      return interaction.reply({ 
        content: '❌ Du hast keine Berechtigung, User zu bannen!', 
        flags: 64 
      });
    }

    if (!member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return interaction.reply({ 
        content: '❌ Du hast keine Berechtigung, über Ban-Anfragen abzustimmen!', 
        flags: 64 
      });
    }

    // Handle Actions
    if (action === 'approve') {
      if (request.approvals.has(interaction.user.id)) {
        return interaction.reply({ 
          content: '⚠️ Du hast bereits zugestimmt!', 
          flags: 64 
        });
      }
      request.denials.delete(interaction.user.id);
      request.approvals.add(interaction.user.id);
      
      await interaction.reply({ 
        content: '✅ Du hast der Ban-Anfrage zugestimmt!', 
        flags: 64 
      });

    } else if (action === 'deny') {
      if (request.denials.has(interaction.user.id)) {
        return interaction.reply({ 
          content: '⚠️ Du hast bereits abgelehnt!', 
          flags: 64 
        });
      }
      request.approvals.delete(interaction.user.id);
      request.denials.add(interaction.user.id);
      
      await interaction.reply({ 
        content: '❌ Du hast die Ban-Anfrage abgelehnt!', 
        flags: 64 
      });

    } else if (action === 'execute') {
      await interaction.deferReply({ flags: 64 });

      try {
        const guild = interaction.guild;
        const targetMember = await guild.members.fetch(request.targetUserId).catch(() => null);

        if (!targetMember) {
          await interaction.editReply({ 
            content: '❌ User ist nicht mehr auf dem Server!' 
          });
          activeBanRequests.delete(requestId);
          return;
        }

        // Banne den User
        await targetMember.ban({ 
          reason: `${request.grund} | Gebannt von: ${interaction.user.tag} | Angefordert von: ${request.requesterTag}` 
        });

        await interaction.editReply({ 
          content: `✅ **${request.targetUserTag}** wurde erfolgreich gebannt!\n**Grund:** ${request.grund}` 
        });

        // Update Original Message
        const channel = await guild.channels.fetch(request.channelId);
        const message = await channel.messages.fetch(request.messageId);
        
        const executedEmbed = EmbedBuilder.from(message.embeds[0])
          .setColor('#00ff00')
          .setTitle('✅ Ban ausgeführt')
          .addFields({ 
            name: '🔨 Gebannt von', 
            value: `${interaction.user} (${interaction.user.tag})`, 
            inline: false 
          });

        await message.edit({ 
          embeds: [executedEmbed], 
          components: [] 
        });

        activeBanRequests.delete(requestId);

      } catch (error) {
        console.error('Ban Error:', error);
        await interaction.editReply({ 
          content: '❌ Fehler beim Bannen des Users!' 
        });
      }
      return;
    }

    // Update Embed
    try {
      const channel = await interaction.guild.channels.fetch(request.channelId);
      const message = await channel.messages.fetch(request.messageId);
      
      const updatedEmbed = EmbedBuilder.from(message.embeds[0])
        .spliceFields(3, 2,
          { name: '✅ Zustimmungen', value: request.approvals.size.toString(), inline: true },
          { name: '❌ Ablehnungen', value: request.denials.size.toString(), inline: true }
        );

      await message.edit({ embeds: [updatedEmbed] });
    } catch (error) {
      console.error('Embed Update Error:', error);
    }
  }
};
