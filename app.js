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

    normalizeText(text) {
        return (text || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }

    isSameRecipe(recipeA, recipeB) {
        return this.normalizeText(recipeA.name) === this.normalizeText(recipeB.name)
            && this.normalizeText(recipeA.ingredients) === this.normalizeText(recipeB.ingredients);
    }

    findDuplicateRecipe(newRecipe, skipId = null) {
        return this.recipes.find(recipe => {
            if (skipId && recipe.id === skipId) {
                return false;
            }
            return this.isSameRecipe(recipe, newRecipe);
        });
    }

    findRecipesByTitle(title, skipId = null) {
        const normalizedTitle = this.normalizeText(title);
        return this.recipes.filter(recipe => {
            if (skipId && recipe.id === skipId) {
                return false;
            }
            return this.normalizeText(recipe.name) === normalizedTitle;
        });
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
        this.currentPhotoData = '';
        this.pageMode = document.body.dataset.page || 'local';
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
        this.shareRecipeBtn = document.getElementById('shareRecipeBtn');
        this.deleteRecipeBtn = document.getElementById('deleteRecipeBtn');
        this.importRecipeBtn = document.getElementById('importRecipeBtn');
        this.importModal = document.getElementById('importModal');
        this.closeImportBtn = document.getElementById('closeImportBtn');
        this.cancelImportBtn = document.getElementById('cancelImportBtn');
        this.importRecipeSubmitBtn = document.getElementById('importRecipeSubmitBtn');
        this.importText = document.getElementById('importText');

        // Form inputs
        this.recipeName = document.getElementById('recipeName');
        this.ingredients = document.getElementById('ingredients');
        this.instructions = document.getElementById('instructions');
        this.prepTime = document.getElementById('prepTime');
        this.cookTime = document.getElementById('cookTime');
        this.servings = document.getElementById('servings');
        this.difficulty = document.getElementById('difficulty');
        this.dishType = document.getElementById('dishType');
        this.vegetarian = document.getElementById('vegetarian');
        this.recipePhoto = document.getElementById('recipePhoto');
        this.generatePhotoBtn = document.getElementById('generatePhotoBtn');
        this.photoPreview = document.getElementById('photoPreview');
        this.formError = document.getElementById('formError');

        // Search
        this.searchInput = document.getElementById('searchInput');
        this.recipesList = document.getElementById('recipesList');
        this.recipePhoto = document.getElementById('recipePhoto');
        this.photoPreview = document.getElementById('photoPreview');

        // Modal titles
        this.modalTitle = document.getElementById('modalTitle');
        this.detailTitle = document.getElementById('detailTitle');
        this.detailContent = document.getElementById('detailContent');
    }

    attachEventListeners() {
        // Modal controls
        if (this.addRecipeBtn) {
            this.addRecipeBtn.addEventListener('click', () => this.openAddModal());
        }
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        this.cancelBtn.addEventListener('click', () => this.closeModal());
        this.closeDetailBtn.addEventListener('click', () => this.closeDetailModal());
        this.closeDetailBtnBottom.addEventListener('click', () => this.closeDetailModal());

        // Form submission
        this.recipeForm.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Search
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e));

        // Edit, Share, and Import
        this.editRecipeBtn.addEventListener('click', () => this.openEditModal());
        this.shareRecipeBtn.addEventListener('click', () => this.shareRecipe());
        this.deleteRecipeBtn.addEventListener('click', () => this.handleDelete());
        if (this.importRecipeBtn) {
            this.importRecipeBtn.addEventListener('click', () => this.openImportModal());
        }
        if (this.recipePhoto) {
            this.recipePhoto.addEventListener('change', (e) => this.handlePhotoUpload(e));
        }
        if (this.generatePhotoBtn) {
            this.generatePhotoBtn.addEventListener('click', () => this.generateRecipePhoto());
        }
        this.closeImportBtn.addEventListener('click', () => this.closeImportModal());
        this.cancelImportBtn.addEventListener('click', () => this.closeImportModal());
        this.importRecipeSubmitBtn.addEventListener('click', () => this.handleImportRecipe());

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === this.recipeModal) this.closeModal();
            if (e.target === this.detailModal) this.closeDetailModal();
            if (e.target === this.importModal) this.closeImportModal();
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
        this.difficulty.value = 'medium';
        this.dishType.value = 'breakfast';
        this.vegetarian.checked = false;
        this.currentPhotoData = '';
        if (this.photoPreview) {
            this.photoPreview.innerHTML = '';
        }
        this.clearFormError();
    }

    populateForm(recipe) {
        this.recipeName.value = recipe.name;
        this.ingredients.value = recipe.ingredients;
        this.instructions.value = recipe.instructions;
        this.prepTime.value = recipe.prepTime || '';
        this.cookTime.value = recipe.cookTime || '';
        this.servings.value = recipe.servings || '4';
        this.difficulty.value = recipe.difficulty || 'medium';
        this.dishType.value = recipe.dishType || 'breakfast';
        this.vegetarian.checked = recipe.vegetarian || false;
        this.currentPhotoData = recipe.photo || '';
        if (this.photoPreview) {
            this.photoPreview.innerHTML = recipe.photo
                ? `<img src="${recipe.photo}" alt="${this.escapeHtml(recipe.name)} photo">`
                : '';
        }
    }

    handleFormSubmit(e) {
        e.preventDefault();

        const existingPhoto = this.currentEditingId
            ? this.recipeManager.getRecipe(this.currentEditingId)?.photo || ''
            : '';
        const recipeData = {
            name: this.recipeName.value,
            ingredients: this.ingredients.value,
            instructions: this.instructions.value,
            prepTime: this.prepTime.value ? parseInt(this.prepTime.value) : 0,
            cookTime: this.cookTime.value ? parseInt(this.cookTime.value) : 0,
            servings: parseInt(this.servings.value),
            difficulty: this.difficulty.value,
            dishType: this.dishType.value || 'breakfast',
            vegetarian: this.vegetarian.checked,
            photo: this.currentPhotoData || existingPhoto,
            source: 'local'
        };

        const existingExactMatch = this.recipeManager.findDuplicateRecipe(recipeData, this.currentEditingId);
        if (existingExactMatch) {
            this.showFormError('A recipe with the same name and ingredients already exists.');
            return;
        }

        const titleMatches = this.recipeManager.findRecipesByTitle(recipeData.name, this.currentEditingId);
        const distinctTitleMatches = titleMatches.filter(recipe => !this.recipeManager.isSameRecipe(recipe, recipeData));
        if (titleMatches.length > 0 && distinctTitleMatches.length === 0) {
            this.showFormError('A recipe with the same title and ingredients already exists.');
            return;
        }

        if (distinctTitleMatches.length > 0) {
            const existingText = distinctTitleMatches.map((recipe, index) => {
                const ingredients = recipe.ingredients.split('\n').map(i => i.trim()).filter(Boolean).join(', ');
                return `Existing Recipe ${index + 1}:\nIngredients: ${ingredients}\nInstructions: ${recipe.instructions.trim().slice(0, 120)}${recipe.instructions.length > 120 ? '...' : ''}`;
            }).join('\n\n');

            const currentIngredients = this.ingredients.value.split('\n').map(i => i.trim()).filter(Boolean).join(', ');
            const currentInstructions = this.instructions.value.trim().slice(0, 120) + (this.instructions.value.trim().length > 120 ? '...' : '');
            const confirmText = `A recipe with the same title already exists.\n\n${existingText}\n\nYour Recipe:\nIngredients: ${currentIngredients}\nInstructions: ${currentInstructions}\n\nSave anyway?`;

            if (!confirm(confirmText)) {
                return;
            }
        }

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

    shareRecipe() {
        const recipe = this.recipeManager.getRecipe(this.currentEditingId);
        if (!recipe) return;

        const ingredients = recipe.ingredients
            .split('\n')
            .filter(i => i.trim())
            .map(i => `- ${i.trim()}`)
            .join('\n');

        const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
        const shareText = `Recipe: ${recipe.name}\n` +
            `Dish Type: ${this.capitalizeLabel(recipe.dishType || 'breakfast')}\n` +
            `Type: ${recipe.vegetarian ? 'Vegetarian' : 'Non-vegetarian'}\n` +
            `Difficulty: ${recipe.difficulty || 'Medium'}\n` +
            `Servings: ${recipe.servings || 4}\n` +
            `Prep Time: ${recipe.prepTime || 0} min\n` +
            `Cook Time: ${recipe.cookTime || 0} min\n` +
            `Total Time: ${totalTime} min\n\n` +
            `Ingredients:\n${ingredients}\n\n` +
            `Instructions:\n${recipe.instructions}`;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareText)
                .then(() => alert('Recipe copied to clipboard. Share it with others!'))
                .catch(() => this.fallbackShare(shareText));
        } else {
            this.fallbackShare(shareText);
        }
    }

    fallbackShare(text) {
        prompt('Copy the recipe text below and share it with others:', text);
    }

    openImportModal() {
        this.importText.value = '';
        this.importModal.classList.add('active');
    }

    handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            this.currentPhotoData = reader.result;
            if (this.photoPreview) {
                this.photoPreview.innerHTML = `<img src="${reader.result}" alt="Recipe photo preview">`;
            }
        };
        reader.readAsDataURL(file);
    }

    showFormError(message) {
        if (this.formError) {
            this.formError.textContent = message;
            this.formError.style.display = 'block';
        } else {
            alert(message);
        }
    }

    clearFormError() {
        if (this.formError) {
            this.formError.textContent = '';
            this.formError.style.display = 'none';
        }
    }

    closeImportModal() {
        this.importModal.classList.remove('active');
    }

    handleImportRecipe() {
        const importText = this.importText.value.trim();
        if (!importText) {
            alert('Please paste the shared recipe text to import.');
            return;
        }

        const recipeData = this.parseSharedRecipeText(importText);
        if (!recipeData) {
            alert('Unable to parse the recipe. Make sure it uses the same shared format.');
            return;
        }

        recipeData.source = 'shared';
        const duplicateLocal = this.recipeManager.findDuplicateRecipe(recipeData);
        if (duplicateLocal && duplicateLocal.source !== 'shared') {
            alert('This shared recipe is exactly the same as one of your own recipes and cannot be imported.');
            return;
        }

        this.recipeManager.addRecipe(recipeData);
        this.closeImportModal();
        this.render();
        alert('Recipe imported successfully!');
    }

    generateRecipePhoto() {
        const query = this.recipeName.value.trim() || 'food';
        const encodedQuery = encodeURIComponent(`${query} recipe`);
        const url = `https://source.unsplash.com/featured/600x400?${encodedQuery}`;
        this.currentPhotoData = url;
        if (this.photoPreview) {
            this.photoPreview.innerHTML = `<img src="${url}" alt="Generated recipe photo">`;
        }
    }

    parseSharedRecipeText(text) {
        const lines = text.split(/\r?\n/).map(line => line.trim());
        const recipe = {
            name: '',
            ingredients: [],
            instructions: [],
            prepTime: 0,
            cookTime: 0,
            servings: 4,
            difficulty: 'medium',
            dishType: 'breakfast',
            vegetarian: false
        };

        let section = null;
        for (const line of lines) {
            if (!line) continue;

            const recipeMatch = line.match(/^Recipe:\s*(.+)$/i);
            const dishTypeMatch = line.match(/^Dish\s*Type:\s*(.+)$/i);
            const typeMatch = line.match(/^Type:\s*(.+)$/i);
            const difficultyMatch = line.match(/^Difficulty:\s*(.+)$/i);
            const servingsMatch = line.match(/^Servings:\s*(\d+)/i);
            const prepMatch = line.match(/^Prep Time:\s*(\d+)/i);
            const cookMatch = line.match(/^Cook Time:\s*(\d+)/i);
            const ingredientsStart = line.match(/^Ingredients:\s*$/i);
            const instructionsStart = line.match(/^Instructions:\s*$/i);
            const ingredientItem = line.match(/^[-•]\s*(.+)$/);

            if (recipeMatch) {
                recipe.name = recipeMatch[1].trim();
                section = null;
                continue;
            }
            if (dishTypeMatch) {
                recipe.dishType = dishTypeMatch[1].trim().toLowerCase();
                section = null;
                continue;
            }
            if (typeMatch) {
                const typeValue = typeMatch[1].trim().toLowerCase();
                if (/(breakfast|lunch|dinner|snack|dessert|brunch|supper|other)/i.test(typeValue)) {
                    recipe.dishType = typeValue;
                }
                if (typeValue.includes('veget')) {
                    recipe.vegetarian = true;
                }
                if (typeValue.includes('non')) {
                    recipe.vegetarian = false;
                }
                section = null;
                continue;
            }
            if (difficultyMatch) {
                recipe.difficulty = difficultyMatch[1].trim().toLowerCase();
                section = null;
                continue;
            }
            if (servingsMatch) {
                recipe.servings = parseInt(servingsMatch[1], 10) || 4;
                section = null;
                continue;
            }
            if (prepMatch) {
                recipe.prepTime = parseInt(prepMatch[1], 10) || 0;
                section = null;
                continue;
            }
            if (cookMatch) {
                recipe.cookTime = parseInt(cookMatch[1], 10) || 0;
                section = null;
                continue;
            }
            if (ingredientsStart) {
                section = 'ingredients';
                continue;
            }
            if (instructionsStart) {
                section = 'instructions';
                continue;
            }
            if (section === 'ingredients' && ingredientItem) {
                recipe.ingredients.push(ingredientItem[1].trim());
                continue;
            }
            if (section === 'instructions') {
                recipe.instructions.push(line);
                continue;
            }
        }

        if (!recipe.name || recipe.ingredients.length === 0 || recipe.instructions.length === 0) {
            return null;
        }

        return {
            name: recipe.name,
            ingredients: recipe.ingredients.join('\n'),
            instructions: recipe.instructions.join('\n'),
            prepTime: recipe.prepTime,
            cookTime: recipe.cookTime,
            servings: recipe.servings,
            difficulty: recipe.difficulty,
            vegetarian: recipe.vegetarian,
            source: 'shared'
        };
    }

    render(searchQuery = '') {
        const recipes = searchQuery
            ? this.recipeManager.searchRecipes(searchQuery)
            : this.recipeManager.getAllRecipes();

        const filteredRecipes = recipes.filter(recipe => {
            if (this.pageMode === 'shared') {
                return recipe.source === 'shared';
            }
            return recipe.source !== 'shared';
        });

        if (filteredRecipes.length === 0) {
            const emptyText = this.pageMode === 'shared'
                ? 'No shared recipes found. Import one to get started!'
                : 'No recipes found. Add one to get started!';
            this.recipesList.innerHTML = `<p class="empty-state">${emptyText}</p>`;
            return;
        }

        const recipeCards = filteredRecipes.map(recipe => this.createRecipeCard(recipe)).join('');
        this.recipesList.innerHTML = `
            <section class="recipe-section">
                <div class="recipes-grid">
                    ${recipeCards}
                </div>
            </section>
        `;

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
        const statusIcon = recipe.vegetarian ? '🥬' : '🔥';
        const statusLabel = recipe.vegetarian ? 'Vegetarian' : 'Non-vegetarian';
        const statusClass = recipe.vegetarian ? 'vegetarian' : 'non-vegetarian';
        const sourceBadge = recipe.source === 'shared' ? '<span class="recipe-badge">Shared</span>' : '';
        const dishTypeBadge = recipe.dishType ? `<span class="recipe-badge recipe-type-badge">${this.escapeHtml(this.capitalizeLabel(recipe.dishType))}</span>` : '';
        const photoMarkup = recipe.photo
            ? `<div class="recipe-card-image"><img src="${recipe.photo}" alt="${this.escapeHtml(recipe.name)}"></div>`
            : '';

        return `
            <div class="recipe-card" data-id="${recipe.id}">
                ${photoMarkup}
                <div class="recipe-card-header">
                    <div class="recipe-card-title-group">
                        <div class="recipe-card-title-row">
                            <h3>${this.escapeHtml(recipe.name)}</h3>
                            ${sourceBadge}
                        </div>
                        <span class="recipe-difficulty">${recipe.difficulty || 'Medium'}</span>
                        ${dishTypeBadge}
                    </div>
                    <span class="recipe-status ${statusClass}" title="${statusLabel}">${statusIcon}</span>
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
        const detailPhotoSection = recipe.photo
            ? `<div class="detail-photo"><img src="${recipe.photo}" alt="${this.escapeHtml(recipe.name)}"></div>`
            : '';

        this.detailContent.innerHTML = `
            ${detailPhotoSection}
            <div class="detail-info-grid">
                ${recipe.prepTime ? `<div class="detail-info-box"><strong>Prep Time</strong>${recipe.prepTime} min</div>` : ''}
                ${recipe.cookTime ? `<div class="detail-info-box"><strong>Cook Time</strong>${recipe.cookTime} min</div>` : ''}
                ${totalTime > 0 ? `<div class="detail-info-box"><strong>Total Time</strong>${totalTime} min</div>` : ''}
                <div class="detail-info-box"><strong>Servings</strong>${recipe.servings || 4}</div>
                <div class="detail-info-box"><strong>Dish Type</strong>${this.escapeHtml(this.capitalizeLabel(recipe.dishType || 'breakfast'))}</div>
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

    capitalizeLabel(label) {
        return String(label || '').replace(/\b(\w)/g, char => char.toUpperCase());
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    const recipeManager = new RecipeManager();
    const uiManager = new UIManager(recipeManager);
});
