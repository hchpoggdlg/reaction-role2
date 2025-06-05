const { 
  Client, Intents, MessageActionRow, MessageButton,
  Permissions,
  REST, Routes
} = require('discord.js');

const TOKEN = 'MTM4MDExODIxMzgwMjg1NjQ4MA.Gwm2Hi.MzHWuD-82WmCenyLGbIhPOaggr2T86UO-mqYOs';
const CLIENT_ID = '1380118213802856480';
const GUILD_ID = '1273843544154701914';

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS],
  partials: ['CHANNEL'],
});

const commands = [
  {
    name: 'reactionrole',
    description: 'إنشاء رسالة رياكشن رول جديدة',
    options: [
      {
        name: 'label',
        type: 'STRING',
        description: 'اسم الزر',
        required: true,
      },
      {
        name: 'color',
        type: 'STRING',
        description: 'لون الزر',
        required: true,
        choices: [
          { name: 'أزرق', value: 'PRIMARY' },
          { name: 'رمادي', value: 'SECONDARY' },
          { name: 'أخضر', value: 'SUCCESS' },
          { name: 'أحمر', value: 'DANGER' },
        ],
      },
      {
        name: 'role',
        type: 'ROLE',
        description: 'الرتبة التي سيتم إعطاؤها',
        required: true,
      },
      {
        name: 'message',
        type: 'STRING',
        description: 'محتوى الرسالة',
        required: true,
      },
    ],
  },
  {
    name: 'addbutton',
    description: 'إضافة زر جديد لرسالة موجودة',
    options: [
      {
        name: 'label',
        type: 'STRING',
        description: 'اسم الزر',
        required: true,
      },
      {
        name: 'color',
        type: 'STRING',
        description: 'لون الزر',
        required: true,
        choices: [
          { name: 'أزرق', value: 'PRIMARY' },
          { name: 'رمادي', value: 'SECONDARY' },
          { name: 'أخضر', value: 'SUCCESS' },
          { name: 'أحمر', value: 'DANGER' },
        ],
      },
      {
        name: 'role',
        type: 'ROLE',
        description: 'الرتبة المرتبطة',
        required: true,
      },
      {
        name: 'message_id',
        type: 'STRING',
        description: 'معرف الرسالة',
        required: true,
      },
    ],
  },
];

const rest = new REST({ version: '9' }).setToken(TOKEN);
async function registerCommands() {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('✅ تم تسجيل الأوامر');
  } catch (err) {
    console.error('❌ فشل في تسجيل الأوامر:', err);
  }
}

client.once('ready', () => {
  console.log(`🔧 Logged in as ${client.user.tag}`);
  client.user.setPresence({
    activity: { name: '/reactionrole', type: 'PLAYING' },
    status: 'dnd'
  });
  registerCommands();
});

const reactionRoles = new Map();

client.on('interactionCreate', async interaction => {
  try {
    if (!interaction.isCommand()) return;

    const member = interaction.member;
    if (!member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
      return interaction.reply({ content: `❌ لست مؤهلاً لاستخدام ${client.user.username}`, ephemeral: true });
    }

    const { commandName, options } = interaction;

    if (commandName === 'reactionrole') {
      const label = options.getString('label');
      const color = options.getString('color');
      const role = options.getRole('role');
      const message = options.getString('message');

      const button = new MessageButton()
        .setCustomId(`rr_${role.id}`)
        .setLabel(label)
        .setStyle(color);

      const row = new MessageActionRow().addComponents(button);
      const msg = await interaction.channel.send({ content: message, components: [row] });
      reactionRoles.set(msg.id, [{ roleId: role.id, label, color }]);

      return interaction.reply({ content: '✅ تم إنشاء رسالة الرياكشن رول', ephemeral: true });

    } else if (commandName === 'addbutton') {
      const label = options.getString('label');
      const color = options.getString('color');
      const role = options.getRole('role');
      const messageId = options.getString('message_id');

      const msg = await interaction.channel.messages.fetch(messageId);
      const oldRow = msg.components[0];
      const components = oldRow ? oldRow.components : [];

      const button = new MessageButton()
        .setCustomId(`rr_${role.id}`)
        .setLabel(label)
        .setStyle(color);

      components.push(button);
      const newRow = new MessageActionRow().addComponents(components);

      await msg.edit({ components: [newRow] });
      reactionRoles.set(messageId, [...(reactionRoles.get(messageId) || []), { roleId: role.id, label, color }]);

      return interaction.reply({ content: '✅ تم إضافة زر جديد', ephemeral: true });
    }
  } catch (err) {
    console.error('❗ خطأ أثناء تنفيذ التفاعل:', err);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: '❌ حدث خطأ أثناء تنفيذ العملية.', ephemeral: true }).catch(() => { });
    } else {
      await interaction.reply({ content: '❌ حدث خطأ أثناء تنفيذ العملية.', ephemeral: true }).catch(() => { });
    }
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  const [prefix, roleId] = interaction.customId.split('_');
  if (prefix !== 'rr') return;

  const role = interaction.guild.roles.cache.get(roleId);
  const member = interaction.member;

  if (!role) {
    return interaction.reply({ content: '❌ الرتبة غير موجودة', ephemeral: true });
  }

  if (member.roles.cache.has(roleId)) {
    try {
      await member.roles.remove(roleId);
      return interaction.reply({ content: `❎ تم إزالة رتبة ${role.name}`, ephemeral: true });
    } catch (err) {
      console.error('❌ خطأ عند إزالة الرتبة:', err);
      return interaction.reply({ content: '❌ لا يمكنني إزالة هذه الرتبة منك.', ephemeral: true });
    }
  } else {
    try {
      await member.roles.add(roleId);
      return interaction.reply({ content: `✅ تم إعطاؤك رتبة ${role.name}`, ephemeral: true });
    } catch (err) {
      console.error('❌ خطأ عند إعطاء الرتبة:', err);
      return interaction.reply({ content: '❌ لا يمكنني إعطاؤك هذه الرتبة، تحقق من صلاحياتي وترتيب الرتب.', ephemeral: true });
    }
  }
});

process.on('uncaughtException', err => {
  console.error('❗ uncaughtException:', err);
});
process.on('unhandledRejection', err => {
  console.error('❗ unhandledRejection:', err);
});

client.login(TOKEN);
