import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding started....");

  //creating league
  const league = await prisma.league.create({
    data: {
      name: "Habitat Community League",
    },
  });

  //creating division
  const division = await prisma.division.create({
    data: {
      name: "Open Division",
      format: "ROUND_ROBIN",
      leagueId: league.id,
    },
  });

  const teamNames = [
    "Team Panot",
    "Team Baho",
    "Team Lasinggero",
    "Team Iyakin",
  ];

  const teams = [];

  //looping teamNames and creating the team
  for (const name of teamNames) {
    const team = await prisma.team.create({
      data: {
        name,
        divisionId: division.id,
      },
    });
    teams.push(team);
  }

  //creating players
  for (const team of teams) {
    for (let i = 1; i <= 5; i++) {
      const user = await prisma.user.create({
        data: {
          fullName: `${team.name} Player ${i}`,
          birthdate: new Date("1995-01-01"),
          email: `${team.name.replace(/\s/g, "").toLowerCase()}${i}@league.com`,
          password: "password123",
          role: "PLAYER",
        },
      });

      await prisma.player.create({
        data: {
          userId: user.id,
          teamId: team.id,
        },
      });
    }
  }

  //creating games
  await prisma.game.create({
    data: {
      divisionId: division.id,
      teamAId: teams[0].id,
      teamBId: teams[1].id,
      date: new Date("2026-05-06T16:00:00"),
      status: "UPCOMING",
      stage: "GROUP_STAGE",
    },
  });

  await prisma.game.create({
    data: {
      divisionId: division.id,
      teamAId: teams[2].id,
      teamBId: teams[3].id,
      date: new Date("2026-05-06T18:00:00"),
      status: "UPCOMING",
      stage: "GROUP_STAGE",
    },
  });
}

main()
  .then(() => {
    console.log("Seeding finished.");
    prisma.$disconnect();
  })
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
