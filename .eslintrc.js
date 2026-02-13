module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['import'],
  settings: {
    'import/resolver': {
      typescript: { project: './tsconfig.json' },
      node: { extensions: ['.js', '.ts', '.tsx'] },
      // tsconfigのpathsを使うなら下の typescript resolver も入れる（後述）
      // typescript: { project: './tsconfig.json' },
    },
  },
  
  rules: {
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          // domain（最内層）は外側を参照禁止
          {
            from: './src/domain/**/*',
            target: './src/usecase/**/*',
            message: 'domain層はusecase層に依存できません',
          },
          {
            from: './src/domain/**/*',
            target: './src/interface/**/*',
            message: 'domain層はinterface層に依存できません',
          },
          {
            from: './src/domain/**/*',
            target: './src/infra/**/*',
            message: 'domain層はinfra層に依存できません',
          },

          // usecase は interface/infra を参照禁止（domainはOK）
          {
            from: './src/usecase/**/*',
            target: './src/interface/**/*',
            message: 'usecase層はinterface層に依存できません',
          },
          {
            from: './src/usecase/**/*',
            target: './src/infra/**/*',
            message: 'usecase層はinfra層に依存できません',
          },

          // interface は infra を参照禁止（domain/usecaseはOK）
          {
            from: './src/interface/**/*',
            target: './src/infra/**/*',
            message: 'interface層はinfra層に依存できません',
          },

          // infra（最外層）は制限なし（内側への依存はOK）
        ],
      },
    ],
  },
};
