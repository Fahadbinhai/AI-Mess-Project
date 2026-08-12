import connectDB from '@/lib/db';
import User from '@/models/User';

export async function POST(request) {
  try {
    await connectDB();
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.password !== password) {
      return Response.json({ error: 'Invalid password' }, { status: 401 });
    }

    return Response.json(user, { status: 200 });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
}
