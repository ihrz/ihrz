module.exports = async (client, invite) => {
    async function inviteManager() {
        await client.invites.get(invite.guild.id).delete(invite.code);
    };

    await inviteManager();
};