import { getGames } from "@/services/game.service";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const gameSchema = z.object({
      teamAId: z.string().min(1, "Team A id is invalid"),
      teamBId: z.string().min(1, "Team B id is invalid"),
      date: z.coerce.date().min(1, "Invalid date format"),
      stage: z.enum(["GROUP_STAGE", "QUARTERFINAL", "SEMIFINAL", "FINAL"]),
      notes: z.string().optional(),
    });

    const body = await request.json();

    const result = gameSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: result.error.flatten() },
        { status: 400 },
      );
    }

    if (result.data.teamAId === result.data.teamBId)
      return NextResponse.json(
        { message: "Game must be played by two different teams" },
        { status: 400 },
      );

    const teams = await prisma.team.findMany({
      where: {
        id: {
          in: [result.data.teamAId, result.data.teamBId],
        },
      },
    });

    if (teams.length !== 2)
      return NextResponse.json(
        { message: "Fetched teams must only consist of 2" },
        { status: 400 },
      );

    const teamA = teams.find((t) => t.id === result.data.teamAId);
    const teamB = teams.find((t) => t.id === result.data.teamBId);

    if (!teamA || !teamB) {
      return NextResponse.json(
        { message: "One or both teams do not exist" },
        { status: 404 },
      );
    }

    if (teamA.divisionId !== teamB.divisionId) {
      return NextResponse.json(
        {
          message: "Teams must belong to the same division",
        },
        { status: 400 },
      );
    }

    const game = await prisma.game.create({
      data: {
        divisionId: teamA.divisionId,
        teamAId: result.data.teamAId,
        teamBId: result.data.teamBId,
        date: result.data.date,
        status: "UPCOMING",
        stage: result.data.stage,
        notes: result.data.notes ?? null,
      },
    });
    return NextResponse.json(
      { message: "Game created successfully", data: game },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const divisionId = searchParams.get("divisionId");
    const teamId = searchParams.get("teamId");
    const pageParam = Number(searchParams.get("page"));
    const limitParam = Number(searchParams.get("limit"));

    const MAX_LIMIT = 20;
    const DEFAULT_LIMIT = 6;
    const DEFAULT_PAGE = 1;

    const page = !pageParam || pageParam < 1 ? DEFAULT_PAGE : pageParam;
    let limit = !limitParam || limitParam < 1 ? DEFAULT_LIMIT : limitParam;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const validStatuses = ["UPCOMING", "PLAYING", "FINISHED", "CANCELLED"];

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { message: "Invalid status value" },
        { status: 400 },
      );
    }

    const result = await getGames({
      status: status as any,
      divisionId: divisionId ?? undefined,
      teamId: teamId ?? undefined,
      page,
      limit,
    });

    return NextResponse.json(
      {
        message: "Games successfully fetched",
        ...result,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 },
    );
  }
}
