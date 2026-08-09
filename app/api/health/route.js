import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB, getDBStatus } from '@/lib/db'

export async function GET() {
  const startTime = Date.now()

  try {
    await connectDB()
    const dbStatus = getDBStatus()

    // Quick DB ping to verify actual connectivity 
    await mongoose.connection.db.admin().ping()

    const responseTime = Date.now() - startTime

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      database: {
        ...dbStatus,
        pingMs: responseTime
      },
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0'
    }, { status: 200 })

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      database: getDBStatus()
    }, { status: 503 })  // 503 Service Unavailable 
  }
} 
