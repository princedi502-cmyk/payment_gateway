import Setting from "../../models/setting.model.ts";

export async function getAllSettings() {
  return Setting.find().sort({ category: 1, key: 1 });
}

export async function getSettingsByCategory(category: string) {
  return Setting.find({ category: category } as Record<string, any>).sort({ key: 1 });
}

export async function getPublicSetting(key: string) {
  return Setting.findOne({ key: key, isPublic: true });
}

export async function updateSettings(
  updates: Array<{ key: string; value: any }>,
  adminId: string
) {
  const results = [];

  for (const { key, value } of updates) {
    const setting = await Setting.findOneAndUpdate(
      { key: key },
      { value: value, updatedBy: adminId },
      { new: true, upsert: true }
    );
    results.push(setting);
  }

  return results;
}

export async function getSettingByKey(key: string) {
  return Setting.findOne({ key: key });
}
