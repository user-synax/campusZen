import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { getCurrentUser } from '@/lib/auth'
import { getAppwriteAdminStorage, getFileViewUrlString, getUserMediaBucketId } from '@/lib/appwrite'
import { ID, Permission, Role } from 'appwrite'

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

    const bucketId = getUserMediaBucketId()
    const storage = getAppwriteAdminStorage()
    const fileId = ID.unique()
    const permissions = [
      Permission.read(Role.any()),
      Permission.update(Role.user(currentUser._id)),
      Permission.delete(Role.user(currentUser._id))
    ]

    let uploadedFile
    try {      
      // Upload new avatar
      uploadedFile = await storage.createFile(
        bucketId,
        fileId,
        file,
        permissions
      )
    } catch (uploadError) {
      console.error('Appwrite upload error:', uploadError)
      return NextResponse.json({ message: 'Upload failed, please try again' }, { status: 500 })
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
    console.error('Avatar upload route error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
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
