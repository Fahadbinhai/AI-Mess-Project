import connectDB from '@/lib/db';
import MonthlySheet from '@/models/MonthlySheet';
import ExpenseEntry from '@/models/ExpenseEntry';
import Group from '@/models/Group';
import mongoose from 'mongoose';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { sheetId } = await params;

    if (!sheetId || !mongoose.Types.ObjectId.isValid(sheetId)) {
      return Response.json({ error: 'Sheet not found' }, { status: 404 });
    }

    const sheet = await MonthlySheet.findById(sheetId).populate({
      path: 'groupId',
      populate: [
        { path: 'members', select: '-password' },
        { path: 'leader', select: '-password' }
      ]
    }).lean();

    if (!sheet) {
      return Response.json({ error: 'Sheet not found' }, { status: 404 });
    }

    // Fetch expense entries for this sheet
    const entries = await ExpenseEntry.find({ sheetId })
      .populate('userId', '-password')
      .sort({ createdAt: 1 })
      .lean();

    const group = sheet.groupId;
    let availableSheets = [];

    // If previous months viewing is allowed by group admin, fetch all sheets for this group
    if (group && group.allowPreviousMonthsViewer) {
      availableSheets = await MonthlySheet.find({ groupId: group._id })
        .select('_id month year openingDate')
        .sort({ year: -1, month: -1, createdAt: -1 })
        .lean();
    } else {
      // If disabled, only return current sheet in available list
      availableSheets = [{
        _id: sheet._id,
        month: sheet.month,
        year: sheet.year,
        openingDate: sheet.openingDate,
      }];
    }

    return Response.json({
      sheet,
      entries,
      group,
      availableSheets,
      allowPreviousMonthsViewer: !!group?.allowPreviousMonthsViewer,
    }, { status: 200 });
  } catch (error) {
    console.error('Fetch public sheet details error:', error);
    return Response.json({ error: 'Failed to fetch public sheet details' }, { status: 500 });
  }
}
