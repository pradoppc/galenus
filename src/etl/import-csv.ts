/**
 * CLI de importação manual de CSV BNAFAR.
 * Uso: npm run etl:csv -- /caminho/arquivo.csv
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { importCsvFile } from './csv-importer'

const csvPath = process.argv[2]
if (!csvPath) { console.error('Uso: npm run etl:csv -- /caminho/arquivo.csv'); process.exit(1) }

importCsvFile(csvPath, 'csv')
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
