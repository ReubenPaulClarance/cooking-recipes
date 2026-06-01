// Recipe Storage Manager
class RecipeManager {
    constructor() {
        this.storageKey = 'cookingRecipes';
        this.recipes = this.loadRecipes();
    }

    loadRecipes() {
        const stored = localStorage.getItem(this.storageKey);
        return stored ? JSON.parse(stored) : [];
    }

    saveRecipes() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.recipes));
    }

    addRecipe(recipe) {
        const newRecipe = {
            id: Date.now(),
            ...recipe,
            createdAt: new Date().toISOString()
        };
        this.recipes.push(newRecipe);
        this.saveRecipes();
        return newRecipe;
    }

    getRecipe(id) {
        return this.recipes.find(r => r.id === id);
    }

    updateRecipe(id, updatedRecipe) {
        const index = this.recipes.findIndex(r => r.id === id);
        if (index !== -1) {
            this.recipes[index] = { ...this.recipes[index], ...updatedRecipe };
            this.saveRecipes();
            return this.recipes[index];
        }
        return null;
    }

    deleteRecipe(id) {
        this.recipes = this.recipes.filter(r => r.id !== id);
        this.saveRecipes();
    }

    searchRecipes(query) {
        const lowerQuery = query.toLowerCase();
        return this.recipes.filter(recipe =>
            recipe.name.toLowerCase().includes(lowerQuery) ||
            recipe.ingredients.toLowerCase().includes(lowerQuery)
        );
    }

    getAllRecipes() {
        return this.recipes;
    }
}

// UI Manager
class UIManager {
    constructor(recipeManager) {
        this.recipeManager = recipeManager;
        this.currentEditingId = null;
        this.initializeElements();
        this.attachEventListeners();
        this.render();
    }

    initializeElements() {
        // Modal elements
        this.recipeModal = document.getElementById('recipeModal');
        this.detailModal = document.getElementById('detailModal');
        this.recipeForm = document.getElementById('recipeForm');

        // Button elements
        this.addRecipeBtn = document.getElementById('addRecipeBtn');
        this.closeModalBtn = document.getElementById('closeModalBtn');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.closeDetailBtn = document.getElementById('closeDetailBtn');
        this.closeDetailBtnBottom = document.getElementById('closeDetailBtnBottom');
        this.editRecipeBtn = document.getElementById('editRecipeBtn');
        this.deleteRecipeBtn = document.getElementById('deleteRecipeBtn');

        // Form inputs
        this.recipeName = document.getElementById('recipeName');
        this.ingredients = document.getElementById('ingredients');
        this.instructions = document.getElementById('instructions');
        this.prepTime = document.getElementById('prepTime');
        this.cookTime = document.getElementById('cookTime');
        this.servings = document.getElementById('servings');
        this.difficulty = document.getElementById('difficulty');

        // Search
        this.searchInput = document.getElementById('searchInput');
        this.recipesList = document.getElementById('recipesList');

        // Modal titles
        this.modalTitle = document.getElementById('modalTitle');
        this.detailTitle = document.getElementById('detailTitle');
        this.detailContent = document.getElementById('detailContent');
    }

    attachEventListeners() {
        // Modal controls
        this.addRecipeBtn.addEventListener('click', () => this.openAddModal());
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        this.cancelBtn.addEventListener('click', () => this.closeModal());
        this.closeDetailBtn.addEventListener('click', () => this.closeDetailModal());
        this.closeDetailBtnBottom.addEventListener('click', () => this.closeDetailModal());

        // Form submission
        this.recipeForm.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Search
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e));

        // Edit and Delete
        this.editRecipeBtn.addEventListener('click', () => this.openEditModal());
        this.deleteRecipeBtn.addEventListener('click', () => this.handleDelete());

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === this.recipeModal) this.closeModal();
            if (e.target === this.detailModal) this.closeDetailModal();
        });
    }

    openAddModal() {
        this.currentEditingId = null;
        this.modalTitle.textContent = 'Add New Recipe';
        this.resetForm();
        this.recipeModal.classList.add('active');
    }

    openEditModal() {
        if (!this.currentEditingId) return;
        const recipe = this.recipeManager.getRecipe(this.currentEditingId);
        if (recipe) {
            this.modalTitle.textContent = 'Edit Recipe';
            this.populateForm(recipe);
            this.closeDetailModal();
            this.recipeModal.classList.add('active');
        }
    }

    closeModal() {
        this.recipeModal.classList.remove('active');
        this.resetForm();
        this.currentEditingId = null;
    }

    closeDetailModal() {
        this.detailModal.classList.remove('active');
        this.currentEditingId = null;
    }

    resetForm() {
        this.recipeForm.reset();
        this.servings.value = '4';
    }

    populateForm(recipe) {
        this.recipeName.value = recipe.name;
        this.ingredients.value = recipe.ingredients;
        this.instructions.value = recipe.instructions;
        this.prepTime.value = recipe.prepTime || '';
        this.cookTime.value = recipe.cookTime || '';
        this.servings.value = recipe.servings || '4';
        this.difficulty.value = recipe.difficulty || 'medium';
    }

    handleFormSubmit(e) {
        e.preventDefault();

        const recipeData = {
            name: this.recipeName.value,
            ingredients: this.ingredients.value,
            instructions: this.instructions.value,
            prepTime: this.prepTime.value ? parseInt(this.prepTime.value) : 0,
            cookTime: this.cookTime.value ? parseInt(this.cookTime.value) : 0,
            servings: parseInt(this.servings.value),
            difficulty: this.difficulty.value
        };

        if (this.currentEditingId) {
            this.recipeManager.updateRecipe(this.currentEditingId, recipeData);
        } else {
            this.recipeManager.addRecipe(recipeData);
        }

        this.closeModal();
        this.render();
    }

    handleSearch(e) {
        const query = e.target.value;
        this.render(query);
    }

    handleDelete() {
        if (confirm('Are you sure you want to delete this recipe?')) {
            this.recipeManager.deleteRecipe(this.currentEditingId);
            this.closeDetailModal();
            this.render();
        }
    }

    render(searchQuery = '') {
        const recipes = searchQuery
            ? this.recipeManager.searchRecipes(searchQuery)
            : this.recipeManager.getAllRecipes();

        if (recipes.length === 0) {
            this.recipesList.innerHTML = '<p class="empty-state">No recipes found. Try adding one!</p>';
            return;
        }

        this.recipesList.innerHTML = recipes
            .map(recipe => this.createRecipeCard(recipe))
            .join('');

        // Attach click handlers to recipe cards
        document.querySelectorAll('.recipe-card').forEach(card => {
            card.addEventListener('click', () => {
                this.showRecipeDetail(parseInt(card.dataset.id));
            });
        });
    }

    createRecipeCard(recipe) {
        const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
        const timeDisplay = totalTime > 0 ? `${totalTime} min` : 'N/A';

        return `
            <div class="recipe-card" data-id="${recipe.id}">
                <div class="recipe-card-header">
                    <h3>${this.escapeHtml(recipe.name)}</h3>
                    <span class="recipe-difficulty">${recipe.difficulty || 'Medium'}</span>
                </div>
                <div class="recipe-card-body">
                    <div class="recipe-info">
                        <div class="recipe-info-item">
                            <span>⏱️</span>
                            <span>${timeDisplay}</span>
                        </div>
                        <div class="recipe-info-item">
                            <span>👥</span>
                            <span>${recipe.servings || 4} servings</span>
                        </div>
                    </div>
                    <div class="recipe-description">
                        ${this.escapeHtml(recipe.ingredients)}
                    </div>
                    <div class="recipe-card-footer">
                        <button class="btn btn-view">View Recipe →</button>
                    </div>
                </div>
            </div>
        `;
    }

    showRecipeDetail(id) {
        const recipe = this.recipeManager.getRecipe(id);
        if (!recipe) return;

        this.currentEditingId = id;

        this.detailTitle.textContent = recipe.name;

        const ingredientsList = recipe.ingredients
            .split('\n')
            .filter(i => i.trim())
            .map(i => `<li>${this.escapeHtml(i.trim())}</li>`)
            .join('');

        const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

        this.detailContent.innerHTML = `
            <div class="detail-info-grid">
                ${recipe.prepTime ? `<div class="detail-info-box"><strong>Prep Time</strong>${recipe.prepTime} min</div>` : ''}
                ${recipe.cookTime ? `<div class="detail-info-box"><strong>Cook Time</strong>${recipe.cookTime} min</div>` : ''}
                ${totalTime > 0 ? `<div class="detail-info-box"><strong>Total Time</strong>${totalTime} min</div>` : ''}
                <div class="detail-info-box"><strong>Servings</strong>${recipe.servings || 4}</div>
                <div class="detail-info-box"><strong>Difficulty</strong>${recipe.difficulty || 'Medium'}</div>
            </div>

            <div class="detail-section">
                <h3>📋 Ingredients</h3>
                <ul style="margin-left: 20px;">
                    ${ingredientsList}
                </ul>
            </div>

            <div class="detail-section">
                <h3>👨‍🍳 Instructions</h3>
                <p>${this.escapeHtml(recipe.instructions)}</p>
            </div>
        `;

        this.detailModal.classList.add('active');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    const recipeManager = new RecipeManager();
    const uiManager = new UIManager(recipeManager);
});
