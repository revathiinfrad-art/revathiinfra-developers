import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    ignores: ['dist/**/*']
  },
  {
    files: ['**/*.rules'],
    plugins: {
      '@firebase/security-rules': firebaseRulesPlugin
    },
    languageOptions: {
      parser: firebaseRulesPlugin.parsers.rules
    },
    rules: {
      ...firebaseRulesPlugin.configs['flat/recommended'].rules
    }
  }
]
