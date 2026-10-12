import http from 'node:http';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { createServices, ServiceError } from './src/services.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const categories = [
  'Food & drinks',
  'Shopping',
  'Transport',
  'Home & bills',
  'Health',
  'Entertainment',
  'Salary',
  'Other',
];
// Validation, storage and routing are separated into focused functions.
function validateTransaction(input) {
  const amount = Number(input.amount);
  // Comparison/logical operators and branching reject invalid transaction fields.
  if (
    !input.description ||
    typeof input.description !== 'string' ||
    input.description.trim().length > 100
  ) {
    throw new Error('Enter a description of 1–100 characters.');
  }
  if (
    !input.description.trim() ||
    !Number.isFinite(amount) ||
    amount < 0.01 ||
    amount > 100000000 ||
    Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001
  )
    throw new Error(
      'Enter a positive amount with no more than two decimal places.',
    );
  if (
    !['expense', 'income'].includes(input.type) ||
    !categories.includes(input.category)
  )
    throw new Error('Choose a valid type and category.');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    !Number.isFinite(Date.parse(input.date)) ||
    new Date(input.date).toISOString().slice(0, 10) !== input.date
  )
    throw new Error('Choose a valid date.');
  // REQ - at least one object in your program.
  // Evidence: the returned object represents a validated transaction resource.
  return {
    description: input.description.trim(),
    amount: Math.round(amount * 100) / 100,
    type: input.type,
    category: input.category,
    date: input.date,
  };
}

export function createApp(
  database = path.join(root, 'data.json'),
  serviceOptions = {},
) {
  const services = createServices(serviceOptions);
  let queue = Promise.resolve();
  const load = async () => JSON.parse(await readFile(database, 'utf8'));
  async function save(data) {
    await writeFile(`${database}.tmp`, JSON.stringify(data, null, 2));
    await rename(`${database}.tmp`, database);
  }
  function json(response, status, data) {
    response.writeHead(status, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    });
    response.end(JSON.stringify(data));
  }
  async function body(request) {
    let content = '';
    // REQ - At least one loop
    // Evidence: for await...of reads asynchronous request chunks.
    for await (const chunk of request) {
      content += chunk;
      if (content.length > 10000) throw new Error('Request is too large.');
    }
    return JSON.parse(content);
  }
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname === '/api/exchange' && request.method === 'GET') {
        return json(
          response,
          200,
          await services.exchange(url.searchParams.get('currency')),
        );
      }
      if (url.pathname === '/api/insights' && request.method === 'POST') {
        if (
          request.headers.origin &&
          request.headers.origin !== `http://${request.headers.host}`
        )
          return json(response, 403, {
            error: 'Request origin is not allowed.',
          });
        const input = await body(request);
        await queue;
        return json(
          response,
          200,
          await services.insight(
            (await load()).transactions,
            input?.month || 'all',
          ),
        );
      }
      if (url.pathname === '/api/transactions' && request.method === 'GET') {
        // REQ - Allow the user to see all created resources, objects or documents
        // Evidence: return the complete saved transaction collection as JSON.
        await queue;
        return json(response, 200, await load());
      }
      const match = url.pathname.match(/^\/api\/transactions(?:\/([^/]+))?$/);
      if (match && ['POST', 'PUT', 'DELETE'].includes(request.method)) {
        const input =
          request.method === 'DELETE'
            ? null
            : validateTransaction(await body(request));
        const operation = queue.then(async () => {
          const data = await load();
          let result;
          if (request.method === 'POST' && !match[1]) {
            // REQ - Allow the user to create instances of at least one type of resource, object or
            // document
            // Evidence: give the new transaction object an ID and add it to storage.
            result = { id: randomUUID(), ...input };
            data.transactions.push(result);
          } else {
            const index = data.transactions.findIndex(
              (item) => item.id === match[1],
            );
            if (index < 0)
              return json(response, 404, { error: 'Transaction not found.' });
            // REQ - Allow the user to delete instances of at least one type of resource, object or
            // document
            // Evidence: splice removes the selected transaction object from the stored array.
            if (request.method === 'DELETE') data.transactions.splice(index, 1);
            else {
              // REQ - Allow the user to edit instances of at least one type of resources, object or
              // document
              // Evidence: replace editable fields while preserving the transaction ID.
              result = { id: match[1], ...input };
              data.transactions[index] = result;
            }
          }
          await save(data);
          json(
            response,
            request.method === 'POST' ? 201 : 200,
            result || { success: true },
          );
        });
        queue = operation.catch(() => {});
        await operation;
        return;
      }
      if (url.pathname.startsWith('/api/'))
        return json(response, 404, { error: 'Endpoint not found.' });
      const files = {
        '/': 'index.html',
        '/index.html': 'index.html',
        '/transaction.html': 'transaction.html',
        '/transaction.js': 'transaction.js',
        '/style.css': 'style.css',
        '/responsive.css': 'responsive.css',
        '/app.js': 'app.js',
      };
      const file = files[url.pathname];
      if (!file || request.method !== 'GET')
        return json(response, 404, { error: 'Not found.' });
      const mime = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript',
      };
      response.writeHead(200, {
        'Content-Type': `${mime[path.extname(file)]}; charset=utf-8`,
      });
      response.end(await readFile(path.join(root, file)));
    } catch (error) {
      json(
        response,
        error instanceof ServiceError
          ? error.status
          : error instanceof SyntaxError || !error.code
            ? 400
            : 500,
        {
          error: error.code ? 'Unable to access the database.' : error.message,
        },
      );
    }
  });
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, '127.0.0.1', () =>
    console.log(`Pocket is ready at http://localhost:${port}`),
  );
}
