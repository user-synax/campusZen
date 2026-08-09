import mongoose from 'mongoose'
import config from './config'

let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

let lastConnectedAt = null
let lastError = null

export async function connectDB() {
  const uri = config.mongodb.uri
  if (!uri) throw new Error('MONGODB_URI is not set')

  if (cached.conn) return cached.conn

  // Agar connection chal raha hai toh wait karo
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
      maxPoolSize: 15,              // Increased from 5 to 15 for better concurrency
      minPoolSize: 2,               // Maintain more minimum connections
      connectTimeoutMS: 10000,
      socketTimeoutMS: 30000,       // Longer socket timeout for heavy queries
      serverSelectionTimeoutMS: 5000,
    }).then((mongoose) => {
      lastConnectedAt = new Date()
      lastError = null
      return mongoose
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (error) {
    cached.promise = null
    lastError = error
    throw error
  }

  return cached.conn
}

export function getDBStatus() {
  const readyState = mongoose.connection.readyState
  const state =
    readyState === 0 ? 'disconnected' :
      readyState === 1 ? 'connected' :
        readyState === 2 ? 'connecting' :
          readyState === 3 ? 'disconnecting' :
            'unknown'

  return {
    state,
    readyState,
    lastConnectedAt: lastConnectedAt ? lastConnectedAt.toISOString() : null,
    lastError: lastError ? (lastError.message || String(lastError)) : null
  }
}

export default connectDB