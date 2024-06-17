const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Seek advice from the Magic 8 Ball")
    .addStringOption((option) =>
      option
        .setName("question")
        .setDescription("What will you be asking?")
        .setRequired(true)
    ),

  async execute(interaction) {
    const questionOption = interaction.options.getString("question");

    const positive = [
      "Definitely",
      "It is certain",
      "Outlook good",
      "Without a doubt",
      "Felix says YA YA YAAAAAAAAAAA",
      "Arik says bet",
      "Ayub says fine I'll let you eat",
    ];

    const vague = [
      "Ask again later",
      "Lock in and ask again",
      "Ayub says I might have some food left, we shall see",
      "Mike says let me check... ask again later",
      "Vape says don't ask me",
    ];

    const negative = [
      "Doubt",
      "My sources say no",
      "Angelo says OH NAHHH",
      "Matt says oh hell nah",
      "William uses f3, no",
      "Miche says no",
    ];

    function getRandomElement(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }

    function get8BallResponse() {
      const rand = Math.random();
      let embedColor;
      let response;

      if (rand < 1 / 3) {
        // Positive (1/3 chance)
        embedColor = 0x85ff89;
        response = getRandomElement(positive);
      } else if (rand < 2 / 3) {
        // Vague (1/3 chance)
        embedColor = 0xFFCB80;
        response = getRandomElement(vague);
      } else {
        // Negative (1/3 chance)
        embedColor = 0xff8585;
        response = getRandomElement(negative);
      }

      return { response, embedColor };
    }

    const { response, embedColor } = get8BallResponse();

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(":8ball: | " + response)
      .setDescription(questionOption);

    interaction.reply({ embeds: [embed] });
  },
};
