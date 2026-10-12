// REQ - at least one object in your program.
// Evidence: state groups the transaction collection and current filter values.
// REQ - use at least one array
// Evidence: state.transactions stores created transaction objects.
const state = {
  transactions: [],
  month: 'all',
  search: '',
  type: 'all',
  category: 'all',
};
// REQ - use at least one array
// Evidence: categories supplies form/filter choices and category chart labels.
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
const colors = [
  '#78966b',
  '#c6aa83',
  '#94aaa4',
  '#2b5748',
  '#b594ad',
  '#b9c785',
  '#88977e',
  '#c8cbbd',
];
const icons = ['♧', '▱', '⇄', '⌂', '♡', '♫', '↓', '◇'];
const $ = (id) => document.getElementById(id);
let toastTimer;

// REQ - At least one custom function
// Evidence: formatMoney accepts an amount and returns SGD currency text.
function formatMoney(amount) {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
  }).format(amount);
}
function setText(id, text) {
  $(id).textContent = text;
}
function notify(message) {
  setText('status', message);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => setText('status', ''), 5000);
}

// REQ -  Display the ability to perform at least one asynchronous call.
// Evidence: await fetch waits for an HTTP response without blocking the browser.
async function request(method = 'GET', id = '', transaction) {
  const response = await fetch(
    `/api/transactions${id ? `/${encodeURIComponent(id)}` : ''}`,
    {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: transaction ? JSON.stringify(transaction) : undefined,
    },
  );
  const data = await response.json();
  // REQ -  Display the ability to fetch data from a JSON resource.
  // Evidence: response.json() parses the JSON returned by /api/transactions.
  if (!response.ok)
    throw new Error(data.error || 'The request could not be completed.');
  return data;
}

function getPeriodTransactions() {
  // REQ - At least one comparison operator
  // Evidence: === compares the selected month with 'all'.
  // REQ - At least one logical operator
  // Evidence: || includes an entry when either condition is true.
  return state.transactions.filter(
    (item) => state.month === 'all' || item.date.startsWith(state.month),
  );
}
function calculateTotals(transactions) {
  const totals = { income: 0, expenses: 0 };
  // REQ - At least one loop
  // Evidence: for...of visits every transaction to calculate totals.
  // REQ - At least one branching
  // Evidence: if/else separates income from expense calculations.
  for (const item of transactions) {
    if (item.type === 'income') totals.income += Math.round(item.amount * 100);
    else totals.expenses += Math.round(item.amount * 100);
  }
  return {
    income: totals.income / 100,
    expenses: totals.expenses / 100,
    balance: (totals.income - totals.expenses) / 100,
  };
}
function renderSummary(transactions) {
  // REQ - At least one function call
  // Evidence: calculateTotals(transactions) returns totals for this summary.
  const totals = calculateTotals(transactions);
  // REQ - Develop your program using the structured programming technique. Have at
  // least one function whose return value is used as the argument of another
  // function call.
  // Evidence: calculations/rendering are separate functions; formatMoney's return
  // value is passed directly as an argument to setText.
  setText('balance', formatMoney(totals.balance));
  setText('income', formatMoney(totals.income));
  setText('expenses', formatMoney(totals.expenses));
  setText('donut-total', formatMoney(totals.expenses));
  const rate =
    totals.income > 0
      ? Math.round((totals.balance / totals.income) * 100)
      : null;
  setText('saving-rate', rate === null ? '—' : `${rate}%`);
  $('saving-bar').style.width = `${Math.max(0, Math.min(100, rate || 0))}%`;
  setText(
    'saving-message',
    rate === null
      ? 'Add income to see how much of it you’re keeping.'
      : rate < 0
        ? 'Your expenses exceed your income this period. A small adjustment can make a difference.'
        : `You've kept ${formatMoney(totals.balance)} of your income. Give every dollar a little direction.`,
  );
  const amounts = new Map();
  for (const item of transactions.filter((item) => item.type === 'expense'))
    amounts.set(
      item.category,
      (amounts.get(item.category) || 0) + Math.round(item.amount * 100),
    );
  const groups = [...amounts.entries()].sort((a, b) => b[1] - a[1]);
  $('category-list').replaceChildren();
  let start = 0;
  const segments = [];
  for (const [category, cents] of groups) {
    const color = colors[categories.indexOf(category)] || colors[7];
    const percent = totals.expenses
      ? (cents / (totals.expenses * 100)) * 100
      : 0;
    segments.push(`${color} ${start}% ${start + percent}%`);
    start += percent;
    const row = document.createElement('div');
    row.className = 'category-row';
    const name = document.createElement('span');
    const marker = document.createElement('i');
    marker.style.background = color;
    name.append(marker, document.createTextNode(category));
    const value = document.createElement('strong');
    value.textContent = formatMoney(cents / 100);
    const share = document.createElement('small');
    share.textContent = `${Math.round(percent)}%`;
    value.append(share);
    row.append(name, value);
    $('category-list').append(row);
  }
  if (!groups.length)
    $('category-list').textContent = 'No expenses in this period.';
  $('donut').style.background = segments.length
    ? `conic-gradient(${segments.join(',')})`
    : '#edf0e8';
}

function renderTransactions(transactions) {
  const visible = transactions
    .filter(
      (item) =>
        (state.type === 'all' || item.type === state.type) &&
        (state.category === 'all' || item.category === state.category) &&
        item.description.toLowerCase().includes(state.search.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  $('transaction-list').replaceChildren();
  // REQ - Allow the user to see all created resources, objects or documents
  // Evidence: every saved transaction is rendered when the filters are cleared.
  for (const item of visible) {
    const row = document.createElement('tr');
    const categoryIndex = categories.indexOf(item.category);
    const description = document.createElement('td');
    const name = document.createElement('div');
    name.className = 'transaction-name';
    const icon = document.createElement('span');
    // DOM Manipulation
    // REQ - DOM Manipulation. Modify at least three properties across two DOM elements.
    // Evidence: icon.className, icon.style.background, icon.style.color and
    // title.textContent below modify four properties across icon and title.
    icon.className = 'transaction-icon';
    icon.style.background = `${colors[categoryIndex] || colors[7]}22`;
    icon.style.color = colors[categoryIndex] || colors[7];
    icon.textContent = icons[categoryIndex] || '◇';
    const details = document.createElement('div');
    const title = document.createElement('strong');
    // Evidence continued: title is the second DOM element; textContent safely displays its description.
    title.textContent = item.description;
    const type = document.createElement('small');
    type.textContent = item.type === 'income' ? 'Income' : 'Expense';
    details.append(title, type);
    name.append(icon, details);
    description.append(name);
    const category = document.createElement('td');
    const tag = document.createElement('span');
    tag.className = 'category-tag';
    tag.textContent = item.category;
    category.append(tag);
    const date = document.createElement('td');
    date.className = 'date-cell';
    date.textContent = new Date(`${item.date}T00:00:00`).toLocaleDateString(
      'en-GB',
      { day: '2-digit', month: 'short', year: 'numeric' },
    );
    const amount = document.createElement('td');
    amount.className = `amount-cell amount-${item.type}`;
    amount.textContent = `${item.type === 'income' ? '+' : '−'}${formatMoney(item.amount)}`;
    const actions = document.createElement('td');
    actions.className = 'actions-cell';
    for (const action of ['Edit', 'Delete']) {
      const button = document.createElement('button');
      button.className = `row-button ${action.toLowerCase()}`;
      button.textContent = action;
      button.setAttribute('aria-label', `${action} ${item.description}`);
      button.addEventListener('click', () =>
        action === 'Edit'
          ? (window.location.href =
              '/transaction.html?id=' + encodeURIComponent(item.id))
          : openDelete(item, actions),
      );
      actions.append(button);
    }
    row.append(description, category, date, amount, actions);
    $('transaction-list').append(row);
  }
  $('empty').hidden = visible.length !== 0;
  setText('count', transactions.length);
  setText(
    'result-count',
    `Showing ${visible.length} of ${transactions.length} transactions`,
  );
}
function render() {
  // Structured programming evidence: sequence calls filtering, summary and table functions;
  // selection and iteration are implemented in those focused functions.
  setText(
    'ai-result',
    'Select Generate to request a summary for this overview period.',
  );
  const transactions = getPeriodTransactions();
  renderSummary(transactions);
  renderTransactions(transactions);
}
async function loadTransactions() {
  // REQ - You must execute at least one GET request via AJAX, and at least one of the
  // following requests via AJAX: POST, PATCH or PUT.
  // Evidence: this AJAX GET loads saved transactions; transaction.js submits POST or PUT.
  const data = await request('GET');
  state.transactions = data.transactions;
  const months = [
    ...new Set(state.transactions.map((item) => item.date.slice(0, 7))),
  ]
    .sort()
    .reverse();
  $('month').replaceChildren(new Option('All time', 'all'));
  for (const month of months)
    $('month').add(
      new Option(
        new Date(`${month}-01T00:00:00`).toLocaleDateString('en-GB', {
          month: 'long',
          year: 'numeric',
        }),
        month,
      ),
    );
  if (!months.includes(state.month)) state.month = 'all';
  $('month').value = state.month;
  render();
}

function openDelete(item, actions) {
  actions.replaceChildren();
  const confirmation = document.createElement('div');
  confirmation.className = 'inline-delete';
  const message = document.createElement('span');
  message.textContent = 'Delete this entry?';
  const confirm = document.createElement('button');
  confirm.className = 'row-button delete';
  confirm.textContent = 'Yes, delete';
  confirm.setAttribute('aria-label', `Confirm deletion of ${item.description}`);
  const cancel = document.createElement('button');
  cancel.className = 'row-button';
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', () => {
    render();
    $('transactions').scrollIntoView({ block: 'start' });
    $('search').focus({ preventScroll: true });
  });
  confirm.addEventListener('click', async () => {
    confirm.disabled = true;
    cancel.disabled = true;
    try {
      // REQ - Allow the user to delete instances of at least one type of resource, object or
      // document
      // Evidence: AJAX DELETE removes the selected transaction; the list is then reloaded.
      await request('DELETE', item.id);
      await loadTransactions();
      notify('Transaction deleted.');
      $('search').focus({ preventScroll: true });
    } catch (error) {
      message.textContent = error.message;
      confirm.disabled = false;
      cancel.disabled = false;
    }
  });
  confirmation.append(message, confirm, cancel);
  actions.append(confirmation);
  confirm.focus({ preventScroll: true });
}
// REQ - Exhibit proficiency in using at least two event handlers to enhance the interactivity of the application.
// Evidence: this click handler opens Add; input/change handlers below update filters and results.
$('add-button').addEventListener('click', () => {
  window.location.href = '/transaction.html';
});
for (const category of categories) {
  $('category-filter').add(new Option(category, category));
}
for (const [id, key, event] of [
  ['month', 'month', 'change'],
  ['search', 'search', 'input'],
  ['type-filter', 'type', 'change'],
  ['category-filter', 'category', 'change'],
]) {
  // Event-handler evidence continued: input updates search; change applies the selected filters.
  $(id).addEventListener(event, () => {
    state[key] = $(id).value;
    render();
  });
}
$('reset').addEventListener('click', () => {
  // REQ - Allow the user to see all created resources, objects or documents
  // Evidence: clear every filter to display all saved transactions.
  Object.assign(state, {
    month: 'all',
    search: '',
    type: 'all',
    category: 'all',
  });
  for (const [id, value] of [
    ['month', 'all'],
    ['search', ''],
    ['type-filter', 'all'],
    ['category-filter', 'all'],
  ])
    $(id).value = value;
  render();
});

loadTransactions().catch((error) => {
  setText('result-count', 'Could not load transactions. Refresh to try again.');
  notify(error.message);
});
const saved = new URLSearchParams(window.location.search).get('saved');
if (['added', 'updated'].includes(saved)) {
  notify(`Transaction ${saved}.`);
  history.replaceState(null, '', '/');
}

// LO8/10/11/12: a user event starts AJAX, then awaited results update the DOM.
async function serviceRequest(url, options) {
  if (!window.axios)
    throw new Error(
      'Axios could not load. Check your internet connection and refresh the page.',
    );
  // REQ -  Display the ability to perform at least one asynchronous call.
  // REQ -  Display the ability to fetch data from a JSON resource.
  // Evidence: Axios awaits HTTP and exposes parsed JSON in response.data.
  const response = await window.axios.request({
    url,
    method: options?.method || 'GET',
    headers: options?.headers,
    data: options?.body ? JSON.parse(options.body) : undefined,
    timeout: 25000,
    validateStatus: () => true,
  });
  const result = response.data;
  if (response.status < 200 || response.status >= 300)
    throw new Error(result.error || 'Service unavailable. Please try again.');
  return result;
}
$('exchange-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button');
  const amount = Number(form.elements.amount.value);
  const currency = form.elements.currency.value;
  button.disabled = true;
  setText('exchange-result', 'Fetching the latest reference rate…');
  try {
    const result = await serviceRequest(
      `/api/exchange?currency=${encodeURIComponent(currency)}`,
    );
    const converted = new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency,
    }).format(amount * result.rate);
    setText(
      'exchange-result',
      `${formatMoney(amount)} = ${converted}. ExchangeRate-API reference rate dated ${result.date}; bank fees are excluded.`,
    );
  } catch (error) {
    setText('exchange-result', error.message);
  } finally {
    button.disabled = false;
  }
});
$('generate-insight').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const month = state.month;
  button.disabled = true;
  setText('ai-result', 'Generating your summary…');
  try {
    const result = await serviceRequest('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month }),
    });
    setText(
      'ai-result',
      state.month === month
        ? `Groq · ${month === 'all' ? 'All time' : month}: ${result.text}`
        : 'The period changed. Generate a new summary for the current period.',
    );
  } catch (error) {
    setText('ai-result', error.message);
  } finally {
    button.disabled = false;
  }
});
