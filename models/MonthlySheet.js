import mongoose from 'mongoose';

const MonthlySheetSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
  },
  month: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  openingDate: {
    type: Date,
    required: true,
  },
}, { timestamps: true });

// A group can only have one sheet per month/year
MonthlySheetSchema.index({ groupId: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.models.MonthlySheet || mongoose.model('MonthlySheet', MonthlySheetSchema);
