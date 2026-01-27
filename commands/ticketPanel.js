const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/tickets.json');

// Stelle sicher, dass data Ordner existiert
if (!fs.existsSync(path.dirname(dataPath))) {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
}

// Lade/Speichere Ticket-Konfiguration
function loadTicketConfig() {
  if (!fs.existsSync(dataPath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
}

function saveTicketConfig(config) {
  fs.writeFileSync(dataPath, JSON.stringify(config, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-ticket')
    .setDescription('Erstellt ein Ticket-Panel (Konfiguration über Website)')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  async execute(interaction) {
    // Lade Konfiguration aus tickets.json (wird über Website gesetzt)
    const config = loadTicketConfig();
    const guildConfig = config[interaction.guild.id] || {};
    
    const titel = guildConfig.panelTitle || '🎫 Support Tickets';
    const beschreibung = guildConfig.panelDescription || 
      'Benötigst du Hilfe? Wähle eine Kategorie aus dem Dropdown-Menü unten.\n\n' +
      '**So funktioniert es:**\n' +
      '• Wähle eine passende Kategorie aus\n' +
      '• Ein privater Channel wird für dich erstellt\n' +
      '• Beschreibe dein Anliegen\n' +
      '• Unser Team wird dir schnellstmöglich helfen';

    // Erstelle Embed
    const embed = new EmbedBuilder()
      .setTitle(titel)
      .setDescription(beschreibung)
      .setColor('#0099ff')
      .setTimestamp()
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

    // Erstelle Select Menu mit Kategorien
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_category_select')
      .setPlaceholder('🎫 Wähle eine Kategorie aus...')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Support')
          .setDescription('Allgemeine Hilfe und Support-Anfragen')
          .setValue('support')
          .setEmoji('🆘'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Bug Report')
          .setDescription('Melde einen Bug oder technisches Problem')
          .setValue('bug')
          .setEmoji('🐛'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Frage')
          .setDescription('Stelle eine allgemeine Frage')
          .setValue('frage')
          .setEmoji('❓'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Bewerbung')
          .setDescription('Bewerbung für das Team')
          .setValue('bewerbung')
          .setEmoji('📝'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Report')
          .setDescription('Melde ein Regelverstoß oder User')
          .setValue('report')
          .setEmoji('⚠️'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Sonstiges')
          .setDescription('Alles andere')
          .setValue('sonstiges')
          .setEmoji('📌')
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    // Sende Panel
    await interaction.reply({ embeds: [embed], components: [row] });

    // Speichere/Update Konfiguration
    const newConfig = loadTicketConfig();
    if (!newConfig[interaction.guild.id]) {
      newConfig[interaction.guild.id] = {
        categoryId: guildConfig.categoryId || null,
        supportRoleId: guildConfig.supportRoleId || null,
        panelTitle: titel,
        panelDescription: beschreibung,
        ticketCounter: 0,
        activeTickets: {}
      };
      saveTicketConfig(newConfig);
    }
  },

  // Select Menu Handler für Ticket-Erstellung
  async handleCreateTicket(interaction, category) {
    await interaction.deferReply({ flags: 64 });

    const config = loadTicketConfig();
    const guildConfig = config[interaction.guild.id];

    if (!guildConfig) {
      return interaction.editReply({
        content: '❌ Ticket-System ist nicht konfiguriert! Ein Admin muss `/ticketpanel` ausführen.'
      });
    }

    // Prüfe ob User bereits ein offenes Ticket hat
    const activeTickets = guildConfig.activeTickets || {};
    const userTicket = Object.values(activeTickets).find(t => t.userId === interaction.user.id);

    if (userTicket) {
      return interaction.editReply({
        content: `❌ Du hast bereits ein offenes Ticket: <#${userTicket.channelId}>`
      });
    }

    // Kategorie-Infos
    const categoryInfo = getCategoryInfo(category);

    try {
      // Erhöhe Ticket Counter
      guildConfig.ticketCounter = (guildConfig.ticketCounter || 0) + 1;
      const ticketNumber = guildConfig.ticketCounter;

      // Erstelle Channel mit Kategorie-Emoji
      const channelName = `${categoryInfo.emoji}-${category}-${ticketNumber.toString().padStart(4, '0')}`;
      
      const channelOptions = {
        name: channelName,
        type: ChannelType.GuildText,
        parent: guildConfig.categoryId,
        topic: `${categoryInfo.label} Ticket von ${interaction.user.tag} | User ID: ${interaction.user.id}`,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.AttachFiles,
              PermissionsBitField.Flags.EmbedLinks
            ]
          },
          {
            id: interaction.client.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ManageChannels
            ]
          }
        ]
      };

      // Support-Rolle hinzufügen
      if (guildConfig.supportRoleId) {
        channelOptions.permissionOverwrites.push({
          id: guildConfig.supportRoleId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        });
      }

      const ticketChannel = await interaction.guild.channels.create(channelOptions);

      // Erstelle Ticket Embed
      const ticketEmbed = new EmbedBuilder()
        .setTitle(`${categoryInfo.emoji} ${categoryInfo.label} Ticket #${ticketNumber}`)
        .setDescription(
          `Hallo ${interaction.user},\n\n` +
          `Willkommen in deinem **${categoryInfo.label}** Ticket!\n\n` +
          `${categoryInfo.description}\n\n` +
          '**Bitte beschreibe dein Anliegen so genau wie möglich:**\n' +
          '• Was ist das Problem/Anliegen?\n' +
          '• Wann trat es auf?\n' +
          '• Screenshots/Beweise (falls vorhanden)\n\n' +
          'Unser Team wird sich schnellstmöglich um dein Anliegen kümmern.'
        )
        .setColor(categoryInfo.color)
        .setTimestamp()
        .setFooter({ text: `Erstellt von ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

      // Ticket Control Buttons
      const controlRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`ticket_close_${ticketChannel.id}`)
            .setLabel('🔒 Ticket schließen')
            .setStyle(ButtonStyle.Danger)
        );

      await ticketChannel.send({ 
        content: guildConfig.supportRoleId ? `<@&${guildConfig.supportRoleId}> ${interaction.user}` : `${interaction.user}`,
        embeds: [ticketEmbed], 
        components: [controlRow] 
      });

      // Speichere Ticket
      activeTickets[ticketChannel.id] = {
        ticketNumber: ticketNumber,
        channelId: ticketChannel.id,
        userId: interaction.user.id,
        uategory: category,
        categoryLabel: categoryInfo.label,
        createdAt: Date.now()
      };
      guildConfig.activeTickets = activeTickets;
      config[interaction.guild.id] = guildConfig;
      saveTicketConfig(config);

      await interaction.editReply({
        content: `✅ ${categoryInfo.emoji} **${categoryInfo.label}** Ticket erstellt! ${ticketChannel}`
      });

    } catch (error) {
      console.error('Ticket Creation Error:', error);
      await interaction.editReply({
        content: '❌ Fehler beim Erstellen des Tickets! Stelle sicher, dass der Bot die nötigen Berechtigungen hat.'
      });
    }
  },

  // Button Handler für Ticket-Schließen
  async handleCloseTicket(interaction) {
    const channelId = interaction.customId.split('_')[2];
    await interaction.deferReply();

    const config = loadTicketConfig();
    const guildConfig = config[interaction.guild.id];

    if (!guildConfig || !guildConfig.activeTickets[channelId]) {
      return interaction.editReply({
        content: '❌ Dieses Ticket existiert nicht mehr im System.'
      });
    }

    const ticket = guildConfig.activeTickets[channelId];

    try {
      // Nachrichten im Ticket-Channel sammeln (letzte 100)
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      const sorted = Array.from(messages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
      const transcriptText = sorted.map(msg => `[${msg.createdAt.toLocaleString()}] ${msg.author.tag}: ${msg.content}`).join('\n');

      // Transcript-Embed bauen
      const transcriptEmbed = new EmbedBuilder()
        .setTitle('🎫 Ticket-Transcript')
        .setDescription('Hier ist das Transcript des geschlossenen Tickets:')
        .addFields(
          { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: true },
          { name: 'Nachrichten', value: transcriptText.substring(0, 4000) || 'Keine Nachrichten gefunden.' }
        )
        .setTimestamp();

      // Schließungs-Embed
      const closeEmbed = new EmbedBuilder()
        .setTitle('🔒 Ticket geschlossen')
        .setDescription(
          `Ticket **#${ticket.ticketNumber}** wurde geschlossen.\n\n` +
          `**Geschlossen von:** ${interaction.user} (${interaction.user.tag})`
        )
        .setColor('#ff0000')
        .setTimestamp();

      await interaction.editReply({
        embeds: [closeEmbed, transcriptEmbed],
        content: '🔒 Ticket wird in 10 Sekunden geschlossen...'
      });

      // Transcript-Embed in Channel aus ENV senden
      const transcriptChannelId = process.env.TICKET_TRANSCRIPT_CHANNEL_ID;
      if (transcriptChannelId) {
        const transcriptChannel = await interaction.guild.channels.fetch(transcriptChannelId).catch(() => null);
        if (transcriptChannel && transcriptChannel.isTextBased()) {
          await transcriptChannel.send({ embeds: [transcriptEmbed] });
        }
      }

      // Entferne aus aktiven Tickets
      delete guildConfig.activeTickets[channelId];
      config[interaction.guild.id] = guildConfig;
      saveTicketConfig(config);

      // Lösche Channel nach 10 Sekunden
      setTimeout(async () => {
        try {
          await interaction.channel.delete('Ticket geschlossen');
        } catch (err) {
          console.error('Fehler beim Löschen des Ticket-Channels:', err);
        }
      }, 10000);

    } catch (error) {
      console.error('Close Ticket Error:', error);
      await interaction.editReply({
        content: '❌ Fehler beim Schließen des Tickets!'
      });
    }
  }
};

/**
 * Gibt Informationen zur Ticket-Kategorie zurück
 */
function getCategoryInfo(category) {
  const categories = {
    'support': {
      label: 'Support',
      emoji: '🆘',
      color: '#0099ff',
      description: '**Du hast ein Problem oder brauchst Hilfe?**\nUnser Support-Team ist für dich da!'
    },
    'bug': {
      label: 'Bug Report',
      emoji: '🐛',
      color: '#ff0000',
      description: '**Danke für deinen Bug Report!**\nBitte beschreibe das Problem so detailliert wie möglich.'
    },
    'frage': {
      label: 'Frage',
      emoji: '❓',
      color: '#ffff00',
      description: '**Du hast eine Frage?**\nWir helfen dir gerne weiter!'
    },
    'bewerbung': {
      label: 'Bewerbung',
      emoji: '📝',
      color: '#00ff00',
      description: '**Vielen Dank für deine Bewerbung!**\nBitte beantworte alle Fragen ehrlich und ausführlich.'
    },
    'report': {
      label: 'Report',
      emoji: '⚠️',
      color: '#ff6600',
      description: '**Danke für deinen Report!**\nBitte beschreibe den Vorfall mit allen relevanten Details und Beweisen.'
    },
    'sonstiges': {
      label: 'Sonstiges',
      emoji: '📌',
      color: '#888888',
      description: '**Du hast ein anderes Anliegen?**\nKein Problem, beschreibe uns dein Anliegen!'
    }
  };
  
  return categories[category] || categories['sonstiges'];
}
