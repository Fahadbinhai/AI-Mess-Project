import connectDB from '@/lib/db';
import ExpenseEntry from '@/models/ExpenseEntry';

// GET all expense entries for a sheet
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const sheetId = searchParams.get('sheetId');

    if (!sheetId) {
      return Response.json({ error: 'Sheet ID is required' }, { status: 400 });
    }

    const entries = await ExpenseEntry.find({ sheetId })
      .populate('userId', '-password')
      .sort({ createdAt: 1 })
      .lean();

    return Response.json(entries, { status: 200 });
  } catch (error) {
    console.error('Fetch expense entries error:', error);
    return Response.json({ error: 'Failed to fetch expense entries' }, { status: 500 });
  }
}

// POST or update expense entry (Upsert behavior with save hooks)
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const {
      sheetId,
      userId,
      houseRent,
      currentBill,
      gasBill,
      wifiBill,
      dustBill,
      maidBill,
      othersExpenses,
      bazarBudget,
      due,
    } = body;

    if (!sheetId || !userId) {
      return Response.json({ error: 'Sheet ID and User ID are required' }, { status: 400 });
    }

    // Try to find an existing entry for this sheet and user
    let entry = await ExpenseEntry.findOne({ sheetId, userId });

    if (!entry) {
      entry = new ExpenseEntry({ sheetId, userId });
    }

    // Update fields if provided in request body
    if (houseRent !== undefined) entry.houseRent = Number(houseRent) || 0;
    if (currentBill !== undefined) entry.currentBill = Number(currentBill) || 0;
    if (gasBill !== undefined) entry.gasBill = Number(gasBill) || 0;
    if (wifiBill !== undefined) entry.wifiBill = Number(wifiBill) || 0;
    if (dustBill !== undefined) entry.dustBill = Number(dustBill) || 0;
    if (maidBill !== undefined) entry.maidBill = Number(maidBill) || 0;
    if (othersExpenses !== undefined) entry.othersExpenses = Number(othersExpenses) || 0;
    if (bazarBudget !== undefined) entry.bazarBudget = Number(bazarBudget) || 0;
    if (due !== undefined) entry.due = Number(due) || 0;
    if (body.isPaid !== undefined) entry.isPaid = Boolean(body.isPaid);

    // Save will trigger the pre('save') hook to calculate computed totals
    const savedEntry = await entry.save();
    const populated = await ExpenseEntry.findById(savedEntry._id).populate('userId', '-password').lean();

    return Response.json(populated, { status: 200 });
  } catch (error) {
    console.error('Save expense entry error:', error);
    return Response.json({ error: error.message || 'Failed to save expense entry' }, { status: 500 });
  }
}
