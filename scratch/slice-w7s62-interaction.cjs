// W7 slice 62 battery: Events/interaction/{contextCommandHandler,
// slashCommandHandler, messageCommandHandler} dispatch legs, verbatim.
'use strict';
let pass = 0, fail = 0;
function eq(actual, expected, label) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; } else { fail++; console.log(`FAIL ${label}: got ${a} want ${e}`); }
}

// ---- A. contextCommandHandler.ts:28-33 guard ----
function contextProceeds(interaction) {
  // if (!interaction.isContextMenuCommand() || interaction.user.bot) return;
  if (!interaction.isContextMenuCommand || interaction.user.bot) return false;
  return true; // guild gate commented out -> DMs proceed
}
eq(contextProceeds({ isContextMenuCommand: false, user: { bot: false } }), false, 'A1 non-context drops');
eq(contextProceeds({ isContextMenuCommand: true, user: { bot: true } }), false, 'A2 bot drops');
eq(contextProceeds({ isContextMenuCommand: true, user: { bot: false }, guild: undefined }), true, 'A3 DM context proceeds (gate commented)');
eq(contextProceeds({ isContextMenuCommand: true, user: { bot: false }, guild: {} }), true, 'A4 guild context proceeds');
// thinking -> deferReply, cmd && run
function contextDispatch(cmd) {
  const calls = [];
  if (cmd && cmd.thinking) calls.push('deferReply');
  if (cmd) calls.push('run');
  return calls;
}
eq(contextDispatch({ thinking: true }), ['deferReply', 'run'], 'A5 thinking defers+runs');
eq(contextDispatch({ thinking: false }), ['run'], 'A6 non-thinking runs w/o defer');
eq(contextDispatch(undefined), [], 'A7 missing cmd no-op');

// ---- B. slashCommandHandler.ts ----
// B1 autocomplete leg (:66-70): isAutocomplete -> cmd?.autocomplete + return
function slashRoute(interaction) {
  if (interaction.isAutocomplete) return 'autocomplete-arm';
  if (!interaction.isChatInputCommand || interaction.user.bot) return 'drop';
  return 'dispatch';
}
eq(slashRoute({ isAutocomplete: true }), 'autocomplete-arm', 'B1 autocomplete arm');
eq(slashRoute({ isAutocomplete: false, isChatInputCommand: false, user: { bot: false } }), 'drop', 'B2a non-chat drops');
eq(slashRoute({ isAutocomplete: false, isChatInputCommand: true, user: { bot: true } }), 'drop', 'B2b bot drops');
eq(slashRoute({ isAutocomplete: false, isChatInputCommand: true, user: { bot: false } }), 'dispatch', 'B2c chat dispatches');

// B3 resolveTarget (:42-61)
function resolveTarget(commands, subCommands, commandName, group, subCommand) {
  const command = commands.get(commandName);
  if (!command) return null;
  if (group && subCommand) {
    const commandPath = `${commandName} ${group} ${subCommand}`;
    const subCmd = subCommands.get(commandPath);
    if (subCmd?.run) return { command, target: subCmd, commandPath };
  } else if (subCommand) {
    const commandPath = `${commandName} ${subCommand}`;
    const subCmd = subCommands.get(commandPath);
    if (subCmd?.run) return { command, target: subCmd, commandPath };
  }
  return { command, target: command, commandPath: commandName };
}
const cmds = new Map([['mod', { name: 'mod' }]]);
const subs = new Map([
  ['mod ban', { run: 1 }], ['mod user timeout', { run: 1 }], ['mod norun', {}],
]);
eq(resolveTarget(cmds, subs, 'mod', 'user', 'timeout').commandPath, 'mod user timeout', 'B3a group+sub path');
eq(resolveTarget(cmds, subs, 'mod', null, 'ban').commandPath, 'mod ban', 'B3b sub path');
eq(resolveTarget(cmds, subs, 'mod', null, 'ban').target.run, 1, 'B3c sub target');
eq(resolveTarget(cmds, subs, 'nope', null, null), null, 'B3d missing cmd null');
eq(resolveTarget(cmds, subs, 'mod', null, 'norun').target.name, 'mod', 'B3e sub-without-run falls to base');
eq(resolveTarget(cmds, subs, 'mod', null, 'missing').commandPath, 'mod', 'B3f sub-miss falls to base');
eq(resolveTarget(cmds, subs, 'mod', 'user', 'missing').commandPath, 'mod', 'B3g group+sub-miss falls to base');

// B5 DM gate (:79-82): channel DM && !integration_types?.includes(1)
const ChannelTypeDM = 1;
function dmBlocked(channelType, integration_types) {
  return channelType === ChannelTypeDM && !integration_types?.includes(1);
}
eq(dmBlocked(1, undefined), true, 'B5a DM no-integration blocked');
eq(dmBlocked(1, [0]), true, 'B5b DM guild-install blocked');
eq(dmBlocked(1, [1]), false, 'B5c DM user-install proceeds');
eq(dmBlocked(0, undefined), false, 'B5d guild proceeds');

// ---- C. parseMessageCommand (messageCommandHandler.ts:43-152) ----
const User = 6, Sub = 1, Group = 2;
function parseMessageCommand(message_commands, content, prefix, reference) {
  if (!content.startsWith(prefix)) return { success: false };
  const args = content.slice(prefix.length).trim().split(/ +/g);
  const commandName = args.shift()?.toLowerCase();
  if (!commandName) return { success: false };
  if (reference && reference.messageId) {
    const refMsg = reference.resolved; // cache.get || fetch collapsed
    if (refMsg && refMsg.author) {
      const potentialSubCommandName = args[0]?.toLowerCase();
      const mainCommand = message_commands.get(commandName);
      if (mainCommand && mainCommand.options) {
        const subCommand = mainCommand.options.find(
          (opt) => (opt.name === potentialSubCommandName ||
            opt.aliases?.includes(potentialSubCommandName)) && (opt.type === 1 || opt.type === 2)
        );
        if (subCommand) {
          args.shift();
          const userOptionIndex = subCommand.options?.findIndex((opt) => opt.type === User);
          if (userOptionIndex !== undefined && userOptionIndex !== -1) {
            args.splice(userOptionIndex, 0, refMsg.author.id);
          }
        } else {
          const userOptionIndex = mainCommand.options.findIndex((opt) => opt.type === User);
          if (userOptionIndex !== -1) args.splice(userOptionIndex, 0, refMsg.author.id);
        }
      }
    }
  }
  const directMessageCommand = message_commands.get(commandName);
  if (directMessageCommand?.commandFullName?.includes(' ')) {
    const commandPath = directMessageCommand.commandFullName;
    return { success: true, args, command: 'parent:' + commandPath.split(' ')[0], subCommand: directMessageCommand.name, commandPath };
  }
  const mainCommand = message_commands.get(commandName);
  if (mainCommand) {
    const potentialSubCommandName = args[0]?.toLowerCase();
    if (potentialSubCommandName && mainCommand.options) {
      const subCommand = mainCommand.options.find(
        (opt) => (opt.name === potentialSubCommandName ||
          opt.aliases?.includes(potentialSubCommandName)) && (opt.type === Sub || opt.type === Group)
      );
      if (subCommand?.commandFullName) {
        args.shift();
        return { success: true, args, command: mainCommand.name, subCommand: subCommand.name, commandPath: subCommand.commandFullName };
      }
    }
    return { success: true, args, command: mainCommand.name, commandPath: mainCommand.commandFullName ?? mainCommand.name };
  }
  return { success: false };
}
const mc = new Map([
  ['ban', { name: 'ban', commandFullName: 'mod ban' }], // flat leaf w/ space fullname
  ['mod', { name: 'mod', commandFullName: 'mod', options: [
    { name: 'ban', aliases: ['b'], type: 1, commandFullName: 'mod ban', options: [{ type: User }, { type: 3 }] },
    { name: 'list', type: 1, commandFullName: 'mod list', options: [{ type: 3 }] },
    { name: 'note', type: 3 },
  ]}],
  ['avatar', { name: 'avatar', commandFullName: 'avatar', options: [{ type: 3 }, { type: User }] }],
  ['ping', { name: 'ping', commandFullName: 'ping' }],
]);
eq(parseMessageCommand(mc, '?ping', '.', null).success, false, 'C1 no-prefix drops');
eq(parseMessageCommand(mc, '.', '.', null).success, false, 'C2 empty name drops');
let r = parseMessageCommand(mc, '.mod ban @x', '.', { messageId: '1', resolved: { author: { id: 'REF' } } });
eq(r.args, ['REF', '@x'], 'C3a ref+sub User@0 injects at 0');
r = parseMessageCommand(mc, '.avatar foo', '.', { messageId: '1', resolved: { author: { id: 'REF' } } });
eq(r.args, ['foo', 'REF'], 'C3b ref+main User@1 injects at 1');
r = parseMessageCommand(mc, '.mod list foo', '.', { messageId: '1', resolved: { author: { id: 'REF' } } });
eq(r.args, ['foo'], 'C3c ref+sub-no-User shifts only');
r = parseMessageCommand(mc, '.ping hi', '.', { messageId: '1', resolved: { author: { id: 'REF' } } });
eq(r.args, ['hi'], 'C3d ref+no-options unchanged');
r = parseMessageCommand(mc, '.mod ban @x', '.', null);
eq(r.args, ['@x'], 'C3e no-ref sub still shifts');
r = parseMessageCommand(mc, '.ban @x', '.', null);
eq([r.command, r.subCommand, r.commandPath, r.args], ['parent:mod', 'ban', 'mod ban', ['@x']], 'C4 flat space-fullname dispatches');
r = parseMessageCommand(mc, '.mod b @x', '.', null);
eq([r.subCommand, r.commandPath, r.args], ['ban', 'mod ban', ['@x']], 'C5a alias sub resolves+shifts');
r = parseMessageCommand(mc, '.mod note @x', '.', null);
eq([r.subCommand, r.commandPath], [undefined, 'mod'], 'C5b type-3 name ignored as sub');
r = parseMessageCommand(mc, '.ping hi', '.', null);
eq([r.commandPath, r.args], ['ping', ['hi']], 'C5c base fallback path');

// D. messageCreate gate (:157): !guild || author.bot || !channel
function msgCreateProceeds(msg) {
  if (!msg.guild || msg.author.bot || !msg.channel) return false;
  return true;
}
eq(msgCreateProceeds({ guild: null, author: { bot: false }, channel: {} }), false, 'D1 no-guild drops');
eq(msgCreateProceeds({ guild: {}, author: { bot: true }, channel: {} }), false, 'D2 bot drops');
eq(msgCreateProceeds({ guild: {}, author: { bot: false }, channel: null }), false, 'D3 no-channel drops');
eq(msgCreateProceeds({ guild: {}, author: { bot: false }, channel: {} }), true, 'D4 proceeds');

// E. splice clamp (native splice semantics for the injection leg)
function spliceReplyUser(args, index, id) { args.splice(index, 0, id); return args; }
eq(spliceReplyUser(['x'], 1, 'REF'), ['x', 'REF'], 'E1 in-range inserts');
eq(spliceReplyUser([], 1, 'REF'), ['REF'], 'E2 over-long clamps to end');
eq(spliceReplyUser(['a', 'b'], 5, 'REF'), ['a', 'b', 'REF'], 'E3 far-over clamps to end');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
