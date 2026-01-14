const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transcript')
    .setDescription('Erstellt ein Transcript des aktuellen Channels')
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Anzahl der Nachrichten (max 1000)')
        .setMinValue(1)
        .setMaxValue(1000)
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const limit = interaction.options.getInteger('limit') || 100;
    const channel = interaction.channel;

    try {
      // Hole alle Nachrichten
      let allMessages = [];
      let lastId;

      const fetchLimit = Math.min(limit, 1000);
      const iterations = Math.ceil(fetchLimit / 100);

      for (let i = 0; i < iterations; i++) {
        const options = { limit: Math.min(100, fetchLimit - allMessages.length) };
        if (lastId) options.before = lastId;

        const messages = await channel.messages.fetch(options);
        if (messages.size === 0) break;

        allMessages.push(...messages.values());
        lastId = messages.last().id;
      }

      // Sortiere Nachrichten (älteste zuerst)
      allMessages = allMessages.reverse();

      // Erstelle Transcript Text
      let transcript = '';
      transcript += `═══════════════════════════════════════════════════════\n`;
      transcript += `         TICKET TRANSCRIPT\n`;
      transcript += `═══════════════════════════════════════════════════════\n\n`;
      transcript += `Server: ${interaction.guild.name}\n`;
      transcript += `Channel: #${channel.name}\n`;
      transcript += `Erstellt: ${new Date().toLocaleString('de-DE')}\n`;
      transcript += `Nachrichten: ${allMessages.length}\n`;
      transcript += `Erstellt von: ${interaction.user.tag}\n\n`;
      transcript += `═══════════════════════════════════════════════════════\n\n`;

      for (const message of allMessages) {
        const timestamp = message.createdAt.toLocaleString('de-DE');
        const author = message.author.tag;
        const content = message.content || '[Kein Text]';
        
        transcript += `[${timestamp}] ${author}:\n`;
        transcript += `${content}\n`;

        // Attachments
        if (message.attachments.size > 0) {
          transcript += `📎 Anhänge:\n`;
          for (const attachment of message.attachments.values()) {
            transcript += `  - ${attachment.url}\n`;
          }
        }

        // Embeds
        if (message.embeds.length > 0) {
          transcript += `📋 Embeds: ${message.embeds.length}\n`;
        }

        transcript += `\n`;
      }

      transcript += `═══════════════════════════════════════════════════════\n`;
      transcript += `Ende des Transcripts\n`;
      transcript += `═══════════════════════════════════════════════════════\n`;

      // Erstelle Datei
      const fileName = `transcript-${channel.name}-${Date.now()}.txt`;
      const filePath = path.join(__dirname, '../data/transcripts', fileName);

      // Stelle sicher, dass Ordner existiert
      if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }

      fs.writeFileSync(filePath, transcript, 'utf-8');

      // Erstelle Attachment
      const attachment = new AttachmentBuilder(filePath, { name: fileName });

      // Erstelle Embed
      const embed = new EmbedBuilder()
        .setTitle('📋 Transcript erstellt')
        .setDescription(
          `**Channel:** #${channel.name}\n` +
          `**Nachrichten:** ${allMessages.length}\n` +
          `**Erstellt von:** ${interaction.user} (${interaction.user.tag})\n` +
          `**Zeitstempel:** <t:${Math.floor(Date.now() / 1000)}:F>`
        )
        .setColor('#00ff00')
        .setTimestamp()
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

      await interaction.editReply({
        embeds: [embed],
        files: [attachment]
      });

      // Lösche temporäre Datei nach 10 Sekunden
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 10000);

    } catch (error) {
      console.error('Transcript Error:', error);
      await interaction.editReply({
        content: '❌ Fehler beim Erstellen des Transcripts!'
      });
    }
  },

  /**
   * Erstellt ein Transcript Embed für einen Channel (wird beim Ticket-Schließen aufgerufen)
   */
  async createTranscriptForTicket(channel, ticketInfo) {
    try {
      // Hole die letzten 50 Nachrichten
      const messages = await channel.messages.fetch({ limit: 50 });
      const allMessages = Array.from(messages.values()).reverse();

      // Erstelle Transcript Embed
      const transcriptEmbed = new EmbedBuilder()
        .setTitle(`📋 Ticket Transcript #${ticketInfo.ticketNumber}`)
        .setColor('#0099ff')
        .setTimestamp()
        .setFooter({ text: channel.guild.name, iconURL: channel.guild.iconURL() })
        .addFields(
          { name: '🎫 Ticket-Info', value: 
            `**Nummer:** #${ticketInfo.ticketNumber}\n` +
            `**Kategorie:** ${ticketInfo.categoryLabel || 'Unbekannt'}\n` +
            `**User:** ${ticketInfo.userTag}\n` +
            `**User ID:** \`${ticketInfo.userId}\``,
            inline: false
          },
          { name: '⏰ Zeitstempel', value:
            `**Erstellt:** <t:${Math.floor(ticketInfo.createdAt / 1000)}:F>\n` +
            `**Geschlossen:** <t:${Math.floor(Date.now() / 1000)}:F>`,
            inline: false
          },
          { name: '📊 Statistik', value:
            `**Nachrichten:** ${allMessages.length}\n` +
            `**Channel:** #${channel.name}`,
            inline: false
          }
        );

      // Erstelle Nachrichtenverlauf (max 1024 Zeichen pro Field)
      let transcriptText = '';
      const maxLength = 950; // Reserve für Sicherheit
      
      for (const message of allMessages) {
        const author = message.author.username;
        const content = message.content || '[Keine Nachricht]';
        const time = `<t:${Math.floor(message.createdAt.getTime() / 1000)}:t>`;
        
        const messageText = `${time} **${author}:** ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}\n`;
        
        if (transcriptText.length + messageText.length > maxLength) {
          transcriptText += `\n_... und ${allMessages.length - allMessages.indexOf(message)} weitere Nachrichten_`;
          break;
        }
        
        transcriptText += messageText;
      }

      if (transcriptText) {
        // Split in mehrere Fields wenn nötig
        const chunks = [];
        let currentChunk = '';
        
        for (const line of transcriptText.split('\n')) {
          if (currentChunk.length + line.length > 1020) {
            chunks.push(currentChunk);
            currentChunk = line + '\n';
          } else {
            currentChunk += line + '\n';
          }
        }
        if (currentChunk) chunks.push(currentChunk);

        // Füge Transcript-Fields hinzu
        chunks.forEach((chunk, index) => {
          transcriptEmbed.addFields({
            name: index === 0 ? '💬 Nachrichtenverlauf' : '\u200b',
            value: chunk || '\u200b',
            inline: false
          });
        });
      }

      return transcriptEmbed;

    } catch (error) {
      console.error('Transcript Creation Error:', error);
      return null;
    }
  }
};
