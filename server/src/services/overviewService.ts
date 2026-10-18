import { prisma } from '../config/prisma';

export async function getOverview() {
  const [
    projectsPublished,
    projectsTotal,
    certsPublished,
    certsTotal,
    journeyPublished,
    journeyTotal,
    unread,
    messagesTotal,
    recentMessages,
    projects,
    certs,
    entries,
    profile,
    settings,
    resume,
  ] = await Promise.all([
    prisma.project.count({ where: { isPublished: true } }),
    prisma.project.count(),
    prisma.certificate.count({ where: { isPublished: true } }),
    prisma.certificate.count(),
    prisma.experienceEntry.count({ where: { isPublished: true } }),
    prisma.experienceEntry.count(),
    prisma.contactMessage.count({ where: { isRead: false } }),
    prisma.contactMessage.count(),
    prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, subject: true, isRead: true, createdAt: true },
    }),
    prisma.project.findMany({ orderBy: { updatedAt: 'desc' }, take: 5, select: { id: true, title: true, isPublished: true, updatedAt: true } }),
    prisma.certificate.findMany({ orderBy: { updatedAt: 'desc' }, take: 5, select: { id: true, title: true, isPublished: true, updatedAt: true } }),
    prisma.experienceEntry.findMany({ orderBy: { updatedAt: 'desc' }, take: 5, select: { id: true, title: true, isPublished: true, updatedAt: true } }),
    prisma.profile.findUnique({ where: { id: 1 }, select: { updatedAt: true } }),
    prisma.siteSettings.findUnique({ where: { id: 1 }, select: { updatedAt: true } }),
    prisma.resumeAsset.findFirst({ where: { isActive: true }, select: { uploadedAt: true } }),
  ]);

  type Activity = { kind: string; id?: number; title: string; isPublished?: boolean; at: Date };
  const activity: Activity[] = [
    ...projects.map((p) => ({ kind: 'project', id: p.id, title: p.title, isPublished: p.isPublished, at: p.updatedAt })),
    ...certs.map((c) => ({ kind: 'certificate', id: c.id, title: c.title, isPublished: c.isPublished, at: c.updatedAt })),
    ...entries.map((e) => ({ kind: 'journey', id: e.id, title: e.title, isPublished: e.isPublished, at: e.updatedAt })),
    ...(profile ? [{ kind: 'profile', title: 'Profile details', at: profile.updatedAt }] : []),
    ...(settings ? [{ kind: 'settings', title: 'Website settings', at: settings.updatedAt }] : []),
    ...(resume ? [{ kind: 'resume', title: 'Resume uploaded', at: resume.uploadedAt }] : []),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 8);

  return {
    counts: {
      projects: { published: projectsPublished, total: projectsTotal },
      certificates: { published: certsPublished, total: certsTotal },
      journey: { published: journeyPublished, total: journeyTotal },
      messages: { unread, total: messagesTotal },
    },
    hasResume: !!resume,
    recentActivity: activity,
    recentMessages,
  };
}
