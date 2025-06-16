import { NextRequest, NextResponse } from "next/server"
import path from "path"
import fs from "fs"

const ALLOWED_CSVS: Record<string, string> = {
  "all_sales_report.csv": "../../../../backend/all_sales_report.csv",
  "employees.csv": "../../../../backend/employees.csv",
  "guests.csv": "../../../../backend/guests.csv",
  "firstWorkouts.csv": "../../../../backend/firstWorkouts.csv",
  "thirtydayreprograms.csv": "../../../../backend/thirtydayreprograms.csv",
  "events.csv": "../../../../backend/app/scripts/events.csv",
}

export async function GET(req: NextRequest) {
  const filename = req.nextUrl.searchParams.get("filename")
  if (!filename || !(filename in ALLOWED_CSVS)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 })
  }
  const filePath = path.resolve(process.cwd(), ALLOWED_CSVS[filename])
  if (fs.existsSync(filePath)) {
    return new NextResponse(null, { status: 200 })
  } else {
    return new NextResponse(null, { status: 404 })
  }
} 