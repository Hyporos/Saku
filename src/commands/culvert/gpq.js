const { SlashCommandBuilder } = require("discord.js");
const dayjs = require("dayjs");
const culvertSchema = require("../../culvertSchema.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gpq")
    .setDescription("Log your culvert score for this week")
    .addIntegerOption((option) =>
      option
        .setName("culvert_score")
        .setDescription("The culvert score to be logged")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("character")
        .setDescription("The character that the score will be logged to")
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const user = await culvertSchema.findById(interaction.user.id, "characters").exec();
    const value = interaction.options.getFocused().toLowerCase();

    let choices = [];

    user.characters.forEach((character) => {
        choices.push(character.name);
    });

    const filtered = choices
      .filter((choice) => choice.toLowerCase().includes(value))
      .slice(0, 25);

    if (!interaction) return;

    await interaction.respond(
      filtered.map((choice) => ({ name: choice, value: choice }))
    );
  },

  async execute(client, interaction) {
    const selectedCharacter = interaction.options.getString("character");
    const culvertScore = interaction.options.getInteger("culvert_score");

    const reset = String(dayjs().day(0).format("MM/DD/YY")); // Day of the week the culvert score gets reset (sunday)

    await culvertSchema.findOneAndUpdate(
      { "characters.name": selectedCharacter },
      {
        $addToSet: {
          "characters.$[index].scores": { score: culvertScore, date: reset },
        },
      },
      { arrayFilters: [{ "index.name": selectedCharacter }], new: true }
    );

    interaction.reply({
      content: `${selectedCharacter} has scored **${culvertScore}** for this week! (${reset})`,
    });
  },
};
