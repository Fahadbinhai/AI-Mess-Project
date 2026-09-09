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
      .populate('leader', '-password')
      .lean();

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
    const { name, memberIds, allowPreviousMonthsViewer } = body;

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
    if (allowPreviousMonthsViewer !== undefined) {
      group.allowPreviousMonthsViewer = Boolean(allowPreviousMonthsViewer);
    }

    await group.save();

    const populatedGroup = await Group.findById(groupId)
      .populate('members', '-password')
      .populate('leader', '-password')
      .lean();

    return Response.json(populatedGroup, { status: 200 });
  } catch (error) {
    console.error('Update group error:', error);
    return Response.json({ error: 'Failed to update group' }, { status: 500 });
  }
}

// DELETE - delete group (System Admin or Group Admin only)
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { groupId } = await params;
    const { searchParams } = new URL(request.url);
    const requesterId = searchParams.get('requesterId');

    if (!requesterId) {
      return Response.json({ error: 'Access Denied: Requester ID is required.' }, { status: 400 });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return Response.json({ error: 'Group not found' }, { status: 404 });
    }

    const requester = await User.findById(requesterId);
    if (!requester) {
      return Response.json({ error: 'Access Denied: Requester not found.' }, { status: 404 });
    }

    const isSystemAdmin = requester.role === 'admin';
    const isGroupLeader = group.leader.toString() === requesterId;

    if (!isSystemAdmin && !isGroupLeader) {
      return Response.json({ error: 'Access Denied: You do not have permission to delete this group.' }, { status: 403 });
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
