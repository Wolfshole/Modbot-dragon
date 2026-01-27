const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

// Speichert aktive Bannlist-Nachrichten
const activeBannlists = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bannlist')
    .setDescription('Zeigt alle gebannten User des Servers')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      // Hole alle Bans
      const bans = await interaction.guild.bans.fetch();
      
      if (bans.size === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle('📋 Bannlist')
              .setDescription('✅ Keine gebannten User auf diesem Server!')
              .setColor('#00ff00')
              .setTimestamp()
          ]
        });
      }

      // Konvertiere zu Array und sortiere nach Datum (neueste zuerst)
      const banArray = Array.from(bans.values());
      
      // Pagination Setup
      const itemsPerPage = 10;
      const totalPages = Math.ceil(banArray.length / itemsPerPage);
      const bannlistId = `bannlist_${Date.now()}_${interaction.user.id}`;
      
      // Erstelle erste Seite
      const embed = createBannlistEmbed(banArray, 0, itemsPerPage, totalPages, interaction.guild);
      const row = createNavigationButtons(bannlistId, 0, totalPages);

      const message = await interaction.editReply({
        embeds: [embed],
        components: totalPages > 1 ? [row] : []
      });

      // Speichere Bannlist-Daten
      if (totalPages > 1) {
        activeBannlists.set(bannlistId, {
          bans: banArray,
          currentPage: 0,
          totalPages: totalPages,
          itemsPerPage: itemsPerPage,
          messageId: message.id,
          userId: interaction.user.id,
          guild: interaction.guild
        });

        // Lösche nach 10 Minuten
        setTimeout(() => {
          activeBannlists.delete(bannlistId);
        }, 10 * 60 * 1000);
      }

    } catch (error) {
      console.error('Bannlist Error:', error);
      await interaction.editReply({
        content: '❌ Fehler beim Laden der Bannlist! Stelle sicher, dass der Bot die Berechtigung "Mitglieder bannen" hat.'
      });
    }
  },

  // Button Handler
  async handleButton(interaction) {
    const customId = interaction.customId;
    const bannlistId = customId.split('_').slice(2, -1).join('_');
    const action = customId.split('_').pop();

    const bannlistData = activeBannlists.get(bannlistId);
    
    if (!bannlistData) {
      return interaction.reply({ 
        content: '❌ Diese Bannlist ist abgelaufen! Verwende `/bannlist` erneut.', 
        flags: 64 
      });
    }

    // Prüfe ob User berechtigt ist
    if (bannlistData.userId !== interaction.user.id) {
      return interaction.reply({ 
        content: '❌ Du kannst nur deine eigenen Bannlist-Seiten wechseln!', 
        flags: 64 
      });
    }

    // Berechne neue Seite
    let newPage = bannlistData.currentPage;
    if (action === 'prev') {
      newPage = Math.max(0, bannlistData.currentPage - 1);
    } else if (action === 'next') {
      newPage = Math.min(bannlistData.totalPages - 1, bannlistData.currentPage + 1);
    } else if (action === 'first') {
      newPage = 0;
    } else if (action === 'last') {
      newPage = bannlistData.totalPages - 1;
    }

    // Update Seite
    bannlistData.currentPage = newPage;

    // Erstelle neues Embed
    const embed = createBannlistEmbed(
      bannlistData.bans, 
      newPage, 
      bannlistData.itemsPerPage, 
      bannlistData.totalPages,
      bannlistData.guild
    );
    const row = createNavigationButtons(bannlistId, newPage, bannlistData.totalPages);

    await interaction.update({
      embeds: [embed],
      components: [row]
    });
  }
};

/**
 * Erstellt ein Bannlist Embed für eine Seite
 */
function createBannlistEmbed(bans, page, itemsPerPage, totalPages, guild) {
  const start = page * itemsPerPage;
  const end = Math.min(start + itemsPerPage, bans.length);
  const pageBans = bans.slice(start, end);

  const embed = new EmbedBuilder()
    .setTitle('🔨 Bannlist')
    .setDescription(`**Server:** ${guild.name}\n**Gesamt Bans:** ${bans.length}\n**Seite ${page + 1} von ${totalPages}**`)
    .setColor('#ff0000')
    .setTimestamp()
    .setFooter({ text: `${guild.name}`, iconURL: guild.iconURL() });

  // Füge Bans hinzu
  let description = '';
  for (let i = 0; i < pageBans.length; i++) {
    const ban = pageBans[i];
    const index = start + i + 1;
    const reason = ban.reason || 'Kein Grund angegeben';
    
    description += `\n**${index}.** ${ban.user.tag} (\`${ban.user.id}\`)\n`;
    description += `└ 📋 *${reason}*\n`;
  }

  embed.addFields({ name: '\u200b', value: description || 'Keine Bans auf dieser Seite' });

  return embed;
}

/**
 * Erstellt Navigation Buttons
 */
function createNavigationButtons(bannlistId, currentPage, totalPages) {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`bannlist_${bannlistId}_first`)
        .setLabel('⏮️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId(`bannlist_${bannlistId}_prev`)
        .setLabel('◀️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId(`bannlist_page_info`)
        .setLabel(`Seite ${currentPage + 1}/${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`bannlist_${bannlistId}_next`)
        .setLabel('▶️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage >= totalPages - 1),
      new ButtonBuilder()
        .setCustomId(`bannlist_${bannlistId}_last`)
        .setLabel('⏭️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage >= totalPages - 1)
    );
}
