import mongoose from 'mongoose';

export const DEFAULT_CATEGORIES = [
  {
    name: 'Exterior',
    slug: 'exterior',
    description: 'Body kits, wraps and exterior styling',
    icon: '\u{1F697}',
    sortOrder: 10,
  },
  {
    name: 'Interior',
    slug: 'interior',
    description: 'Seat covers, mats and cabin upgrades',
    icon: '\u{1FA91}',
    sortOrder: 20,
  },
  {
    name: 'Lighting',
    slug: 'lighting',
    description: 'LED, HID and ambient lights',
    icon: '\u{1F4A1}',
    sortOrder: 30,
  },
  {
    name: 'Electronics',
    slug: 'electronics',
    description: 'Cameras, GPS and smart accessories',
    icon: '\u{1F4F1}',
    sortOrder: 40,
  },
  {
    name: 'Car Care',
    slug: 'car-care',
    description: 'Polish, wax and cleaners',
    icon: '\u{1F9F4}',
    sortOrder: 50,
  },
  {
    name: 'Dashboard',
    slug: 'dashboard',
    description: 'Mounts, trims and gauges',
    icon: '\u{1F39B}\uFE0F',
    sortOrder: 60,
  },
];

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: 60,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Category slug must be URL friendly'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: 140,
    default: '',
  },
  icon: {
    type: String,
    trim: true,
    maxlength: 12,
    default: 'AC',
  },
  sortOrder: {
    type: Number,
    default: 100,
  },
}, { timestamps: true });

categorySchema.index({ sortOrder: 1, name: 1 });

const Category = mongoose.model('Category', categorySchema);

export const slugifyCategory = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

export const ensureDefaultCategories = async () => {
  const operations = DEFAULT_CATEGORIES.map((category) => ({
    updateOne: {
      filter: { slug: category.slug },
      update: { $setOnInsert: category },
      upsert: true,
    },
  }));

  if (operations.length) {
    await Category.bulkWrite(operations, { ordered: false });
  }
};

export default Category;
