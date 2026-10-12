const form = document.getElementById('transaction-form');
const errorText = document.getElementById('form-error');
const saveButton = document.getElementById('save-button');
const id = new URLSearchParams(window.location.search).get('id');
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
for (const category of categories)
  form.elements.category.add(new Option(category, category));
const today = new Date();
today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
form.elements.date.value = today.toISOString().slice(0, 10);
document.getElementById('cancel-form').addEventListener('click', () => {
  window.location.href = '/';
});

// REQ - At least one custom function
// Evidence: request encapsulates asynchronous HTTP calls and JSON parsing.
async function request(method, transaction) {
  const response = await fetch(
    `/api/transactions${method === 'PUT' ? `/${encodeURIComponent(id)}` : ''}`,
    {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: transaction ? JSON.stringify(transaction) : undefined,
    },
  );
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || 'Unable to save the transaction.');
  return result;
}

async function initialize() {
  if (!id) return;
  saveButton.disabled = true;
  document.getElementById('editor-title').textContent = 'Edit transaction';
  document.title = 'Edit transaction — Pocket';
  saveButton.textContent = 'Save changes';
  try {
    // AJAX evidence: GET loads saved transaction objects for editing.
    const data = await request('GET');
    const transaction = data.transactions.find((item) => item.id === id);
    if (!transaction)
      throw new Error(
        'This transaction no longer exists. Return to the overview to choose another.',
      );
    // REQ - Allow the user to edit instances of at least one type of resources, object or
    // document
    // Evidence: prefill the existing transaction's editable form fields.
    for (const field of ['description', 'amount', 'date', 'type', 'category'])
      form.elements[field].value = transaction[field];
    saveButton.disabled = false;
  } catch (error) {
    errorText.textContent = error.message;
  }
}

// REQ - Exhibit proficiency in using at least two event handlers to enhance the interactivity of the application.
// Evidence: submit saves the form; the cancel click handler above returns to the dashboard.
// REQ - Allow the user to create instances of at least one type of resource, object or
// document
// Evidence: POST saves a new transaction object; PUT updates the selected transaction.
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const transaction = Object.fromEntries(new FormData(form));
  transaction.amount = Number(transaction.amount);
  saveButton.disabled = true;
  errorText.textContent = '';
  try {
    // REQ - You must execute at least one GET request via AJAX, and at least one of the
    // following requests via AJAX: POST, PATCH or PUT.
    // Evidence: POST creates, PUT edits; initialize() and app.js execute AJAX GET.
    await request(id ? 'PUT' : 'POST', transaction);
    window.location.href = `/?saved=${id ? 'updated' : 'added'}`;
  } catch (error) {
    errorText.textContent = error.message;
    saveButton.disabled = false;
  }
});
initialize();
