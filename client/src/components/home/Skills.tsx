import type { LucideIcon } from 'lucide-react';
import { Code2, Cpu, Database, Globe, LayoutTemplate, Palette, Server, Sparkles, Video, Wrench } from 'lucide-react';
import { useSkills } from '@/hooks/usePublicData';
import { useSectionIndex } from '@/hooks/useSections';
import { Section } from '@/components/ui/Layout';
import { Reveal } from '@/components/ui/Reveal';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { Tag } from '@/components/ui/Tag';

/** Icon keys the admin can choose for a skill category (must match server/src/validators/skill.ts). */
export const SKILL_ICON_MAP: Record<string, LucideIcon> = {
  code: Code2,
  layout: LayoutTemplate,
  server: Server,
  database: Database,
  wrench: Wrench,
  sparkles: Sparkles,
  palette: Palette,
  globe: Globe,
  cpu: Cpu,
  video: Video,
};

export function Skills() {
  const skills = useSkills();
  const index = useSectionIndex('skills');

  return (
    <Section
      id="skills"
      index={index}
      eyebrow="Skills"
      title="Tools I work with"
      description="Technologies and tools from my projects and training. This is a list of what I use and am learning, not a ranking."
    >
      {skills.isPending && (
        <div className="grid gap-5 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      )}
      {skills.isError && <ErrorState error={skills.error} onRetry={() => void skills.refetch()} />}
      {skills.data && (
        <ul className="grid gap-5 md:grid-cols-2">
          {skills.data.map((cat, i) => {
            const Icon = SKILL_ICON_MAP[cat.icon] ?? Code2;
            return (
              <li key={cat.id}>
                <Reveal delay={(i % 2) * 0.08} className="h-full">
                  <div className="group h-full rounded-2xl border border-line bg-surface p-7 transition-[border-color,background-color] duration-500 hover:border-accent/40 hover:bg-surface-2/50">
                    <div className="flex items-center gap-4">
                      <span aria-hidden="true" className="grid size-11 place-items-center rounded-xl border border-line bg-bg text-accent transition group-hover:border-accent/50">
                        <Icon className="size-5" />
                      </span>
                      <div>
                        <h3 className="font-display text-2xl leading-tight">{cat.name}</h3>
                        {cat.description && <p className="mt-0.5 text-sm text-muted">{cat.description}</p>}
                      </div>
                    </div>
                    <ul className="mt-6 flex flex-wrap gap-2">
                      {cat.skills.map((s) => (
                        <li key={s.id}>
                          <Tag className="px-3 py-1.5 text-[0.8rem] text-fg">
                            {s.name}
                            {s.note && <span className="ml-1.5 text-subtle">· {s.note}</span>}
                          </Tag>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
