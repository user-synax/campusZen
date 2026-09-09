import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { getCurrentUser } from '@/lib/auth'
import { getAppwriteAdminStorage, getFileViewUrlString, getUserMediaBucketId, toInputFile } from '@/lib/appwrite'
import { ID, Permission, Role } from 'node-appwrite'
import { verifyImageBlob } from '@/lib/file-validation'

export async function POST(request) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('avatar')

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ message: 'Only JPG, PNG, and WebP images allowed' }, { status: 400 })
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ message: 'Image must be under 5MB' }, { status: 400 })
    }

    // Magic-byte validation of real content (defeats MIME spoofing).
    if (!(await verifyImageBlob(file, allowedTypes))) {
      return NextResponse.json({ message: 'File content is not a valid image' }, { status: 400 })
    }

    let bucketId
    try {
      bucketId = getUserMediaBucketId()
    } catch (envError) {
      console.error('Missing bucket env:', envError.message)
      return NextResponse.json({ message: 'Storage not configured' }, { status: 500 })
    }
    let storage
    try {
      storage = getAppwriteAdminStorage()
    } catch (envError) {
      console.error('Appwrite admin client error:', envError.message)
      return NextResponse.json({ message: 'Storage not configured' }, { status: 500 })
    }
    const fileId = ID.unique()
    const permissions = [
      Permission.read(Role.any()),
      Permission.update(Role.user(String(currentUser._id))),
      Permission.delete(Role.user(String(currentUser._id)))
    ]

    let uploadedFile
    try {      
      const inputFile = await toInputFile(file)
      // Upload new avatar
      uploadedFile = await storage.createFile(
        bucketId,
        fileId,
        inputFile,
        permissions
      )
    } catch (uploadError) {
      console.error('Appwrite upload error:', uploadError?.message || uploadError, uploadError?.stack)
      // Surface Appwrite response details if available
      const details = uploadError?.response?.message || uploadError?.message || 'Upload failed'
      return NextResponse.json({ message: details }, { status: 500 })
    }

    const avatarUrl = getFileViewUrlString(uploadedFile.$id, bucketId)

    await connectDB()
    
    // Update user in database
    const updatedUser = await User.findByIdAndUpdate(
      currentUser._id,
      { avatar: avatarUrl },
      { new: true }
    )

    if (!updatedUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      message: 'Avatar updated successfully',
      avatarUrl 
    })
  } catch (error) {
    console.error('Avatar upload route error:', error?.message || error, error?.stack)
    return NextResponse.json({ message: error?.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    // Update user in database to remove avatar
    const updatedUser = await User.findByIdAndUpdate(
      currentUser._id,
      { $unset: { avatar: "" } },
      { new: true }
    )

    if (!updatedUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      message: 'Avatar deleted successfully'
    })
  } catch (error) {
    console.error('Avatar delete route error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
}
