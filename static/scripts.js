const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

// Reset Form Fields upon Closing Modal
function resetFormFields(containerId) {
    const container = document.getElementById(containerId);

    if (container) {
        const datetimeInput = container.querySelector('input[type="datetime-local"]');
        if (datetimeInput) {
            datetimeInput.value = '';
        }

        const inputs = container.querySelectorAll('input');
        inputs.forEach(input => {
            input.value = '';
        });

        const textareas = container.querySelectorAll('textarea');
        textareas.forEach(textarea => {
            textarea.value = '';
        });

        const selects = container.querySelectorAll('select');
        selects.forEach(select => {
            select.selectedIndex = 0;
        });
    }

    document.getElementById('deleteTransactionButton').style.display = 'none';
    document.getElementById('addTransactionModalLabel').innerHTML = 'Add Transaction';
    document.getElementById('formMode').value = 'add';
}


// Adding Transaction in Index.html
// Populate categories and assets dynamically
function populateCategories() {
    // Fetch categories from the backend
    fetch('/get_categories')
        .then(response => response.json())
        .then(data => {
            const categorySelects = document.querySelectorAll('.category-select');
            categorySelects.forEach(select => {
                select.innerHTML = '';
                data.categories.forEach(category => {
                    const option = document.createElement('option');
                    option.text = category.name;
                    option.value = category.id;
                    select.appendChild(option);
                });
            });
        })
        .catch(error => console.error('Error fetching categories:', error));
}

function populateAssets() {
    // Fetch assets from the backend
    fetch('/get_assets')
        .then(response => response.json())
        .then(data => {
            const assets = data.assets;
            const assetSelects = document.querySelectorAll('.asset-select');
            assetSelects.forEach(select => {
                select.innerHTML = '';
                assets.forEach(asset => {
                    const option = document.createElement('option');
                    option.text = asset.asset_name;
                    option.value = asset.id;
                    select.appendChild(option);
                });
            });
        })
        .catch(error => console.error('Error fetching assets:', error));
}

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.btn-link').forEach(button => {
        button.addEventListener('click', openEditCategoriesModal);
    });

    populateCategories();
    populateAssets();
});


// Handling Opening Edit Category Modal
function openEditCategoriesModal() {
    // Fetch Existing Categories
    fetch('/get_categories')
        .then(response => response.json())
        .then(data => {
            const categoriesList = document.getElementById('categoriesList');
            categoriesList.innerHTML = '';
            data.categories.forEach(category => {
                const listItem = document.createElement('li');
                listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
                listItem.innerHTML = `
                    ${category.name}
                    <button class="btn btn-danger btn-sm" onclick="deleteCategory('${category.name}')">Delete</button>
                `;
                categoriesList.appendChild(listItem);
            });
        })
        .catch(error => console.error('Error fetching categories:', error));

    $('#editCategoriesModal').modal('show');
}

// Add New Category
function addCategory(event) {
    event.preventDefault();

    const newCategoryInput = document.getElementById('newCategory');
    const newCategory = newCategoryInput.value.trim();

    if (newCategory) {
        fetch('/add_category', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({
                category: newCategory
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                const categoriesList = document.getElementById('categoriesList');
                const listItem = document.createElement('li');
                listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
                listItem.innerHTML = `
                    ${newCategory}
                    <button class="btn btn-danger btn-sm" onclick="deleteCategory('${newCategory}')">Delete</button>
                `;
                categoriesList.appendChild(listItem);

                // Clear the input field
                newCategoryInput.value = '';
                populateCategories();
            } else {
                console.error('Error adding category:', data.message);
                alert(`Error adding category: ${data.message}`);
            }
        })
        .catch(error => {
            console.error('Error adding category: ', error);
            alert('An error occurred while adding the category.');
        });
    } else {
        alert('Category name cannot be empty.');
    }
}

// Function to delete a category
function deleteCategory(category) {
    fetch('/delete_category', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({
            category: category
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Remove category from the list
            const categoriesList = document.getElementById('categoriesList');
            const items = categoriesList.getElementsByTagName('li');
            for (let item of items) {
                if (item.textContent.includes(category)) {
                    categoriesList.removeChild(item);
                    populateCategories()
                    break;
                }
            }
        } else {
            console.error('Category Cannot be deleted: ', data.message);
            alert(`Error deleting category: ${data.message}`);
        }
    })
    .catch(error => {
        console.error('Error: ', error)
        alert('An error occurred while deleting the category.');
    });
}

// Add Transaction Button must display all tabs (income, expense, transfer)
function showAllTabs() {
    document.getElementById('income-tab').parentElement.style.display = 'block';
    document.getElementById('expense-tab').parentElement.style.display = 'blcok';
    document.getElementById('transfer-tab').parentElement.style.display = 'block';
    $('#income-tab').tab('show');
}

// Opening Transaction Edit Modal
function openEditModal(element) {
    const transactionId = element.getAttribute('data-id');
    const type = element.getAttribute('data-type');
    const date = element.getAttribute('data-date');
    const amount = element.getAttribute('data-amount');
    const category = element.getAttribute('data-category');
    const asset = element.getAttribute('data-asset');
    const fromAsset = element.getAttribute('data-from-asset');
    const toAsset = element.getAttribute('data-to-asset');
    const note = element.getAttribute('data-note');

    // Set form mode to edit
    document.getElementById('addTransactionModalLabel').innerHTML = 'Edit Transaction';
    document.getElementById('formMode').value = 'edit';
    document.getElementById('transactionId').value = transactionId;
    document.getElementById('deleteTransactionButton').style.display = 'block';

    // Display the form fields with the existing transaction data
    if (type === 'income') {
        document.getElementById('incomeDate').value = date;
        document.getElementById('incomeAmount').value = amount;
        document.getElementById('incomeCategory').value = category;
        document.getElementById('incomeAsset').value = asset;
        document.getElementById('incomeNote').value = note;
        document.getElementById('transfer-tab').parentElement.style.display = 'none';
        $('#income-tab').tab('show');
    } else if (type === 'expense') {
        document.getElementById('expenseDate').value = date;
        document.getElementById('expenseAmount').value = amount;
        document.getElementById('expenseCategory').value = category;
        document.getElementById('expenseAsset').value = asset;
        document.getElementById('expenseNote').value = note;
        document.getElementById('transfer-tab').parentElement.style.display = 'none';
        $('#expense-tab').tab('show');
    } else if (type === 'transfer') {
        document.getElementById('transferDate').value = date;
        document.getElementById('transferAmount').value = amount;
        document.getElementById('transferFromAsset').value = fromAsset;
        document.getElementById('transferToAsset').value = toAsset;
        document.getElementById('transferNote').value = note;
        document.getElementById('income-tab').parentElement.style.display = 'none';
        document.getElementById('expense-tab').parentElement.style.display = 'none';
        $('#transfer-tab').tab('show');
    }

    // Show the modal
    $('#addTransactionModal').modal('show');
}

// Save Transaction (income, expense, transfter) upon clicking Save button on index.html
function saveTransaction(type, event) {
    event.preventDefault();

    let form;
    if (type === 'income') {
        form = document.getElementById('incomeForm');
    } else if (type === 'expense') {
        form = document.getElementById('expenseForm');
    } else if (type === 'transfer') {
        form = document.getElementById('transferForm');
    }

    const formData = new FormData(form);
    const data = {
        type: type,
        date: formData.get(type + 'Date'),
        amount: parseFloat(formData.get(type +  'Amount')),
        category_id: formData.get(type + 'Category'),
        asset_id: formData.get(type + 'Asset'),
        note: formData.get(type + 'Note')
    };

    if (type === 'transfer') {
        data.from_asset_id = formData.get('transferFromAsset');
        data.to_asset_id = formData.get('transferToAsset');
    }

    // Choosing either Add/Edit Transaction URL
    const formMode = document.getElementById('formMode').value;
    let url, method;
    if (formMode === 'add') {
        url = '/add_transaction';
        method = 'POST';
    } else {
        const transactionId = document.getElementById('transactionId').value;
        url = `/update_transaction/${transactionId}`;
        method = 'POST';
    }

    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            $('#addTransactionModal').modal('hide');
            form.reset();
            location.reload();
        } else {
            console.error('Error adding/editing transaction: ', data.message);
            alert(`Error adding/editing  transaction: ${data.message}`);
        }
    })
    .catch(error => {
        console.error('Error adding/editing transaction: ', error)
        alert('An error occurred while adding/editing the transaction.');
    });
}

// Delete Transaction upon clicking Delet button
function deleteTransaction(event) {
    event.preventDefault();

    const transactionId = document.getElementById('transactionId').value;
    fetch(`/delete_transaction/${transactionId}`, {
        method: "DELETE",
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            $('#addTransactionModal').modal('hide');
            location.reload();
        } else {
            console.error('Error deleting transaction: ', data.message);
            alert(`Error adding/editing  transaction: ${data.message}`);
        }
    })
    .catch(error => {
        console.error('Error deleting transaction: ', error)
        alert('An error occurred while deleting the transaction.');
    });
}


// Budget creating Asset Modal
function selectAsset(asset) {
    document.getElementById('asset-group').value = asset;
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';
    document.getElementById('modal-back-btn').style.display = 'block';
}

function goBack() {
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step1').style.display = 'block';
    document.getElementById('modal-back-btn').style.display = 'none';
    document.getElementById('asset-name').value = '';
    document.getElementById('asset-amount').value = '';
}

// Re-opening Add Asset will always display step1 modal
$('#addAssetModal').on('hidden.bs.modal', function () {
    document.getElementById('step1').style.display = 'block';
    document.getElementById('step2').style.display = 'none';
    document.getElementById('modal-back-btn').style.display = 'none';
    document.getElementById('asset-name').value = '';
    document.getElementById('asset-amount').value = '';
});

// Save the Asset into the list
function saveAsset(event) {
    event.preventDefault();

    const group = document.getElementById('asset-group').value;
    const name = document.getElementById('asset-name').value;
    const amount = document.getElementById('asset-amount').value;

    // Save the asset in the database
    fetch('/save_asset', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({
            group: group,
            name: name,
            amount: amount
        })
    })
    .then(response => {
        if (response.ok) {
            // Reload the page to show updated data
            location.reload();
        } else {
            throw new Error('Failed to save asset');
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });

    // Reset and close modal
    $('#addAssetModal').modal('hide');
}

// Retrieve list of assets from the database upon opening delete asset modal
function openDeleteAssetModal() {
    fetch('/get_assets')
    .then(response => response.json())
    .then(data => {
        const assetDeleteList = document.getElementById('assetDeleteList');
        assetDeleteList.innerHTML = '';
        data.assets.forEach(asset => {
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
            listItem.innerHTML = `
                ${asset.asset_group_name} - ${asset.asset_name}
                <button class="btn btn-danger btn-sm" onclick="confirmDelete(${asset.id})">Delete</button>
            `;
            assetDeleteList.appendChild(listItem);
        });
        $('#deleteAssetModal').modal('show');
    })
    .catch(error => console.error('Error:', error));
}

// Upon clicking to delete the element from the asset list, confirm the user and perform delete
function confirmDelete(assetId) {
    const confirmation = confirm("Are you sure you want to delete this asset?");
    if (confirmation) {
        fetch(`/delete_asset/${assetId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                $('#deleteAssetModal').modal('hide');
                location.reload(); // Reload the page to update the asset list
            } else {
                alert('Error deleting asset.');
            }
        })
        .catch(error => console.error('Error:', error));
    }
}

