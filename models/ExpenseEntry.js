import mongoose from 'mongoose';

const ExpenseEntrySchema = new mongoose.Schema({
  sheetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MonthlySheet',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  houseRent: { type: Number, default: 0 },
  currentBill: { type: Number, default: 0 },
  gasBill: { type: Number, default: 0 },
  wifiBill: { type: Number, default: 0 },
  dustBill: { type: Number, default: 0 },
  maidBill: { type: Number, default: 0 },
  othersExpenses: { type: Number, default: 0 },
  bazarBudget: { type: Number, default: 0 },
  due: { type: Number, default: 0 },
  totalWithoutDue: { type: Number, default: 0 },
  totalWithDue: { type: Number, default: 0 },
  isPaid: { type: Boolean, default: false },
}, { timestamps: true });

// Use async pre-save hook (no 'next' callback — modern Mongoose style)
ExpenseEntrySchema.pre('save', async function () {
  const hr = this.houseRent || 0;
  const cb = this.currentBill || 0;
  const gb = this.gasBill || 0;
  const wb = this.wifiBill || 0;
  const db = this.dustBill || 0;
  const mb = this.maidBill || 0;
  const oe = this.othersExpenses || 0;
  const bb = this.bazarBudget || 0;
  const d = this.due || 0;

  this.totalWithoutDue = hr + cb + gb + wb + db + mb + oe + bb;
  this.totalWithDue = this.totalWithoutDue + d;
});

// A user can only have one expense entry per monthly sheet
ExpenseEntrySchema.index({ sheetId: 1, userId: 1 }, { unique: true });
ExpenseEntrySchema.index({ sheetId: 1 });

export default mongoose.models.ExpenseEntry || mongoose.model('ExpenseEntry', ExpenseEntrySchema);

