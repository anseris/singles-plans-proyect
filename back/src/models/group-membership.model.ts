import { Schema, model } from 'mongoose';

const groupMembershipSchema = new Schema(
  {
    group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

groupMembershipSchema.index({ group: 1, user: 1 }, { unique: true });
groupMembershipSchema.index({ user: 1, createdAt: -1 });

export const GroupMembership = model('GroupMembership', groupMembershipSchema);
