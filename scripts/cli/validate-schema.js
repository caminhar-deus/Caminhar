#!/usr/bin/env node
import { validateSchema } from '../validate-schema.js';

const success = await validateSchema();
process.exit(success ? 0 : 1);