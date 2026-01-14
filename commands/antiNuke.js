const fs = require('fs');
const path = require('path');

let SlashCommandBuilder;
let PermissionFlagsBits;
let ChannelType;

try {
  // Prefer discord.js v14 style imports
  ({ SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js'));
} catch (_) {
  // Fallback for v13 where SlashCommandBuilder is in @discordjs/builders
  ({ SlashCommandBuilder } = require('@discordjs/builders'));
  try {
    // Provide minimal shims
    ({ Permissions: { FLAGS: PermissionFlagsBits } } = require('discord.js'));
  } catch (_) {
    PermissionFlagsBits = { Administrator: 0x00000008 };
  }
}

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'antinuke.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2));
}

function readStore() {
  ensureStore();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (e) {
    return {};
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

function getDefaultConfig() {
  return {
    enabled: false,
    thresholds: {
      channels: 3,
      roles: 3,
      bans: 3,
      kicks: 3,
    },
    timeWindowSec: 60,
    punishment: 'timeout', // timeout | ban | none
    logChannelId: null,
  };
}

function toCodeBlock(obj) {
  return '```json\n' + JSON.stringify(obj, null, 2) + '\n```';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinuke')
    .setDescription('Anti-Nuke Schutz konfigurieren')
    .setDefaultMemberPermissions(PermissionFlagsBits?.Administrator ?? PermissionFlagsBits)
    .addSubcommand(sc => sc
      .setName('enable')
      .setDescription('Anti-Nuke aktivieren'))
    .addSubcommand(sc => sc
      .setName('disable')
      .setDescription('Anti-Nuke deaktivieren'))
    .addSubcommand(sc => sc
      .setName('status')
      .setDescription('Aktuelle Anti-Nuke Konfiguration anzeigen'))
    .addSubcommand(sc => sc
      .setName('set')
      .setDescription('Grenzwerte und Optionen festlegen')
      .addIntegerOption(o => o.setName('channels').setDescription('Max. Kanal-Löschungen im Zeitfenster').setMinValue(1))
      .addIntegerOption(o => o.setName('roles').setDescription('Max. Rollen-Löschungen im Zeitfenster').setMinValue(1))
      .addIntegerOption(o => o.setName('bans').setDescription('Max. Bans im Zeitfenster').setMinValue(1))
      .addIntegerOption(o => o.setName('kicks').setDescription('Max. Kicks im Zeitfenster').setMinValue(1))
      .addIntegerOption(o => o.setName('zeitfenster').setDescription('Zeitfenster in Sekunden').setMinValue(10).setMaxValue(3600))
      .addStringOption(o => o.setName('strafe').setDescription('Strafe: timeout | ban | none').addChoices(
        { name: 'timeout', value: 'timeout' },
        { name: 'ban', value: 'ban' },
        { name: 'none', value: 'none' },
      ))
      .addChannelOption(o => o
        .setName('logkanal')
        .setDescription('Kanal für Anti-Nuke Logs')
        .addChannelTypes?.(ChannelType ? [ChannelType.GuildText] : [])
      )
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').CommandInteraction} interaction
   */
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' ? interaction.isChatInputCommand() : true;
    if (!isSlash) return;

    const guild = interaction.guild;
    if (!guild) return interaction.reply({ content: 'Dieser Befehl kann nur in einem Server verwendet werden.', ephemeral: true });

    // Permission check for the user
    const memberPerms = interaction.memberPermissions || interaction.member?.permissions;
    const hasAdmin = typeof memberPerms?.has === 'function'
      ? memberPerms.has(PermissionFlagsBits?.Administrator ?? PermissionFlagsBits?.ADMINISTRATOR ?? PermissionFlagsBits)
      : false;

    if (!hasAdmin) {
      return interaction.reply({ content: 'Du benötigst Administrator-Rechte, um Anti-Nuke zu konfigurieren.', ephemeral: true });
    }

    const store = readStore();
    const key = guild.id;
    if (!store[key]) store[key] = getDefaultConfig();

    const sub = interaction.options.getSubcommand();

    if (sub === 'enable') {
      store[key].enabled = true;
      writeStore(store);
      return interaction.reply({ content: '✅ Anti-Nuke wurde aktiviert.', ephemeral: false });
    }

    if (sub === 'disable') {
      store[key].enabled = false;
      writeStore(store);
      return interaction.reply({ content: '🛑 Anti-Nuke wurde deaktiviert.', ephemeral: false });
    }

    if (sub === 'status') {
      const cfg = store[key];
      const summary = {
        enabled: cfg.enabled,
        thresholds: cfg.thresholds,
        timeWindowSec: cfg.timeWindowSec,
        punishment: cfg.punishment,
        logChannelId: cfg.logChannelId,
      };
      return interaction.reply({ content: `Aktuelle Konfiguration:\n${toCodeBlock(summary)}`, ephemeral: true });
    }

    if (sub === 'set') {
      const channels = interaction.options.getInteger('channels');
      const roles = interaction.options.getInteger('roles');
      const bans = interaction.options.getInteger('bans');
      const kicks = interaction.options.getInteger('kicks');
      const zeitfenster = interaction.options.getInteger('zeitfenster');
      const strafe = interaction.options.getString('strafe');
      const logkanal = interaction.options.getChannel('logkanal');

      if (channels) store[key].thresholds.channels = channels;
      if (roles) store[key].thresholds.roles = roles;
      if (bans) store[key].thresholds.bans = bans;
      if (kicks) store[key].thresholds.kicks = kicks;
      if (zeitfenster) store[key].timeWindowSec = zeitfenster;
      if (strafe) store[key].punishment = strafe;
      if (logkanal) store[key].logChannelId = logkanal.id;

      writeStore(store);
      const cfg = store[key];
      return interaction.reply({ content: `✅ Gespeichert. Neue Konfiguration:\n${toCodeBlock(cfg)}`, ephemeral: false });
    }

    return interaction.reply({ content: 'Unbekannter Unterbefehl.', ephemeral: true });
  },
};
