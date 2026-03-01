# UI Polish Audit

## Audit Findings

1. The shell leaned too heavily on generic frosted-glass styling, which made every surface feel equally important and reduced hierarchy.
2. Primary actions and secondary actions were visually too similar, so pages lacked a clear decision path.
3. Spacing was inconsistent across layouts, tables, and forms, which made the product feel assembled rather than designed.
4. Tables used dense spacing and weak headings, so scanning member and guest records took more effort than it should.
5. Page intros were repetitive and generic. Several headings sounded like placeholder SaaS copy instead of church-office tools.
6. Long-form inputs such as notes, addresses, and event descriptions used single-line fields, which is the wrong interaction medium.
7. The dashboard chart used CSS variable references that would not resolve correctly inside inline Recharts styles.
8. Navigation and auth views lacked the level of restraint and clarity the rest of the product should signal.

## Implementation Plan

1. Tighten the global theme: warmer background, calmer primary, cleaner elevation, better borders, and more deliberate focus states.
2. Refine shared primitives: buttons, inputs, selects, badges, cards, tables, and long-form textareas.
3. Rework the application shell: stronger sidebar hierarchy, better mobile header, improved user/account block.
4. Standardize page headers so every screen has consistent hierarchy, supporting copy, and action placement.
5. Upgrade the main product pages: member directory, guest follow-up, attendance logging, calendar, and dashboard widgets.
6. Improve copy where it sounded generic, mechanical, or overly enterprise.
