const config = require('./config.json');

module.exports = {
    giveaway: (config.everyoneMention ? "" : "")+"🎉🎉 **GIVEAWAY** 🎉🎉",
    giveawayEnded: (config.everyoneMention ? "" : "")+"🎉🎉 **GIVEAWAY ENDED** 🎉🎉",
    inviteToParticipate: "React with 🎉 to participate!",
    dropMessage: "Be the first to react with 🎉 !",
    drawing: 'Time remaining: {timestamp}',
    winMessage: "Congratulations, {winners}! You won **{this.prize}**!",
    embedFooter: "Giveaways for iHorizon",
    noWinner: "Giveaway cancelled, no valid participations.",
    hostedBy: "Hosted by: {this.hostedBy}",
    winners: "winner(s): ",
    endedAt: "Ended at"
};