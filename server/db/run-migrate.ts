import { migrate } from "./migrate";

migrate()
  .then(({ driver }) => { console.log(`Migration complete (${driver})`); process.exit(0); })
  .catch((err) => { console.error(err); process.exit(1); });
