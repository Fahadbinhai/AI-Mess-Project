import connectDB from '@/lib/db';
import MonthlySheet from '@/models/MonthlySheet';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { sheetId } = await params;

    const sheet = await MonthlySheet.findById(sheetId).populate({
      path: 'groupId',
      populate: [
        { path: 'members', select: '-password' },
        { path: 'leader', select: '-password' }
      ]
    });

    if (!sheet) {
      return Response.json({ error: 'Sheet not found' }, { status: 404 });
    }

    return Response.json(sheet, { status: 200 });
  } catch (error) {
    console.error('Fetch sheet detail error:', error);
    return Response.json({ error: 'Failed to fetch sheet details' }, { status: 500 });
  }
}
