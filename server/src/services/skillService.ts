import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { nextSortOrder } from './helpers';

const categoryInclude = (visibleOnly: boolean) => ({
  skills: { where: visibleOnly ? { isVisible: true } : undefined, orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }] },
});

/** Public: visible categories with their visible skills. Empty categories are omitted. */
export async function listPublic() {
  const categories = await prisma.skillCategory.findMany({
    where: { isVisible: true },
    include: categoryInclude(true),
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  return categories
    .filter((c) => c.skills.length > 0)
    .map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      icon: c.icon,
      skills: c.skills.map((s) => ({ id: s.id, name: s.name, note: s.note })),
    }));
}

export async function listAdmin() {
  return prisma.skillCategory.findMany({
    include: categoryInclude(false),
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
}

export async function createCategory(data: { name: string; description: string | null; icon: string; isVisible: boolean }) {
  return prisma.skillCategory.create({
    data: { ...data, sortOrder: await nextSortOrder(prisma.skillCategory, 'end') },
    include: categoryInclude(false),
  });
}

export async function updateCategory(id: number, data: { name: string; description: string | null; icon: string; isVisible: boolean }) {
  return prisma.skillCategory.update({ where: { id }, data, include: categoryInclude(false) });
}

export async function removeCategory(id: number) {
  await prisma.skillCategory.delete({ where: { id } }); // skills cascade
}

export async function createSkill(data: { categoryId: number; name: string; note: string | null; isVisible: boolean }) {
  const category = await prisma.skillCategory.findUnique({ where: { id: data.categoryId }, select: { id: true } });
  if (!category) throw AppError.validation('That skill category does not exist.');
  return prisma.skill.create({
    data: { ...data, sortOrder: await nextSortOrder(prisma.skill, 'end', { categoryId: data.categoryId }) },
  });
}

export async function updateSkill(id: number, data: { categoryId: number; name: string; note: string | null; isVisible: boolean }) {
  const existing = await prisma.skill.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Skill');
  const moved = existing.categoryId !== data.categoryId;
  return prisma.skill.update({
    where: { id },
    data: { ...data, ...(moved ? { sortOrder: await nextSortOrder(prisma.skill, 'end', { categoryId: data.categoryId }) } : {}) },
  });
}

export async function removeSkill(id: number) {
  await prisma.skill.delete({ where: { id } });
}
