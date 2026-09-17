import connectDB from '@/lib/db';
import Group from '@/models/Group';
import User from '@/models/User';

// GET all groups (optionally filtering by member user ID)
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const filter = {};
    if (userId) {
      filter.members = userId;
    }

    const groups = await Group.find(filter)
      .populate('members', '-password')
      .populate('leader', '-password')
      .sort({ createdAt: -1 })
      .lean();

    return Response.json(groups, { status: 200 });
  } catch (error) {
    console.error('Fetch groups error:', error);
    return Response.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

// POST to create a new group
export async function POST(request) {
  try {
    await connectDB();
    const { name, memberIds, leaderId } = await request.json();

    if (!name || !memberIds || memberIds.length === 0 || !leaderId) {
      return Response.json({ error: 'Name, members list and leader ID are required' }, { status: 400 });
    }

    // Leader must be a member of the group as well
    const uniqueMembers = Array.from(new Set([...memberIds, leaderId]));

    const newGroup = await Group.create({
      name,
      members: uniqueMembers,
      leader: leaderId,
    });

    const populatedGroup = await Group.findById(newGroup._id)
      .populate('members', '-password')
      .populate('leader', '-password')
      .lean();

    return Response.json(populatedGroup, { status: 201 });
  } catch (error) {
    console.error('Create group error:', error);
    return Response.json({ error: error.message || 'Failed to create group' }, { status: 500 });
  }
}
