import {createInterface} from 'node:readline';
import {stdin as input, stdout as output} from 'node:process';

import {normalizeAdminEmail} from '../src/lib/admin/identity';
import {provisionAdmin} from '../src/lib/admin/provision';

function askHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const terminal = input.isTTY && typeof input.setRawMode === 'function';
    if (!terminal) {
      reject(new Error('Interactive TTY with hidden password input is required.'));
      return;
    }

    output.write(question);
    input.setRawMode(true);
    input.resume();
    let value = '';

    const onData = (chunk: Buffer) => {
      const char = chunk.toString('utf8');
      if (char === '\u0003') {
        cleanup();
        reject(new Error('Cancelled.'));
      } else if (char === '\r' || char === '\n') {
        output.write('\n');
        cleanup();
        resolve(value);
      } else if (char === '\u007f') {
        if (value.length > 0) value = value.slice(0, -1);
      } else {
        value += char;
      }
    };

    const cleanup = () => {
      input.setRawMode?.(false);
      input.pause();
      input.removeListener('data', onData);
    };

    input.on('data', onData);
  });
}

async function main(): Promise<void> {
  const email = normalizeAdminEmail(process.argv[2]);
  if (!email) {
    console.error('Usage: npm run admin:provision -- admin@example.com');
    process.exit(1);
  }

  try {
    const password = await askHidden('Admin password: ');
    const confirmation = await askHidden('Confirm admin password: ');
    if (password.length < 12 || password !== confirmation) {
      console.error('Password must be at least 12 characters and confirmations must match.');
      process.exitCode = 1;
    } else {
      await provisionAdmin(email, password);
      console.log(`Admin account provisioned: ${email}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Provisioning failed.');
    process.exitCode = 1;
  }
}

// Wrapped in an async main (invoked, not awaited at top level) so the helper
// also runs under the CJS format used by `node --import tsx` in this repo.
void main();
