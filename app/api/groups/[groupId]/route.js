import connectDB from '@/lib/db';
import Group from '@/models/Group';
import MonthlySheet from '@/models/MonthlySheet';
import ExpenseEntry from '@/models/ExpenseEntry';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { groupId } = await params;

    const group = await Group.findById(groupId)
      .populate('members', '-password')
      .populate('leader', '-password');

    if (!group) {
      return Response.json({ error: 'Group not found' }, { status: 404 });
    }

    return Response.json(group, { status: 200 });
  } catch (error) {
    console.error('Fetch group detail error:', error);
    return Response.json({ error: 'Failed to fetch group details' }, { status: 500 });
  }
}

// PATCH - update group details (name, members)
export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { groupId } = await params;
    const body = await request.json();
    const { name, memberIds } = body;

    const group = await Group.findById(groupId);
    if (!group) {
      return Response.json({ error: 'Group not found' }, { status: 404 });
    }

    if (name !== undefined) {
      group.name = name;
    }
    if (memberIds !== undefined) {
      group.members = memberIds;
    }

    await group.save();

    const populatedGroup = await Group.findById(groupId)
      .populate('members', '-password')
      .populate('leader', '-password');

    return Response.json(populatedGroup, { status: 200 });
  } catch (error) {
    console.error('Update group error:', error);
    return Response.json({ error: 'Failed to update group' }, { status: 500 });
  }
}

// DELETE - delete group (System Admin only)
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { groupId } = await params;
    const { searchParams } = new URL(request.url);
    const requesterId = searchParams.get('requesterId');

    if (requesterId) {
      const requester = await User.findById(requesterId);
      if (!requester || requester.role !== 'admin') {
        return Response.json({ error: 'Access Denied: Only system admins can delete groups.' }, { status: 403 });
      }
    }

    // Delete associated monthly sheets and expense entries first
    const sheets = await MonthlySheet.find({ groupId });
    const sheetIds = sheets.map(s => s._id);

    if (sheetIds.length > 0) {
      await ExpenseEntry.deleteMany({ sheetId: { $in: sheetIds } });
      await MonthlySheet.deleteMany({ _id: { $in: sheetIds } });
    }

    // Delete the group
    await Group.findByIdAndDelete(groupId);

    return Response.json({ message: 'Group deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Delete group error:', error);
    return Response.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}
