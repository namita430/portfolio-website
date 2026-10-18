import type { PrismaClient } from '@prisma/client';
import { upsertTagIds } from '../services/helpers';

/**
 * Initial content, limited to facts the owner supplied. Nothing here is invented:
 *  - skills match the owner's list (React is omitted until the owner confirms it)
 *  - projects use the owner's own descriptions and links
 *  - certificates are saved as UNPUBLISHED drafts: they cannot go public until a file or
 *    verification URL is attached (enforced by the API)
 *  - journey entries name the programmes the owner listed, with no invented dates or outcomes
 *
 * Runs ONLY when the database has no profile row yet, so it can never overwrite edits made in the
 * admin dashboard and never resurrects content the owner deleted.
 */
export async function seedIfEmpty(prisma: PrismaClient): Promise<'seeded' | 'skipped'> {
  const existing = await prisma.profile.findUnique({ where: { id: 1 }, select: { id: true } });
  if (existing) return 'skipped';

  await prisma.$transaction(
    async (tx) => {
      await tx.profile.create({
        data: {
          id: 1,
          fullName: 'Namita Giri',
          titles: ['Frontend Developer', 'Full-Stack Developer', 'Aspiring Software Engineer'],
          introduction:
            "I'm Namita Giri, a developer passionate about creating reliable, intuitive, and meaningful digital experiences through modern web technologies.",
          objective: 'Building reliable, user-friendly software that solves real-world problems.',
          aboutTitle: 'Curious by nature, practical by habit.',
          aboutBody: [
            "I'm a developer from Nepal who enjoys turning ideas into working software. I build for the web with HTML, CSS and JavaScript, and I'm growing into full-stack development with Python, Django, Node.js, Express and MySQL.",
            'I care most about practical problems: a restaurant that needs to coordinate orders and billing, or people who want an easier way to discover services. Those are the ideas behind my projects SmartBite and Skill Connect Nepal.',
            "Learning is a habit I'm deliberately building, through structured training, workshops and webinars, and by shipping real projects. I'm also curious about how AI tools and chatbot concepts can make software more helpful.",
            'My goal is to keep growing into a software engineer who builds reliable, user-friendly software that solves real-world problems.',
          ].join('\n\n'),
          aboutHighlights: [
            { label: 'Based in', value: 'Nepal' },
            { label: 'Focus', value: 'Frontend and full-stack web development' },
            { label: 'Always learning', value: 'Training, workshops and hands-on projects' },
          ],
          location: 'Nepal',
          email: 'namitagiri783@gmail.com',
          githubUrl: 'https://github.com/namita430',
          linkedinUrl: 'https://linkedin.com/in/namita-giri-834a93323',
        },
      });

      await tx.siteSettings.create({
        data: {
          id: 1,
          siteTitle: 'Namita Giri — Frontend & Full-Stack Developer',
          siteDescription:
            'Portfolio of Namita Giri, a frontend and full-stack developer from Nepal building reliable, user-friendly software that solves real-world problems.',
          heroHeadline: 'Building Digital Experiences That Solve Real Problems.',
          heroSubtext:
            "I'm Namita Giri, a developer passionate about creating reliable, intuitive, and meaningful digital experiences through modern web technologies.",
          theme: 'ember',
          sectionVisibility: { about: true, skills: true, projects: true, certificates: true, journey: true, contact: true },
          footerText: 'Designed and built by Namita Giri in Nepal.',
          showResumeButton: true,
        },
      });

      // ----- Skills (no percentages, no proficiency claims)
      const categories: Array<{ name: string; icon: string; description: string; skills: string[] }> = [
        {
          name: 'Frontend',
          icon: 'layout',
          description: 'Building responsive interfaces for the web.',
          skills: ['HTML5', 'CSS3', 'JavaScript', 'Responsive Web Design'],
        },
        {
          name: 'Backend & Database',
          icon: 'server',
          description: 'Server-side development, APIs and data storage.',
          skills: ['Python', 'Django', 'Django REST Framework', 'Node.js', 'Express.js', 'MySQL', 'Firebase', 'REST APIs'],
        },
        {
          name: 'Tools & Platforms',
          icon: 'wrench',
          description: 'Everyday tools for building, versioning and shipping.',
          skills: ['Git', 'GitHub', 'VS Code', 'Netlify', 'WordPress', 'Elementor'],
        },
        {
          name: 'Additional Skills',
          icon: 'sparkles',
          description: 'Design, media and emerging tools.',
          skills: ['UI Design', 'Video Editing', 'AI Tools', 'AI Chatbot Concepts'],
        },
      ];
      for (const [ci, c] of categories.entries()) {
        await tx.skillCategory.create({
          data: {
            name: c.name,
            icon: c.icon,
            description: c.description,
            sortOrder: ci,
            skills: { create: c.skills.map((name, si) => ({ name, sortOrder: si })) },
          },
        });
      }

      // ----- Projects
      const smartbiteTags = await upsertTagIds(tx, ['HTML', 'CSS', 'JavaScript', 'Firebase Realtime Database', 'Netlify']);
      await tx.project.create({
        data: {
          slug: 'smartbite',
          title: 'SmartBite',
          tagline: 'Smart Restaurant Ordering and Billing System',
          shortDescription:
            'A restaurant management application designed to support table selection, reservations, menu management, order tracking, kitchen coordination, and billing.',
          description: [
            'SmartBite is a restaurant management application designed to support table selection, reservations, menu management, order tracking, kitchen coordination, and billing.',
            'It is built with HTML, CSS and JavaScript, uses Firebase Realtime Database to keep data in sync across connected devices, and is deployed on Netlify.',
          ].join('\n\n'),
          category: 'Web Application',
          status: 'LIVE_DEMO',
          githubUrl: 'https://github.com/namita430/Smart-restaurant-ordering-and-billing-system',
          liveUrl: 'https://vocal-sprinkles-6b716c.netlify.app/login',
          features: [
            'Table selection and reservations',
            'Menu management',
            'Order tracking',
            'Kitchen coordination',
            'Itemised billing',
            'Real-time data sync across devices with Firebase Realtime Database',
            'Admin dashboard with Orders, Menu, Tables and Reviews tabs',
          ],
          challenges: [],
          isFeatured: true,
          isPublished: true,
          sortOrder: 0,
          tags: { create: smartbiteTags.map((tagId) => ({ tagId })) },
        },
      });
      await tx.project.create({
        data: {
          slug: 'skill-connect-nepal',
          title: 'Skill Connect Nepal',
          tagline: 'Connecting customers with service providers',
          shortDescription: 'A platform intended to connect customers with service providers and help people discover services.',
          description: 'Skill Connect Nepal is a platform intended to connect customers with service providers and help people discover services.',
          category: 'Platform',
          // Status not verified by the assistant — the owner should confirm it in the admin dashboard.
          status: 'IN_PROGRESS',
          githubUrl: 'https://github.com/namita430/Skill-Connect-Nepal',
          features: [],
          challenges: [],
          isFeatured: true,
          isPublished: true,
          sortOrder: 1,
        },
      });

      // ----- Certificates: drafts only. They need a file or verification URL before they can be published.
      const drafts = [
        { title: 'Nobel Learning PBC Programs', issuer: 'Nobel Learning PBC', category: 'Professional Development' },
        { title: 'Python with Django Training', issuer: 'CodeIT', category: 'Programming' },
        { title: 'Generative AI Mastermind', issuer: 'Outskill Learners', category: 'Artificial Intelligence' },
        { title: 'Networking Mastery (badge)', issuer: 'Nobel Learning', category: 'Professional Development' },
        { title: 'Leadership Conclave 2026', issuer: 'JCI Hetauda', category: 'Leadership' },
      ];
      for (const [i, d] of drafts.entries()) {
        await tx.certificate.create({ data: { ...d, isPublished: false, sortOrder: i } });
      }

      // ----- Journey: programmes the owner named. No dates or outcomes are invented.
      const journey = [
        {
          type: 'TRAINING' as const,
          title: 'Python with Django Training',
          organization: 'CodeIT',
          description: 'Training programme covering Python with the Django framework.',
          tags: ['Python', 'Django'],
        },
        {
          type: 'TRAINING' as const,
          title: 'Generative AI Mastermind',
          organization: 'Outskill Learners',
          description: 'Learning programme on generative AI.',
          tags: ['Generative AI'],
        },
        {
          type: 'TRAINING' as const,
          title: 'Nobel Learning PBC Programs',
          organization: 'Nobel Learning PBC',
          description: 'Learning programmes through Nobel Learning PBC, including the Networking Mastery badge.',
          tags: ['Networking'],
        },
        {
          type: 'LEADERSHIP' as const,
          title: 'Leadership Conclave 2026',
          organization: 'JCI Hetauda',
          description: 'Leadership programme organised by JCI Hetauda.',
          tags: ['Leadership'],
        },
      ];
      for (const [i, e] of journey.entries()) {
        const { tags, ...rest } = e;
        const tagIds = await upsertTagIds(tx, tags);
        await tx.experienceEntry.create({
          data: { ...rest, isPublished: true, sortOrder: i, tags: { create: tagIds.map((tagId) => ({ tagId })) } },
        });
      }
    },
    { timeout: 30_000 },
  );

  return 'seeded';
}
