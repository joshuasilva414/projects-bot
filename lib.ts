import { Client, GuildMember } from "discord.js";

export const getGuildMemberByUsername = async (
  client: Client,
  username: string
) => {
  const guild = await client.guilds.fetch(
    process.env.DISCORD_GUILD_ID as string
  );
  const member = await guild.members.fetch({ query: username });
  if (!member) {
    return null;
  }
  return member.first() as GuildMember;
};
