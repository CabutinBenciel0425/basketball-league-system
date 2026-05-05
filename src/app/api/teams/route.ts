import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.divisionId)
      return NextResponse.json(
        {
          message: "Name or Division Id is missing",
        },
        {
          status: 400,
        },
      );

    const team = await prisma.team.create({
      data: {
        name: body.name,
        divisionId: body.divisionId,
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
