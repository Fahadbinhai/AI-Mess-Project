import connectDB from '@/lib/db';
import MonthlySheet from '@/models/MonthlySheet';

// GET sheets (typically filtered by groupId)
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return Response.json({ error: 'Group ID is required' }, { status: 400 });
    }

    const sheets = await MonthlySheet.find({ groupId })
      .sort({ year: -1, month: -1, createdAt: -1 })
      .lean();

    return Response.json(sheets, { status: 200 });
  } catch (error) {
    console.error('Fetch sheets error:', error);
    return Response.json({ error: 'Failed to fetch sheets' }, { status: 500 });
  }
}

// POST to create a sheet
export async function POST(request) {
  try {
    await connectDB();
    const { groupId, month, year, openingDate } = await request.json();

    if (!groupId || !month || !year || !openingDate) {
      return Response.json({ error: 'All fields (groupId, month, year, openingDate) are required' }, { status: 400 });
    }

    // Check if a sheet for this month/year already exists in this group
    const existing = await MonthlySheet.findOne({ groupId, month, year }).lean();
    if (existing) {
      return Response.json({ error: `A sheet for ${month} ${year} already exists in this group` }, { status: 400 });
    }

    const newSheet = await MonthlySheet.create({
      groupId,
      month,
      year: parseInt(year),
      openingDate: new Date(openingDate),
    });

    return Response.json(newSheet, { status: 201 });
  } catch (error) {
    console.error('Create sheet error:', error);
    if (error.code === 11000) {
      return Response.json({ error: 'A sheet for this month/year already exists in this group' }, { status: 400 });
    }
    return Response.json({ error: error.message || 'Failed to create sheet' }, { status: 500 });
  }
}
