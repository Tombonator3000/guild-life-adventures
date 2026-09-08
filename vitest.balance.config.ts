import { defineConfig } from 'vitest/config';
import base from './vitest.config';
export default defineConfig({...base,test:{...base.test,include:['scripts/balance/runner.test.ts'],testTimeout:3_600_000,fileParallelism:false}});
