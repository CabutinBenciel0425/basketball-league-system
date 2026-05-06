import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const teamSchema = z.object({
      name: z.string().min(1, "Name must be at least 1 character"),
      divisionId: z.string().min(1, "Division id is invalid"),
    });

    const body = await request.json();

    const result = teamSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: result.error.flatten() },
        { status: 400 },
      );
    }

    const team = await prisma.team.create({
      data: {
        name: result.data.name,
        divisionId: result.data.divisionId,
      },
    });
    return NextResponse.json(
      { message: "Team created successfully", data: team },
      { status: 201 },
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const teamsRaw = await prisma.team.findMany({
      include: {
        division: true,
        players: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    const teams = teamsRaw.map((team) => ({
      id: team.id,
      name: team.name,
      division: {
        id: team.division.id,
        name: team.division.name,
      },
      players: team.players.map((player) => ({
        id: player.id,
        fullName: player.user?.fullName ?? null,
        email: player.user?.email ?? null,
      })),
    }));

    return NextResponse.json(
      { message: "Teams successfully fetched", data: teams },
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
