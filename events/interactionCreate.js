module.exports = {
  name: 'interactionCreate',
  /**
   * @param {import('discord.js').Interaction} interaction
   */
  async execute(interaction) {
    // Handle Button Interactions
    if (interaction.isButton() && interaction.customId.startsWith('channel_delete_')) {
        const channelDeleteHandler = require('./channelDelete');
        try {
            return await channelDeleteHandler.handleButton(interaction);
        } catch (error) {
            console.error('Button Error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ Fehler!', flags: 64 }).catch(() => {});
            }
        }
        return;
    }

    // Handle Ban Request Buttons
    if (interaction.isButton() && interaction.customId.startsWith('ban_')) {
        const banRequestHandler = require('../commands/interactive_ban_request');
        try {
            return await banRequestHandler.handleButton(interaction);
        } catch (error) {
            console.error('Ban Button Error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ Fehler beim Verarbeiten der Ban-Anfrage!', flags: 64 }).catch(() => {});
            }
        }
        return;
    }

    // Handle Bannlist Buttons
    if (interaction.isButton() && interaction.customId.startsWith('bannlist_') && !interaction.customId.includes('page_info')) {
        const bannlistHandler = require('../commands/bannlist');
        try {
            return await bannlistHandler.handleButton(interaction);
        } catch (error) {
            console.error('Bannlist Button Error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ Fehler beim Laden der Seite!', flags: 64 }).catch(() => {});
            }
        }
        return;
    }

    // Handle Ticket Select Menu
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_category_select') {
        const ticketPanel = require('../commands/ticketPanel');
        const selectedCategory = interaction.values[0];
        try {
            return await ticketPanel.handleCreateTicket(interaction, selectedCategory);
        } catch (error) {
            console.error('Ticket Create Error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ Fehler beim Erstellen des Tickets!', flags: 64 }).catch(() => {});
            }
        }
        return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('ticket_close_')) {
        const ticketPanel = require('../commands/ticketPanel');
        try {
            return await ticketPanel.handleCloseTicket(interaction);
        } catch (error) {
            console.error('Ticket Close Error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ Fehler beim Schließen des Tickets!', flags: 64 }).catch(() => {});
            }
        }
        return;
    }

    // Determine if this is a chat input (slash) command in a version-agnostic way
    const isSlash =
      typeof interaction.isChatInputCommand === 'function'
        ? interaction.isChatInputCommand()
        : (typeof interaction.isCommand === 'function'
            ? interaction.isCommand()
            : interaction.type?.toString?.().includes('ApplicationCommand'));

    if (!isSlash) return;

    const client = interaction.client;
    const command = client?.commands?.get(interaction.commandName);

    if (!command) {
      // Reply only if we haven't already
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({ content: `⚠️ Befehl \`${interaction.commandName}\` nicht gefunden.`, ephemeral: true });
        } else {
          await interaction.reply({ content: `⚠️ Befehl \`${interaction.commandName}\` nicht gefunden.`, ephemeral: true });
        }
      } catch (_) {}
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`[interactionCreate] Fehler beim Ausführen von /${interaction.commandName}:`, error);
      const msg = '❌ Beim Ausführen des Befehls ist ein Fehler aufgetreten.';
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({ content: msg, ephemeral: true });
        } else {
          await interaction.reply({ content: msg, ephemeral: true });
        }
      } catch (_) {}
    }
  },
};
