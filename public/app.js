const form = document.getElementById('assistant-form');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const modelTagEl = document.getElementById('model-tag');
const submitBtn = document.getElementById('generate-btn');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  statusEl.textContent = 'Generating AI-powered campaign plan...';
  resultEl.innerHTML = '';
  submitBtn.disabled = true;

  try {
    const response = await fetch('/api/assist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.details || data.error || 'Request failed');
    }

    statusEl.textContent = 'Plan generated successfully.';
    modelTagEl.textContent = `Model: ${data.model}`;

    const markdown = data.content || 'No content returned.';
    resultEl.innerHTML = window.marked ? marked.parse(markdown) : markdown;
  } catch (error) {
    statusEl.textContent = 'Could not generate the plan. Please try again.';
    resultEl.textContent = error.message;
    modelTagEl.textContent = 'Model: unavailable';
  } finally {
    submitBtn.disabled = false;
  }
});
