import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig(
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results', 'docs']),

  // Regras gerais para todo o código TypeScript
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
  },

  // Regras de React só para a interface, a cena e o estado
  {
    files: ['src/**/*.tsx', 'src/store/**/*.ts', 'src/scene/**/*.ts', 'src/ui/**/*.ts'],
    extends: [reactHooks.configs.flat['recommended-latest'], reactRefresh.configs.vite],
  },

  // REGRA DE OURO: o núcleo de cálculo (src/core) é TypeScript puro.
  // Não pode importar React, Three.js nem as outras camadas da app.
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react/*',
                'react-dom',
                'react-dom/*',
                'three',
                'three/*',
                '@react-three/*',
                'zustand',
                'zustand/*',
                'zundo',
                'lucide-react',
              ],
              message:
                'src/core é TypeScript puro: não pode importar React, Three.js nem bibliotecas de interface/estado.',
            },
            {
              group: [
                '**/ui',
                '**/ui/**',
                '**/scene',
                '**/scene/**',
                '**/store',
                '**/store/**',
                '**/persistence',
                '**/persistence/**',
              ],
              message:
                'src/core não pode depender de src/ui, src/scene, src/store nem src/persistence (as setas vão sempre para dentro do core).',
            },
          ],
        },
      ],
    },
  },

  // Ficheiros de configuração correm em Node
  {
    files: ['*.config.{ts,js}', 'tests/**/*.ts'],
    languageOptions: { globals: globals.node },
  },

  // Desliga regras de estilo que o Prettier já trata
  prettier,
)
