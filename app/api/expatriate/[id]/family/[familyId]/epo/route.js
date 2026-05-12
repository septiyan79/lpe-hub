import { NextResponse } from "next/server";

const GONE = { error: "EPO sekarang dikelola sebagai jenis permit (isEPO: true). Gunakan endpoint /permits." };

export async function GET() { return NextResponse.json(GONE, { status: 410 }); }
export async function POST() { return NextResponse.json(GONE, { status: 410 }); }
export async function PATCH() { return NextResponse.json(GONE, { status: 410 }); }
export async function DELETE() { return NextResponse.json(GONE, { status: 410 }); }
