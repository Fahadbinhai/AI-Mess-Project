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
}, { timestamps: true });

export default mongoose.models.Group || mongoose.model('Group', GroupSchema);
