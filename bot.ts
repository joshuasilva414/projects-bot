import fs from "node:fs";
import path from "node:path";
import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  MessageFlags,
} from "discord.js";

import { Hono } from "hono";
import { serve } from "bun";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();

const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file: string) => file.endsWith(".ts"));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error while executing this command!",
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command!",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN as string);

const app = new Hono();

const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID as string);

if (!guild) {
  throw new Error(`Guild ${process.env.DISCORD_GUILD_ID} not found`);
}

app.get("/", (c) => c.text("Hono!"));

app.get("/roles/:username", async (c) => {
  const username = c.req.param("username");

  const member = await guild.members.fetch(username);
  if (!member) {
    return c.json({ error: "User not found" }, 404);
  }

  const roles = member.roles.cache;

  return c.json({
    username: member.user.username,
    roles: Array.from(roles),
  });
});

serve({
  fetch: app.fetch,
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
});
