import User from '@/models/User';

export async function generateUniqueUserId() {
  let id;
  let exists = true;
  while (exists) {
    id = Math.floor(100000 + Math.random() * 900000).toString();
    const found = await User.findOne({ userId: id });
    exists = !!found;
  }
  return id;
}
