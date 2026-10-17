import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// ADR-0042: only src/data/ talks to Supabase.
const supabaseImports = {
  group: ['@supabase/*'],
  message: 'Only src/data/ talks to Supabase (ADR-0042). Use its hooks.',
}

// docs/30-design/README.md#enforcement: screens use the shared components.
const primitiveMessage =
  'Use the components in @/components/ui or @/components/lifeos (docs/30-design/components.md).'
const primitiveImports = { group: ['@base-ui/*', '@radix-ui/*'], message: primitiveMessage }
const primitivePaths = ['sonner', 'react-day-picker', 'cmdk', 'vaul'].map((name) => ({
  name,
  message: primitiveMessage,
}))

const colourLiteral = /#[0-9a-fA-F]{3,8}\b|\b(?:oklch|oklab|rgba?|hsla?|lab|lch)\(/
const arbitraryClass = /(?:^|\s)[!\w:-]*-\[[^\]]+\]/

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'docs', 'src/routeTree.gen.ts', 'src/data/database.types.ts'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2023, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // Route files export a Route object; shadcn's files export variant helpers.
    files: ['src/routes/**/*.tsx', 'src/components/ui/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // Colours live only in src/styles/theme.css.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=${colourLiteral}]`,
          message: 'Colours live only in src/styles/theme.css (docs/30-design/tokens.md).',
        },
        {
          selector: `TemplateElement[value.raw=${colourLiteral}]`,
          message: 'Colours live only in src/styles/theme.css (docs/30-design/tokens.md).',
        },
      ],
    },
  },
  {
    // Screens compose the shared components; they never style them.
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/components/**',
      'src/data/**',
      'src/routes/design.tsx',
      // Stage 3's screens drawn for the design step (plan step 3), until Plan is built.
      'src/routes/design-stage-3.tsx',
      'src/**/*.test.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: primitivePaths, patterns: [supabaseImports, primitiveImports] },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=${colourLiteral}]`,
          message: 'Colours live only in src/styles/theme.css (docs/30-design/tokens.md).',
        },
        {
          selector: `Literal[value=${arbitraryClass}]`,
          message: 'No arbitrary Tailwind values on a screen: use the tokens and components.',
        },
        {
          selector: `TemplateElement[value.raw=${arbitraryClass}]`,
          message: 'No arbitrary Tailwind values on a screen: use the tokens and components.',
        },
        {
          selector: "JSXAttribute[name.name='style']",
          message:
            'No inline styles on a screen, except computed sizes (a progress width), with a comment saying so.',
        },
      ],
    },
  },
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: [supabaseImports] }] },
  },
  {
    files: ['src/data/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { paths: primitivePaths, patterns: [primitiveImports] }],
    },
  },
)
