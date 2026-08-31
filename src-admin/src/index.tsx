import { createRoot } from 'react-dom/client';

import pack from '../package.json';
import App from './App';
import { ADAPTER_NAME } from './consts';

window.adapterName = ADAPTER_NAME;
// same project as common.plugins.sentry.dsn in io-package.json
window.sentryDSN = 'https://0b5a9ab175f617f1d0e75219bc758fda@o1146681.ingest.us.sentry.io/4507094441918464';

console.log(`iobroker.${ADAPTER_NAME}@${pack.version}`);

const container = window.document.getElementById('root');
if (container) {
    createRoot(container).render(<App />);
}
