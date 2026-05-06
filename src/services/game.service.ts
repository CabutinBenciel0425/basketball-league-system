import { PrismaClient, Status } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

type GetGamesParams = {
  status?: Status;
  divisionId?: string;
  teamId?: string;
  page: number;
  limit: number;
};

type PlayerStat = {
  playerId: string;
  name: string;
  teamId: string | null;

  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  fouls: number;
  turnovers: number;
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

export async function getGameById(id: string) {
  const game = await prisma.game.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      date: true,
      status: true,
      stage: true,
      notes: true,

      scoreA: true,
      scoreB: true,

      teamAId: true,
      teamBId: true,

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
      stats: {
        select: {
          points: true,
          rebounds: true,
          assists: true,
          steals: true,
          blocks: true,
          fouls: true,
          turnovers: true,

          player: {
            select: {
              user: {
                select: {
                  fullName: true,
                },
              },
              id: true,
              teamId: true,
            },
          },
        },
      },
    },
  });

  if (!game) return null;

  const teamAStats: PlayerStat[] = [];
  const teamBStats: PlayerStat[] = [];

  const {
    id: gameId,
    date,
    status,
    stage,
    notes,
    teamA,
    teamB,
    teamAId,
    teamBId,
    scoreA,
    scoreB,
    playerOfTheGame,
    stats,
  } = game;

  for (const stat of stats) {
    const data: PlayerStat = {
      playerId: stat.player.id,
      name: stat.player.user.fullName,
      teamId: stat.player.teamId,

      points: stat.points,
      rebounds: stat.rebounds,
      assists: stat.assists,
      steals: stat.steals,
      blocks: stat.blocks,
      fouls: stat.fouls,
      turnovers: stat.turnovers,
    };

    if (stat.player.teamId === teamAId) {
      teamAStats.push(data);
    } else if (stat.player.teamId === teamBId) {
      teamBStats.push(data);
    }
  }

  const formattedPlayerOfTheGame = playerOfTheGame
    ? {
        id: playerOfTheGame.id,
        name: playerOfTheGame.user.fullName,
      }
    : null;
  return {
    id: gameId,
    date: date.toISOString(),
    status,
    stage,
    notes,
    teamA,
    teamB,
    score: { teamA: scoreA, teamB: scoreB },
    playerOfTheGame: formattedPlayerOfTheGame,
    stats: { teamA: teamAStats, teamB: teamBStats },
  };
}
