import connectDB from '@/lib/db';
import User from '@/models/User';
import { generateUniqueUserId } from '@/lib/generateId';

export async function POST(request) {
  try {
    await connectDB();
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return Response.json({ error: 'Name, email and password are required' }, { status: 400 });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return Response.json({ error: 'Email already registered' }, { status: 400 });
    }

    const userId = await generateUniqueUserId();

    const isFirstUser = (await User.countDocuments({})) === 0;

    const newUser = await User.create({
      userId,
      name,
      email,
      password,
      role: isFirstUser ? 'admin' : 'user', // First user is Admin, others are regular users
    });

    return Response.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return Response.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
}
