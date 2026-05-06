import { PrismaClient, Status } from "@prisma/client";

const prisma = new PrismaClient();

type GetGamesParams = {
  status?: Status;
  divisionId?: string;
  teamId?: string;
  page: number;
  limit: number;
};

export async function getGames({
  status,
  divisionId,
  teamId,
  page,
  limit,
}: GetGamesParams) {
  const skip = (page - 1) * limit;
  const take = limit;

  const where: any = {};

  if (status) where.status = status;
  if (divisionId) where.status = divisionId;

  if (teamId) {
    where.OR = [{ teamAId: teamId }, { teamBId: teamId }];
  }

  const total = await prisma.game.count({ where });

  const gamesRaw = await prisma.game.findMany({
    where,
    skip,
    take,
    orderBy: {
      date: "asc",
    },
    select: {
      id: true,
      date: true,
      status: true,
      stage: true,
      scoreA: true,
      scoreB: true,

      division: {
        select: {
          id: true,
          name: true,
        },
      },

      teamA: {
        select: {
          id: true,
          name: true,
        },
      },

      teamB: {
        select: {
          id: true,
          name: true,
        },
      },

      playerOfTheGame: {
        select: {
          id: true,
          user: {
            select: {
              fullName: true,
            },
          },
        },
      },
    },
  });

  const data = gamesRaw.map((g) => ({
    id: g.id,
    date: g.date.toISOString(),
    status: g.status,
    stage: g.stage,
    teamA: {
      id: g.teamA.id,
      name: g.teamA.name,
    },
    teamB: {
      id: g.teamB.id,
      name: g.teamB.name,
    },
    score: {
      teamA: g.scoreA,
      teamB: g.scoreB,
    },
    division: {
      id: g.division.id,
      name: g.division.name,
    },
    playerOfTheGame: g.playerOfTheGame
      ? {
          id: g.playerOfTheGame.id,
          name: g.playerOfTheGame.user.fullName,
        }
      : null,
  }));

  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}
