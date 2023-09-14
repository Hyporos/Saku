const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
} = require("discord.js");
const culvertSchema = require("../../culvertSchema.js");

// ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ //

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rankings")
    .setDescription("View the culvert leaderboard")
    .addStringOption((option) =>
      option
        .setName("category")
        .setDescription("The leaderboard category")
        .setRequired(true)
        .addChoices(
          { name: "This week", value: "this_week" },
          { name: "Last week", value: "last_week" },
          { name: "Lifetime", value: "lifetime" }
        )
    ),

  // ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ //

  async execute(client, interaction) {
    const category = interaction.options.getString("category");

    await interaction.deferReply();

    // Create buttons & row
    const previous = new ButtonBuilder()
      .setCustomId("previous")
      .setLabel("Prev")
      .setStyle(ButtonStyle.Secondary);

    const next = new ButtonBuilder()
      .setCustomId("next")
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary);

    const pagination = new ActionRowBuilder().addComponents(previous, next);

    // Find the character with the given name
    const users = await culvertSchema.aggregate([
      {
        $unwind: "$characters",
      },
    ]);

    // Calculate the sum of lifetime character scores
    let lifetimeList = [];

    for (const user of users) {
      const totalScore = await culvertSchema.aggregate([
        {
          $unwind: "$characters",
        },
        {
          $unwind: "$characters.scores",
        },
        {
          $match: {
            "characters.name": {
              $regex: `^${user.characters.name}`,
              $options: "i",
            },
          },
        },
        {
          $group: {
            _id: null,
            total_score: {
              $sum: "$characters.scores.score",
            },
          },
        },
      ]);
      lifetimeList.push({
        name: user.characters.name,
        score: totalScore[0]?.total_score,
      });
    }

    // Sort the array of lifetime scores
    lifetimeList.sort((a, b) => {
      if (a.score === undefined) {
        return 1;
      }
      if (b.score === undefined) {
        return -1;
      }
      return b.score - a.score;
    });

    // Find the users rank

    // Create the rankings list embed field
    let firstRank = 0;
    let lastRank = 8;
    let page = 1;
    let placement = 1;
    const maxPage = Math.ceil(lifetimeList.length / 8);

    function getLifetimeRank() {
      let content = "\u0060\u0060\u0060";

      let padding = 20;

      for (let i = firstRank; i < lastRank; i++) {
        if (placement > 9) padding = 19; // Adjust padding based on placement length
        if (placement > 99) padding = 18;
        if (lifetimeList[i]?.name) {
          content = content.concat(
            `${placement}. ${lifetimeList[i].name.padEnd(padding, " ")}${
              lifetimeList[i].score || 0
            }\n`
          );
        }

        placement++;
      }
      return content.concat("\u0060\u0060\u0060");
    }

    // Original embed
    const rankings = new EmbedBuilder()
      .setColor(0xffc3c5)
      .setAuthor({ name: "Culvert Rankings" })
      .addFields({
        name: "Lifetime",
        value: `${getLifetimeRank()}`,
        inline: false,
      })
      .setFooter({ text: `Page ${page}/${maxPage} • Your rank: #71` });

    // Display responses via button collector
    const response = await interaction.editReply({
      embeds: [rankings],
      components: [pagination],
    });

    const filter = (i) => i.user.id === interaction.user.id;

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter,
      idle: 120000,
    });

    collector.on("collect", async (interaction) => {
      // Handle button presses
      if (interaction.customId === "previous") {
        if (page <= 1) {
          page = 1;
        } else {
          page--;
        }
        firstRank -= 8;
        lastRank -= 8;
        placement -= 16;

 // if previous page, decrement the placements
      } else if (interaction.customId === "next") {
        firstRank += 8;
        lastRank += 8;
        page++;
      }

      // New updated embed object // ! This should not be duplicated
      const rankingsUpdate = new EmbedBuilder()
        .setColor(0xffc3c5)
        .setAuthor({ name: "Culvert Rankings" })
        .addFields({
          name: "Lifetime",
          value: `${getLifetimeRank()}`,
          inline: false,
        })
        .setFooter({ text: `Page ${page}/${maxPage} • Your rank: #71` });

      // Display new page
      await interaction.deferUpdate();

      await interaction.editReply({
        embeds: [rankingsUpdate],
        components: [pagination],
      });

      return;
    });

    // Disable the buttons after 2 minutes of idling
    collector.on("end", () => {
      previous.setDisabled(true);
      next.setDisabled(true);

      // New updated embed object // ! This should not be duplicated
      const rankingsUpdate = new EmbedBuilder()
        .setColor(0xffc3c5)
        .setAuthor({ name: "Culvert Rankings" })
        .addFields({
          name: "Lifetime",
          value: `${getLifetimeRank()}`,
          inline: false,
        })
        .setFooter({ text: `Page ${page}/${maxPage} • Your rank: #71` });

      interaction.editReply({
        embeds: [rankingsUpdate],
        components: [pagination],
      });
    });
  },
};
