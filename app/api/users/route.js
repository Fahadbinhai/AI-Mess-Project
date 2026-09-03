import connectDB from '@/lib/db';
import User from '@/models/User';

// GET all users (with optional name/email query search)
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { userId: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter).select('-password').sort({ name: 1 }).lean();
    return Response.json(users, { status: 200 });
  } catch (error) {
    console.error('Fetch users error:', error);
    return Response.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// PATCH to promote a user to admin or update role
export async function PATCH(request) {
  try {
    await connectDB();
    const { userId, role } = await request.json(); // DB ObjectId and target role

    if (!userId || !role) {
      return Response.json({ error: 'User ID and Role are required' }, { status: 400 });
    }

    if (!['user', 'admin'].includes(role)) {
      return Response.json({ error: 'Invalid role' }, { status: 400 });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select('-password').lean();

    if (!updatedUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    return Response.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error('Update user role error:', error);
    return Response.json({ error: 'Failed to update user role' }, { status: 500 });
  }
}
