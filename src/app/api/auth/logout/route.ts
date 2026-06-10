import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ success: true })
  res.cookies.delete('sb-access-token')
  res.cookies.delete('sb-refresh-token')
  return res
}
