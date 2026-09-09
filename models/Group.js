import mongoose from 'mongoose';

const GroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  allowPreviousMonthsViewer: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

GroupSchema.index({ members: 1 });
GroupSchema.index({ leader: 1 });

export default mongoose.models.Group || mongoose.model('Group', GroupSchema);

