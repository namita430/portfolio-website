import { describe, expect, it } from 'vitest';
import type { Profile, ProjectListItem, SkillCategory } from '@/types/api';
import { buildSnippets, type Line } from './codeSnippets';

const profile: Profile = {
  fullName: 'Test Person',
  titles: ['Role One', 'Role Two'],
  introduction: 'Intro',
  objective: 'Building reliable, user-friendly software that solves real-world problems.',
  aboutTitle: 'About',
  aboutBody: 'Body',
  aboutHighlights: [],
  location: 'Somewhere',
  email: 'a@b.co',
  githubUrl: null,
  linkedinUrl: null,
  profileImage: null,
  updatedAt: '2026-01-01T00:00:00Z',
};
const skills: SkillCategory[] = [
  { id: 1, name: 'Backend & Database', description: null, icon: 'server', skills: ['A', 'B', 'C', 'D', 'E', 'F'].map((name, i) => ({ id: i, name, note: null })) },
];
const projects = [{ title: 'Proj', status: 'LIVE_DEMO' }] as ProjectListItem[];

const text = (lines: Line[]) => lines.map((l) => l.map((t) => t.v).join('')).join('\n');

describe('hero code window content', () => {
  it('is built entirely from the supplied data', () => {
    const [dev] = buildSnippets(profile, undefined, undefined);
    const code = text(dev!.lines);
    expect(code).toContain('"Test Person"');
    expect(code).toContain('"Somewhere"');
    expect(code).toContain('"Role One"');
    expect(code).toContain('"Role Two"');
    expect(code).not.toContain('Namita'); // nothing hardcoded
  });

  it('wraps a long objective across several string lines without losing words', () => {
    const [dev] = buildSnippets(profile, undefined, undefined);
    const joined = dev!.lines
      .flat()
      .filter((t) => t.t === 'str')
      .map((t) => JSON.parse(t.v) as string)
      .join('');
    expect(joined).toContain(profile.objective!);
  });

  it('only shows the stack and projects tabs when there is data for them', () => {
    expect(buildSnippets(profile, undefined, undefined).map((s) => s.file)).toEqual(['developer.ts']);
    expect(buildSnippets(profile, skills, projects).map((s) => s.file)).toEqual(['developer.ts', 'stack.ts', 'projects.ts']);
  });

  it('turns category names into valid identifiers and truncates long lists honestly', () => {
    const stack = buildSnippets(profile, skills, undefined)[1]!;
    const code = text(stack.lines);
    expect(code).toContain('backendAndDatabase: [');
    expect(code).toContain('// +2 more'); // 6 skills, 4 shown
  });

  it('reports each project with its real status', () => {
    const proj = buildSnippets(profile, undefined, projects)[1]!;
    expect(text(proj.lines)).toContain('{ name: "Proj", status: "live demo" },');
  });
});
