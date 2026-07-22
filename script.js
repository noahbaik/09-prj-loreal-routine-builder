/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const productDetailsPanel = document.getElementById("productDetailsPanel");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");

const workerUrl = "https://loreal-api-key.noahbaik.workers.dev/";
const storageKey = "loreal-selected-products";

let allProducts = [];
let selectedProductIds = loadSelectedProductIds();
let currentFilteredProducts = [];
let activeProductId = null;
let conversationMessages = [];

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load the saved list right away so it is visible after a page reload */
async function initializeSelectionState() {
  await loadProducts();
  displaySelectedProducts();
}

/* Load product data from JSON file */
async function loadProducts() {
  if (allProducts.length > 0) {
    return allProducts;
  }

  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;
  return allProducts;
}

/* Load the saved selection list from localStorage */
function loadSelectedProductIds() {
  const savedSelection = localStorage.getItem(storageKey);

  if (!savedSelection) {
    return [];
  }

  try {
    const parsedSelection = JSON.parse(savedSelection);

    if (!Array.isArray(parsedSelection)) {
      return [];
    }

    return parsedSelection;
  } catch (error) {
    return [];
  }
}

/* Save the selected product list so it stays after reload */
function saveSelectedProductIds() {
  localStorage.setItem(storageKey, JSON.stringify(selectedProductIds));
}

/* Mark a product card as selected if its id is in the selected list */
function isProductSelected(productId) {
  return selectedProductIds.includes(productId);
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  currentFilteredProducts = products;

  productsContainer.innerHTML = products
    .map((product) => {
      const selectedClass = isProductSelected(product.id) ? "selected" : "";

      return `
        <div
          class="product-card ${selectedClass}"
          data-product-id="${product.id}"
          tabindex="0"
          aria-pressed="${isProductSelected(product.id)}"
          aria-label="${product.name} by ${product.brand}. Select or unselect this product."
        >
          <img src="${product.image}" alt="${product.name}">
          <div class="product-info">
            <h3>${product.name}</h3>
            <p>${product.brand}</p>
            <button
              type="button"
              class="toggle-description-btn"
              data-product-id="${product.id}"
              aria-expanded="${activeProductId === product.id}"
            >
              ${activeProductId === product.id ? "Hide info" : "More info"}
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

/* Show the selected product description in the left-side panel */
function showProductDetails(productId) {
  const product = allProducts.find((item) => item.id === productId);

  if (!product) {
    return;
  }

  activeProductId = productId;
  productDetailsPanel.innerHTML = `
    <h2>${product.name}</h2>
    <p class="product-details-brand">${product.brand}</p>
    <p class="product-details-description">${product.description}</p>
  `;

  displayProducts(currentFilteredProducts);
}

/* Get only the products that the user has selected */
function getSelectedProducts() {
  return allProducts.filter((product) =>
    selectedProductIds.includes(product.id),
  );
}

/* Render the selected products list and allow each item to be removed */
function displaySelectedProducts() {
  const selectedProducts = getSelectedProducts();

  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `
      <p class="empty-selection-message">No products selected yet.</p>
    `;
    return;
  }

  selectedProductsList.innerHTML = `
    <div class="selected-products-actions">
      <button type="button" class="clear-all-btn" id="clearAllSelectionsInline">
        Clear All
      </button>
    </div>
    ${selectedProducts
      .map(
        (product) => `
          <div class="selected-product-pill">
            <span>${product.name}</span>
            <button
              type="button"
              class="remove-selected-btn"
              data-product-id="${product.id}"
              aria-label="Remove ${product.name}"
            >
              ×
            </button>
          </div>
        `,
      )
      .join("")}
  `;
}

/* Escape HTML so the AI message shows safely in the chat UI */
function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/* Convert line breaks into readable chatbot-style paragraphs */
function formatChatContent(content) {
  const escapedContent = escapeHtml(content);
  const paragraphs = escapedContent
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");

  return paragraphs;
}

/* Print a chat message in the chat window */
function addChatMessage(role, content) {
  const messageElement = document.createElement("div");
  messageElement.className = `chat-message ${role}`;
  messageElement.innerHTML = formatChatContent(content);
  chatWindow.appendChild(messageElement);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Add or remove a product from the selected list */
function toggleProductSelection(productId) {
  const productIndex = selectedProductIds.indexOf(productId);

  if (productIndex >= 0) {
    selectedProductIds.splice(productIndex, 1);
  } else {
    selectedProductIds.push(productId);
  }

  saveSelectedProductIds();
  displayProducts(currentFilteredProducts);
  displaySelectedProducts();
}

/* Remove all saved selections */
function clearAllSelections() {
  selectedProductIds = [];
  saveSelectedProductIds();
  displayProducts(currentFilteredProducts);
  displaySelectedProducts();
}

/* Show a product description in the left-side panel */
productsContainer.addEventListener("click", (e) => {
  const toggleButton = e.target.closest(".toggle-description-btn");

  if (toggleButton) {
    e.stopPropagation();

    const productId = Number(toggleButton.dataset.productId);
    showProductDetails(productId);
    return;
  }

  const card = e.target.closest(".product-card");

  if (!card) {
    return;
  }

  const productId = Number(card.dataset.productId);
  toggleProductSelection(productId);
});

/* Let keyboard users toggle a product card with Enter or Space */
productsContainer.addEventListener("keydown", (e) => {
  const card = e.target.closest(".product-card");

  if (!card) {
    return;
  }

  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();

    if (e.target.classList.contains("toggle-description-btn")) {
      e.target.click();
      return;
    }

    const productId = Number(card.dataset.productId);
    toggleProductSelection(productId);
  }
});

/* Remove a selected product directly from the selected list */
selectedProductsList.addEventListener("click", (e) => {
  const removeButton = e.target.closest(".remove-selected-btn");
  const clearAllInlineButton = e.target.closest("#clearAllSelectionsInline");

  if (clearAllInlineButton) {
    clearAllSelections();
    return;
  }

  if (!removeButton) {
    return;
  }

  const productId = Number(removeButton.dataset.productId);
  toggleProductSelection(productId);
});

initializeSelectionState();

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory,
  );

  displayProducts(filteredProducts);
  displaySelectedProducts();
});

/* Build a personalized routine from the selected products */
generateRoutineBtn.addEventListener("click", async () => {
  const selectedProducts = getSelectedProducts();

  if (selectedProducts.length === 0) {
    chatWindow.innerHTML = "";
    addChatMessage(
      "assistant",
      "Please select at least one product before generating a routine.",
    );
    return;
  }

  const selectedProductDetails = selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
  }));

  const userPrompt = `Build a personalized L'Oréal skincare routine using these selected products. Explain the order to use them and suggest a simple daily routine.\n\n${JSON.stringify(selectedProductDetails, null, 2)}`;

  conversationMessages = [
    {
      role: "system",
      content:
        "You are a helpful L'Oréal skincare and beauty advisor. Recommend a routine based only on the selected products and explain it clearly. Format your answer as a friendly, easy-to-read chatbot reply with short sections or bullets when helpful. Stay focused on skincare, haircare, makeup, fragrance, and related beauty topics.",
    },
    { role: "user", content: userPrompt },
  ];

  chatWindow.innerHTML = "";
  addChatMessage("assistant", "Generating your routine...");

  try {
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: conversationMessages,
      }),
    });

    const data = await response.json();
    const routineText =
      data?.choices?.[0]?.message?.content ||
      "I could not generate a routine right now.";

    conversationMessages.push({
      role: "assistant",
      content: routineText,
    });

    chatWindow.innerHTML = "";
    addChatMessage("assistant", routineText);
  } catch (error) {
    chatWindow.innerHTML = "";
    addChatMessage(
      "assistant",
      "Sorry, I could not reach the AI service right now. Please try again.",
    );
  }
});

/* Follow-up chat form sends the conversation history back to the worker */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userInput = chatForm.userInput.value.trim();

  if (!userInput) {
    return;
  }

  addChatMessage("user", userInput);
  chatForm.reset();

  const nextMessages = [
    ...conversationMessages,
    { role: "user", content: userInput },
  ];

  try {
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: nextMessages,
      }),
    });

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || "I’m not sure.";

    conversationMessages = nextMessages;
    conversationMessages.push({ role: "assistant", content: reply });
    addChatMessage("assistant", reply);
  } catch (error) {
    addChatMessage(
      "assistant",
      "Sorry, I could not reach the AI service right now. Please try again.",
    );
  }
});
