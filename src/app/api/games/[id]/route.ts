import { getGameById, updateGame } from "@/services/game.service";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const result = await getGameById(id);

    if (!result) {
      return NextResponse.json({ message: "Game not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Game successfully fetched", data: result },
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const body = await request.json();

    const gameSchema = z.object({
      status: z
        .enum(["UPCOMING", "PLAYING", "FINISHED", "CANCELLED"])
        .optional(),

      scoreA: z.number().int().min(0).max(1000).optional(),

      scoreB: z.number().int().min(0).max(1000).optional(),
    });

    const result = gameSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: result.error.flatten(),
        },
        { status: 400 },
      );
    }

    const gamePatch = result.data;

    const gameUpdate = await updateGame(id, gamePatch);

    if (!gameUpdate) {
      return NextResponse.json(
        {
          message: "Game not found",
        },
        {
          status: 404,
        },
      );
    }

    if ("errors" in gameUpdate) {
      return NextResponse.json(
        {
          message: "Game update failed",
          errors: gameUpdate.errors,
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json(
      {
        message: "Game successfully updated",
        data: gameUpdate.data,
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
