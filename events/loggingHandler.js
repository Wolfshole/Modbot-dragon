const { EmbedBuilder, AuditLogEvent, Events } = require('discord.js');

module.exports = {
  name: 'loggingHandler',

  /**
   * Registriert alle Logging Event Handler
   */
  setupLoggingEvents(client) {
    const setupLogging = require('../commands/setupLogging');

    // Nachricht gelöscht
    client.on(Events.MessageDelete, async (message) => {
      if (!message.guild || message.author?.bot) return;

      const embed = new EmbedBuilder()
        .setTitle('🗑️ Nachricht gelöscht')
        .setColor('#ff0000')
        .addFields(
          { name: '👤 Author', value: message.author ? `${message.author} (${message.author.tag})` : 'Unbekannt', inline: true },
          { name: '📍 Channel', value: `${message.channel}`, inline: true },
          { name: '📝 Inhalt', value: message.content || '[Embed/Datei]', inline: false }
        )
        .setTimestamp();

      await setupLogging.sendLog(message.guild, embed);
    });

    // Nachricht bearbeitet
    client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
      if (!newMessage.guild || newMessage.author?.bot) return;
      if (oldMessage.content === newMessage.content) return;

      const embed = new EmbedBuilder()
        .setTitle('✏️ Nachricht bearbeitet')
        .setColor('#ffaa00')
        .addFields(
          { name: '👤 Author', value: `${newMessage.author} (${newMessage.author.tag})`, inline: true },
          { name: '📍 Channel', value: `${newMessage.channel}`, inline: true },
          { name: '📝 Vorher', value: oldMessage.content?.substring(0, 1000) || '[Leer]', inline: false },
          { name: '📝 Nachher', value: newMessage.content?.substring(0, 1000) || '[Leer]', inline: false }
        )
        .setTimestamp();

      await setupLogging.sendLog(newMessage.guild, embed);
    });

    // User tritt bei
    client.on(Events.GuildMemberAdd, async (member) => {
      const embed = new EmbedBuilder()
        .setTitle('📥 User beigetreten')
        .setColor('#00ff00')
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
          { name: '👤 User', value: `${member} (${member.user.tag})`, inline: true },
          { name: '🆔 ID', value: member.id, inline: true },
          { name: '📅 Account erstellt', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: false }
        )
        .setTimestamp();

      await setupLogging.sendLog(member.guild, embed);
    });

    // User verlässt Server
    client.on(Events.GuildMemberRemove, async (member) => {
      const embed = new EmbedBuilder()
        .setTitle('📤 User verlassen')
        .setColor('#ff6600')
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
          { name: '👤 User', value: `${member.user.tag}`, inline: true },
          { name: '🆔 ID', value: member.id, inline: true },
          { name: '📅 Beigetreten', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unbekannt', inline: true }
        )
        .setTimestamp();

      await setupLogging.sendLog(member.guild, embed);
    });

    // User gebannt
    client.on(Events.GuildBanAdd, async (ban) => {
      const auditLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd }).catch(() => null);
      const executor = auditLogs?.entries.first()?.executor;

      const embed = new EmbedBuilder()
        .setTitle('🔨 User gebannt')
        .setColor('#ff0000')
        .setThumbnail(ban.user.displayAvatarURL())
        .addFields(
          { name: '👤 User', value: `${ban.user.tag}`, inline: true },
          { name: '🆔 ID', value: ban.user.id, inline: true },
          { name: '👮 Von', value: executor ? `${executor.tag}` : 'Unbekannt', inline: true },
          { name: '📋 Grund', value: ban.reason || 'Kein Grund angegeben', inline: false }
        )
        .setTimestamp();

      await setupLogging.sendLog(ban.guild, embed);
    });

    // User entbannt
    client.on(Events.GuildBanRemove, async (ban) => {
      const auditLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanRemove }).catch(() => null);
      const executor = auditLogs?.entries.first()?.executor;

      const embed = new EmbedBuilder()
        .setTitle('✅ User entbannt')
        .setColor('#00ff00')
        .setThumbnail(ban.user.displayAvatarURL())
        .addFields(
          { name: '👤 User', value: `${ban.user.tag}`, inline: true },
          { name: '🆔 ID', value: ban.user.id, inline: true },
          { name: '👮 Von', value: executor ? `${executor.tag}` : 'Unbekannt', inline: true }
        )
        .setTimestamp();

      await setupLogging.sendLog(ban.guild, embed);
    });

    // Rolle zugewiesen/entfernt
    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
      // Filter Bots aus (nur echte User loggen)
      if (newMember.user.bot) return;
      
      const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
      const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

      if (addedRoles.size > 0) {
        // Hole Audit Log
        const auditLogs = await newMember.guild.fetchAuditLogs({ 
          limit: 1, 
          type: AuditLogEvent.MemberRoleUpdate 
        }).catch(() => null);
        const executor = auditLogs?.entries.first()?.executor;

        const embed = new EmbedBuilder()
          .setTitle('🎭 Rolle hinzugefügt')
          .setColor('#00ff00')
          .addFields(
            { name: '👤 User', value: `${newMember} (${newMember.user.tag})`, inline: true },
            { name: '🎭 Rolle', value: addedRoles.map(r => r.name).join(', '), inline: true },
            { name: '👮 Von', value: executor ? `${executor.tag}` : 'Unbekannt', inline: true }
          )
          .setTimestamp();

        await setupLogging.sendLog(newMember.guild, embed);
      }

      if (removedRoles.size > 0) {
        // Hole Audit Log
        const auditLogs = await newMember.guild.fetchAuditLogs({ 
          limit: 1, 
          type: AuditLogEvent.MemberRoleUpdate 
        }).catch(() => null);
        const executor = auditLogs?.entries.first()?.executor;

        const embed = new EmbedBuilder()
          .setTitle('🎭 Rolle entfernt')
          .setColor('#ff0000')
          .addFields(
            { name: '👤 User', value: `${newMember} (${newMember.user.tag})`, inline: true },
            { name: '🎭 Rolle', value: removedRoles.map(r => r.name).join(', '), inline: true },
            { name: '👮 Von', value: executor ? `${executor.tag}` : 'Unbekannt', inline: true }
          )
          .setTimestamp();

        await setupLogging.sendLog(newMember.guild, embed);
      }

      // Nickname geändert
      if (oldMember.nickname !== newMember.nickname) {
        const auditLogs = await newMember.guild.fetchAuditLogs({ 
          limit: 1, 
          type: AuditLogEvent.MemberUpdate 
        }).catch(() => null);
        const executor = auditLogs?.entries.first()?.executor;

        const embed = new EmbedBuilder()
          .setTitle('📝 Nickname geändert')
          .setColor('#ffaa00')
          .addFields(
            { name: '👤 User', value: `${newMember} (${newMember.user.tag})`, inline: false },
            { name: '📝 Vorher', value: oldMember.nickname || 'Kein Nickname', inline: true },
            { name: '📝 Nachher', value: newMember.nickname || 'Kein Nickname', inline: true },
            { name: '👮 Von', value: executor ? `${executor.tag}` : 'Selbst geändert', inline: true }
          )
          .setTimestamp();

        await setupLogging.sendLog(newMember.guild, embed);
      }

      // Timeout hinzugefügt/entfernt
      if (oldMember.communicationDisabledUntilTimestamp !== newMember.communicationDisabledUntilTimestamp) {
        const auditLogs = await newMember.guild.fetchAuditLogs({ 
          limit: 1, 
          type: AuditLogEvent.MemberUpdate 
        }).catch(() => null);
        const executor = auditLogs?.entries.first()?.executor;
        const reason = auditLogs?.entries.first()?.reason;

        if (newMember.communicationDisabledUntilTimestamp) {
          // Timeout hinzugefügt
          const embed = new EmbedBuilder()
            .setTitle('⏱️ User wurde getimeoutet')
            .setColor('#ff0000')
            .addFields(
              { name: '👤 User', value: `${newMember} (${newMember.user.tag})`, inline: true },
              { name: '👮 Von', value: executor ? `${executor.tag}` : 'Unbekannt', inline: true },
              { name: '⏰ Bis', value: `<t:${Math.floor(newMember.communicationDisabledUntilTimestamp / 1000)}:F>`, inline: false },
              { name: '📋 Grund', value: reason || 'Kein Grund angegeben', inline: false }
            )
            .setTimestamp();

          await setupLogging.sendLog(newMember.guild, embed);
        } else {
          // Timeout entfernt
          const embed = new EmbedBuilder()
            .setTitle('✅ Timeout aufgehoben')
            .setColor('#00ff00')
            .addFields(
              { name: '👤 User', value: `${newMember} (${newMember.user.tag})`, inline: true },
              { name: '👮 Von', value: executor ? `${executor.tag}` : 'Automatisch', inline: true }
            )
            .setTimestamp();

          await setupLogging.sendLog(newMember.guild, embed);
        }
      }
    });

    // Channel erstellt
    client.on(Events.ChannelCreate, async (channel) => {
      if (!channel.guild) return;

      const auditLogs = await channel.guild.fetchAuditLogs({ 
        limit: 1, 
        type: AuditLogEvent.ChannelCreate 
      }).catch(() => null);
      const executor = auditLogs?.entries.first()?.executor;

      const embed = new EmbedBuilder()
        .setTitle('📁 Channel erstellt')
        .setColor('#00ff00')
        .addFields(
          { name: '📝 Name', value: channel.name, inline: true },
          { name: '📋 Typ', value: channel.type.toString(), inline: true },
          { name: '📍 Channel', value: `${channel}`, inline: true },
          { name: '👮 Von', value: executor ? `${executor.tag}` : 'Unbekannt', inline: true }
        )
        .setTimestamp();

      await setupLogging.sendLog(channel.guild, embed);
    });

    // Channel gelöscht
    client.on(Events.ChannelDelete, async (channel) => {
      if (!channel.guild) return;

      const auditLogs = await channel.guild.fetchAuditLogs({ 
        limit: 1, 
        type: AuditLogEvent.ChannelDelete 
      }).catch(() => null);
      const executor = auditLogs?.entries.first()?.executor;

      const embed = new EmbedBuilder()
        .setTitle('🗑️ Channel gelöscht')
        .setColor('#ff0000')
        .addFields(
          { name: '📝 Name', value: channel.name, inline: true },
          { name: '📋 Typ', value: channel.type.toString(), inline: true },
          { name: '🆔 ID', value: channel.id, inline: true },
          { name: '👮 Von', value: executor ? `${executor.tag}` : 'Unbekannt', inline: true }
        )
        .setTimestamp();

      await setupLogging.sendLog(channel.guild, embed);
    });

    // Channel bearbeitet
    client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
      if (!newChannel.guild) return;

      const changes = [];

      if (oldChannel.name !== newChannel.name) {
        changes.push(`**Name:** ${oldChannel.name} → ${newChannel.name}`);
      }
      if (oldChannel.topic !== newChannel.topic) {
        changes.push(`**Topic:** ${oldChannel.topic || 'Leer'} → ${newChannel.topic || 'Leer'}`);
      }
      if (oldChannel.nsfw !== newChannel.nsfw) {
        changes.push(`**NSFW:** ${oldChannel.nsfw ? 'Ja' : 'Nein'} → ${newChannel.nsfw ? 'Ja' : 'Nein'}`);
      }
      if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
        changes.push(`**Slowmode:** ${oldChannel.rateLimitPerUser}s → ${newChannel.rateLimitPerUser}s`);
      }

      if (changes.length > 0) {
        const auditLogs = await newChannel.guild.fetchAuditLogs({ 
          limit: 1, 
          type: AuditLogEvent.ChannelUpdate 
        }).catch(() => null);
        const executor = auditLogs?.entries.first()?.executor;

        const embed = new EmbedBuilder()
          .setTitle('✏️ Channel bearbeitet')
          .setColor('#ffaa00')
          .addFields(
            { name: '📍 Channel', value: `${newChannel}`, inline: true },
            { name: '👮 Von', value: executor ? `${executor.tag}` : 'Unbekannt', inline: true },
            { name: '📝 Änderungen', value: changes.join('\n'), inline: false }
          )
          .setTimestamp();

        await setupLogging.sendLog(newChannel.guild, embed);
      }
    });

    // Rolle erstellt
    client.on(Events.GuildRoleCreate, async (role) => {
      const auditLogs = await role.guild.fetchAuditLogs({ 
        limit: 1, 
        type: AuditLogEvent.RoleCreate 
      }).catch(() => null);
      const executor = auditLogs?.entries.first()?.executor;

      const embed = new EmbedBuilder()
        .setTitle('🎭 Rolle erstellt')
        .setColor('#00ff00')
        .addFields(
          { name: '🎭 Rolle', value: `${role.name}`, inline: true },
          { name: '🆔 ID', value: role.id, inline: true },
          { name: '👮 Von', value: executor ? `${executor.tag}` : 'Unbekannt', inline: true }
        )
        .setTimestamp();

      await setupLogging.sendLog(role.guild, embed);
    });

    // Rolle gelöscht
    client.on(Events.GuildRoleDelete, async (role) => {
      const auditLogs = await role.guild.fetchAuditLogs({ 
        limit: 1, 
        type: AuditLogEvent.RoleDelete 
      }).catch(() => null);
      const executor = auditLogs?.entries.first()?.executor;

      const embed = new EmbedBuilder()
        .setTitle('🗑️ Rolle gelöscht')
        .setColor('#ff0000')
        .addFields(
          { name: '🎭 Rolle', value: `${role.name}`, inline: true },
          { name: '🆔 ID', value: role.id, inline: true },
          { name: '👮 Von', value: executor ? `${executor.tag}` : 'Unbekannt', inline: true }
        )
        .setTimestamp();

      await setupLogging.sendLog(role.guild, embed);
    });

    // Emoji erstellt/gelöscht
    client.on(Events.GuildEmojiCreate, async (emoji) => {
      const auditLogs = await emoji.guild.fetchAuditLogs({ 
        limit: 1, 
        type: AuditLogEvent.EmojiCreate 
      }).catch(() => null);
      const executor = auditLogs?.entries.first()?.executor;

      const embed = new EmbedBuilder()
        .setTitle('😀 Emoji erstellt')
        .setColor('#00ff00')
        .setThumbnail(emoji.url)
        .addFields(
          { name: '😀 Emoji', value: `${emoji} (:${emoji.name}:)`, inline: true },
          { name: '👮 Von', value: executor ? `${executor.tag}` : 'Unbekannt', inline: true }
        )
        .setTimestamp();

      await setupLogging.sendLog(emoji.guild, embed);
    });

    client.on(Events.GuildEmojiDelete, async (emoji) => {
      const auditLogs = await emoji.guild.fetchAuditLogs({ 
        limit: 1, 
        type: AuditLogEvent.EmojiDelete 
      }).catch(() => null);
      const executor = auditLogs?.entries.first()?.executor;

      const embed = new EmbedBuilder()
        .setTitle('🗑️ Emoji gelöscht')
        .setColor('#ff0000')
        .setThumbnail(emoji.url)
        .addFields(
          { name: '😀 Emoji', value: `:${emoji.name}:`, inline: true },
          { name: '👮 Von', value: executor ? `${executor.tag}` : 'Unbekannt', inline: true }
        )
        .setTimestamp();

      await setupLogging.sendLog(emoji.guild, embed);
    });

    // Voice State Update
    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
      if (!newState.guild) return;

      // User joined voice
      if (!oldState.channel && newState.channel) {
        const embed = new EmbedBuilder()
          .setTitle('🔊 Voice Channel beigetreten')
          .setColor('#00ff00')
          .addFields(
            { name: '👤 User', value: `${newState.member} (${newState.member.user.tag})`, inline: true },
            { name: '📍 Channel', value: newState.channel.name, inline: true }
          )
          .setTimestamp();

        await setupLogging.sendLog(newState.guild, embed);
      }

      // User left voice
      if (oldState.channel && !newState.channel) {
        const embed = new EmbedBuilder()
          .setTitle('🔇 Voice Channel verlassen')
          .setColor('#ff0000')
          .addFields(
            { name: '👤 User', value: `${oldState.member} (${oldState.member.user.tag})`, inline: true },
            { name: '📍 Channel', value: oldState.channel.name, inline: true }
          )
          .setTimestamp();

        await setupLogging.sendLog(oldState.guild, embed);
      }

      // User moved voice
      if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
        const embed = new EmbedBuilder()
          .setTitle('🔀 Voice Channel gewechselt')
          .setColor('#ffaa00')
          .addFields(
            { name: '👤 User', value: `${newState.member} (${newState.member.user.tag})`, inline: false },
            { name: '📍 Von', value: oldState.channel.name, inline: true },
            { name: '📍 Nach', value: newState.channel.name, inline: true }
          )
          .setTimestamp();

        await setupLogging.sendLog(newState.guild, embed);
      }
    });

    // GENERISCHER EVENT LOGGER (optional, kann viele Logs erzeugen!)
    if (process.env.LOG_ALL_EVENTS === 'true') {
      const allEvents = Object.values(Events);
      const handledEvents = new Set([
        Events.MessageDelete,
        Events.MessageUpdate,
        Events.GuildMemberAdd,
        Events.GuildMemberRemove,
        Events.GuildBanAdd,
        Events.GuildBanRemove,
        Events.GuildMemberUpdate,
        Events.ChannelCreate,
        Events.ChannelDelete,
        Events.ChannelUpdate,
        Events.GuildRoleCreate,
        Events.GuildRoleDelete,
        Events.GuildEmojiCreate,
        Events.GuildEmojiDelete,
        Events.VoiceStateUpdate
      ]);

      for (const eventName of allEvents) {
        if (handledEvents.has(eventName)) continue;
        client.on(eventName, async (...args) => {
          // Versuche Guild zu finden
          let guild = null;
          for (const arg of args) {
            if (arg && arg.guild) { guild = arg.guild; break; }
          }
          // Fallback: keine Guild, dann nicht loggen
          if (!guild) return;
          try {
            await setupLogging.sendLog(guild, {
              title: `Unbehandeltes Event: ${eventName}`,
              description: `Event-Argumente: \n\n\`\`\`js\n${JSON.stringify(args, null, 2).slice(0, 1800)}\n\`\`\``,
              category: 'system',
              level: 'debug'
            });
          } catch (e) {
            // Fehler ignorieren, um Endlosschleifen zu vermeiden
          }
        });
      }
      console.log('⚠️ Generischer Event-Logger AKTIV! (LOG_ALL_EVENTS=true)');
    }
    console.log('✅ Logging Event Handler registriert');
  }
};
