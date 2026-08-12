import connectDB from '@/lib/db';
import MonthlySheet from '@/models/MonthlySheet';
import ExpenseEntry from '@/models/ExpenseEntry';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { groupId } = await params;

    // Find all sheets in this group
    const sheets = await MonthlySheet.find({ groupId });
    const sheetIds = sheets.map(s => s._id);

    // Sum up the category values for all entries in these sheets
    const aggregate = await ExpenseEntry.aggregate([
      { $match: { sheetId: { $in: sheetIds } } },
      {
        $group: {
          _id: null,
          houseRent: { $sum: '$houseRent' },
          currentBill: { $sum: '$currentBill' },
          gasBill: { $sum: '$gasBill' },
          wifiBill: { $sum: '$wifiBill' },
          dustBill: { $sum: '$dustBill' },
          maidBill: { $sum: '$maidBill' },
          othersExpenses: { $sum: '$othersExpenses' },
          bazarBudget: { $sum: '$bazarBudget' },
          due: { $sum: '$due' },
          totalWithoutDue: { $sum: '$totalWithoutDue' },
          totalWithDue: { $sum: '$totalWithDue' },
        }
      }
    ]);

    const defaultResult = {
      houseRent: 0,
      currentBill: 0,
      gasBill: 0,
      wifiBill: 0,
      dustBill: 0,
      maidBill: 0,
      othersExpenses: 0,
      bazarBudget: 0,
      due: 0,
      totalWithoutDue: 0,
      totalWithDue: 0,
    };

    const summary = aggregate.length > 0 ? aggregate[0] : defaultResult;
    delete summary._id; // Remove the mongo _id placeholder

    return Response.json(summary, { status: 200 });
  } catch (error) {
    console.error('Fetch group expenses summary error:', error);
    return Response.json({ error: 'Failed to aggregate group expenses summary' }, { status: 500 });
  }
}
